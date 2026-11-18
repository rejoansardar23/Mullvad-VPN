# Security and privacy operating baseline

The prototype handles account credentials, browser routing and traffic forwarding. It requires separate review before exposure to external users. Automated tests, source inspection and successful local TLS requests do not certify security, privacy, account ownership or live US routing. Report issues through [SECURITY.md](../SECURITY.md).

Preserve these controls during development:

- Verify TLS certificates, package integrity and pinned archive checksums. Do not use certificate-error bypasses or weaken managed browser policies to force a passing test.
- Keep account secrets and TLS keys outside Git, logs, prompts and public reports. Generated `.local/` credentials are test-only and private. Use secure environment settings for supplied secrets.
- Keep management interfaces private, public signup disabled and founder authentication separate from short-lived, revocable proxy grants. Never ship a permanent gateway/admin secret in a client.
- Match proxy credentials to the exact configured host, port and Basic proxy challenge. Check ownership before changing browser proxy or privacy settings.
- Enforce authentication, expiry, active revocation, destination restrictions, connection limits and byte quotas on the gateway. Deny private, loopback, metadata and special-use destinations; validate all DNS answers and pin a checked address.
- Keep website HTTPS end-to-end. Do not add traffic interception, browsing-history collection or unreviewed telemetry to fill operational dashboards.

The exact control API origin deliberately bypasses the browser proxy. Incognito, browser-internal traffic, other applications and operating-system networking are outside the protection claim. Route verification checks that the extension still owns the required WebRTC policy before and after its exit check. WebRTC mitigation and failure behavior require owner-device testing; they do not establish leak-free routing or an operating-system kill switch.

The current database stores salted password hashes, hashed tokens/grants, expiry/revocation state and aggregate usage. Expired sessions are pruned; old grant state has bounded retention while cumulative account quota survives restart. Development credentials, provider logs, platform logs, access permissions and backups are separate data surfaces. This is not an independently verified no-logs policy.

Encrypted backup tools use authenticated encryption and reject incorrect passwords or tampering. After restoring older account state, stop all database consumers and perform owner-controlled account recovery before restart. Recovery changes the password and invalidates sessions and grants in one SQLite transaction. Stop services first to close existing in-memory tunnels. A local recovery test does not prove off-host recovery or production rollback. See [local development](LOCAL_DEVELOPMENT.md) and [deployment prerequisites](DEPLOYMENT.md).

Required release checks include real authentication and traffic forwarding, forbidden destinations, expired/revoked grants, quota exhaustion, gateway/API outage, browser and worker restart, network changes, DNS/WebRTC/IPv6 behavior, trusted production TLS, firewall behavior, recovery and provider limits. Distinguish passed, failed, simulated, skipped and unrun checks in [STATUS.md](STATUS.md).

Earlier threat scenarios are preserved in [the historical threat model](../AnalyseFuture/previous-docs/SECURITY_THREAT_MODEL.md). Review applicable privacy, hosting and consumer obligations before serving others. Do not publish claims such as anonymous, audited, no logs or guaranteed protection without evidence supporting the exact claim.
