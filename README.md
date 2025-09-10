# Spark Space - AI-Powered Deployment Automation

A production-ready full-stack React application with integrated Express server, featuring AI-powered deployment automation, intelligent file generation, and modern DevOps workflows.

## 🚀 Features

- **AI-Powered Deployment**: Intelligent Dockerfile generation using OpenAI GPT-4
- **GitHub Integration**: Analyze and deploy from GitHub repositories
- **Intelligent File Analysis**: Automatically detect missing files and generate them
- **Modern UI**: Built with React 18, TypeScript, and TailwindCSS
- **Database Integration**: Supabase for user management and deployment tracking
- **Docker Support**: Full Docker containerization and deployment workflows

## 🛠️ Tech Stack

- **Frontend**: React 18 + React Router 6 + TypeScript + Vite + TailwindCSS 3
- **Backend**: Express server with TypeScript
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenAI GPT-4 integration
- **UI Components**: Radix UI + Lucide React icons
- **Package Manager**: PNPM

## 📋 Prerequisites

- Node.js 18+ 
- PNPM
- OpenAI API key
- Supabase account
- Docker (optional, for containerization features)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd spark-space
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Environment Setup

Copy the example environment file and configure your keys:

```bash
cp .env.example .env
```

Edit `.env` with your actual values:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_KEY=your_supabase_service_key_here
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# GitHub Configuration (Optional - for private repos)
GITHUB_TOKEN=your_github_token_here

# Docker Hub Configuration (Optional - for pushing images)
DOCKER_HUB_USERNAME=your_docker_hub_username
DOCKER_HUB_PASSWORD=your_docker_hub_password_or_token

# Application Configuration
NODE_ENV=development
PING_MESSAGE=ping
PORT=8080
```

### 4. Database Setup

Run the Supabase migrations:

```bash
# If using Supabase CLI
supabase db push

# Or manually run the SQL files in supabase/migrations/ in your Supabase dashboard
```

### 5. Start Development Server

```bash
pnpm dev
```

The application will be available at `http://localhost:8080`

## 🔑 API Keys Setup

### OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Add it to your `.env` file as `OPENAI_API_KEY`

### Supabase Setup
1. Create a new project at [Supabase](https://supabase.com)
2. Get your project URL and API keys from Settings > API
3. Add them to your `.env` file:
   - `SUPABASE_URL` - Your project URL
   - `SUPABASE_SERVICE_KEY` - Service role key (server-side)
   - `VITE_SUPABASE_URL` - Same as SUPABASE_URL
   - `VITE_SUPABASE_ANON_KEY` - Anon/public key (client-side)

### GitHub Token (Optional)
For private repositories or higher rate limits:
1. Go to GitHub Settings > Developer settings > Personal access tokens
2. Generate a new token with `repo` scope
3. Add it to your `.env` file as `GITHUB_TOKEN`

## 📁 Project Structure

```
├── client/                   # React SPA frontend
│   ├── pages/               # Route components
│   ├── components/          # UI components
│   ├── integrations/        # External service integrations
│   └── services/            # API service clients
├── server/                  # Express API backend
│   ├── routes/              # API route handlers
│   ├── lib/                 # Utility libraries
│   └── migrations/          # Database migrations
├── shared/                  # Shared types and interfaces
├── supabase/                # Database configuration
└── netlify/                 # Deployment configuration
```

## 🚀 Deployment

### Netlify (Recommended)
1. Connect your GitHub repository to Netlify
2. Set environment variables in Netlify dashboard
3. Deploy automatically on push

### Manual Build
```bash
pnpm build
pnpm start
```

## 🔧 Development Commands

```bash
pnpm dev        # Start development server
pnpm build      # Production build
pnpm start      # Start production server
pnpm typecheck  # TypeScript validation
pnpm test       # Run tests
```

## 🛡️ Security

- All sensitive keys are stored in environment variables
- Never commit `.env` files to version control
- Use service role keys only on the server-side
- Client-side keys should have minimal permissions

## 📚 Documentation

- [Deployment Setup](DEPLOYMENT_SETUP.md)
- [Intelligent File Generation](INTELLIGENT_FILE_GENERATION.md)
- [GitHub Token Setup](GITHUB_TOKEN_SETUP.md)
- [AI Dockerfile Implementation](AI_DOCKERFILE_IMPLEMENTATION.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

If you encounter any issues:
1. Check the documentation files
2. Verify your environment variables are set correctly
3. Check the console for error messages
4. Open an issue on GitHub

---

**Note**: Make sure to never commit your `.env` file or any files containing sensitive information to version control.
