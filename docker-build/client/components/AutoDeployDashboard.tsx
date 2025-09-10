import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Clock, Play, Github, Docker, Cloud, Zap } from 'lucide-react';

interface AutoDeployResult {
  success: boolean;
  deploymentId: string;
  imageName?: string;
  deploymentUrl?: string;
  logs: string[];
  error?: string;
  steps: {
    analysis: boolean;
    fileGeneration: boolean;
    dockerBuild: boolean;
    dockerPush: boolean;
    deployment: boolean;
  };
}

export default function AutoDeployDashboard() {
  const [repoUrl, setRepoUrl] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [dockerHubUsername, setDockerHubUsername] = useState('');
  const [dockerHubPassword, setDockerHubPassword] = useState('');
  const [deploymentTarget, setDeploymentTarget] = useState('dockerhub');
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentResult, setDeploymentResult] = useState<AutoDeployResult | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const handleAutoDeploy = async () => {
    if (!repoUrl) {
      alert('Please enter a repository URL');
      return;
    }

    setIsDeploying(true);
    setDeploymentResult(null);
    setLogs([]);

    try {
      const response = await fetch('/api/auto-deploy/auto-deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repoUrl,
          githubToken: githubToken || undefined,
          dockerHubUsername: dockerHubUsername || undefined,
          dockerHubPassword: dockerHubPassword || undefined,
          autoBuild: true,
          autoPush: true,
          autoDeploy: true,
          deploymentTarget,
        }),
      });

      const result: AutoDeployResult = await response.json();
      setDeploymentResult(result);
      setLogs(result.logs || []);
    } catch (error) {
      console.error('Deployment failed:', error);
      setDeploymentResult({
        success: false,
        deploymentId: `error-${Date.now()}`,
        logs: [`Error: ${error}`],
        error: error instanceof Error ? error.message : 'Unknown error',
        steps: {
          analysis: false,
          fileGeneration: false,
          dockerBuild: false,
          dockerPush: false,
          deployment: false,
        },
      });
    } finally {
      setIsDeploying(false);
    }
  };

  const getStepIcon = (completed: boolean, isCurrent: boolean) => {
    if (completed) return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (isCurrent) return <Clock className="h-5 w-5 text-blue-500 animate-spin" />;
    return <Clock className="h-5 w-5 text-gray-400" />;
  };

  const getStepStatus = (completed: boolean, isCurrent: boolean) => {
    if (completed) return 'completed';
    if (isCurrent) return 'running';
    return 'pending';
  };

  const getProgressPercentage = () => {
    if (!deploymentResult) return 0;
    const completedSteps = Object.values(deploymentResult.steps).filter(Boolean).length;
    return (completedSteps / 5) * 100;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          🚀 Fully Automated Deployment
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          AI-powered deployment pipeline that analyzes your code, fixes errors, generates missing files, 
          builds Docker images, and deploys automatically - all with zero manual commands!
        </p>
      </div>

      <Tabs defaultValue="deploy" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="deploy">Deploy</TabsTrigger>
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="deploy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Deployment Configuration
              </CardTitle>
              <CardDescription>
                Configure your repository and deployment settings for fully automated deployment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="repoUrl">Repository URL *</Label>
                  <Input
                    id="repoUrl"
                    placeholder="https://github.com/username/repository"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deploymentTarget">Deployment Target</Label>
                  <select
                    id="deploymentTarget"
                    className="w-full p-2 border rounded-md"
                    value={deploymentTarget}
                    onChange={(e) => setDeploymentTarget(e.target.value)}
                  >
                    <option value="dockerhub">Docker Hub</option>
                    <option value="aws">AWS ECS/Fargate</option>
                    <option value="gcp">Google Cloud Run</option>
                    <option value="azure">Azure Container Instances</option>
                    <option value="vercel">Vercel</option>
                    <option value="netlify">Netlify</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="githubToken">GitHub Token (Optional)</Label>
                  <Input
                    id="githubToken"
                    type="password"
                    placeholder="ghp_xxxxxxxxxxxx"
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dockerHubUsername">Docker Hub Username (Optional)</Label>
                  <Input
                    id="dockerHubUsername"
                    placeholder="your-dockerhub-username"
                    value={dockerHubUsername}
                    onChange={(e) => setDockerHubUsername(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dockerHubPassword">Docker Hub Password (Optional)</Label>
                <Input
                  id="dockerHubPassword"
                  type="password"
                  placeholder="your-dockerhub-password"
                  value={dockerHubPassword}
                  onChange={(e) => setDockerHubPassword(e.target.value)}
                />
              </div>

              <Button
                onClick={handleAutoDeploy}
                disabled={isDeploying || !repoUrl}
                className="w-full"
                size="lg"
              >
                {isDeploying ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Deploying...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Start Fully Automated Deployment
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {deploymentResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {deploymentResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  Deployment Result
                </CardTitle>
                <CardDescription>
                  Deployment ID: {deploymentResult.deploymentId}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Overall Progress</span>
                    <span className="text-sm text-gray-500">{Math.round(getProgressPercentage())}%</span>
                  </div>
                  <Progress value={getProgressPercentage()} className="w-full" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {Object.entries(deploymentResult.steps).map(([step, completed]) => (
                    <div key={step} className="flex items-center space-x-2">
                      {getStepIcon(completed, false)}
                      <span className="text-sm capitalize">{step.replace(/([A-Z])/g, ' $1')}</span>
                    </div>
                  ))}
                </div>

                {deploymentResult.imageName && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100">Docker Image</h4>
                    <p className="text-blue-700 dark:text-blue-300 font-mono">{deploymentResult.imageName}</p>
                  </div>
                )}

                {deploymentResult.deploymentUrl && (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <h4 className="font-medium text-green-900 dark:text-green-100">Deployment URL</h4>
                    <a
                      href={deploymentResult.deploymentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-700 dark:text-green-300 hover:underline"
                    >
                      {deploymentResult.deploymentUrl}
                    </a>
                  </div>
                )}

                {deploymentResult.error && (
                  <Alert>
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>{deploymentResult.error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="status" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Deployment Pipeline Steps</CardTitle>
              <CardDescription>
                Track the progress of your fully automated deployment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                {[
                  { key: 'analysis', title: 'AI Analysis & Error Detection', description: 'Analyze code, find errors, detect framework' },
                  { key: 'fileGeneration', title: 'Missing File Generation', description: 'Generate missing files using LangChain + GPT-4o Mini' },
                  { key: 'dockerBuild', title: 'Docker Image Building', description: 'Build optimized Docker image' },
                  { key: 'dockerPush', title: 'Docker Hub Push', description: 'Push image to Docker Hub' },
                  { key: 'deployment', title: 'Automatic Deployment', description: 'Deploy to selected platform' },
                ].map((step) => (
                  <div key={step.key} className="flex items-center space-x-4 p-4 border rounded-lg">
                    <div className="flex-shrink-0">
                      {deploymentResult ? (
                        getStepIcon(
                          deploymentResult.steps[step.key as keyof typeof deploymentResult.steps],
                          false
                        )
                      ) : (
                        <Clock className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{step.title}</h4>
                      <p className="text-sm text-gray-500">{step.description}</p>
                    </div>
                    <div className="flex-shrink-0">
                      {deploymentResult ? (
                        <Badge variant={
                          deploymentResult.steps[step.key as keyof typeof deploymentResult.steps] 
                            ? 'default' 
                            : 'secondary'
                        }>
                          {deploymentResult.steps[step.key as keyof typeof deploymentResult.steps] 
                            ? 'Completed' 
                            : 'Pending'}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Deployment Logs</CardTitle>
              <CardDescription>
                Real-time logs from the automated deployment pipeline
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm h-96 overflow-y-auto">
                {logs.length > 0 ? (
                  logs.map((log, index) => (
                    <div key={index} className="mb-1">
                      {log}
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500">
                    No logs available. Start a deployment to see real-time logs.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            GitHub Webhook Setup
          </CardTitle>
          <CardDescription>
            Set up automatic deployment on every push to main/master branch
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h4 className="font-medium mb-2">Webhook URL:</h4>
            <code className="text-sm bg-white dark:bg-gray-900 p-2 rounded border block">
              {window.location.origin}/api/auto-deploy/webhook
            </code>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <p>1. Go to your GitHub repository settings</p>
            <p>2. Navigate to Webhooks → Add webhook</p>
            <p>3. Set the URL to the above endpoint</p>
            <p>4. Select "Push events" as the trigger</p>
            <p>5. Save the webhook</p>
            <p className="mt-2 font-medium text-green-600">
              Now every push to main/master will automatically trigger deployment! 🚀
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
