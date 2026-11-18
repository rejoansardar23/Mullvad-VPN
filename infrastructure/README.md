# Owner-host runtime templates — not deployed

These files do not provision infrastructure or establish a US location. First complete `docs/DEPLOYMENT.md`: owner authorization, provider terms, US region, exact recurring $0 resource/bandwidth/IP cost, shutdown access, DNS and trusted TLS. No trial, paid fallback, public signup or store publication is authorized.

Copy `config.example.json` to an external private directory, replace its placeholders and keep mode 0600. Create the database directory first. Set TLS paths to a key/certificate valid for the proxy and API hostnames (or provision separate TLS frontends under a reviewed deployment design). Configure a separate HTTPS route verifier returning `{"ip":"actual-public-egress-address"}` and the actual expected exit IP. An attestation is owner-provided configuration; it does not prove location, provider permission, actual costs or browser security. `live: false` stays visibly a fixture. Setting `live: true` requires all four preflight flags and separate observed evidence in the release report.

Use Node 24 and `npm ci`. With services stopped, create the founder using the existing secure-environment CLI: `npm run account -- create /var/lib/private-browser-proxy/control.sqlite founder`. Supply `FOUNDER_PASSWORD` through secure process configuration; never put its value in history, source, logs or chat. Start with `PROXY_CONFIG=/etc/private-browser-proxy/config.json node infrastructure/serve.mjs`. The runner refuses missing accounts, checkout-local runtime files, non-HTTPS configuration, mismatched ports, and non-loopback management binds. `SIGINT`/`SIGTERM` cleanly close listeners and SQLite.

For the shared-certificate setup, check the configuration before starting services:

```sh
PROXY_CONFIG=/etc/private-browser-proxy/config.json npm run start -- --check-config
```

The check validates the runtime configuration and checks that the key and certificate match, that the leaf is current, and that it covers both the API and gateway names. It opens no listeners or database. Live configuration requires a public expected exit IP. When a separate frontend terminates API TLS, verify the frontend certificate from the owner browser and verify the gateway identity separately. Chain trust, host reachability and actual exit IP require checks on the authorized deployment.

The sample binds everything to loopback. To expose the proxy on an authorized host, deliberately configure its listener and host firewall. The management API remains loopback: provide a separately reviewed owner-only HTTPS access path (for example an authenticated SSH tunnel or hardened TLS frontend); this template does not publish it. The exact Chrome extension origin must be allowlisted after the unpacked extension ID is known. A TLS certificate must be renewed with the issuing provider's supported workflow, and services restarted to load it; renewal is not automated or proven here.

`private-browser-proxy.service` is a supervision template requiring an existing dedicated non-root service identity, installed Node 24, `/opt/private-browser-proxy`, externally owned secrets and writable `/var/lib/private-browser-proxy`. `firewall.nft.example` is a service-UID egress and loopback management template, not a complete host firewall. It must be merged with existing rules, correct DNS resolver and real service UID; preserve SSH/recovery. Neither template was installed or applied to the cloud task. Do not run host firewall mutations during local development.

After authorized deployment verify trusted TLS, authenticated HTTP/CONNECT, private IPv4/IPv6/metadata denial, expiry, active revocation, quotas, route IP, extension restart/outage behavior, manual DNS/WebRTC/IPv6 tests and actual billing. Quota accounting excludes TLS/kernel/provider overhead and conservatively consumes remaining allowance on a rejected oversized outgoing write; reserve provider headroom and independently enforce provider resource limits. No live release is ready until those checks pass.
