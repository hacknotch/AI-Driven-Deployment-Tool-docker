import { supabase } from '../integrations/supabase/client';

// Types for deployment
export interface DeploymentRequest {
  prompt: string;
  repoLink: string;
  githubApiKey?: string;
  deploymentStack?: string[];
}

export interface DeploymentResponse {
  success: boolean;
  message: string;
  deploymentId?: string;
  status?: string;
  output?: string;
  dockerfile?: string;
  analysis?: any;
  generatedFiles?: any[];
}

export interface Deployment {
  id: number;
  user_id: string;
  prompt: string;
  repo_link: string;
  deployment_stack: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  webhook_response?: string;
  dockerfile_content?: string;
  error_message?: string;
  deployment_url?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

class DeploymentService {
  private baseUrl = '/api'; // Use relative URL to work with current server

  // Get auth headers with current user token
  private async getAuthHeaders(): Promise<HeadersInit> {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('No authentication token available');
    }

    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    };
  }

  // Create a new deployment using intelligent file generation
  async createDeployment(request: DeploymentRequest): Promise<DeploymentResponse> {
    try {
      // Transform the old request format to new format
      const intelligentRequest = {
        repoUrl: request.repoLink, // Map repoLink to repoUrl
        userPrompt: request.prompt,
        githubToken: request.githubApiKey
      };

      console.log('🚀 Sending intelligent deployment request:', intelligentRequest);

      const response = await fetch(`${this.baseUrl}/deployments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(intelligentRequest)
      });

      console.log('📥 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Response error:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Response data:', data);
      
      // Transform the response back to the expected format
      return {
        success: data.success,
        message: data.message || 'Deployment completed successfully',
        dockerfile: data.dockerfile,
        analysis: data.analysis,
        generatedFiles: data.generatedFiles
      };
    } catch (error) {
      console.error('Create deployment error:', error);
      throw error;
    }
  }

  // Create deployment from uploaded files
  async createDeploymentFromFiles(files: File[], userPrompt: string, streamId?: string): Promise<DeploymentResponse> {
    try {
      console.log('📁 Creating deployment from uploaded files:', files.length);
      
      // Create FormData for file upload
      const formData = new FormData();
      
      // Add files to FormData
      files.forEach((file, index) => {
        formData.append('files', file);
        console.log(`📄 Added file ${index + 1}: ${file.name} (${file.size} bytes)`);
      });
      
      // Add user prompt
      formData.append('userPrompt', userPrompt);
      
      console.log('🚀 Sending file upload request to backend...');
      
      const url = streamId ? `${this.baseUrl}/deployments/upload?streamId=${encodeURIComponent(streamId)}` : `${this.baseUrl}/deployments/upload`;
      const response = await fetch(url, {
        method: 'POST',
        body: formData
        // Don't set Content-Type header - let the browser set it for FormData
      });
      
      console.log('📥 Upload response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Upload response error:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('✅ Upload response data:', data);
      
      return {
        success: data.success,
        message: data.message || 'File upload deployment completed successfully',
        dockerfile: data.dockerfile,
        analysis: data.analysis,
        generatedFiles: data.generatedFiles
      };
      
    } catch (error) {
      console.error('Create deployment from files error:', error);
      throw error;
    }
  }

  // Get deployment status by ID
  async getDeploymentStatus(deploymentId: string): Promise<{ success: boolean; deployment?: Deployment; message?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      
      const response = await fetch(`${this.baseUrl}/deployments/${deploymentId}`, {
        method: 'GET',
        headers
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('Get deployment status error:', error);
      throw error;
    }
  }

  // Get user's deployment history
  async getDeploymentHistory(): Promise<{ success: boolean; deployments?: Deployment[]; message?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      
      const response = await fetch(`${this.baseUrl}/deployments`, {
        method: 'GET',
        headers
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('Get deployment history error:', error);
      throw error;
    }
  }

  // Poll deployment status until completion
  async pollDeploymentStatus(
    deploymentId: string, 
    onStatusUpdate?: (deployment: Deployment) => void,
    maxAttempts: number = 60,
    intervalMs: number = 5000
  ): Promise<Deployment> {
    let attempts = 0;
    
    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          attempts++;
          
          const result = await this.getDeploymentStatus(deploymentId);
          
          if (!result.success || !result.deployment) {
            throw new Error(result.message || 'Failed to get deployment status');
          }

          const deployment = result.deployment;
          
          // Call status update callback if provided
          if (onStatusUpdate) {
            onStatusUpdate(deployment);
          }

          // Check if deployment is complete
          if (deployment.status === 'completed' || deployment.status === 'failed' || deployment.status === 'cancelled') {
            resolve(deployment);
            return;
          }

          // Check if we've exceeded max attempts
          if (attempts >= maxAttempts) {
            reject(new Error('Deployment polling timeout'));
            return;
          }

          // Continue polling
          setTimeout(poll, intervalMs);
          
        } catch (error) {
          reject(error);
        }
      };

      // Start polling
      poll();
    });
  }

  // Validate GitHub repository URL
  validateGitHubUrl(url: string): { valid: boolean; message?: string } {
    if (!url || !url.trim()) {
      return { valid: false, message: 'Repository URL is required' };
    }

    const githubUrlPattern = /^https:\/\/github\.com\/[\w\-\.]+\/[\w\-\.]+\/?$/;
    
    if (!githubUrlPattern.test(url.trim())) {
      return { 
        valid: false, 
        message: 'Please enter a valid GitHub repository URL (e.g., https://github.com/username/repository)' 
      };
    }

    return { valid: true };
  }

  // Validate deployment prompt
  validatePrompt(prompt: string): { valid: boolean; message?: string } {
    if (!prompt || !prompt.trim()) {
      return { valid: false, message: 'Deployment prompt is required' };
    }

    if (prompt.trim().length < 10) {
      return { 
        valid: false, 
        message: 'Please provide a more detailed description (at least 10 characters)' 
      };
    }

    return { valid: true };
  }

  // Get status color for UI display
  getStatusColor(status: string): string {
    switch (status) {
      case 'pending':
        return 'text-yellow-400 bg-yellow-400/20';
      case 'processing':
        return 'text-blue-400 bg-blue-400/20';
      case 'completed':
        return 'text-green-400 bg-green-400/20';
      case 'failed':
        return 'text-red-400 bg-red-400/20';
      case 'cancelled':
        return 'text-gray-400 bg-gray-400/20';
      default:
        return 'text-gray-400 bg-gray-400/20';
    }
  }

  // Get status icon for UI display
  getStatusIcon(status: string): string {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'processing':
        return '🔄';
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      case 'cancelled':
        return '⏹️';
      default:
        return '❓';
    }
  }

  // Format deployment stack for display
  formatDeploymentStack(stack: string[]): string {
    return stack.join(' → ');
  }

  // Get relative time string
  getRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 1) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }
  }
}

// Export singleton instance
export const deploymentService = new DeploymentService();
export default deploymentService;
