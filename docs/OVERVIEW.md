## Vynix — What This App Is and How It Works

Vynix is a full‑stack AI conversation platform that lets users explore ideas as branching conversation trees. Each AI response can be elaborated on by selecting text and spawning new branches, creating a navigable 2D graph of ideas. The project includes a React frontend, a Node.js/Express backend, and a MongoDB database, with pluggable AI providers (LM Studio, OpenAI, Google AI, Groq, OpenRouter).

### Why Vynix?
- **Branching exploration**: Move beyond linear chats; branch on any detail to dig deeper.
- **Visual clarity**: Conversations render as an interactive tree using React Flow.
- **Provider flexibility**: Use local models via LM Studio, or external APIs (OpenAI/Gemini/Groq/OpenRouter).
- **Modern DX**: Type‑safe schemas, clean endpoints, Tailwind UI, and composable React components.

---

## High‑Level Architecture

- **Client (`client/`)**: React 18 app (Create React App) with Tailwind CSS, Framer Motion, React Router, React Flow, Zustand utilities. Handles auth, UI, and conversation tree visualization.
- **Server (`server/`)**: Express API with JWT auth, rate limiting, Helmet, and CORS. Exposes auth, conversation, and AI routes.
- **Database**: MongoDB via Mongoose. Stores users and conversations (including embedded node data per conversation).
- **AI Service**: Central adapter in `server/services/aiService.js` to call different model providers with a consistent contract.

Data flow overview:
1. User logs in/registers → receives JWT → stored in localStorage.
2. Client calls conversation endpoints with `Authorization: Bearer <token>`.
3. On conversation creation/branching, server calls `aiService.generateResponse(...)` for the selected provider/model.
4. Response is persisted to MongoDB as a node; client re-renders the tree.

---

## Key Features

- **Conversation Trees**: 2D, interactive tree of conversation nodes with pan/zoom, minimap, and controls.
- **Text‑Selection Branching**: Select text inside an AI response to create a focused “elaboration” branch.
- **Provider/Model Selection**: Choose provider/model per conversation; sensible defaults applied in UI and server.
- **Auth & Security**: JWT, password hashing (bcrypt), rate limiting, Helmet, CORS.
- **Theming**: Light/Dark/Auto with system preference support.

---

## Backend Details

### Entry Point
- `server/index.js`: Sets up Express, security middleware, CORS, rate limiting, body parsers, Mongo connection, and mounts routers:
  - `/api/auth` → `server/routes/auth.js`
  - `/api/conversations` → `server/routes/conversations.js`
  - `/api/ai` → `server/routes/ai.js`

### Models
- `server/models/User.js`
  - Fields: `email`, `password` (hashed), `name`, `avatar`, `preferences` (theme, defaultApiProvider), timestamps.
  - Hooks: pre‑save password hash; methods: `comparePassword`, `toJSON` (removes password).

- `server/models/Conversation.js`
  - Conversation fields: `title`, `description`, `userId`, `rootNodeId`, `nodes` (embedded), `settings` (layout, autoLayout, showFullResponses), `tags`, `isPublic`, `shareToken`, `lastModified`, `__v` for optimistic locking.
  - Node fields (embedded): `id`, `title`, `prompt`, `response`, `selectedText`, `parentId`, `children[]`, `position`, `metadata` (provider, model, tokens, responseTime), `createdAt`.
  - Methods:
    - `getNodeById(id)`
    - `addChildNode(parentId, newNode)` (updates parent children, pushes node, updates `lastModified`)
    - `deleteNode(nodeId)` (removes node and descendants, updates parent refs)
    - `getTreeStructure()` (returns a nested tree from the flat list).
  - Indexes: `{ userId, createdAt }`, `shareToken`, `tags`. Virtual: `nodeCount`.

### Routes

- `server/routes/auth.js`
  - `POST /api/auth/test-login`: Dev helper to create/login a test user and return a JWT.
  - `POST /api/auth/register`: Creates user, returns `{ token, user }`.
  - `POST /api/auth/login`: Authenticates and returns `{ token, user }`.
  - `GET /api/auth/me`: Returns current user (JWT required).
  - `PATCH /api/auth/preferences`: Update user preferences.
  - `PATCH /api/auth/password`: Change password (requires current password).

- `server/routes/conversations.js` (JWT required except shared route)
  - `GET /api/conversations`: List user’s conversations (summary fields, sorted by `lastModified`).
  - `GET /api/conversations/:id`: Fetch full conversation with `treeStructure`.
  - `POST /api/conversations`: Create a conversation.
    - Body: `{ title, prompt, provider='lmstudio', model }`.
    - Calls AI provider for initial response; creates root node and conversation.
  - `POST /api/conversations/:id/branches`: Add a branch (child node) to a parent node.
    - Body: `{ parentId, selectedText?, prompt, provider?, model? }`.
    - Enhances prompt if `selectedText` is present; passes context (parent prompt/response) to AI.
    - Uses optimistic save with retry on `VersionError`.
  - `PATCH /api/conversations/:id/nodes/:nodeId/title`: Rename node title.
  - `DELETE /api/conversations/:id/nodes/:nodeId`: Delete a node and all descendants (not the root).
  - `PATCH /api/conversations/:id/settings`: Update conversation settings.
  - `DELETE /api/conversations/:id`: Delete conversation.
  - `GET /api/conversations/shared/:token`: Fetch public, shared conversation by token.

- `server/routes/ai.js`
  - `POST /api/ai/generate`: Generate a response for a prompt with `{ prompt, provider, model, context? }`.
  - `POST /api/ai/test-connection`: Verify provider connectivity.
  - `GET /api/ai/providers`: List providers and available models.
  - `GET /api/ai/providers/:provider`: Provider config (safe subset).

### Middleware
- `server/middleware/auth.js`: Extracts/validates JWT from `Authorization` header and sets `req.user`.
- Global security: Helmet, rate limiting (100 req/15 min/IP), CORS with `CLIENT_URL`.

### AI Service
- `server/services/aiService.js` abstracts provider calls:
  - OpenAI‑compatible (`lmstudio`, `openai`, `groq`, `openrouter`) via `/v1/chat/completions` shape.
  - Google AI (Gemini) via `models/{model}:generateContent`.
  - Returns a normalized payload: `{ id, content, tokens, responseTime, provider, model }`.
  - Error handling includes LM Studio diagnostics; generous request timeouts.
  - Utility: list providers/models, test connection.

Env configuration (see `server/env.example`): `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL`, and optional `OPENAI_API_KEY`, `GOOGLE_AI_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`.

---

## Frontend Details

### App Shell & Routing
- `client/src/App.js`: Wraps app in `AuthProvider` and `ThemeProvider`. Routes:
  - `/login`, `/register` (public; redirect to `/dashboard` if logged in)
  - `/dashboard` (protected)
  - `/conversation/:id` and `/conversation/new` (protected)
  - Default redirects based on auth state.

### Authentication
- `client/src/hooks/useAuth.js`: Manages `user` and `loading`, persists `{ token, user }` in localStorage.
  - On load, validates token via `/api/auth/me`.
  - Methods: `login`, `register`, `logout`, `updateUser`, `setUserFromToken` (used by test login button).
- `client/src/services/api.js`: Axios instance with base URL and interceptors.
  - Request: attaches `Authorization` header from localStorage token.
  - Response: on 401, clears storage and redirects to `/login`.

### Theming
- `client/src/contexts/ThemeContext.js`: Light/Dark/Auto; applies `dark` class to `<html>`; saves preference.

### Screens & Components
- `Dashboard` (`pages/Dashboard.js`)
  - Fetches `/api/conversations` and renders grid/list with search, recent filter, and delete. Quick link to create new.

- `Conversation` (`pages/Conversation.js`)
  - Provider & model selection sidebar; prompt input at bottom.
  - “New conversation” creates root via `POST /api/conversations`.
  - Branching: selects a node and calls `POST /api/conversations/:id/branches`.
  - UI defaults: starts with `selectedProvider = 'google'` and `selectedModel = 'gemini-1.5-flash'` (server defaults to `lmstudio` if none provided).

- `ConversationTree` (`components/ConversationTree.js`)
  - React Flow graph; custom `conversationNode` with actions: expand, copy, delete, edit title.
  - Text selection inside a node reveals a branch composer; creates a focused elaboration branch.
  - Layout: deterministic hierarchical algorithm (horizontal/vertical) with per‑column compaction; centers/zooms to new/focused nodes.
  - Expanded node modal provides full markdown rendering of prompt/response and actions.

- `Layout`, `LoadingSpinner`, utility `cn()`.

### Styling & UX
- Tailwind CSS with extended theme in `tailwind.config.js` and component utilities in `index.css`.
- Framer Motion for subtle transitions.
- `react-hot-toast` for feedback.

---

## Data Model (At a Glance)

Conversation document example (simplified):

```json
{
  "_id": "...",
  "title": "Root topic...",
  "userId": "...",
  "rootNodeId": "uuid",
  "nodes": [
    {
      "id": "uuid",
      "prompt": "Initial prompt",
      "response": "AI response...",
      "parentId": null,
      "children": ["child-uuid"],
      "metadata": { "apiProvider": "google", "model": "gemini-1.5-flash", "responseTime": 1234 }
    }
  ],
  "settings": { "layout": "hierarchical", "autoLayout": true },
  "lastModified": "2024-01-01T00:00:00.000Z"
}
```

`getTreeStructure()` produces nested children suitable for direct visualization.

---

## Security and Operational Concerns

- JWT auth for all protected endpoints; passwords hashed with bcrypt.
- Helmet + rate limiting; CORS restricted to `CLIENT_URL`.
- Server errors return sanitized messages unless `NODE_ENV=development` (see error handler in `server/index.js`).

---

## Provider Defaults & Notes

- Server default provider is `lmstudio` (local) unless specified by the client.
- The `Conversation` UI starts with provider `google` and model `gemini-1.5-flash` for a good out‑of‑the‑box experience; you can change this in the sidebar.
- LM Studio tips (if using local): run on `http://127.0.0.1:1234` and load a compatible chat model (e.g., `openai/gpt-oss-20b`).

---

## Limitations & Roadmap Pointers

- Real‑time collaboration is referenced in docs but no websocket layer exists yet in code.
- Sharing via `shareToken` is present on the model with a public fetch endpoint; UI for generating tokens or toggling public visibility is not implemented.
- No server‑side streaming of tokens; requests are non‑streaming with higher timeouts.

---

## Extending the System

- Add a new AI provider:
  1. Extend `providers` in `server/services/aiService.js` with `baseURL`, `endpoint`, and headers.
  2. Update `generateResponse` switch to call a new adapter if not OpenAI‑compatible.
  3. Add model list to `getModels()`.
  4. Expose in UI via `apiProviders` and `models` in `pages/Conversation.js`.

- Add conversation features:
  - Implement sharing UI (create/manage `shareToken`, toggle `isPublic`).
  - Add export/import endpoints (e.g., JSON of conversation trees).
  - Add server‑sent events or websockets for real‑time multi‑client sync.

---

## Setup (Short)

1. `npm run install-all`
2. Copy `server/env.example` → `server/.env` and fill values.
3. Start dev: `npm run dev` (client at `http://localhost:3000`, server at `http://localhost:5000`).

---

## Quick Glossary

- **Node**: One prompt/response pair in the tree.
- **Root node**: The first node of a conversation.
- **Branching**: Creating a child node from a parent node, often focused on selected text.
- **Provider**: AI backend (LM Studio/OpenAI/Google/Groq/OpenRouter) invoked for generation.


