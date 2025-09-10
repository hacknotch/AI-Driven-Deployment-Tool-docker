# 🚀 Spark Space - AI-Driven Deployment Tool

A full-stack application that automates Docker deployment using AI-powered analysis and intelligent file generation.

## 📁 Project Structure

```
spark-space/
├── frontend/                 # React frontend application
│   ├── components/          # Reusable UI components
│   ├── pages/              # Route components
│   ├── hooks/              # Custom React hooks
│   ├── services/           # API service functions
│   ├── lib/                # Utility functions
│   ├── integrations/       # Third-party integrations
│   └── package.json        # Frontend dependencies
├── backend/                 # Express.js backend API
│   ├── routes/             # API route handlers
│   ├── lib/                # Business logic and services
│   ├── migrations/         # Database migrations
│   ├── types/              # TypeScript type definitions
│   └── package.json        # Backend dependencies
├── shared/                  # Shared types and utilities
│   ├── types.ts            # Common TypeScript types
│   ├── utils.ts            # Shared utility functions
│   ├── api.ts              # API interface definitions
│   └── package.json        # Shared dependencies
├── docs/                    # Documentation
│   ├── README.md           # Main documentation
│   ├── API.md              # API documentation
│   └── DEPLOYMENT.md       # Deployment guide
├── scripts/                 # Deployment and setup scripts
│   ├── deploy.ps1          # Windows deployment script
│   ├── deploy.sh           # Linux/macOS deployment script
│   └── setup-*.ps1         # Environment setup scripts
└── package.json            # Root workspace configuration
```

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **Radix UI** for components
- **React Router** for navigation
- **React Query** for data fetching

### Backend
- **Express.js** with TypeScript
- **Supabase** for database
- **OpenAI API** for AI features
- **Docker** for containerization
- **Multer** for file uploads

### Shared
- **TypeScript** for type safety
- **Zod** for validation
- **Common utilities** and types

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm 8+
- Docker (optional)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/hacknotch/AI-Driven-Deployment-Tool-docker.git
   cd AI-Driven-Deployment-Tool-docker
   ```

2. **Install dependencies:**
   ```bash
   npm run install:all
   ```

3. **Set up environment:**
   ```bash
   # Copy environment template
   cp .env.example .env.local
   
   # Edit .env.local with your API keys
   # See docs/ENVIRONMENT_SETUP.md for details
   ```

4. **Start development servers:**
   ```bash
   npm run dev
   ```

This will start:
- Frontend on http://localhost:3000
- Backend on http://localhost:3001

## 📋 Available Scripts

### Root Level
- `npm run dev` - Start both frontend and backend
- `npm run build` - Build all packages
- `npm run typecheck` - Type check all packages
- `npm run install:all` - Install dependencies for all packages
- `npm run clean` - Clean all node_modules and dist folders

### Frontend
- `npm run dev:frontend` - Start frontend dev server
- `npm run build:frontend` - Build frontend for production
- `npm run typecheck:frontend` - Type check frontend

### Backend
- `npm run dev:backend` - Start backend dev server
- `npm run build:backend` - Build backend for production
- `npm run start` - Start production backend server
- `npm run typecheck:backend` - Type check backend

## 🔧 Configuration

### Environment Variables
See `docs/ENVIRONMENT_SETUP.md` for detailed configuration instructions.

Required variables:
- `OPENAI_API_KEY` - OpenAI API key for AI features
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key

### TypeScript Configuration
Each package has its own `tsconfig.json` with appropriate settings:
- **Frontend**: React-specific configuration with path aliases
- **Backend**: Node.js configuration with shared type references
- **Shared**: Library configuration with declaration files

## 🚀 Deployment

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

### Docker
```bash
# Build and run with Docker Compose
docker-compose up --build
```

## 📚 Documentation

- [Environment Setup](docs/ENVIRONMENT_SETUP.md)
- [API Documentation](docs/API.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Contributing Guide](docs/CONTRIBUTING.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenAI for AI capabilities
- Supabase for backend services
- React and Express.js communities
- All contributors and users
