# Vynix - AI-Powered Conversation Platform

Vynix is a full-stack AI-powered chat platform that allows users to have conversations with AI models, featuring advanced branching and elaboration capabilities visualized in a 2D tree structure.

## 🌟 Features

- **AI Integration**: Support for multiple AI providers (LM Studio, OpenAI, Google AI, Groq)
- **Tree Visualization**: Interactive 2D mind-map style conversation trees
- **Text Selection Branching**: Select any text in AI responses to create new branches
- **Real-time Collaboration**: Live conversation tree updates
- **Modern UI**: Beautiful, responsive interface with dark/light mode
- **Authentication**: Secure user registration and login
- **Mobile Support**: Fully responsive design with touch controls
- **PWA Ready**: Progressive Web App capabilities

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud)
- LM Studio (optional, for local AI)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd vynix
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Set up environment variables**
   ```bash
   # Copy server environment example
   cp server/env.example server/.env
   
   # Edit server/.env with your configuration
   ```

4. **Start MongoDB**
   ```bash
   # If using local MongoDB
   mongod
   ```

5. **Start the development servers**
   ```bash
   npm run dev
   ```

The application will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

## 🔧 Configuration

### Server Environment Variables

Create a `.env` file in the `server` directory:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/vynix
JWT_SECRET=your-super-secret-jwt-key
CLIENT_URL=http://localhost:3000

# Optional AI API Keys
OPENAI_API_KEY=your-openai-api-key
GOOGLE_AI_KEY=your-google-ai-key
GROQ_API_KEY=your-groq-api-key
```

### LM Studio Setup

1. Download and install [LM Studio](https://lmstudio.ai/)
2. Load a model (e.g., GPT-3.5-turbo compatible)
3. Start the local server on port 1234
4. Vynix will automatically connect to `http://127.0.0.1:1234`

## 🏗️ Architecture

### Backend (Node.js/Express)

- **Authentication**: JWT-based auth with bcrypt password hashing
- **Database**: MongoDB with Mongoose ODM
- **AI Integration**: Multi-provider AI service with fallback support
- **API**: RESTful API with proper error handling

### Frontend (React 18)

- **UI Framework**: React with modern hooks and context
- **Styling**: Tailwind CSS with custom design system
- **Visualization**: React Flow for tree rendering
- **Animations**: Framer Motion for smooth transitions
- **State Management**: React Context + custom hooks

### Database Schema

- **Users**: Authentication and preferences
- **Conversations**: Tree structure with nodes and relationships
- **Nodes**: Individual AI interactions with metadata

## 🎯 Core Features

### 1. AI Conversation Trees

- Start conversations with any AI provider
- Visualize conversations as interactive 2D trees
- Automatic layout and spacing algorithms
- Zoom, pan, and navigate large conversation trees

### 2. Text Selection Branching

- Select any text in AI responses
- Click the "+" button to create new branches
- Infinite recursive elaboration
- Context-aware branching with parent-child relationships

### 3. Multi-Provider AI Support

- **LM Studio**: Local AI models (default)
- **OpenAI**: GPT-3.5/4 models
- **Google AI**: Gemini models
- **Groq**: Fast inference models

### 4. Modern UI/UX

- Dark/light mode with system preference detection
- Responsive design for all devices
- Smooth animations and transitions
- Accessibility features (ARIA labels, keyboard navigation)

## 📱 Mobile Support

- Touch-optimized controls
- Pinch to zoom on conversation trees
- Swipe gestures for navigation
- Responsive layout for all screen sizes
- PWA capabilities for offline access

## 🔒 Security

- JWT authentication with secure token storage
- Password hashing with bcrypt
- Rate limiting on API endpoints
- CORS configuration
- Input validation and sanitization

## 🚀 Deployment

### Backend Deployment

1. **Heroku/Render**
   ```bash
   # Set environment variables
   # Deploy using Git integration
   ```

2. **Vercel**
   ```bash
   # Deploy serverless functions
   # Configure environment variables
   ```

### Frontend Deployment

1. **Vercel**
   ```bash
   npm run build
   # Deploy to Vercel
   ```

2. **Netlify**
   ```bash
   npm run build
   # Deploy to Netlify
   ```

## 🛠️ Development

### Available Scripts

```bash
# Install all dependencies
npm run install-all

# Start development servers
npm run dev

# Start only backend
npm run server

# Start only frontend
npm run client

# Build for production
npm run build

# Start production server
npm start
```

### Documentation

- Detailed system overview: see `docs/OVERVIEW.md`.

### Project Structure

```
vynix/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── contexts/      # React contexts
│   │   ├── services/      # API services
│   │   └── utils/         # Utility functions
│   └── public/            # Static assets
├── server/                # Node.js backend
│   ├── models/           # Database models
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   ├── middleware/       # Express middleware
│   └── index.js          # Server entry point
└── package.json          # Root package.json
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the code examples

## 🔮 Roadmap

- [ ] Real-time collaboration
- [ ] Advanced tree layouts
- [ ] Export/import functionality
- [ ] Plugin system
- [ ] Advanced AI models
- [ ] Voice input/output
- [ ] Multi-language support

---

Built with ❤️ using React, Node.js, and modern web technologies.
