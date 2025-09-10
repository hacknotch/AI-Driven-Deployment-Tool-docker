# GitHub Token Setup for AutoDeploy.AI

## Issue
You're getting "No accessible files found in repository" error because:
1. GitHub API rate limiting for unauthenticated requests
2. Some repositories might be private
3. GitHub API requires authentication for better access

## Solution: Add GitHub Token

### Step 1: Create GitHub Personal Access Token
1. Go to GitHub.com → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Set expiration and select scopes:
   - ✅ `public_repo` (for public repositories)
   - ✅ `repo` (if you want to analyze private repos)
4. Copy the generated token

### Step 2: Add Token to Environment
Add this line to your `.env` file:
```bash
GITHUB_TOKEN=your_github_token_here
```

**Current Token**: The project is now configured with a GitHub token (replace with your own)

### Step 3: Update Frontend (Optional)
Your frontend can pass the GitHub token in requests:
```javascript
const response = await fetch('/api/deployments', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    repoUrl: 'https://github.com/user/repo',
    userPrompt: 'Generate Dockerfile',
                    githubToken: 'your_github_token_here'  // Replace with your actual token
  })
});
```

## Alternative: Test with Guaranteed Public Repos

For testing without a token, try these definitely public repositories:
- https://github.com/octocat/Hello-World
- https://github.com/github/gitignore
- https://github.com/microsoft/TypeScript

## Quick Fix Test

Try this test command:
```bash
curl -X POST http://localhost:3001/api/test
```

This should return server status without GitHub API calls.
