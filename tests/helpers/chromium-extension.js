import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { isAbsolute } from 'node:path';

const managedPolicy = '/etc/chromium/policies/managed/extensions.json';

export async function canRunRealExtension(t, { needsNss = false } = {}) {
  const required = process.env.REQUIRE_MV3_ACCEPTANCE === '1';
  const unavailable = reason => {
    if (required) throw new Error(reason);
    t.skip(reason);
    return false;
  };

  // An executable override does not authorize bypassing a managed runner's policy.
  const policy = await readFile(managedPolicy, 'utf8').then(JSON.parse).catch(error => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  const blockedExtensions = policy?.ExtensionInstallBlocklist;
  if (Array.isArray(blockedExtensions) && blockedExtensions.includes('*')) {
    return unavailable(`Managed Chromium policy (${managedPolicy}) blocks unpacked extensions. Use an authorized runner that permits them.`);
  }
  if (required && !isAbsolute(process.env.CHROMIUM_PATH || '')) {
    throw new Error('Set CHROMIUM_PATH to the absolute path of the authorized Chromium executable.');
  }
  if (needsNss && spawnSync('certutil', ['-H'], { stdio: 'ignore' }).error?.code === 'ENOENT') {
    return unavailable('NSS certutil is required for the isolated localhost TLS trust store (install libnss3-tools).');
  }
  return true;
}
