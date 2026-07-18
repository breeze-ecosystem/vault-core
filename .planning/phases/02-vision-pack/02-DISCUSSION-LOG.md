# Phase 2: VISION Pack - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-18
**Phase:** 2-VISION Pack
**Areas discussed:** WhatsApp & SMS alert channels, Reconnaissance faciale VISION, Géofencing & mode absence, Multi-utilisateurs & partage, Accès hors réseau, Découverte & streaming

---

## WhatsApp & SMS alert channels

| Option | Description | Selected |
|--------|-------------|----------|
| Proxy through vault-app | Centralized WhatsApp Business account managed by VaultOS. vault-app handles Meta webhook + template approval. All vault-os instances send alerts through vault-app API. | |
| Per-client setup | Each client creates their own WhatsApp Business account. vault-os connects directly to Meta API. | |
| You decide | Let planner/researcher figure out approach. | |
| **Decision: Hermes Agent (open source)** | **Replaced both options above. Deploy Hermes Agent in client's Docker Compose. QR code WhatsApp Web — no Business API needed.** | ✓ |
| GSM modem preferred | Client inserts SIM in edge server. vault-os sends SMS via AT commands over serial/USB. Works fully offline. | |
| Cloud SMS gateway preferred | Use Africa's Talking, Twilio, or similar. Simpler integration but requires internet. | |
| Both — modem primary, gateway fallback | Try modem first (offline-capable). Fall back to cloud gateway if no modem detected. | ✓ |
| Queue alerts locally | Store failed alerts in local queue. Retry when connection restores. | ✓ |
| Skip silently | VISION is local-first. If no channel available, event is just logged. | |
| Text + screenshot image | Alert text + auto-captured snapshot via WhatsApp. | ✓ |
| Text only | Alert description only. | |
| WhatsApp costs included in license | VaultOS pays, cost absorbed in VISION license price. | ✓ |
| WhatsApp costs charged to client | Per-client billing for WhatsApp messages. | |
| Low volume (<100 SMS/month/client) | Critical alerts only (intrusion, forced doors). | ✓ |
| Medium volume (100-1000) | Alerts + scheduled notifications. | |
| Hermes + GSM modem documented | Create technical note/ADR explaining the architecture choice. | ✓ |

**User's choice:** Used Hermes Agent (open source) instead of direct WhatsApp Business API. QR code WhatsApp Web connection. GSM modem primary (Huawei E3372). Cloud gateway fallback optional. WhatsApp costs included in VISION license. French only. Document decision.

**Notes:** User is not technical — needed simplified explanations and recommendations. Hermes Agent emerged as a better alternative to the original WhatsApp API proxy approach.

---

## Reconnaissance faciale VISION (VIS-07)

| Option | Description | Selected |
|--------|-------------|----------|
| One engine, license-enforced limits | Single face recognition engine. VISION limited to 50 faces, basic features. BASTION unlocks all. | ✓ |
| Two separate systems | VISION uses simplified system. BASTION has full AI engine. | |
| Dashboard upload | Import faces via web dashboard. | |
| Mobile app upload | Import faces via phone camera. | |
| Both | Dashboard + mobile. | ✓ |
| Whitelist only (VISION) | Authorized persons list. Unknown faces trigger alert. | ✓ |
| Whitelist + blacklist | Both from VISION. | |
| Local storage | PostgreSQL or filesystem. No cloud. | ✓ |
| Qdrant vector DB | More performant but BASTION scope. | |

**User's choice:** One engine with license limits. Both dashboard + mobile import. Whitelist only (unknown = alert). Local storage.

---

## Géofencing & mode absence (VIS-20, VIS-16, VIS-22)

| Option | Description | Selected |
|--------|-------------|----------|
| WiFi detection | Phone connects/disconnects from site WiFi = present/absent. Simple, reliable, no battery drain. | ✓ |
| GPS geofencing | Radius around site. More precise but battery heavy. | |
| WiFi + GPS combined | Both methods used. | |
| Automatic without confirmation | Arms/disarms silently in background. | |
| Automatic with notification | Notifies user but no confirmation needed. | ✓ |
| With user confirmation | Asks each time. | |
| Normal sensitivity | All alerts active at normal thresholds. | |
| Enhanced sensitivity | Lower thresholds, all channels active. | ✓ |
| Armed when ALL leave | Last phone to leave arms. First to return disarms. | ✓ |
| Per-phone independently | Each phone controls independently. | |
| Configurable timeout | If no heartbeat from phone for X min → considered absent. | ✓ |
| Last known state | System stays in last known state. | |
| Configurable arming delay | E.g. 10 min after WiFi disconnect before arming. Prevents false triggers. | ✓ |
| Arm immediately | No delay. WiFi disconnect = armed. | |
| Manual + scheduled arming | Button in dashboard + daily schedule. For when phone forgotten at office. | ✓ |
| Motion + WiFi combined | Detect no motion on cameras + WiFi connected = arm anyway. | |
| DND = scheduled quiet hours | Programmable time slots. | ✓ |
| Quick toggle in app | Manual DND switch. | |
| Both | Planning + toggle. | ✓ |
| Critical alerts bypass DND | Intrusion, forced door notify even during DND. | ✓ |
| No DND exceptions | DND = absolute silence. | |

**User's choice:** WiFi detection, automatic with notification, enhanced sensitivity when armed, armed when ALL leave, configurable timeout + arming delay, manual/scheduled override available, DND scheduled separately but overridden by absence mode, critical alerts bypass DND.

---

## Multi-utilisateurs & partage (VIS-19, VIS-21)

| Option | Description | Selected |
|--------|-------------|----------|
| Temporary link without login | URL share. No account needed. Expires after set time. | ✓ |
| Temporary guest account | Email + code. More secure but heavier. | |
| Both options | Both available. | |
| Configurable expiry | 1h/6h/24h/custom. | ✓ |
| 1 hour fixed | Simple default. | |
| Role chosen at invitation | Owner picks role (admin/viewer) when inviting. | ✓ |
| All same role | All secondary accounts identical. | |
| Differentiated roles | Admin vs viewer predefined. | |
| Invitation by email/SMS | Click to create password. | |
| Manual creation | Admin creates credentials directly. | |
| Both | Both methods available. | ✓ |
| Camera(s) of choice | Owner picks which cameras to share. | ✓ |
| All cameras | Full access. | |
| Revocable | Owner sees active shares and can revoke any. | ✓ |
| Expiry only | Cannot revoke early. | |
| Block with BASTION upgrade prompt | "VISION limit (3/3). Upgrade to BASTION." | ✓ |
| Rotation possible | Remove one, add another. | |
| HTTPS mandatory | Encrypted even on local network. | ✓ |
| HTTP local OK | Local sharing, encryption optional. | |
| Notify on share open | Owner notified when recipient opens link. | ✓ |
| No notification | Silent sharing. | |

**User's choice:** Temporary link without login, configurable expiry (1h default), role at invitation time, both invitation methods, camera(s) of choice, revocable, BASTION upgrade prompt at limit, HTTPS mandatory, notified on access.

---

## Accès hors réseau (VIS-23)

| Option | Description | Selected |
|--------|-------------|----------|
| DDNS recommended + guide | Script/config generator. Simple for non-technical users. | ✓ |
| WireGuard VPN + guide | More secure but more complex configuration. | |
| Both available | Support both methods. | |
| DDNS container in Docker Compose | Built-in DuckDNS/No-IP service. Client enters token. Automatic. | ✓ |
| Documentation only | Client configures DDNS/VPN themselves. | |

**User's choice:** DDNS recommended (simpler). Include DDNS container in Docker Compose. WireGuard documentation available.

---

## Découverte & streaming (VIS-01 à VIS-05)

| Option | Description | Selected |
|--------|-------------|----------|
| Live streaming in mobile app | expo-av or WebRTC viewer in Expo app. | ✓ |
| Dashboard web only | Streaming only via web. Mobile for alerts only. | |
| Verify ONVIF + build UI | Check existing ONVIF code works. Add dashboard scan UI. | ✓ |
| Add UI only | Backend works, just needs UI. | |
| Camera substreams | HD + SD streams from camera. App selects based on device. | ✓ |
| Server transcoding | vault-os transcodes via FFmpeg. More CPU but flexible. | |

**User's choice:** Live streaming in mobile app. Verify ONVIF + build scan UI. Camera substreams for adaptive quality (no server transcoding).

---

## the agent's Discretion

- Exact Hermes Agent integration implementation details
- UI design specifics for dashboard pages
- Feature flag key naming convention
- ONVIF scan UI implementation approach

## Deferred Ideas

- Anti-spoofing / liveness detection → Phase 3 (BASTION)
- Blacklist + risk scoring → Phase 3 (BASTION)
- Qdrant vector DB for face rec → Phase 3 (BASTION)
- WebRTC streaming → future evaluation
- WireGuard integrated VPN → documentation only for v1.0
