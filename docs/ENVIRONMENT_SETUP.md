# Environment Setup Guide

This guide will help you set up the environment variables needed to run the Spark Space application locally and deploy it to production.

## Quick Start

1. **Copy the example environment file:**
   ```bash
   cp .env.example .env.local
   ```

2. **Fill in your actual values in `.env.local`**
3. **Never commit `.env.local` to version control**

## Required Environment Variables

### Server Configuration
- `NODE_ENV`: Environment mode (development/production)
- `PORT`: Server port (default: 3000)
- `SERVER_PORT`: Development server port (default: 3001)
- `PING_MESSAGE`: Custom ping message for API health check

### OpenAI Configuration
- `OPENAI_API_KEY`: Your OpenAI API key for AI features
  - Get it from: https://platform.openai.com/api-keys
  - Required for: AI file analysis, intelligent file generation, Docker fixes

### Supabase Configuration
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_KEY`: Supabase service role key (server-side)
- `VITE_SUPABASE_URL`: Supabase project URL (client-side)
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key (client-side)

### Docker Configuration
- `DOCKER_USER`: Your Docker Hub username (optional)
- `AUTO_BUILD`: Enable automatic Docker builds (true/false)

### Development Configuration
- `DEBUG`: Enable debug mode (true/false)

## Setting Up Each Service

### 1. OpenAI Setup
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Copy the key and paste it in your `.env.local` file:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```

### 2. Supabase Setup
1. Go to [Supabase](https://supabase.com) and create a new project
2. Go to Settings > API
3. Copy the following values:
   - **Project URL** → `SUPABASE_URL` and `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_KEY`

### 3. Docker Setup (Optional)
If you plan to use Docker features:
1. Create a Docker Hub account
2. Set your username in `DOCKER_USER`
3. Set `AUTO_BUILD=true` if you want automatic builds

## Environment File Structure

```
.env.example          # Template file (committed to git)
.env.local           # Your local environment (NOT committed)
.env.production      # Production environment (if needed)
```

## Security Best Practices

1. **Never commit sensitive files:**
   - `.env.local`
   - `.env.production`
   - Any file containing API keys

2. **Use different keys for different environments:**
   - Development: Use test/development API keys
   - Production: Use production API keys

3. **Rotate keys regularly:**
   - Update API keys periodically
   - Remove old/unused keys

## Troubleshooting

### Common Issues

1. **"Missing required environment variables" error:**
   - Check that all required variables are set in `.env.local`
   - Ensure there are no typos in variable names

2. **OpenAI API errors:**
   - Verify your API key is correct
   - Check that you have sufficient credits
   - Ensure the key has the right permissions

3. **Supabase connection errors:**
   - Verify the URL and keys are correct
   - Check that your Supabase project is active
   - Ensure the service key has the right permissions

### Environment Variable Validation

The application includes debug endpoints to check your environment setup:

- `GET /api/debug/env` - Check OpenAI configuration
- `GET /api/debug/intelligent` - Check intelligent file generation setup

## Production Deployment

For production deployment:

1. Set `NODE_ENV=production`
2. Use production API keys and database URLs
3. Ensure all required environment variables are set in your hosting platform
4. Never use development keys in production

## Support

If you encounter issues with environment setup:

1. Check this guide first
2. Verify all required variables are set
3. Test with the debug endpoints
4. Check the application logs for specific error messages
