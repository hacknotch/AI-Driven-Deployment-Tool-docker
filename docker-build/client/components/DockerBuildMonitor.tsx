import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, AlertTriangle, Wrench, Play, Eye } from 'lucide-react';

interface DockerError {
  type: 'missing_file' | 'syntax_error' | 'dependency_error' | 'language_mismatch' | 'permission_error';
  message: string;
  line?: number;
  file?: string;
  suggestion: string;
  fix: string;
}

interface BuildResult {
  success: boolean;
  imageName?: string;
  errors: DockerError[];
  logs: string[];
  fixedDockerfile?: string;
}

export default function DockerBuildMonitor() {
  const [dockerfile, setDockerfile] = useState(`FROM golang:1.21 AS builder

WORKDIR /app

COPY go.mod go.sum ./

RUN go mod download

COPY . .

RUN go build -o process_cursor_links process_cursor_links.py

FROM python:3.11-slim

WORKDIR /app

COPY --from=builder /app/process_cursor_links .

COPY . .

RUN pip install --no-cache-dir -r requirements.txt

RUN adduser --disabled-password --gecos '' appuser
USER appuser

EXPOSE 8080

CMD ["python", "process_cursor_links.py"]

HEALTHCHECK --interval=30s --timeout=3s CMD curl -f http://localhost:8080/ || exit 1`);

  const [validationErrors, setValidationErrors] = useState<DockerError[]>([]);
  const [buildResult, setBuildResult] = useState<BuildResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('validate');

  const validateDockerfile = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/docker-monitor/validate-dockerfile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dockerfile })
      });

      const result = await response.json();
      setValidationErrors(result.errors || []);
    } catch (error) {
      console.error('Validation error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const buildWithAutoFix = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/docker-monitor/build-with-auto-fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          dockerfile, 
          imageName: 'test-auto-fix-image',
          maxRetries: 3 
        })
      });

      const result = await response.json();
      setBuildResult(result);
      if (result.fixedDockerfile) {
        setDockerfile(result.fixedDockerfile);
      }
    } catch (error) {
      console.error('Build error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testWithProblematicDockerfile = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/docker-monitor/test-build');
      const result = await response.json();
      
      if (result.success) {
        setDockerfile(result.fixedDockerfile);
        setValidationErrors(result.validationErrors);
        setBuildResult({
          success: true,
          errors: result.validationErrors,
          logs: [`Auto-fixed ${result.analysis.issuesFixed} issues`],
          fixedDockerfile: result.fixedDockerfile
        });
      }
    } catch (error) {
      console.error('Test error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getErrorIcon = (type: string) => {
    switch (type) {
      case 'missing_file': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'language_mismatch': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'syntax_error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'dependency_error': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'permission_error': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getErrorColor = (type: string) => {
    switch (type) {
      case 'missing_file': return 'destructive';
      case 'language_mismatch': return 'secondary';
      case 'syntax_error': return 'destructive';
      case 'dependency_error': return 'outline';
      case 'permission_error': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          🐳 Docker Build Monitor
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-lg">
          Intelligent Docker build monitoring with automatic error detection and fixing
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="validate">🔍 Validate</TabsTrigger>
          <TabsTrigger value="build">🔨 Build & Fix</TabsTrigger>
          <TabsTrigger value="test">🧪 Test Demo</TabsTrigger>
        </TabsList>

        <TabsContent value="validate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Dockerfile Validation
              </CardTitle>
              <CardDescription>
                Analyze your Dockerfile for common issues before building
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={dockerfile}
                onChange={(e) => setDockerfile(e.target.value)}
                placeholder="Paste your Dockerfile here..."
                className="min-h-[300px] font-mono text-sm"
              />
              <Button 
                onClick={validateDockerfile} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Validating...' : '🔍 Validate Dockerfile'}
              </Button>

              {validationErrors.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Found {validationErrors.length} potential issues in your Dockerfile
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                {validationErrors.map((error, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-start gap-3">
                      {getErrorIcon(error.type)}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={getErrorColor(error.type)}>
                            {error.type.replace('_', ' ')}
                          </Badge>
                          {error.line && (
                            <Badge variant="outline">Line {error.line}</Badge>
                          )}
                        </div>
                        <p className="font-medium">{error.message}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          💡 {error.suggestion}
                        </p>
                        <p className="text-sm font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded">
                          🔧 Fix: {error.fix}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="build" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Build with Auto-Fix
              </CardTitle>
              <CardDescription>
                Build your Docker image with automatic error detection and fixing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={buildWithAutoFix} 
                disabled={isLoading}
                className="w-full"
                size="lg"
              >
                {isLoading ? 'Building with Auto-Fix...' : '🚀 Build with Auto-Fix'}
              </Button>

              {buildResult && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {buildResult.success ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      Build Result
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge variant={buildResult.success ? 'default' : 'destructive'}>
                        {buildResult.success ? 'Success' : 'Failed'}
                      </Badge>
                      {buildResult.imageName && (
                        <Badge variant="outline">{buildResult.imageName}</Badge>
                      )}
                    </div>

                    {buildResult.errors.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Errors Found & Fixed:</h4>
                        <div className="space-y-2">
                          {buildResult.errors.map((error, index) => (
                            <div key={index} className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                              {getErrorIcon(error.type)}
                              <div>
                                <p className="text-sm font-medium">{error.message}</p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  Fixed: {error.fix}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {buildResult.logs.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Build Logs:</h4>
                        <div className="bg-black text-green-400 p-4 rounded font-mono text-sm max-h-40 overflow-y-auto">
                          {buildResult.logs.map((log, index) => (
                            <div key={index}>{log}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Test with Problematic Dockerfile
              </CardTitle>
              <CardDescription>
                Test the auto-fix system with a Dockerfile that has common issues
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This will test the system with a Dockerfile that has mixed Go/Python issues, 
                  missing files, and other common problems.
                </AlertDescription>
              </Alert>

              <Button 
                onClick={testWithProblematicDockerfile} 
                disabled={isLoading}
                className="w-full"
                size="lg"
              >
                {isLoading ? 'Testing Auto-Fix...' : '🧪 Test Auto-Fix System'}
              </Button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Common Issues Detected</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-500" />
                        Mixed Go and Python base images
                      </li>
                      <li className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-500" />
                        Building .py file with go build
                      </li>
                      <li className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-500" />
                        Missing requirements.txt
                      </li>
                      <li className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-500" />
                        Missing go.sum file
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Auto-Fix Capabilities</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Language mismatch detection
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Missing file generation
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Base image correction
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Build command fixes
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
