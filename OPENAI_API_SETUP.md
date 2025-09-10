# 🔑 OpenAI API Key Setup Guide

## The Problem
You're getting this error:
```
Error generating Dockerfile: AuthenticationError: 401 Incorrect API key provided: your-api*****here
```

This means your OpenAI API key is not properly configured.

## 🚀 Quick Fix

### Step 1: Get Your OpenAI API Key
1. Go to [https://platform.openai.com/account/api-keys](https://platform.openai.com/account/api-keys)
2. Sign in to your OpenAI account
3. Click "Create new secret key"
4. Copy the API key (it starts with `sk-` but don't include the actual key in your code)

### Step 2: Create .env File
Create a file named `.env` in your project root with this content:

```bash
# OpenAI API Configuration
OPENAI_API_KEY=your_actual_api_key_here

# Docker Configuration (Optional)
DOCKER_USER=your_dockerhub_username
DOCKER_PASSWORD=your_dockerhub_password

# Auto Build Configuration
AUTO_BUILD=true

# Server Configuration
NODE_ENV=development
PORT=8080
```

### Step 3: Replace the Placeholder
Replace `your_actual_api_key_here` with your real API key from Step 1.

### Step 4: Restart Your Server
```bash
# Stop your current server (Ctrl+C)
# Then restart it
pnpm dev
```

## 🧪 Test the Fix

### Method 1: Test API Key
```bash
curl http://localhost:8080/api/debug/env
```

You should see:
```json
{
  "hasOpenAIKey": true,
  "keyLength": 51,
  "keyStart": "sk-1234567890abcde... (example format)"
}
```

### Method 2: Test Auto-Deploy
1. Go to `/auto-deploy` in your browser
2. Enter a GitHub repository URL
3. Click "Start Fully Automated Deployment"
4. It should now work without the API key error!

## 🔒 Security Notes

- **Never commit your `.env` file to Git**
- **Keep your API key secret**
- **Use environment variables in production**

## 💡 Alternative: Set Environment Variable Directly

If you don't want to create a `.env` file, you can set the environment variable directly:

### Windows (PowerShell):
```powershell
$env:OPENAI_API_KEY="your_actual_api_key_here"
pnpm dev
```

### Windows (Command Prompt):
```cmd
set OPENAI_API_KEY=your_actual_api_key_here
pnpm dev
```

### Linux/macOS:
```bash
export OPENAI_API_KEY="your_actual_api_key_here"
pnpm dev
```

## 🎯 What This Fixes

Once you set up the correct API key, your fully automated deployment system will:

✅ **Analyze code** using AI (LangChain + GPT-4o Mini)  
✅ **Generate missing files** automatically  
✅ **Create optimized Dockerfiles**  
✅ **Build Docker images**  
✅ **Deploy to cloud platforms**  

## 🆘 Still Having Issues?

If you're still getting errors:

1. **Check the API key format**: Should start with `sk-` (but don't include actual keys in code)
2. **Verify the key is active**: Check your OpenAI dashboard
3. **Check your billing**: Make sure you have credits
4. **Restart the server**: After changing environment variables

## 🎉 Success!

Once you've set up the API key correctly, you'll have a **fully automated deployment system** that requires **zero manual commands**!

Just push to GitHub and watch your application deploy automatically! 🚀✨
