/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

import type { Deployment } from './types'

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

// Deployment interface is now defined in types.ts

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
