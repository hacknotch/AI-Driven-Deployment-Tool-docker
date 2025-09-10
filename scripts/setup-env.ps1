# PowerShell script to help set up environment variables
# Run this script to set up your OpenAI API key

Write-Host "🔑 OpenAI API Key Setup Script" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Check if .env file exists
if (Test-Path ".env") {
    Write-Host "✅ .env file found" -ForegroundColor Green
} else {
    Write-Host "❌ .env file not found. Creating one..." -ForegroundColor Yellow
    
    # Create .env file
    $envContent = @"
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
"@
    
    $envContent | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "✅ .env file created" -ForegroundColor Green
}

Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Get your OpenAI API key from: https://platform.openai.com/account/api-keys" -ForegroundColor White
Write-Host "2. Edit the .env file and replace 'your_actual_openai_api_key_here' with your real API key" -ForegroundColor White
Write-Host "3. Restart your server with: pnpm dev" -ForegroundColor White
Write-Host ""
Write-Host "🧪 Test your setup with: curl http://localhost:8080/api/debug/env" -ForegroundColor Cyan
Write-Host ""
Write-Host "🎉 Once configured, your fully automated deployment system will work!" -ForegroundColor Green
