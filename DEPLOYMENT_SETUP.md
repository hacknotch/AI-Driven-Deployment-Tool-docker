# 🚀 Deployment Backend Setup

This document explains how to set up and use the new deployment functionality that has been integrated from the zerops-main project.

## 📋 What's Been Added

### Backend Components
- **`server/routes/deployment.ts`** - Deployment API endpoints
- **`server/migrations/001_create_deployments_table.sql`** - Database migration
- **`supabase/migrations/20250829000000_create_deployments_table.sql`** - Supabase migration

### Frontend Components
- **`client/services/deploymentService.ts`** - Deployment service client
- **Updated `client/pages/Dashboard.tsx`** - Integrated deployment form
- **Updated `shared/api.ts`** - Added deployment types

### Database Schema
- **`deployments` table** with the following fields:
  - `id` (Primary Key)
  - `user_id` (UUID, references auth.users)
  - `prompt` (TEXT, deployment description)
  - `repo_link` (TEXT, GitHub repository URL)
  - `deployment_stack` (TEXT[], default: ['Docker', 'Kubernetes', 'Cloud Deploy'])
  - `status` (VARCHAR, enum: pending/processing/completed/failed/cancelled)
  - `webhook_response` (TEXT, response from deployment webhook)
  - `error_message` (TEXT, error details if failed)
  - `deployment_url` (TEXT, deployed application URL)
  - `created_at`, `updated_at`, `completed_at` (Timestamps)

## 🛠️ Setup Instructions

### 1. Run Database Migration

You need to apply the database migration to create the deployments table:

```bash
# If using Supabase CLI (recommended)
supabase db push

# Or manually run the SQL in your Supabase dashboard
# Copy the contents of supabase/migrations/20250829000000_create_deployments_table.sql
# and run it in the SQL editor
```

### 2. Environment Variables

Make sure your `.env` file has the required Supabase configuration:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Install Dependencies

The required dependencies should already be installed, but verify:

```bash
npm install @supabase/supabase-js
```

### 4. Restart Development Server

```bash
npm run dev
```

## 🎯 API Endpoints

### POST `/api/deployments`
Create a new deployment
- **Auth**: Required (Bearer token)
- **Body**: `{ prompt: string, repoLink: string, deploymentStack?: string[] }`
- **Response**: `{ success: boolean, message: string, deploymentId?: string, status?: string, output?: string }`

### GET `/api/deployments/:deploymentId`
Get deployment status by ID
- **Auth**: Required (Bearer token)
- **Response**: `{ success: boolean, deployment?: Deployment, message?: string }`

### GET `/api/deployments`
Get user's deployment history
- **Auth**: Required (Bearer token)
- **Response**: `{ success: boolean, deployments?: Deployment[], message?: string }`

## 🎨 Frontend Usage

### Dashboard Integration

The deployment form is now integrated into the Dashboard page with:

1. **Input Fields**:
   - Prompt (deployment description)
   - GitHub repository URL

2. **Validation**:
   - Prompt must be at least 10 characters
   - Repository URL must be valid GitHub format

3. **Deployment Process**:
   - Form submission triggers backend API
   - Real-time status updates via polling
   - Output display in expandable section

### Deployment Service

Use the deployment service in your components:

```typescript
import { deploymentService } from '@/services/deploymentService';

// Create deployment
const response = await deploymentService.createDeployment({
  prompt: "Deploy my React app",
  repoLink: "https://github.com/user/repo",
  deploymentStack: ['Docker', 'Kubernetes', 'Cloud Deploy']
});

// Get deployment history
const history = await deploymentService.getDeploymentHistory();

// Poll deployment status
await deploymentService.pollDeploymentStatus(
  deploymentId,
  (deployment) => console.log('Status:', deployment.status)
);
```

## 🔗 Webhook Integration

The system uses the same webhook URL from the zerops-main project:
- **URL**: `https://sush1704.app.n8n.cloud/webhook-test/4cdc348d-668c-4f29-842c-c11f3a1e145e`
- **Method**: POST
- **Payload**: `{ prompt, repoLink, userId, deploymentId, deploymentStack, timestamp }`

## 🔒 Security Features

- **Row Level Security (RLS)** enabled on deployments table
- **User isolation** - users can only see their own deployments
- **JWT token validation** on all API endpoints
- **Input validation** for GitHub URLs and prompts

## 🐛 Troubleshooting

### Common Issues

1. **Migration fails**: Check Supabase connection and permissions
2. **API returns 401**: Verify user is authenticated and token is valid
3. **Webhook fails**: Check network connectivity and webhook URL
4. **Form validation errors**: Ensure prompt is descriptive and GitHub URL is valid

### Debug Steps

1. Check browser console for errors
2. Verify API responses in Network tab
3. Check Supabase logs for database errors
4. Test webhook URL manually with curl/Postman

## 📈 Next Steps

Consider adding:
- Real-time deployment status updates via WebSockets
- Deployment logs streaming
- Multiple deployment provider support
- Deployment rollback functionality
- Deployment metrics and analytics

## 🎉 Ready to Deploy!

Your deployment backend is now fully integrated and ready to use! Users can:

1. ✅ Enter deployment prompts and GitHub URLs
2. ✅ Submit deployments via the Dashboard
3. ✅ Track deployment status and history
4. ✅ View deployment outputs and errors
5. ✅ Get real-time status updates

The system follows the same logic as the zerops-main project but is now fully integrated into your spark-space application with proper authentication, database storage, and user management.
