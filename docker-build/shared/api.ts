/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

// Deployment API types
export interface DeploymentRequest {
  prompt: string;
  repoLink: string;
  deploymentStack?: string[];
}

export interface DeploymentResponse {
  success: boolean;
  message: string;
  deploymentId?: string;
  status?: string;
  output?: string;
}

export interface Deployment {
  id: number;
  user_id: string;
  prompt: string;
  repo_link: string;
  deployment_stack: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  webhook_response?: string;
  error_message?: string;
  deployment_url?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface DeploymentHistoryResponse {
  success: boolean;
  deployments?: Deployment[];
  message?: string;
}

export interface DeploymentStatusResponse {
  success: boolean;
  deployment?: Deployment;
  message?: string;
}
