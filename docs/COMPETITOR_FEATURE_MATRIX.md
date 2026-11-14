# Competitor feature matrix — planning benchmark

Observed 2026-11-15 from vendor-published product/support pages. This is a roadmap benchmark, **not an independent verification of competitor claims** and not a requirement to copy proprietary implementations.

Official reference pages used for this pass:

- NordVPN feature/support pages: https://nordvpn.com/features/ and https://support.nordvpn.com/hc/en-us/articles/19559429814545-What-features-does-NordVPN-have
- Proton VPN features/support pages: https://protonvpn.com/features and https://protonvpn.com/support/protonvpn-features
- ExpressVPN features page: https://www.expressvpn.com/features

## Product benchmark

| Capability | NordVPN | Proton VPN | ExpressVPN | Our current state | Roadmap position |
| --- | --- | --- | --- | --- | --- |
| Full-device encrypted VPN | Yes | Yes | Yes | **No** — browser proxy only | Native phase |
| Browser extension | Lightweight proxy extension | Browser extension | Browser extension | **Implemented prototype** | Current MVP |
| Modern VPN protocol | NordLynx/WireGuard plus other protocols | WireGuard/OpenVPN/Stealth | Lightway plus OpenVPN/WireGuard per vendor page | None; not a device VPN | WireGuard-based native phase |
| Kill switch / always-on | Yes | Yes | Yes on supported platforms | No OS-wide kill switch; proxy stays configured on error | Native phase; browser claims remain narrow |
| Split tunneling | Yes | Yes on multiple platforms including browser extension | Yes | Not implemented | Later browser/native phase if justified |
| DNS leak protection | Yes | Yes | Yes | Not certified; local destination controls only | Owner-browser leak acceptance, then native DNS controls |
| WebRTC leak protection | Browser/platform protections | Platform/browser features | Vendor claims WebRTC safeguards | Mitigation setting only; not leak-certified | Current browser acceptance gate |
| Ad/tracker/malware filtering | Threat Protection family | NetShield | Advanced Protection / tracker and malicious-site blocking | Not implemented | DNS/privacy phase after core routing reliability |
| Multi-hop / double VPN | Double VPN | Secure Core | No equivalent highlighted on current general feature page | Not implemented | Advanced future feature, only after core service maturity |
| Tor/onion routing | Onion over VPN | Tor over VPN | Not a core highlighted feature | Not implemented | Optional later; avoid complexity in MVP |
| Obfuscation / censorship resistance | Obfuscated servers / NordWhisper | Stealth / alternative routing | Lightway and platform-specific connectivity features | Not implemented | Later, separate threat model |
| Dedicated IP | Yes as product option | Product-dependent | Yes | Not implemented | Commercial phase only if demand justifies cost |
| Multi-country network | Large global network | Large global network | Large global network | No live country verified | US-only first, then 1–2 countries |
| Multi-device support | Up to vendor-stated device limit | Up to vendor-stated device limit | Up to vendor-stated device limit | One founder Chrome browser | After native clients and entitlement system |
| Independent audit / transparency claims | Vendor publishes audit/no-log claims | Vendor publishes open-source/audit claims | Vendor publishes audit/no-log claims | No independent audit | Commercial release gate |
| Account MFA | Yes | Proton account 2FA | Account security features vary | No MFA in founder-only MVP | External-user auth phase |
| Operations/support | Mature 24/7 support | Mature customer support | Mature 24/7 support | Founder-only operations page | Commercial operations phase |
| Billing/subscriptions | Mature | Mature | Mature | None | Commercial phase |
| Global scaling/HA | Mature networks | Mature networks | Mature networks | Single-gateway design | Multi-region phase |

## What we should compete on first

The correct sequence is not to clone the entire feature list. The first competitive foundation is:

1. Reliable authenticated connection.
2. Truthful exit-route verification.
3. Safe failure behavior and leak testing.
4. Fast, simple UX.
5. Reproducible deployment and rollback.
6. Minimal data retention and clear privacy claims.
7. Measured performance and uptime.

Only after those foundations are proven should we add filtering, split tunneling, obfuscation, multi-hop, billing, or large-region counts.

## Browser milestone definition

For the USA-only browser-proxy milestone, success means the founder can install the extension, authenticate to the control plane, connect to an authorized US proxy, verify the observed exit IP, survive normal lifecycle events, disconnect cleanly, and demonstrate the documented DNS/WebRTC/IPv6/failure boundaries.

That milestone is **not feature parity** with NordVPN, Proton VPN, or ExpressVPN and must never be marketed as a full-device VPN.
