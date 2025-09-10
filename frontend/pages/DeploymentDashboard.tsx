import React, { useState, useRef } from 'react';
import Layout from '../components/Layout';
import DeploymentProgressTracker, { DeploymentProgress } from '../components/DeploymentProgressTracker';
import { deploymentFlowService, DeploymentRequest } from '../services/deploymentFlowService';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { 
  Upload, 
  Link, 
  Play, 
  Square, 
  RotateCcw, 
  FileText, 
  Globe,
  Activity,
  Zap,
  Brain,
  Container
} from 'lucide-react';

export default function DeploymentDashboard() {
  const [deployment, setDeployment] = useState<DeploymentProgress | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [deploymentType, setDeploymentType] = useState<'files' | 'repository'>('files');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize deployment flow service
  React.useEffect(() => {
    deploymentFlowService.onProgressUpdate((progress) => {
      setDeployment(progress);
    });

    return () => {
      deploymentFlowService.cleanup();
    };
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setUploadedFiles(files);
  };

  const handleStartDeployment = async () => {
    if (deploymentType === 'files' && uploadedFiles.length === 0) {
      alert('Please upload files first');
      return;
    }
    if (deploymentType === 'repository' && !repositoryUrl.trim()) {
      alert('Please enter a repository URL');
      return;
    }

    setIsDeploying(true);
    setDeployment(null);

    try {
      const request: DeploymentRequest = {
        type: deploymentType,
        files: deploymentType === 'files' ? uploadedFiles : undefined,
        repositoryUrl: deploymentType === 'repository' ? repositoryUrl : undefined,
        userPrompt: userPrompt || 'Generate production-ready Dockerfile and deploy',
        githubToken: githubToken || undefined
      };

      const result = await deploymentFlowService.startDeployment(request);
      
      if (result.success) {
        console.log('✅ Deployment completed successfully:', result);
      } else {
        console.error('❌ Deployment failed:', result.error);
      }
    } catch (error) {
      console.error('❌ Deployment error:', error);
    } finally {
      setIsDeploying(false);
    }
  };

  const handleCancelDeployment = () => {
    deploymentFlowService.cancelDeployment();
    setIsDeploying(false);
  };

  const handleRetryDeployment = () => {
    setDeployment(null);
    handleStartDeployment();
  };

  const handleViewLogs = (phaseId: string) => {
    // This could open a modal or navigate to a logs page
    console.log('View logs for phase:', phaseId);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center space-x-2 mb-6">
          <Activity className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold">Deployment Dashboard</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Deployment Controls */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Deployment Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs value={deploymentType} onValueChange={(value) => setDeploymentType(value as 'files' | 'repository')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="files" className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Files
                    </TabsTrigger>
                    <TabsTrigger value="repository" className="flex items-center gap-2">
                      <Link className="h-4 w-4" />
                      Repository
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="files" className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Upload Project Files</label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                        accept=".js,.ts,.jsx,.tsx,.py,.java,.go,.php,.rb,.html,.css,.json,.yml,.yaml,.md,.txt"
                      />
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Choose Files
                      </Button>
                      {uploadedFiles.length > 0 && (
                        <div className="mt-2">
                          <Badge variant="secondary">
                            {uploadedFiles.length} files selected
                          </Badge>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="repository" className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Repository URL</label>
                      <Input
                        placeholder="https://github.com/username/repository"
                        value={repositoryUrl}
                        onChange={(e) => setRepositoryUrl(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">GitHub Token (Optional)</label>
                      <Input
                        type="password"
                        placeholder="ghp_xxxxxxxxxxxx"
                        value={githubToken}
                        onChange={(e) => setGithubToken(e.target.value)}
                      />
                    </div>
                  </TabsContent>
                </Tabs>

                <div>
                  <label className="block text-sm font-medium mb-2">Deployment Instructions (Optional)</label>
                  <Textarea
                    placeholder="Describe what you want to deploy or any specific requirements..."
                    value={userPrompt}
                    onChange={(e) => setUserPrompt(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  {!isDeploying ? (
                    <Button
                      onClick={handleStartDeployment}
                      className="flex-1"
                      disabled={
                        (deploymentType === 'files' && uploadedFiles.length === 0) ||
                        (deploymentType === 'repository' && !repositoryUrl.trim())
                      }
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start Deployment
                    </Button>
                  ) : (
                    <Button
                      onClick={handleCancelDeployment}
                      variant="destructive"
                      className="flex-1"
                    >
                      <Square className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  )}
                  
                  {deployment?.status === 'failed' && (
                    <Button
                      onClick={handleRetryDeployment}
                      variant="outline"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Retry
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Deployment Info */}
            {deployment && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Deployment Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Status:</span>
                    <Badge variant={
                      deployment.status === 'completed' ? 'default' :
                      deployment.status === 'failed' ? 'destructive' :
                      deployment.status === 'running' ? 'secondary' : 'outline'
                    }>
                      {deployment.status.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Progress:</span>
                    <span className="text-sm font-medium">{deployment.overallProgress}%</span>
                  </div>
                  {deployment.startTime && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Started:</span>
                      <span className="text-sm">{deployment.startTime.toLocaleTimeString()}</span>
                    </div>
                  )}
                  {deployment.totalDuration && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Duration:</span>
                      <span className="text-sm">{Math.round(deployment.totalDuration / 1000)}s</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Deployment Progress */}
          <div className="lg:col-span-2">
            <DeploymentProgressTracker
              deployment={deployment}
              onCancel={handleCancelDeployment}
              onRetry={handleRetryDeployment}
              onViewLogs={handleViewLogs}
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Container className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" className="h-20 flex flex-col items-center gap-2">
                  <FileText className="h-6 w-6" />
                  <span>View Generated Files</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col items-center gap-2">
                  <Globe className="h-6 w-6" />
                  <span>Open Deployment</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col items-center gap-2">
                  <Activity className="h-6 w-6" />
                  <span>View Logs</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
