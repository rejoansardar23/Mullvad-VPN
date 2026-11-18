import { DatabaseSync, type SQLOutputValue } from 'node:sqlite';
import { randomBytes, createHash, scryptSync, timingSafeEqual } from 'node:crypto';
import { mkdirSync, chmodSync, lstatSync } from 'node:fs';
import { dirname } from 'node:path';

const secret = () => randomBytes(32).toString('base64url');
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const passwordHash = (password: string, salt: string) => scryptSync(password, salt, 64).toString('hex');

interface AccountRow extends Record<string, SQLOutputValue> {
  id: number;
  username: string;
  salt: string;
  password_hash: string;
  quota_bytes: number;
  used_bytes: number;
}
interface SessionRow extends Record<string, SQLOutputValue> {
  hash: string;
  expires_at: number;
}
interface GrantRow extends Record<string, SQLOutputValue> {
  id: string;
  session_hash: string;
  password_hash: string;
  gateway_id: string;
  expires_at: number;
  max_bytes: number;
  used_bytes: number;
  revoked: number;
}
interface AccountQuotaRow extends Record<string, SQLOutputValue> {
  username: string;
  quota_bytes: number;
  used_bytes: number;
}
interface GrantStatusRow {
  id: string;
  expiresAt: number;
  usedBytes: number;
  revoked: number;
}
interface GrantIdRow extends Record<string, SQLOutputValue> { id: string }
export interface StoreOptions {
  now?: () => number;
  sessionMs?: number;
  grantMs?: number;
}
export interface IssuedSession { token: string; expiresAt: number }
export interface IssuedGrant { id: string; username: string; password: string; expiresAt: number }
export interface AuthorizedGrant {
  id: string;
  expiresAt: number;
  maxBytes: number;
  usedBytes: number;
  maxConnections: number;
}
export interface StoreStatus {
  account: { username: string; quotaBytes: number; usedBytes: number } | null;
  grants: (GrantStatusRow & { active: boolean; state: 'active' | 'revoked' | 'expired' | 'exhausted' })[];
}

export class Store {
  readonly db: DatabaseSync;
  readonly now: () => number;
  readonly sessionMs: number;
  readonly grantMs: number;
  constructor(path: string, { now = Date.now, sessionMs = 3600000, grantMs = 300000 }: StoreOptions = {}) {
    this.now = now; this.sessionMs = sessionMs; this.grantMs = grantMs;
    if (path !== ':memory:') {
      mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
      if (lstatSync(path, { throwIfNoEntry: false })?.isSymbolicLink()) throw new Error('Database symlinks are forbidden');
    }
    this.db = new DatabaseSync(path);
    if (path !== ':memory:') chmodSync(path, 0o600);
    this.db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=DELETE;
      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY CHECK(id=1), username TEXT UNIQUE NOT NULL,
        salt TEXT NOT NULL, password_hash TEXT NOT NULL, quota_bytes INTEGER NOT NULL, used_bytes INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS sessions (
        hash TEXT PRIMARY KEY, account_id INTEGER NOT NULL REFERENCES accounts(id), expires_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS grants (
        id TEXT PRIMARY KEY, session_hash TEXT NOT NULL, password_hash TEXT NOT NULL,
        gateway_id TEXT NOT NULL, expires_at INTEGER NOT NULL, max_bytes INTEGER NOT NULL,
        used_bytes INTEGER NOT NULL DEFAULT 0, revoked INTEGER NOT NULL DEFAULT 0, revoked_at INTEGER);`);
    // Upgrade earlier prototype databases without resetting their usage totals.
    const accountColumns = this.db.prepare('PRAGMA table_info(accounts)').all().map(row => row.name);
    const grantColumns = this.db.prepare('PRAGMA table_info(grants)').all().map(row => row.name);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      if (!accountColumns.includes('used_bytes')) {
        this.db.exec('ALTER TABLE accounts ADD COLUMN used_bytes INTEGER NOT NULL DEFAULT 0');
        this.db.exec('UPDATE accounts SET used_bytes=(SELECT coalesce(sum(used_bytes),0) FROM grants)');
      }
      if (!grantColumns.includes('revoked_at')) this.db.exec('ALTER TABLE grants ADD COLUMN revoked_at INTEGER');
      this.db.exec('PRAGMA user_version=2; COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); this.db.close(); throw error; }
    this.prune();
  }
  createAccount(username: string, password: string, quotaBytes = 100 * 1024 * 1024) {
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(username) || typeof password !== 'string' || password.length < 16 || password.length > 256)
      throw new Error('Use a simple username and a password of 16–256 characters');
    if (!Number.isSafeInteger(quotaBytes) || quotaBytes < 1024) throw new Error('Invalid quota');
    const salt = secret();
    this.db.prepare('INSERT INTO accounts(id,username,salt,password_hash,quota_bytes) VALUES (1,?,?,?,?)').run(username, salt, passwordHash(password, salt), quotaBytes);
  }
  login(username: string, password: string): IssuedSession | null {
    const account = this.db.prepare('SELECT * FROM accounts WHERE id=1').get() as AccountRow | undefined;
    const actual = passwordHash(password, account?.salt || 'unconfigured-account');
    if (!account || username !== account.username || !timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(account.password_hash, 'hex'))) return null;
    this.prune();
    const token = secret(), expiresAt = this.now() + this.sessionMs;
    this.db.prepare('INSERT INTO sessions VALUES (?,1,?)').run(digest(token), expiresAt);
    return { token, expiresAt };
  }
  session(token: unknown): SessionRow | null {
    if (typeof token !== 'string' || token.length > 128) return null;
    return this.db.prepare('SELECT hash,expires_at FROM sessions WHERE hash=? AND expires_at>?').get(digest(token), this.now()) as SessionRow | undefined || null;
  }
  status(): StoreStatus {
    this.prune();
    const a = this.db.prepare('SELECT username,quota_bytes,used_bytes FROM accounts WHERE id=1').get() as AccountQuotaRow | undefined;
    const grants = this.db.prepare('SELECT id,expires_at AS expiresAt,used_bytes AS usedBytes,max_bytes AS maxBytes,revoked FROM grants ORDER BY expires_at DESC LIMIT 100').all() as unknown as (GrantStatusRow & { maxBytes: number })[];
    return { account: a ? { username: a.username, quotaBytes: a.quota_bytes, usedBytes: a.used_bytes } : null,
      grants: grants.map(grant => {
        const state = grant.revoked ? 'revoked' : grant.expiresAt <= this.now() ? 'expired'
          : grant.usedBytes >= grant.maxBytes || (a && a.used_bytes >= a.quota_bytes) ? 'exhausted' : 'active';
        return { ...grant, state, active: state === 'active' };
      }) };

  }
  issue(sessionHash: string, gatewayId: string): IssuedGrant {
    const { account } = this.status();
    if (!account || account.usedBytes >= account.quotaBytes) throw new Error('Quota exhausted');
    const id = randomBytes(16).toString('hex'), password = secret();
    const expiresAt = Math.min(this.now() + this.grantMs, (this.db.prepare('SELECT expires_at FROM sessions WHERE hash=?').get(sessionHash) as Pick<SessionRow, 'expires_at'>).expires_at);
    this.db.prepare('INSERT INTO grants(id,session_hash,password_hash,gateway_id,expires_at,max_bytes) VALUES (?,?,?,?,?,?)')
      .run(id, sessionHash, digest(password), gatewayId, expiresAt, account.quotaBytes - account.usedBytes);
    return { id, username: id, password, expiresAt };
  }
  authorize(username: unknown, password: unknown): AuthorizedGrant | null {
    if (typeof username !== 'string' || typeof password !== 'string' || password.length > 128) return null;
    const g = this.db.prepare(`SELECT g.* FROM grants g JOIN sessions s ON g.session_hash=s.hash
      WHERE g.id=? AND g.revoked=0 AND g.expires_at>? AND s.expires_at>?`).get(username, this.now(), this.now()) as GrantRow | undefined;
    if (!g || !timingSafeEqual(Buffer.from(digest(password), 'hex'), Buffer.from(g.password_hash, 'hex'))) return null;
    const { account } = this.status();
    if (account!.usedBytes >= account!.quotaBytes) return null;
    return { id: g.id, expiresAt: g.expires_at, maxBytes: Math.min(g.max_bytes, g.used_bytes + account!.quotaBytes - account!.usedBytes),
      usedBytes: g.used_bytes, maxConnections: 4 };
  }
  addUsage(id: string, bytes: number): void {
    if (!Number.isSafeInteger(bytes) || bytes < 0) throw new Error('Invalid usage');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const grant = this.db.prepare('UPDATE grants SET used_bytes=used_bytes+? WHERE id=? AND used_bytes<=?').run(bytes, id, Number.MAX_SAFE_INTEGER - bytes);
      const account = this.db.prepare('UPDATE accounts SET used_bytes=used_bytes+? WHERE id=1 AND used_bytes<=?').run(bytes, Number.MAX_SAFE_INTEGER - bytes);
      if (Number(grant.changes) !== 1 || Number(account.changes) !== 1) throw new Error('Usage persistence failed');
      this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  revoke(id: string, sessionHash: string): boolean {
    // Every authenticated session belongs to the single founder account. This
    // allows the private dashboard to revoke an extension's separate session.
    return this.db.prepare(`UPDATE grants SET revoked=1,revoked_at=? WHERE id=?
      AND EXISTS (SELECT 1 FROM sessions WHERE hash=? AND account_id=1 AND expires_at>?)`)
      .run(this.now(), id, sessionHash, this.now()).changes > 0;
  }
  prune(): void {
    const cutoff = this.now() - 7 * 24 * 60 * 60 * 1000;
    this.db.prepare('DELETE FROM grants WHERE expires_at<=? OR (revoked=1 AND coalesce(revoked_at,expires_at)<=?)').run(cutoff, cutoff);
    this.db.prepare('DELETE FROM sessions WHERE expires_at<=?').run(this.now());
  }
  revokeSession(sessionHash: string): string[] {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const grants = this.db.prepare(`UPDATE grants SET revoked=1,revoked_at=? WHERE session_hash=? AND revoked=0
        RETURNING id`).all(this.now(), sessionHash) as GrantIdRow[];
      this.db.prepare('DELETE FROM sessions WHERE hash=?').run(sessionHash);
      this.db.exec('COMMIT');
      return grants.map(grant => grant.id);
    } catch (error) {
      if (this.db.isTransaction) this.db.exec('ROLLBACK');
      throw error;
    }
  }
  recover(password: string): void {
    if (typeof password !== 'string' || password.length < 16 || password.length > 256) throw new Error('Password must be 16–256 characters');
    const salt = secret();
    const hash = passwordHash(password, salt);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const account = this.db.prepare('UPDATE accounts SET salt=?,password_hash=? WHERE id=1').run(salt, hash);
      if (Number(account.changes) !== 1) throw new Error('Founder account does not exist');
      this.db.prepare('UPDATE grants SET revoked=1,revoked_at=?').run(this.now());
      this.db.exec('DELETE FROM sessions; COMMIT');
    } catch (error) {
      if (this.db.isTransaction) this.db.exec('ROLLBACK');
      throw error;
    }
  }
  close(): void { this.db.close(); }
}
