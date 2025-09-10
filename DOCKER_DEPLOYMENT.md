# Docker Deployment Guide

This guide provides complete instructions for deploying your Fusion Starter application using Docker.

## Quick Start

### Prerequisites
- Docker Desktop installed and running
- Git (for cloning the repository)

### 1. Environment Setup

Create a `.env` file in the project root with your configuration:

```bash
# Copy the example file
cp .env.example .env

# Edit with your actual values
nano .env  # or use your preferred editor
```

Required environment variables:
- `OPENAI_API_KEY` - Your OpenAI API key
- `NODE_ENV` - Set to `production` for production deployment
- `PORT` - Application port (default: 3000)

### 2. Deploy with Scripts

#### Linux/macOS:
```bash
# Make script executable
chmod +x deploy.sh

# Deploy the application
./deploy.sh

# Other commands
./deploy.sh stop     # Stop the container
./deploy.sh restart  # Restart the container
./deploy.sh logs     # View logs
./deploy.sh status   # Check status
./deploy.sh clean    # Remove container and image
```

#### Windows PowerShell:
```powershell
# Deploy the application
.\deploy.ps1

# Other commands
.\deploy.ps1 stop     # Stop the container
.\deploy.ps1 restart  # Restart the container
.\deploy.ps1 logs     # View logs
.\deploy.ps1 status   # Check status
.\deploy.ps1 clean    # Remove container and image
```

### 3. Deploy with Docker Compose

#### Production:
```bash
# Start the application
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the application
docker-compose down
```

#### Development:
```bash
# Start in development mode
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f
```

### 4. Manual Docker Commands

If you prefer to run Docker commands manually:

```bash
# Build the image
docker build -t fusion-starter:latest .

# Run the container
docker run -d \
  --name fusion-starter-app \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env \
  -v $(pwd)/logs:/app/logs \
  fusion-starter:latest

# Check status
docker ps

# View logs
docker logs -f fusion-starter-app

# Stop and remove
docker stop fusion-starter-app
docker rm fusion-starter-app
```

## Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode | `production` | No |
| `PORT` | Application port | `3000` | No |
| `APP_PORT` | External port mapping | `3000` | No |
| `DOMAIN` | Domain for production | `localhost` | No |
| `OPENAI_API_KEY` | OpenAI API key | - | Yes |
| `SUPABASE_URL` | Supabase URL | - | No |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | - | No |
| `PING_MESSAGE` | API ping message | `Hello from Docker!` | No |

### Port Configuration

The application runs on port 3000 inside the container. You can map it to a different host port:

```bash
# Map to port 8080 on host
docker run -p 8080:3000 fusion-starter:latest
```

Or use the deployment scripts:
```bash
# Linux/macOS
APP_PORT=8080 ./deploy.sh

# Windows PowerShell
.\deploy.ps1 -HostPort 8080
```

## Health Checks

The application includes health check endpoints:

- **Health Check**: `http://localhost:3000/api/ping`
- **Debug Info**: `http://localhost:3000/api/debug/env`
- **Intelligent Services**: `http://localhost:3000/api/debug/intelligent`

## Troubleshooting

### Container Won't Start
1. Check Docker is running: `docker info`
2. Check logs: `docker logs fusion-starter-app`
3. Verify .env file exists and has required variables
4. Check port availability: `netstat -tulpn | grep :3000`

### Application Not Responding
1. Wait for container to fully start (up to 60 seconds)
2. Check health endpoint: `curl http://localhost:3000/api/ping`
3. View container logs: `docker logs -f fusion-starter-app`

### Permission Issues (Linux/macOS)
```bash
# Fix script permissions
chmod +x deploy.sh

# Fix log directory permissions
sudo chown -R $USER:$USER logs/
```

### Windows Issues
- Ensure Docker Desktop is running
- Run PowerShell as Administrator if needed
- Check Windows Defender/antivirus isn't blocking Docker

## Production Considerations

### Security
- Never commit `.env` files to version control
- Use strong, unique secrets for production
- Consider using Docker secrets for sensitive data
- Enable HTTPS in production (use reverse proxy like Traefik)

### Performance
- Use multi-stage builds (already configured)
- Set appropriate resource limits
- Monitor container resource usage
- Use production-ready Node.js settings

### Monitoring
- Set up log aggregation
- Monitor container health
- Set up alerts for failures
- Use container orchestration for high availability

## Advanced Configuration

### Custom Dockerfile
The provided Dockerfile uses multi-stage builds for optimization:
- **Base stage**: Installs dependencies
- **Builder stage**: Builds the application
- **Production stage**: Creates minimal runtime image

### Docker Compose Profiles
Use profiles for different environments:

```bash
# Production with Traefik
docker-compose --profile production up -d

# Development only
docker-compose -f docker-compose.dev.yml up -d
```

### Volume Mounts
The deployment scripts mount a logs directory for persistent logging:
```bash
-v $(pwd)/logs:/app/logs
```

## Support

If you encounter issues:
1. Check the logs: `docker logs fusion-starter-app`
2. Verify your environment configuration
3. Ensure all prerequisites are installed
4. Check the troubleshooting section above
