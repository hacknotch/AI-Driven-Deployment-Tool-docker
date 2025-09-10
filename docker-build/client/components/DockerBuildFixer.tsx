import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { SimpleFileUploader } from './SimpleFileUploader';
import { CheckCircle, XCircle, AlertCircle, Wrench, FileText, Container } from 'lucide-react';

interface DockerBuildFixResult {
  success: boolean;
  fixedFiles: string[];
  generatedFiles: GeneratedFile[];
  dockerfileContent: string;
  errorMessage?: string;
}

interface GeneratedFile {
  fileName: string;
  content: string;
  reason: string;
  fileType: 'config' | 'entry' | 'dependency' | 'docker' | 'ignore';
}

interface ProjectAnalysis {
  language: string;
  framework?: string;
  dependencies: string[];
  projectHealth?: 'excellent' | 'good' | 'needs_improvement' | 'critical';
}

export function DockerBuildFixer() {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<DockerBuildFixResult | null>(null);
  const [analysis, setAnalysis] = useState<ProjectAnalysis | null>(null);
  const [progress, setProgress] = useState(0);
  const [userPrompt, setUserPrompt] = useState('');

  const handleFilesChange = (newFiles: File[]) => {
    setFiles(newFiles);
    setResult(null);
    setAnalysis(null);
  };

  const handleFixDockerBuild = async () => {
    if (files.length === 0) {
      alert('Please upload some files first');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setResult(null);

    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });
      if (userPrompt.trim()) {
        formData.append('userPrompt', userPrompt.trim());
      }

      setProgress(25);

      const response = await fetch('/api/docker-build-fix', {
        method: 'POST',
        body: formData,
      });

      setProgress(75);

      const data = await response.json();

      if (data.success) {
        setResult(data.result);
        setAnalysis(data.analysis);
        setProgress(100);
      } else {
        throw new Error(data.error || 'Failed to fix Docker build');
      }
    } catch (error) {
      console.error('Docker build fix error:', error);
      setResult({
        success: false,
        fixedFiles: [],
        generatedFiles: [],
        dockerfileContent: '',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadFile = (fileName: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getHealthColor = (health?: string) => {
    switch (health) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'needs_improvement': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Docker Build Fixer
          </CardTitle>
          <CardDescription>
            Fix Docker build issues using LangChain-powered analysis. Upload your project files and get a proper Dockerfile and .dockerignore generated automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SimpleFileUploader
            onFilesChange={handleFilesChange}
            accept="*/*"
            multiple={true}
            maxFiles={50}
          />

          <div className="space-y-2">
            <label htmlFor="userPrompt" className="text-sm font-medium">
              Additional Instructions (Optional)
            </label>
            <textarea
              id="userPrompt"
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder="e.g., Use Node.js 18, optimize for production, include health checks..."
              className="w-full p-3 border border-gray-300 rounded-md resize-none"
              rows={3}
            />
          </div>

          <Button
            onClick={handleFixDockerBuild}
            disabled={files.length === 0 || isProcessing}
            className="w-full"
          >
            {isProcessing ? 'Fixing Docker Build...' : 'Fix Docker Build'}
          </Button>

          {isProcessing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Processing...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              Fix Result
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.success ? (
              <>
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Docker build issues have been successfully fixed! The following files have been generated or updated.
                  </AlertDescription>
                </Alert>

                {analysis && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium">Project Analysis</h4>
                      <div className="space-y-1 text-sm">
                        <div>Language: <Badge variant="outline">{analysis.language}</Badge></div>
                        {analysis.framework && (
                          <div>Framework: <Badge variant="outline">{analysis.framework}</Badge></div>
                        )}
                        <div>Dependencies: <Badge variant="outline">{analysis.dependencies.length}</Badge></div>
                        <div>Health: <span className={getHealthColor(analysis.projectHealth)}>{analysis.projectHealth || 'unknown'}</span></div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Fixed Files</h4>
                    <div className="flex flex-wrap gap-2">
                      {result.fixedFiles.map((file, index) => (
                        <Badge key={index} variant="secondary">
                          <FileText className="h-3 w-3 mr-1" />
                          {file}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Generated Files</h4>
                    <div className="space-y-2">
                      {result.generatedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-md">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <span className="font-medium">{file.fileName}</span>
                            <Badge variant="outline" className="text-xs">
                              {file.fileType}
                            </Badge>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadFile(file.fileName, file.content)}
                          >
                            Download
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {result.dockerfileContent && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                                                 <h4 className="font-medium flex items-center gap-2">
                           <Container className="h-4 w-4" />
                           Generated Dockerfile
                         </h4>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadFile('Dockerfile', result.dockerfileContent)}
                        >
                          Download
                        </Button>
                      </div>
                      <pre className="bg-gray-100 p-4 rounded-md text-sm overflow-x-auto">
                        {result.dockerfileContent}
                      </pre>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  Failed to fix Docker build: {result.errorMessage}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
