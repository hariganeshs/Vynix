# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Development Commands

### Setup and Installation
```powershell
# Install all dependencies (root, server, and client)
npm run install-all

# Set up environment variables
cp server/env.example server/.env
# Edit server/.env with your configuration
```

### Development
```powershell
# Start both client and server in development mode
npm run dev
# Client runs on: http://localhost:3000
# Server runs on: http://localhost:5000

# Start only the server
npm run server

# Start only the client  
npm run client

# Build client for production
npm run build

# Start production server
npm start
```

### Testing and Development Utilities
```powershell
# Test client components
cd client && npm test

# Run client in development mode with hot reload
cd client && npm start

# Run server with nodemon (auto-restart on changes)
cd server && npm run dev

# Test AI provider connections
curl -X POST http://localhost:5000/api/ai/test-connection -H "Content-Type: application/json" -d "{\"provider\":\"lmstudio\"}"
```

### Database Operations
```powershell
# Start local MongoDB (if using local instance)
mongod

# Access MongoDB shell
mongosh

# Connect to Vynix database
mongosh mongodb://localhost:27017/vynix
```

## Architecture Overview

### High-Level Structure
Vynix is a full-stack AI conversation platform with a unique branching conversation tree system:

- **Client**: React 18 SPA with React Flow for tree visualization
- **Server**: Node.js/Express REST API with JWT authentication
- **Database**: MongoDB with embedded conversation nodes
- **AI Integration**: Multi-provider service supporting LM Studio, OpenAI, Google AI, Groq, and OpenRouter

### Key Architectural Patterns

**Conversation Tree Model**: Each conversation contains an array of embedded nodes with parent-child relationships, rendered as an interactive 2D tree using React Flow.

**Multi-Provider AI Service**: Central `aiService.js` abstracts different AI providers behind a consistent interface, with intelligent fallbacks and caching.

**Text Selection Branching**: Core feature allowing users to select text from any AI response and create elaboration branches, creating non-linear conversation exploration.

**Free-Mode Operation**: Zero-cost defaults using LM Studio (local) and OpenRouter free models, with optional BYOK for paid providers.

### Frontend Architecture (`client/`)

**State Management**:
- `useAuth` hook for authentication state and JWT management
- `ThemeContext` for dark/light mode with system preference detection
- Zustand for complex component state (conversation trees)

**Key Components**:
- `ConversationTree.js`: React Flow implementation with custom node types and hierarchical layout
- `Conversation.js`: Main conversation interface with provider/model selection
- `Dashboard.js`: Conversation management with grid view and search

**Services**:
- `api.js`: Axios client with automatic token attachment and 401 handling
- Conversation export/import functionality

### Backend Architecture (`server/`)

**API Structure**:
- `/api/auth/*`: User authentication and preferences
- `/api/conversations/*`: CRUD operations, branching, sharing
- `/api/ai/*`: AI generation, provider testing, model listing

**Data Models**:
- `User`: Authentication, preferences, optional encrypted API keys
- `Conversation`: Title, settings, embedded nodes array with tree structure helpers

**Key Services**:
- `aiService.js`: Multi-provider AI integration with caching and error handling
- `cache.js`: LRU cache for AI responses to reduce compute costs
- `contentSafety.js`: Profanity filtering for public shared conversations

**Security**:
- JWT authentication with bcrypt password hashing
- Rate limiting (100 requests/15 minutes per IP)
- Helmet security headers and CORS configuration
- Optional API key encryption for BYOK functionality

## Project-Specific Development Guidelines

### Free Mode Configuration
The application defaults to zero-cost operation:
- Set `FREE_MODE=true` in server environment to restrict to free providers only
- LM Studio (local) and OpenRouter free models are the default options
- Client respects `REACT_APP_FREE_MODE` to hide paid provider options

### Working with Conversation Trees
**Node Structure**: Each node has `id`, `prompt`, `response`, `selectedText` (for branches), `parentId`, `children[]`, and `metadata`.

**Tree Operations**: Use `Conversation.addChildNode()`, `deleteNode()`, and `getTreeStructure()` methods rather than manipulating the nodes array directly.

**Layout Algorithm**: ConversationTree uses a deterministic hierarchical layout with column-based positioning and automatic centering.

### AI Provider Integration
**Adding New Providers**: 
1. Extend the `providers` configuration in `aiService.js`
2. Add provider-specific request formatting if not OpenAI-compatible
3. Update `getModels()` to return available models
4. Add provider to frontend selection UI

**Testing Providers**:
```javascript
// Test provider connectivity
POST /api/ai/test-connection
{ "provider": "lmstudio", "apiKeyOverride": "optional-key" }
```

### Content Safety and Sharing
Public shared conversations automatically apply profanity filtering via the `contentSafety` middleware. Private conversations remain unfiltered.

**Sharing Workflow**:
1. `POST /api/conversations/:id/share` creates a public `shareToken`
2. Public access via `GET /api/conversations/shared/:token` 
3. `DELETE /api/conversations/:id/share` revokes public access

### Environment Configuration
Critical environment variables for development:

**Server** (`server/.env`):
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/vynix
JWT_SECRET=your-super-secret-jwt-key
CLIENT_URL=http://localhost:3000
FREE_MODE=true
CACHE_DISABLED=false
CONTENT_SAFETY_ENABLED=true

# Optional AI API Keys
OPENAI_API_KEY=your-key
GOOGLE_AI_KEY=your-key
GROQ_API_KEY=your-key
```

**Client** (`.env.local` in client directory):
```env
REACT_APP_FREE_MODE=true
REACT_APP_ADS_ENABLED=false
```

### LM Studio Integration
For local AI development, LM Studio should run on `http://127.0.0.1:1234` with a chat-compatible model loaded. The application includes an integrated setup guide component (`LMStudioGuide.js`) for users.

### Database Considerations
**Optimistic Locking**: Conversation updates use MongoDB's `__v` version field to prevent concurrent modification conflicts.

**Indexing**: Conversations are indexed on `{ userId, createdAt }` and `shareToken` for performance.

**Node Relationships**: Parent-child relationships are maintained both ways (parent.children[] array and child.parentId) for efficient tree traversal.

### Caching Strategy
AI responses are cached by hash of `{provider, model, prompt, contextHash}` with configurable TTL. Cache keys include conversation context to ensure branch-specific responses.

### Testing Conversation Features
**Create Test Conversation**:
```bash
curl -X POST http://localhost:5000/api/conversations \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test", "prompt": "Hello", "provider": "lmstudio"}'
```

**Create Branch**:
```bash
curl -X POST http://localhost:5000/api/conversations/CONVERSATION_ID/branches \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"parentId": "NODE_ID", "prompt": "Elaborate on this", "selectedText": "specific text"}'
```

## Quick Development Tips

- Use the test login button in development for quick authentication
- The conversation tree auto-layouts and centers on new nodes
- Text selection in responses triggers the branch creation UI
- Export/import functionality preserves complete tree structure
- Response caching significantly improves performance with repeated prompts
- Content safety only applies to public shared conversations
- Free mode prevents accidental usage of paid AI APIs
