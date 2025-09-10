#!/bin/bash

# Bash script to help set up environment variables
# Run this script to set up your OpenAI API key

echo "🔑 OpenAI API Key Setup Script"
echo "================================"

# Check if .env file exists
if [ -f ".env" ]; then
    echo "✅ .env file found"
else
    echo "❌ .env file not found. Creating one..."
    
    # Create .env file
    cat > .env << EOF
# OpenAI API Configuration
# Get your API key from: https://platform.openai.com/account/api-keys
OPENAI_API_KEY=your_actual_openai_api_key_here

# Docker Configuration (Optional)
DOCKER_USER=your_dockerhub_username
DOCKER_PASSWORD=your_dockerhub_password

# Auto Build Configuration
AUTO_BUILD=true

# Server Configuration
NODE_ENV=development
PORT=8080
EOF
    
    echo "✅ .env file created"
fi

echo ""
echo "📋 Next Steps:"
echo "1. Get your OpenAI API key from: https://platform.openai.com/account/api-keys"
echo "2. Edit the .env file and replace 'your_actual_openai_api_key_here' with your real API key"
echo "3. Restart your server with: pnpm dev"
echo ""
echo "🧪 Test your setup with: curl http://localhost:8080/api/debug/env"
echo ""
echo "🎉 Once configured, your fully automated deployment system will work!"
