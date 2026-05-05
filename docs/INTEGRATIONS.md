# Integrations

> Tracks every external system the portal talks to. Per README §12, each
> integration ships as `IXxxAdapter` + `XxxHttpAdapter` (real) +
> `XxxMockAdapter` (fixtures), selected at runtime by env var.

## Conventions

- Interface lives in `packages/shared-types/src/integrations/`.
- Implementations live in `apps/api/src/integrations/<name>/`.
- Selection: `<NAME>_ADAPTER=http|mock` (defaults to `mock`).
- Every adapter exposes `health()` which `/admin/health` aggregates.
- Every outbound message-style adapter (email, SMS, voice, doc-sign) MUST
  emit `communication.logged` per README §8.

## Status

| Integration       | MVP scope               | Adapter status           | Notes |
|-------------------|-------------------------|--------------------------|-------|
| CampusLogin (SIS) | Real                    | Phase 1 — http + mock    | Pull every 15 min. See `SIS_MIGRATION.md`. |
| Salesforce (SIS)  | Skeleton only           | Phase 1 — interface, Phase 6 — http stub  | Same `ISisAdapter` as CampusLogin. |
| Moodle (LMS)      | Real                    | Phase 2 — http + mock    | Enrollment + activity pull. |
| BigBlueButton     | Real                    | Phase 4 — http + mock    | Webhooks for attendance + recording refs. |
| Twilio (SMS)      | Real                    | Phase 2 — http + mock    | SMS send + delivery webhook. |
| Claude API        | Real                    | Phase 8 — http + mock    | `claude-opus-4-7`, 24 h cache. |
| JustCall (CTI)    | Stub                    | Phase 1 — mock           | Logs calls/SMS into `communications`. |
| PandaDoc          | Stub                    | Phase 1 — mock           | Signed enrollment / accommodation docs. |
| Google Workspace  | Stub                    | Phase 1 — mock           | Calendar, gmail, docs; OIDC for SSO. |
| FAL.ai            | Stub                    | Phase 1 — mock           | Visual generation if needed. |

## Real-integration TODOs

For each "Stub" row above we ship the interface + a deterministic
`MockAdapter` returning fixture data, plus a TODO entry below capturing
what the http implementation needs.

### Salesforce
- API: REST + Bulk API 2.0, OAuth 2.0 client-credentials.
- Scopes: `api`, `refresh_token`, `offline_access`.
- Required custom objects: `Program__c`, `Campus__c`, `Entity__c`,
  `Enrollment__c`, `Practicum__c` (see `SIS_MIGRATION.md`).
- Doc: <https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/>

### JustCall
- API: REST v2, API key auth.
- Webhooks: `call.completed`, `sms.received`, `voicemail.created`.
- Doc: <https://developer.justcall.io/>

### PandaDoc
- API: REST v3, API key auth.
- Templates needed: `Enrollment Agreement`, `Accommodation Request`,
  `Re-Entry Plan`.
- Webhooks: `document.completed`, `document.declined`.
- Doc: <https://developers.pandadoc.com/>

### Google Workspace
- OIDC for SSO; service account with domain-wide delegation for
  Calendar/Gmail.
- Scopes: `openid email profile`,
  `https://www.googleapis.com/auth/calendar.events`,
  `https://www.googleapis.com/auth/gmail.send`.
- Doc: <https://developers.google.com/workspace>

### FAL.ai
- API: REST, bearer token.
- Used only if visual generation surfaces (newsletter banners, etc.).
- Doc: <https://fal.ai/docs>
