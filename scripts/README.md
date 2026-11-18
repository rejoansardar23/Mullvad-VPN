# Private database recovery

Requires Node.js 24.22.1 or newer with `node:sqlite`. No package installation or paid backup service is needed. The tooling takes a consistent online SQLite snapshot, encrypts it, and restores into a separate database after authenticated decryption and `PRAGMA integrity_check`.

Supply `BACKUP_PASSWORD` through your secure environment settings. A passphrase must contain 16–1024 characters. Do not put a real value in command arguments, shell history, source files, logs or chat. Keep an offline recovery copy of the passphrase under the owner's control; losing it makes the backup unrecoverable.

From the repository root:

```sh
node scripts/recovery/backup.mjs backup /private/data/control.sqlite /private/backups/control.enc
node scripts/recovery/backup.mjs restore /private/backups/control.enc /private/recovery/control.sqlite
node --test tests/operations/ops.test.js
```

Both commands refuse to overwrite an existing file. `--force` permits replacement, but stop every service using the destination database before restoring. Restore rejects existing `-wal`, `-shm` or `-journal` sidecars: stop the service and complete a normal SQLite checkpoint first. Never remove active WAL files to bypass this check. An older snapshot also contains older authorization state. Before restarting the application, run its owner-controlled account recovery command with a securely supplied new `FOUNDER_PASSWORD` (`npm run account -- recover /private/recovery/control.sqlite`); this invalidates restored sessions and connection grants so revocations cannot be undone by restoring old state. Validate the recovered API and accounts against the restored database before changing the service's database path. Retain the previous deployment and original database for rollback until that check passes.

Backups use AES-256-GCM through Node/OpenSSL, a random 32-byte salt, random 12-byte nonce, 16-byte authentication tag, and scrypt (`N=32768`, `r=8`, `p=1`, 32-byte key). The versioned file framing is `VPNSQL01 | salt | nonce | ciphertext | tag`; the header is authenticated. Keep this tool/version available for recovery; this framing is not an interchange claim for third-party backup tools. Inputs are limited to 512 MiB. Encryption is streamed, and decrypted data is never published until authentication and SQLite integrity checks pass.

New output files are mode `0600`; newly created directories and temporary snapshot directories are mode `0700`. An online snapshot and decrypted restore are temporarily present on disk inside those private directories and are removed after success or failure. This is filesystem cleanup, not a claim of forensic secure erasure. Prefer an encrypted host volume when available. No backup passphrase or database records are printed.

Run the local handoff drill with `node --test tests/runtime/dev.test.js`. It uses the backup, restore and account CLIs with disposable credentials and two isolated directories on one machine. It copies the encrypted archive, restores and rotates access with services stopped, preserves accounted usage, rejects the old password, bearer and proxy grant, and accepts fresh credentials. The source database stays byte-identical.

For the off-host drill, copy the encrypted archive to existing authorized storage in a separate failure domain. Retrieve it to a private destination on the recovery host and run the restore and account recovery commands there. Keep the prior service configuration and database available until the recovered service passes trusted TLS, fresh credential, stale credential and usage checks. Record transfer and recovery times, then verify rollback on the authorized deployment. Keep the passphrase and any private records separate from the copied archive.

# Local development services

Run `npm ci` and `npm run dev:init` from the repository root. Initialization creates `.local/` (mode `0700`), a localhost-only self-signed development certificate, a private SQLite database, a configuration file and `.local/credentials.json` (mode `0600`). The founder password is generated once unless `FOUNDER_PASSWORD` was supplied securely. It is never printed. These are local development credentials, never production credentials. Re-running initialization preserves the existing account and TLS identity.

`npm run dev` starts the TLS control API on loopback port 9443 and the TLS proxy on loopback port 9444. No gateway is advertised by default. `npm run dev -- --fixture` additionally starts an HTTPS route-check fixture on loopback port 9445 and advertises **Local fixture (not US)**. The only special destination permission is HTTPS CONNECT to that exact local fixture; the normal internet-only destination policy remains active otherwise. This proves a local integration path, not a US location or a deployed VPN.

Check the API without disabling certificate verification:

```sh
curl --cacert .local/localhost.pem https://localhost:9443/healthz
```

Ctrl+C stops all services. Running the same start command again reuses retained state. For extension testing, explicitly trust the local certificate in your test browser/OS trust store and add the exact `chrome-extension://<extension-id>` origin to `.local/config.json` under `extensionOrigins`, then restart. Do not use certificate-error bypass flags or trust this development CA on production devices. The certificate expires after 30 days; stop services and regenerate both certificate/key files together when needed. No production certificate or renewal automation is implied.

The popup's control API origin is `https://localhost:9443`; retrieve credentials privately from the generated file. The API and route-check fixture share the hostname with different ports; the extension's narrow API bypass is scoped to the API's exact host and port. Use a separate clean browser profile for test configuration and remove its local trust entry afterward.

# Private extension package

`node scripts/packaging/package.mjs` builds the extension and creates `dist/private-route-extension-0.1.0.zip` plus its `.sha256` checksum. Packaging copies only an explicit extension-asset allowlist and third-party license notices, never `.local/`, account data or TLS keys. Stable file timestamps and sorted archive entries make identical inputs produce identical archive bytes. Install the unpacked `dist/extension/` folder through Chrome Developer Mode for private testing. No store upload, public signup, production deployment or live US exit is performed.
