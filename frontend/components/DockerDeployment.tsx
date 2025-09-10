import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Container, 
  Upload, 
  Play, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Copy,
  ExternalLink,
  Loader2
} from 'lucide-react';

interface DockerDeploymentProps {
  deploymentId: string;
  dockerfile: string;
  analysis: any;
  generatedFiles: any[];
  repoUrl?: string;
}

interface BuildResult {
  success: boolean;
  message: string;
  imageName: string;
  buildLogs: string[];
  pushResult?: {
    success: boolean;
    imageUrl?: string;
    pullCommand?: string;
    error?: string;
  };
  commands: {
    run: string;
    pull?: string;
  };
}

export const DockerDeployment: React.FC<DockerDeploymentProps> = ({
  deploymentId,
  dockerfile,
  analysis,
  generatedFiles,
  repoUrl
}) => {
  const [dockerHubUsername, setDockerHubUsername] = useState('');
  const [dockerHubPassword, setDockerHubPassword] = useState('');
  const [imageName, setImageName] = useState('');
  const [pushToHub, setPushToHub] = useState(true);
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildResult, setBuildResult] = useState<BuildResult | null>(null);
  const [error, setError] = useState('');

  const handleBuild = async () => {
    if (!dockerfile) {
      setError('Dockerfile is required for building');
      return;
    }

    setIsBuilding(true);
    setError('');
    setBuildResult(null);

    try {
      // Convert generated files to the format expected by the API
      const files = generatedFiles.map(file => ({
        name: file.fileName,
        path: file.fileName,
        type: 'file',
        content: file.content
      }));

      const response = await fetch(`/api/deployments/${deploymentId}/build`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repoUrl,
          dockerfile,
          files,
          dockerHubUsername: pushToHub ? dockerHubUsername : undefined,
          dockerHubPassword: pushToHub ? dockerHubPassword : undefined,
          imageName: imageName || undefined,
          pushToHub
        }),
      });

      const result = await response.json();

      if (result.success) {
        setBuildResult(result);
      } else {
        setError(result.error || 'Build failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error occurred');
    } finally {
      setIsBuilding(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getLogIcon = (log: string) => {
    if (log.includes('✅') || log.includes('Success')) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (log.includes('❌') || log.includes('Error') || log.includes('Failed')) return <XCircle className="h-4 w-4 text-red-500" />;
    if (log.includes('⚠️') || log.includes('Warning')) return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return <Container className="h-4 w-4 text-blue-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Docker Build Configuration */}
      <Card>
        <CardHeader>
                     <CardTitle className="flex items-center gap-2">
             <Container className="h-5 w-5" />
             Docker Build & Deployment
           </CardTitle>
          <CardDescription>
            Build your Docker image and optionally push it to Docker Hub
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="imageName">Image Name (Optional)</Label>
              <Input
                id="imageName"
                placeholder="myusername/myapp:latest"
                value={imageName}
                onChange={(e) => setImageName(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty to auto-generate from repository name
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="pushToHub"
                checked={pushToHub}
                onChange={(e) => setPushToHub(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="pushToHub">Push to Docker Hub</Label>
            </div>
          </div>

          {pushToHub && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dockerHubUsername">Docker Hub Username</Label>
                <Input
                  id="dockerHubUsername"
                  placeholder="your-username"
                  value={dockerHubUsername}
                  onChange={(e) => setDockerHubUsername(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="dockerHubPassword">Docker Hub Password/Token</Label>
                <Input
                  id="dockerHubPassword"
                  type="password"
                  placeholder="your-password-or-token"
                  value={dockerHubPassword}
                  onChange={(e) => setDockerHubPassword(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use an access token for better security
                </p>
              </div>
            </div>
          )}

          <Button 
            onClick={handleBuild} 
            disabled={isBuilding || !dockerfile}
            className="w-full"
          >
            {isBuilding ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Building Docker Image...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Build & Deploy
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Build Results */}
      {buildResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {buildResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              Build Results
            </CardTitle>
            <CardDescription>
              {buildResult.success ? 'Docker image built successfully!' : 'Build failed'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="logs">Build Logs</TabsTrigger>
                <TabsTrigger value="commands">Commands</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Image Name:</span>
                    <Badge variant="outline">{buildResult.imageName}</Badge>
                  </div>
                  
                  {buildResult.pushResult && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Docker Hub Push:</span>
                        <Badge variant={buildResult.pushResult.success ? "default" : "destructive"}>
                          {buildResult.pushResult.success ? "Success" : "Failed"}
                        </Badge>
                      </div>
                      
                      {buildResult.pushResult.success && buildResult.pushResult.imageUrl && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Image URL:</span>
                          <a 
                            href={buildResult.pushResult.imageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          >
                            View on Docker Hub
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                      
                      {buildResult.pushResult.error && (
                        <Alert className="border-yellow-200 bg-yellow-50">
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          <AlertDescription className="text-yellow-800">
                            {buildResult.pushResult.error}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="logs" className="mt-6">
                <div className="bg-slate-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
                  {buildResult.buildLogs.map((log, index) => (
                    <div key={index} className="flex items-start gap-2 mb-1">
                      {getLogIcon(log)}
                      <span className="flex-1">{log}</span>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="commands" className="mt-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Run the container:</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Textarea
                        value={buildResult.commands.run}
                        readOnly
                        className="font-mono text-sm"
                        rows={1}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(buildResult.commands.run)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {buildResult.commands.pull && (
                    <div>
                      <Label className="text-sm font-medium">Pull the image:</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Textarea
                          value={buildResult.commands.pull}
                          readOnly
                          className="font-mono text-sm"
                          rows={1}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(buildResult.commands.pull!)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
