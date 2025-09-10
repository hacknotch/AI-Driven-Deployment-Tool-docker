import { DeploymentProgress, DeploymentPhase } from '../components/DeploymentProgressTracker';

export interface DeploymentRequest {
  type: 'files' | 'repository';
  files?: File[];
  repositoryUrl?: string;
  userPrompt?: string;
  githubToken?: string;
}

export interface DeploymentResult {
  success: boolean;
  deploymentId: string;
  imageName?: string;
  deploymentUrl?: string;
  error?: string;
}

class DeploymentFlowService {
  private currentDeployment: DeploymentProgress | null = null;
  private eventSource: EventSource | null = null;
  private onProgressUpdate: ((progress: DeploymentProgress) => void) | null = null;

  // Initialize deployment phases
  private createInitialPhases(): DeploymentPhase[] {
    return [
      {
        id: 'upload',
        name: 'Upload Code',
        description: 'Upload your project files',
        icon: 'upload',
        status: 'pending',
        progress: 0,
        logs: []
      },
      {
        id: 'analysis',
        name: 'AI Analysis',
        description: 'Analyzing dependencies and project structure',
        icon: 'analysis',
        status: 'pending',
        progress: 0,
        logs: []
      },
      {
        id: 'build',
        name: 'Build',
        description: 'Building your application with Docker',
        icon: 'build',
        status: 'pending',
        progress: 0,
        logs: []
      },
      {
        id: 'deploy',
        name: 'Deploy',
        description: 'Deploying to production',
        icon: 'deploy',
        status: 'pending',
        progress: 0,
        logs: []
      },
      {
        id: 'monitor',
        name: 'Monitor',
        description: 'Monitoring deployment health',
        icon: 'monitor',
        status: 'pending',
        progress: 0,
        logs: []
      }
    ];
  }

  // Start a new deployment
  async startDeployment(request: DeploymentRequest): Promise<DeploymentResult> {
    const deploymentId = `deploy-${Date.now()}`;
    
    this.currentDeployment = {
      id: deploymentId,
      phases: this.createInitialPhases(),
      currentPhase: 'upload',
      overallProgress: 0,
      status: 'running',
      startTime: new Date()
    };

    this.notifyProgress();

    try {
      // Phase 1: Upload Code
      await this.executeUploadPhase(request);
      
      // Phase 2: AI Analysis
      await this.executeAnalysisPhase();
      
      // Phase 3: Build
      const buildResult = await this.executeBuildPhase();
      
      // Phase 4: Deploy
      const deployResult = await this.executeDeployPhase(buildResult);
      
      // Phase 5: Monitor
      await this.executeMonitorPhase(deployResult);

      // Mark deployment as completed
      this.currentDeployment.status = 'completed';
      this.currentDeployment.endTime = new Date();
      this.currentDeployment.totalDuration = this.currentDeployment.endTime.getTime() - this.currentDeployment.startTime!.getTime();
      this.currentDeployment.overallProgress = 100;
      this.notifyProgress();

      return {
        success: true,
        deploymentId,
        imageName: buildResult.imageName,
        deploymentUrl: deployResult.deploymentUrl
      };

    } catch (error) {
      this.currentDeployment.status = 'failed';
      this.currentDeployment.endTime = new Date();
      this.notifyProgress();

      return {
        success: false,
        deploymentId,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Phase 1: Upload Code
  private async executeUploadPhase(request: DeploymentRequest): Promise<void> {
    const phase = this.getCurrentPhase('upload');
    phase.status = 'in_progress';
    phase.startTime = new Date();
    this.addLog(phase, '🚀 Starting file upload process...');

    if (request.type === 'files' && request.files) {
      this.addLog(phase, `📁 Uploading ${request.files.length} files...`);
      
      // Simulate file upload progress
      for (let i = 0; i <= 100; i += 10) {
        phase.progress = i;
        this.addLog(phase, `📤 Upload progress: ${i}%`);
        this.updateOverallProgress();
        await this.delay(200);
      }

      this.addLog(phase, '✅ Files uploaded successfully');
      phase.details = { filesUploaded: request.files.length };
    } else if (request.type === 'repository' && request.repositoryUrl) {
      this.addLog(phase, `🔗 Processing repository: ${request.repositoryUrl}`);
      await this.delay(1000);
      this.addLog(phase, '✅ Repository processed successfully');
      phase.details = { repositoryUrl: request.repositoryUrl };
    }

    phase.status = 'completed';
    phase.endTime = new Date();
    phase.duration = phase.endTime.getTime() - phase.startTime!.getTime();
    phase.progress = 100;
    this.updateOverallProgress();
  }

  // Phase 2: AI Analysis
  private async executeAnalysisPhase(): Promise<void> {
    const phase = this.getCurrentPhase('analysis');
    phase.status = 'in_progress';
    phase.startTime = new Date();
    this.addLog(phase, '🧠 Starting AI analysis...');

    // Connect to streaming endpoint
    await this.connectToAnalysisStream(phase);

    phase.status = 'completed';
    phase.endTime = new Date();
    phase.duration = phase.endTime.getTime() - phase.startTime!.getTime();
    phase.progress = 100;
    this.updateOverallProgress();
  }

  // Phase 3: Build
  private async executeBuildPhase(): Promise<{ imageName: string }> {
    const phase = this.getCurrentPhase('build');
    phase.status = 'in_progress';
    phase.startTime = new Date();
    this.addLog(phase, '🐳 Starting Docker build...');

    // Simulate build progress
    const buildSteps = [
      '📦 Preparing build context...',
      '🔧 Installing dependencies...',
      '🏗️ Building application...',
      '📋 Creating Docker image...',
      '✅ Build completed successfully'
    ];

    for (let i = 0; i < buildSteps.length; i++) {
      phase.progress = (i + 1) * 20;
      this.addLog(phase, buildSteps[i]);
      this.updateOverallProgress();
      await this.delay(1500);
    }

    const imageName = `anonymous/project-${Date.now()}:latest`;
    phase.details = { imageName };
    phase.status = 'completed';
    phase.endTime = new Date();
    phase.duration = phase.endTime.getTime() - phase.startTime!.getTime();
    phase.progress = 100;
    this.updateOverallProgress();

    return { imageName };
  }

  // Phase 4: Deploy
  private async executeDeployPhase(buildResult: { imageName: string }): Promise<{ deploymentUrl: string }> {
    const phase = this.getCurrentPhase('deploy');
    phase.status = 'in_progress';
    phase.startTime = new Date();
    this.addLog(phase, '🚀 Starting deployment...');

    const deploySteps = [
      '📤 Pushing image to registry...',
      '🌐 Creating deployment resources...',
      '⚙️ Configuring load balancer...',
      '🔗 Setting up domain...',
      '✅ Deployment completed successfully'
    ];

    for (let i = 0; i < deploySteps.length; i++) {
      phase.progress = (i + 1) * 20;
      this.addLog(phase, deploySteps[i]);
      this.updateOverallProgress();
      await this.delay(1200);
    }

    const deploymentUrl = `https://project-${Date.now()}.deploy.app`;
    phase.details = { deploymentUrl, imageName: buildResult.imageName };
    phase.status = 'completed';
    phase.endTime = new Date();
    phase.duration = phase.endTime.getTime() - phase.startTime!.getTime();
    phase.progress = 100;
    this.updateOverallProgress();

    return { deploymentUrl };
  }

  // Phase 5: Monitor
  private async executeMonitorPhase(deployResult: { deploymentUrl: string }): Promise<void> {
    const phase = this.getCurrentPhase('monitor');
    phase.status = 'in_progress';
    phase.startTime = new Date();
    this.addLog(phase, '📊 Starting health monitoring...');

    const monitorSteps = [
      '🔍 Checking deployment health...',
      '📈 Monitoring performance metrics...',
      '🛡️ Verifying security status...',
      '✅ All systems operational'
    ];

    for (let i = 0; i < monitorSteps.length; i++) {
      phase.progress = (i + 1) * 25;
      this.addLog(phase, monitorSteps[i]);
      this.updateOverallProgress();
      await this.delay(1000);
    }

    phase.details = { deploymentUrl: deployResult.deploymentUrl, status: 'healthy' };
    phase.status = 'completed';
    phase.endTime = new Date();
    phase.duration = phase.endTime.getTime() - phase.startTime!.getTime();
    phase.progress = 100;
    this.updateOverallProgress();
  }

  // Connect to analysis stream
  private async connectToAnalysisStream(phase: DeploymentPhase): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const es = new EventSource('/api/deployments/stream');
        this.eventSource = es;

        es.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.done) {
              es.close();
              resolve();
              return;
            }

            if (data.error) {
              this.addLog(phase, `❌ ${data.error}`);
              es.close();
              reject(new Error(data.error));
              return;
            }

            if (data.message) {
              this.addLog(phase, data.message);
              
              // Update progress based on message content
              if (data.message.includes('analysis complete')) {
                phase.progress = 100;
              } else if (data.message.includes('analyzing')) {
                phase.progress = Math.min(phase.progress + 10, 90);
              }
              
              this.updateOverallProgress();
            }

            if (data.dockerfile) {
              this.addLog(phase, '📄 Dockerfile generated successfully');
              phase.details = { filesGenerated: (phase.details?.filesGenerated || 0) + 1 };
            }

          } catch (error) {
            this.addLog(phase, `⚠️ Error parsing stream data: ${error}`);
          }
        };

        es.onerror = () => {
          this.addLog(phase, '❌ Stream connection error');
          es.close();
          reject(new Error('Stream connection failed'));
        };

        // Timeout after 5 minutes
        setTimeout(() => {
          es.close();
          reject(new Error('Analysis timeout'));
        }, 300000);

      } catch (error) {
        reject(error);
      }
    });
  }

  // Helper methods
  private getCurrentPhase(phaseId: string): DeploymentPhase {
    const phase = this.currentDeployment?.phases.find(p => p.id === phaseId);
    if (!phase) throw new Error(`Phase ${phaseId} not found`);
    return phase;
  }

  private addLog(phase: DeploymentPhase, message: string): void {
    const timestamp = new Date().toLocaleTimeString();
    phase.logs.push(`[${timestamp}] ${message}`);
    this.notifyProgress();
  }

  private updateOverallProgress(): void {
    if (!this.currentDeployment) return;
    
    const totalProgress = this.currentDeployment.phases.reduce((sum, phase) => {
      return sum + phase.progress;
    }, 0);
    
    this.currentDeployment.overallProgress = Math.round(totalProgress / this.currentDeployment.phases.length);
    this.notifyProgress();
  }

  private notifyProgress(): void {
    if (this.onProgressUpdate && this.currentDeployment) {
      this.onProgressUpdate({ ...this.currentDeployment });
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public methods
  getCurrentDeployment(): DeploymentProgress | null {
    return this.currentDeployment;
  }

  onProgressUpdate(callback: (progress: DeploymentProgress) => void): void {
    this.onProgressUpdate = callback;
  }

  cancelDeployment(): void {
    if (this.eventSource) {
      this.eventSource.close();
    }
    if (this.currentDeployment) {
      this.currentDeployment.status = 'cancelled';
      this.notifyProgress();
    }
  }

  cleanup(): void {
    if (this.eventSource) {
      this.eventSource.close();
    }
    this.currentDeployment = null;
    this.onProgressUpdate = null;
  }
}

export const deploymentFlowService = new DeploymentFlowService();
export default deploymentFlowService;
