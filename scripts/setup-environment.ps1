# Spark Space Environment Setup Script
# This script helps you set up your environment variables for local development

Write-Host "🚀 Spark Space Environment Setup" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# Check if .env.local already exists
if (Test-Path ".env.local") {
    Write-Host "⚠️  .env.local already exists!" -ForegroundColor Yellow
    $overwrite = Read-Host "Do you want to overwrite it? (y/N)"
    if ($overwrite -ne "y" -and $overwrite -ne "Y") {
        Write-Host "❌ Setup cancelled. Your existing .env.local file is preserved." -ForegroundColor Red
        exit
    }
}

# Copy .env.example to .env.local
if (Test-Path ".env.example") {
    Copy-Item ".env.example" ".env.local" -Force
    Write-Host "✅ Created .env.local from .env.example" -ForegroundColor Green
} else {
    Write-Host "❌ .env.example not found! Please make sure it exists." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Yellow
Write-Host "1. Open .env.local in your editor" -ForegroundColor White
Write-Host "2. Fill in your actual API keys and configuration values" -ForegroundColor White
Write-Host "3. Get your OpenAI API key from: https://platform.openai.com/api-keys" -ForegroundColor White
Write-Host "4. Set up Supabase at: https://supabase.com" -ForegroundColor White
Write-Host "5. Run 'pnpm dev' to start the development server" -ForegroundColor White
Write-Host ""
Write-Host "📚 For detailed setup instructions, see ENVIRONMENT_SETUP.md" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔒 Security reminder: Never commit .env.local to version control!" -ForegroundColor Red
