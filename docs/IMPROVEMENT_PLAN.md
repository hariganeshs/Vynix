## Vynix Improvement Plan (Zero-Cost, Ad-Supported)

Last updated: 2025-09-17

### Goals

- Ensure all core features work without incurring variable API costs
- Monetize via privacy-conscious, non-intrusive ads
- Improve UX for branching conversations, sharing, and exporting
- Strengthen performance, reliability, and developer productivity

### Constraints and Principles

- Zero-cost operation by default: no paid API keys required to start or to use core flows
- Prefer local models (LM Studio) and free-tier/community gateways (OpenRouter free models)
- Do not degrade privacy (no invasive tracking); keep AdSense-compliant content moderation
- Ship iterative, testable increments with clear acceptance criteria

---

## Current State (Quick Snapshot)

- Backend: Express + MongoDB via Mongoose
  - Entry: `server/index.js` (Helmet, CORS, rate-limit, `/api/*` mounting)
  - AI adapter: `server/services/aiService.js` (LM Studio, OpenAI, Google, Groq, OpenRouter)
  - Conversations: `server/routes/conversations.js` with create/branch/delete/title/settings and a public fetch `GET /api/conversations/shared/:token`
  - AI endpoints: `server/routes/ai.js` (`/generate`, `/providers`, `/test-connection`)
  - Models: `server/models/User.js`, `server/models/Conversation.js` (embedded nodes, indexes, helpers)

- Frontend: React 18 (CRA) + Tailwind + React Flow
  - Main UX: `client/src/pages/Conversation.js`, `client/src/components/ConversationTree.js`
  - Auth: `client/src/hooks/useAuth.js`, `client/src/pages/Login.js`
  - API client: `client/src/services/api.js` (token interceptor)

- Defaults that may incur cost:
  - UI defaults to provider `google` and model `gemini-1.5-flash` for new conversations
  - Server default provider is `lmstudio` (safe), but UI pushes `google` unless user changes it

- Not yet implemented but referenced in docs/UI:
  - Share UI (backend has public read route, but no token generate/revoke routes or client controls)
  - Export/Import actions (icons exist in UI, actions not wired)
  - Streaming responses (non-streaming calls only)

---

## Risks and Gaps (Relevant to Zero-Cost + Ads)

- Cost risk: Defaulting to Gemini on the client can cause paid usage if API key is present
- No “Free-only mode”: Users can select paid providers/models accidentally
- No caching of AI responses: repeated prompts waste compute (even locally)
- Missing share/export UX: reduces virality and SEO surface (ad-driven growth)
- No content moderation: risk for ad policy violations (hate/sexual content)
- No analytics baseline: hard to iterate on ad placements without basic, privacy-friendly metrics
- No streaming: worse UX and higher timeouts under free infra

---

## Plan Overview (Phased, Zero-Cost Focus)

### Phase 1 — Free-Mode Foundation and Core UX (High Priority)

1) Enforce Zero-Cost Defaults and Controls
- Change client defaults in `client/src/pages/Conversation.js`:
  - `selectedProvider` default: `openrouter` or `lmstudio`
  - If `openrouter`, default `selectedModel` to a free model (e.g., `openai/gpt-oss-20b:free`)
- Add a global FREE_MODE switch
  - Env: `FREE_MODE=true` (server) and `REACT_APP_FREE_MODE=true` (client)
  - When enabled:
    - Server: `aiService.getAvailableProviders()` returns only `lmstudio` and `openrouter`
    - Server: `getModels('openrouter')` filtered to `:free` models only
    - Client: hide paid providers/models in provider/model selectors
- Acceptance criteria:
  - Fresh clone with no keys: user can create/branch conversations via LM Studio OR OpenRouter free models
  - No paid network calls are possible while FREE_MODE is on

2) Response Caching (Compute Frugality)
- Add `server/services/cache.js` with in-memory LRU (size- and TTL-bounded)
- Key by hash of `{provider, model, prompt, contextHash}`; store normalized response
- Integrate in `aiService.generateResponse()`:
  - Check cache before calling provider; write-through after success
- Acceptance criteria:
  - Repeating identical prompt+context returns cached result (observed via logs) within TTL
  - Cache can be disabled with `CACHE_DISABLED=true`

3) Export/Import for Conversations (Viral Utility, Free)
- Backend routes:
  - `GET /api/conversations/:id/export` → JSON payload of the conversation document
  - `POST /api/conversations/import` → creates a new conversation from uploaded JSON
- Client:
  - Wire `Download` button in `Conversation.js` to export endpoint
  - Add Import button in `Dashboard` to upload JSON and navigate to the created conversation
- Acceptance criteria:
  - One-click export downloads JSON; Import creates identical tree structure

4) Sharing UI (SEO Surface for Ad Growth)
- Backend routes:
  - `POST /api/conversations/:id/share` → creates `shareToken`, sets `isPublic=true`
  - `DELETE /api/conversations/:id/share` → revokes token and sets `isPublic=false`
- Client:
  - Wire `Share` button in `Conversation.js` to toggle public status, generate/copy share URL
  - Share URL uses existing `GET /api/conversations/shared/:token`
- Acceptance criteria:
  - Users can make a conversation public, copy the link, and revoke it

5) Initial Ad Integration (Non-Intrusive, Config-Driven, Free to Run)
- Create `client/src/components/AdSlot.js` that renders placeholders and, when enabled, ad code
- Placements (initial):
  - Conversation page sidebar (top and bottom)
  - Below input area (responsive horizontal)
  - Dashboard grid (between rows)
- Wire via simple config:
  - Env: `REACT_APP_ADS_ENABLED=false` by default
  - When enabled, load AdSense script in `public/index.html` and mount `<AdSlot>`
- Acceptance criteria:
  - App runs fine with ads disabled (default)
  - When enabled and publisher ID is provided, units render without layout shifts

6) Content Safety (Ad Policy Baseline)
- Add optional server-side profanity filter using `bad-words` or similar MIT-licensed list
  - Filter both prompts and responses before rendering to public pages
  - Provide a per-conversation "Safe Mode" toggle (default on for shared pages)
- Acceptance criteria:
  - Shared pages are safe-filtered; private views can show full content

7) Better Empty/Offline States (LM Studio-first UX)
- Detect LM Studio availability (`http://127.0.0.1:1234`) in settings
- Show an inline guide with steps to install/run LM Studio and load a model
- Acceptance criteria:
  - Helpful instructions appear when LM Studio isn’t reachable

### Phase 1B — Bring-Your-Own-Keys (BYOK) [Optional, Opt-in]

Goal: Allow users to supply their own API keys for paid providers without changing the default zero-cost experience.

1) Architecture & Modes
- Ephemeral (no storage):
  - Client includes `apiKeyOverride` per request to `/api/ai/generate`.
  - Server uses the key only for that call; never persists it.
- Encrypted storage (opt-in):
  - Add `apiKeys` on `User` with per-provider encrypted secrets.
  - Encryption: AES-256-GCM via Node `crypto`, using `KEY_ENCRYPTION_KEY` (KEK) from env.
  - Stored shape per provider: `{ provider, ciphertext, iv, authTag, updatedAt, kekVersion }`.
  - `.toJSON()` must never include keys; expose only boolean status via a summary route.

2) Server Changes
- `aiService`:
  - Accept `apiKeyOverride` and `useUserKey` flags; selection priority: override > stored user key > process.env key.
  - OpenAI-compatible: set `Authorization: Bearer <key>`.
  - Google AI: append `?key=<key>` to URL (not header).
  - Ensure logs mask headers/URLs; never log keys.
- Routes (extend `auth.js` or add `keys.js`):
  - `GET /api/auth/api-keys/summary` → returns configured status per provider (booleans only).
  - `PATCH /api/auth/api-keys` → upsert/delete encrypted keys; body: `{ openai?, google?, groq?, openrouter? }` where string sets, `null` deletes.
  - `DELETE /api/auth/api-keys/:provider` → delete that key.
  - `POST /api/ai/test-connection` → accept `apiKeyOverride` to validate a provided key.
- Free-mode guard:
  - `ALLOW_BYOK_IN_FREE_MODE` (default `false`). If `FREE_MODE=true` and not allowed, ignore BYOK inputs and stored keys.

3) Client Changes
- Settings UI (new page/section):
  - Masked inputs per provider with Save and Test buttons.
  - Fetch status from `/api/auth/api-keys/summary` (no secrets returned).
- Conversation settings:
  - Toggle "Use my key" for this conversation; persist flag in conversation `settings`.
  - Advanced: one-off `apiKeyOverride` for a single call.
- Error UX:
  - Clear messages when a chosen provider requires a key but none is available.

4) Security & Privacy
- Keys never returned once stored; only the user submits them.
- Exclude keys from logs and sanitized errors.
- Rate-limit key routes; require JWT; optional re-auth for updates.
- Lightweight audit log for key set/clear events (no key material stored).

5) Acceptance Criteria
- With `FREE_MODE=true` and `ALLOW_BYOK_IN_FREE_MODE=false`, BYOK is unavailable even if keys exist.
- With `ALLOW_BYOK_IN_FREE_MODE=true`, BYOK works only when user explicitly enables it.
- Ephemeral override works without persisting; stored keys are encrypted and usable.
- Summary endpoint accurately reflects which providers are configured.

### Phase 2 — Performance, Streaming, and Growth

8) Streaming Responses (SSE)
- Server: add SSE endpoint `POST /api/ai/generate/stream`
  - For OpenAI-compatible providers (LM Studio, OpenRouter), stream deltas
- Client: stream into the active node (token-by-token) with a cancellable request
- Acceptance criteria:
  - Long generations remain responsive; cancellations work; no paid providers required

9) Basic, Privacy-Friendly Analytics (Free)
- Use Cloudflare Web Analytics (free) or host-free solution
- Events to track: page views (shared pages), ad-slot visibility, conversation create/branch
- Acceptance criteria:
  - Aggregate metrics available without storing PII; no cookie banner required

10) SEO for Shared Pages
- Add server-rendered HTML for `GET /share/:token` with basic Open Graph tags (title/description)
- Static snapshot of conversation title and nodeCount; content is fetched client-side for interactivity
- Acceptance criteria:
  - Links unfurl on social platforms; pages indexable without exposing private data

11) Provider and Model Discovery (Free-Only Aware)
- OpenRouter free model list can change; periodically refresh (server boot or daily)
- Cache list; expose via `/api/ai/providers` to the client
- Acceptance criteria:
  - Model list stays accurate; only free options shown in FREE_MODE

### Phase 3 — Developer Experience, Quality, and Optional Enhancements

12) API Validation and Error Hygiene
- Add `zod` or `express-validator` to validate request bodies/params for all routes
- Normalize error payloads for client display; keep dev traces gated by `NODE_ENV`

13) Linting, Formatting, and Tests
- ESLint + Prettier configs for server and client
- Add Jest tests for:
  - `Conversation` model helpers (`getTreeStructure`, `deleteNode`)
  - `aiService` caching and provider selection
  - Route guards (auth + free-mode restrictions)

14) CI for Public Repos (Free)
- GitHub Actions: Node matrix (16/18/20), lint + test + build
- Cache npm; fail fast on type/lint/test errors

15) Local Dev Convenience
- Add `docker-compose.yml` for MongoDB and a seeded DB
- Optional: switch CRA to Vite for faster dev builds (no behavior change)

---

## File-Level Change Map (for Future Implementers)

- Server
  - `server/services/aiService.js`
    - Respect `process.env.FREE_MODE` to filter providers/models and to short-circuit non-free calls
    - Add cache integration (check-before-call; write-after)
    - Add streaming variant (OpenAI-compatible chunk parsing)
  - `server/routes/ai.js`
    - Add `POST /generate/stream` (SSE)
    - Make `/providers` honor FREE_MODE for lists
  - `server/routes/conversations.js`
    - Add `GET /:id/export`, `POST /import`
    - Add `POST /:id/share` and `DELETE /:id/share`
  - `server/index.js`
    - Tune rate limits per-route (stricter on `/ai`) and add CORS whitelist from env
  - New: `server/services/cache.js`
    - LRU cache (size ~500 entries, TTL 24h configurable); export get/set helpers
  - New: `server/middleware/contentSafety.js`
    - Simple sanitize step for public/shared responses

- Client
  - `client/src/pages/Conversation.js`
    - Default to free providers/models when FREE_MODE
    - Wire Export/Share buttons to real endpoints
  - `client/src/components/ConversationTree.js`
    - Handle streaming updates and cancellation UI
  - New: `client/src/components/AdSlot.js`
    - Responsive ad container; renders placeholder when ads disabled
  - `public/index.html`
    - Conditionally load AdSense script via env gate (document setup steps)

---

## Monetization Plan (Ad-Only, Privacy-Conscious)

- Network: Google AdSense (or similar) — free to integrate; revenue-share only
- Placement principles:
  - Above-the-fold sidebar unit on `Conversation` page
  - Inline responsive unit under the input box
  - One unit per N nodes scrolled (lazy, frequency-capped)
- Technical notes:
  - Do not render ads on private conversations when user is in edit-heavy sessions (reduce annoyance)
  - Avoid CLS by reserving space with CSS and loading ads lazily
  - Provide an `AdPlaceholder` fallback for ad blockers (non-tracking message)
- Compliance:
  - Add simple profanity filter for public pages
  - Add Privacy Policy and Terms links in footer; link to ad policy

---

## Analytics Plan (Free)

- Cloudflare Web Analytics (no cookies, free)
- Track only aggregate events needed to optimize UX and ad placement
- Expose a simple `/about/analytics` page documenting what’s collected

---

## Acceptance Checklist (Phase 1)

- Free mode prevents any paid provider/model usage
- Create/branch works with LM Studio OR OpenRouter free models out of the box
- Export/Import works end-to-end via UI
- Share token creation, revoke, and public fetch work via UI
- Ads can be toggled on/off; when on, units render without layout shifts
- Basic content safety applied to shared pages

---

## Rollout & Effort Estimate

- Phase 1: 2–4 days
  - Free mode, caching, export/import, share UI, initial ad slots, content safety
- Phase 2: 3–5 days
  - SSE streaming, analytics, SEO share pages, provider discovery
- Phase 3: 2–4 days
  - Validation, lint/tests, CI, local dev enhancements

Notes: These are calendar-day estimates for a single contributor and assume no paid infra.

---

## Appendix

### Suggested Environment Flags

```env
# Server
FREE_MODE=true
CACHE_DISABLED=false
CACHE_MAX_ITEMS=500
CACHE_TTL_MS=86400000
ALLOW_BYOK_IN_FREE_MODE=false
KEY_ENCRYPTION_KEY=change_me_strong_random_32_bytes

# Client
REACT_APP_FREE_MODE=true
REACT_APP_ADS_ENABLED=false
REACT_APP_ADS_PUBLISHER_ID=ca-pub-xxxxxxxxxxxxxxxx
```

### Minimal SSE Contract (Sketch)

```http
POST /api/ai/generate/stream
Content-Type: application/json

{ "prompt": "...", "provider": "openrouter", "model": "openai/gpt-oss-20b:free", "context": [] }

// Server responds with text/event-stream chunks:
event: token
data: { "delta": "Hel" }

event: token
data: { "delta": "lo" }

event: done
data: { "id": "...", "model": "...", "usage": { ... } }
```

### Content Safety (Public Pages)

- Filter list: MIT-licensed or similar (e.g., `bad-words`), extendable via config
- Apply on public/shared responses only; keep originals in DB unchanged

### Ad Component Sketch (Client)

```jsx
// client/src/components/AdSlot.js
export default function AdSlot({ slot, style }) {
  const enabled = process.env.REACT_APP_ADS_ENABLED === 'true';
  if (!enabled) return <div style={{ minHeight: 90, ...style }} />; // reserved space
  // AdSense markup would be injected here once publisher ID is configured
  return <div className="ad-slot" data-ad-slot={slot} style={style} />;
}
```

---

This plan keeps Vynix fully usable at zero cost by default, adds ad-based monetization when desired, and improves UX, performance, and maintainability in iterative, low-risk steps.


