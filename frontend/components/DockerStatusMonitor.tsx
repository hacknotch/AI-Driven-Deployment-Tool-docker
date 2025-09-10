import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Play, Download, Info } from 'lucide-react';

interface DockerStatus {
  isInstalled: boolean;
  isRunning: boolean;
  version?: string;
  error?: string;
  canBuild: boolean;
}

interface DockerHealth {
  docker: DockerStatus;
  buildTest: {
    success: boolean;
    error?: string;
    output?: string;
  };
  overall: 'healthy' | 'unhealthy';
  recommendations: string[];
}

export default function DockerStatusMonitor() {
  const [dockerStatus, setDockerStatus] = useState<DockerStatus | null>(null);
  const [dockerHealth, setDockerHealth] = useState<DockerHealth | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkDockerStatus = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/docker-status/check');
      const result = await response.json();
      
      if (result.success) {
        setDockerStatus(result.status);
        setLastChecked(new Date());
      }
    } catch (error) {
      console.error('Failed to check Docker status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const runHealthCheck = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/docker-status/health');
      const result = await response.json();
      
      if (result.success) {
        setDockerHealth(result.health);
        setDockerStatus(result.health.docker);
        setLastChecked(new Date());
      }
    } catch (error) {
      console.error('Failed to run health check:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startDockerDesktop = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/docker-status/start-desktop', {
        method: 'POST'
      });
      const result = await response.json();
      
      if (result.success) {
        // Wait a bit and then check status again
        setTimeout(() => {
          checkDockerStatus();
        }, 3000);
      }
    } catch (error) {
      console.error('Failed to start Docker Desktop:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testDockerBuild = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/docker-status/test-build');
      const result = await response.json();
      
      if (result.success) {
        alert('Docker build test successful!');
      } else {
        alert(`Docker build test failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to test Docker build:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkDockerStatus();
  }, []);

  const getStatusIcon = (status: DockerStatus | null) => {
    if (!status) return <AlertTriangle className="h-5 w-5 text-gray-500" />;
    
    if (status.canBuild) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else if (status.isInstalled) {
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    } else {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusColor = (status: DockerStatus | null) => {
    if (!status) return 'secondary';
    
    if (status.canBuild) return 'default';
    if (status.isInstalled) return 'secondary';
    return 'destructive';
  };

  const getStatusText = (status: DockerStatus | null) => {
    if (!status) return 'Unknown';
    
    if (status.canBuild) return 'Ready';
    if (status.isInstalled && !status.isRunning) return 'Not Running';
    if (status.isInstalled) return 'Installed';
    return 'Not Installed';
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          🐳 Docker Status Monitor
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-lg">
          Monitor Docker installation and running status for automated deployments
        </p>
      </div>

      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon(dockerStatus)}
            Docker Status Overview
          </CardTitle>
          <CardDescription>
            Current Docker installation and running status
            {lastChecked && (
              <span className="block text-xs text-gray-500 mt-1">
                Last checked: {lastChecked.toLocaleTimeString()}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant={getStatusColor(dockerStatus)}>
                {getStatusText(dockerStatus)}
              </Badge>
              {dockerStatus?.version && (
                <Badge variant="outline">{dockerStatus.version}</Badge>
              )}
            </div>
            <Button 
              onClick={checkDockerStatus} 
              disabled={isLoading}
              size="sm"
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {dockerStatus?.error && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{dockerStatus.error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold">
                {dockerStatus?.isInstalled ? '✅' : '❌'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Docker Installed
              </div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold">
                {dockerStatus?.isRunning ? '✅' : '❌'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Docker Running
              </div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold">
                {dockerStatus?.canBuild ? '✅' : '❌'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Can Build
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              onClick={startDockerDesktop}
              disabled={isLoading || dockerStatus?.isRunning}
              className="w-full"
            >
              <Play className="h-4 w-4 mr-2" />
              Start Docker Desktop
            </Button>
            
            <Button 
              onClick={testDockerBuild}
              disabled={isLoading || !dockerStatus?.isRunning}
              className="w-full"
              variant="outline"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Test Docker Build
            </Button>
            
            <Button 
              onClick={runHealthCheck}
              disabled={isLoading}
              className="w-full"
              variant="outline"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Full Health Check
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Installation Guide
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Docker Desktop is required for automated deployments
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <h4 className="font-medium">Windows:</h4>
              <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>1. Download Docker Desktop from docker.com</li>
                <li>2. Run the installer</li>
                <li>3. Start Docker Desktop</li>
                <li>4. Wait for it to fully initialize</li>
              </ol>
            </div>
            
            <Button 
              onClick={() => window.open('https://www.docker.com/products/docker-desktop/', '_blank')}
              className="w-full"
              variant="outline"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Docker Desktop
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Health Check Results */}
      {dockerHealth && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {dockerHealth.overall === 'healthy' ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              Health Check Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant={dockerHealth.overall === 'healthy' ? 'default' : 'destructive'}>
                {dockerHealth.overall === 'healthy' ? 'Healthy' : 'Unhealthy'}
              </Badge>
            </div>

            {dockerHealth.buildTest && (
              <div>
                <h4 className="font-medium mb-2">Build Test:</h4>
                <div className={`p-3 rounded ${
                  dockerHealth.buildTest.success 
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200' 
                    : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                }`}>
                  {dockerHealth.buildTest.success ? '✅ Build test passed' : `❌ Build test failed: ${dockerHealth.buildTest.error}`}
                </div>
              </div>
            )}

            {dockerHealth.recommendations.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Recommendations:</h4>
                <ul className="space-y-1">
                  {dockerHealth.recommendations.map((rec, index) => (
                    <li key={index} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                      <span className="text-blue-500">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
