import React, { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { SimpleFileUploader } from './SimpleFileUploader';
import { CheckCircle, XCircle, AlertCircle, Bot, FileText, Trash2, Download, Play, RotateCcw, Brain, Zap, FileCheck, Container } from 'lucide-react';

interface DockerBuildError {
  type: 'missing_file' | 'permission' | 'syntax' | 'dependency' | 'unknown';
  missingFile?: string;
  errorMessage: string;
  lineNumber?: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestedAction: 'generate_file' | 'remove_instruction' | 'fix_permission' | 'manual_fix';
}

interface GeneratedFile {
  fileName: string;
  content: string;
  reason: string;
  action: 'created' | 'placeholder' | 'template';
}

interface DockerAutoFixResult {
  success: boolean;
  attempts: number;
  maxAttempts: number;
  errors: DockerBuildError[];
  generatedFiles: GeneratedFile[];
  removedInstructions: string[];
  buildLogs: string[];
  finalDockerfile?: string;
}

interface ProjectAnalysis {
  language: string;
  framework?: string;
  dependencies: string[];
  projectHealth?: 'excellent' | 'good' | 'needs_improvement' | 'critical';
}

export function DockerAutoFixer() {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<DockerAutoFixResult | null>(null);
  const [analysis, setAnalysis] = useState<ProjectAnalysis | null>(null);
  const [progress, setProgress] = useState(0);
  const [userPrompt, setUserPrompt] = useState('');
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [logs, setLogs] = useState<string[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const handleFilesChange = (newFiles: File[]) => {
    setFiles(newFiles);
    setResult(null);
    setAnalysis(null);
    setLogs([]);
  };

  const handleAutoFix = async () => {
    if (files.length === 0) {
      alert('Please upload some files first');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setResult(null);
    setLogs([]);

    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });
      if (userPrompt.trim()) {
        formData.append('userPrompt', userPrompt.trim());
      }
      formData.append('maxAttempts', maxAttempts.toString());

      const response = await fetch('/api/docker-auto-fix', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.result);
        setAnalysis(data.analysis);
        setLogs(data.logs || []);
        setProgress(100);
      } else {
        throw new Error(data.error || 'Failed to auto-fix Docker build');
      }
    } catch (error) {
      console.error('Docker auto-fix error:', error);
      setLogs([`Error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStreamingAutoFix = async () => {
    if (files.length === 0) {
      alert('Please upload some files first');
      return;
    }

    setIsStreaming(true);
    setIsProcessing(true);
    setProgress(0);
    setResult(null);
    setLogs([]);

    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });
      if (userPrompt.trim()) {
        formData.append('userPrompt', userPrompt.trim());
      }
      formData.append('maxAttempts', maxAttempts.toString());

      const response = await fetch('/api/docker-auto-fix/stream', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to start streaming auto-fix');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            const eventType = line.substring(7);
            const dataLine = lines[lines.indexOf(line) + 1];
            if (dataLine?.startsWith('data: ')) {
              const data = JSON.parse(dataLine.substring(6));
              handleStreamEvent(eventType, data);
            }
          }
        }
      }
    } catch (error) {
      console.error('Streaming auto-fix error:', error);
      setLogs(prev => [...prev, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    } finally {
      setIsProcessing(false);
      setIsStreaming(false);
    }
  };

  const handleStartDocker = async () => {
    try {
      setLogs(['🚀 Attempting to start Docker Desktop...']);
      
      const response = await fetch('/api/docker-auto-fix/start-docker', {
        method: 'POST',
      });

      const data = await response.json();
      
      if (data.success) {
        setLogs(prev => [...prev, '✅ Docker Desktop start command sent!', ...data.instructions]);
      } else {
        setLogs(prev => [...prev, '❌ Failed to start Docker Desktop automatically', ...data.instructions]);
      }
    } catch (error) {
      console.error('Start Docker error:', error);
      setLogs(prev => [...prev, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    }
  };

  const handleStreamEvent = (eventType: string, data: any) => {
    switch (eventType) {
      case 'start':
        setLogs(prev => [...prev, data.message]);
        break;
      case 'analyze':
        setLogs(prev => [...prev, data.message]);
        break;
      case 'analyze_complete':
        setAnalysis(data.analysis);
        setLogs(prev => [...prev, data.message]);
        break;
      case 'build_context':
        setLogs(prev => [...prev, data.message]);
        break;
      case 'log':
        setLogs(prev => [...prev, data.message]);
        break;
      case 'progress':
        setProgress(data.progress);
        break;
      case 'complete':
        setResult(data.result);
        setLogs(prev => [...prev, data.message]);
        break;
      case 'error':
        setLogs(prev => [...prev, `Error: ${data.error}`]);
        break;
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

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-green-600 bg-green-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'critical': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'generate_file': return <FileText className="h-4 w-4" />;
      case 'remove_instruction': return <Trash2 className="h-4 w-4" />;
      case 'fix_permission': return <AlertCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            LangChain-Powered Docker Auto-Fixer
          </CardTitle>
          <CardDescription>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              AI-powered Docker build automation that intelligently detects missing files, generates smart placeholders using LangChain, and automatically retries builds.
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SimpleFileUploader
            onFilesChange={handleFilesChange}
            accept="*/*"
            multiple={true}
            maxFiles={100}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <div className="space-y-2">
              <label htmlFor="maxAttempts" className="text-sm font-medium">
                Max Retry Attempts
              </label>
              <input
                id="maxAttempts"
                type="number"
                min="1"
                max="5"
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(parseInt(e.target.value) || 3)}
                className="w-full p-3 border border-gray-300 rounded-md"
              />
            </div>
          </div>

                     <div className="flex gap-2">
             <Button
               onClick={handleAutoFix}
               disabled={files.length === 0 || isProcessing}
               className="flex-1"
             >
               <Play className="h-4 w-4 mr-2" />
               {isProcessing ? 'Auto-Fixing...' : 'Start Auto-Fix'}
             </Button>

             <Button
               onClick={handleStreamingAutoFix}
               disabled={files.length === 0 || isProcessing}
               variant="outline"
               className="flex-1"
             >
               <RotateCcw className="h-4 w-4 mr-2" />
               {isStreaming ? 'Streaming...' : 'Stream Auto-Fix'}
             </Button>
           </div>

           <div className="flex gap-2">
             <Button
               onClick={handleStartDocker}
               disabled={isProcessing}
               variant="secondary"
               className="flex-1"
             >
               <Container className="h-4 w-4 mr-2" />
               Start Docker Desktop
             </Button>
           </div>

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

      {/* Logs */}
      {logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Auto-Fix Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-900 text-green-400 p-4 rounded-md font-mono text-sm max-h-64 overflow-y-auto">
              {logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              Auto-Fix Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              {result.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                {result.success 
                  ? `Docker build issues fixed successfully after ${result.attempts} attempts!`
                  : `Auto-fix completed after ${result.attempts} attempts with issues.`
                }
              </AlertDescription>
            </Alert>

            {/* Attempts Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{result.attempts}</div>
                <div className="text-sm text-gray-600">Attempts Made</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{result.generatedFiles.length}</div>
                <div className="text-sm text-gray-600">Files Generated</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{result.removedInstructions.length}</div>
                <div className="text-sm text-gray-600">Instructions Removed</div>
              </div>
            </div>

            {/* Errors Detected */}
            {result.errors.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Brain className="h-4 w-4 text-purple-600" />
                  LangChain-Analyzed Errors & AI-Generated Fixes
                </h4>
                <div className="space-y-2">
                  {result.errors.map((error, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-md bg-gradient-to-r from-purple-50 to-blue-50">
                      <div className="flex items-center gap-2">
                        {getActionIcon(error.suggestedAction)}
                        <span className="font-medium">{error.type}</span>
                        <Badge className={getSeverityColor(error.severity)}>
                          {error.severity}
                        </Badge>
                        {error.missingFile && (
                          <span className="text-sm text-gray-600 font-mono bg-gray-100 px-2 py-1 rounded">
                            {error.missingFile}
                          </span>
                        )}
                        <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700">
                          AI-Analyzed
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Generated Files */}
            {result.generatedFiles.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <FileCheck className="h-4 w-4 text-green-600" />
                  LangChain-Generated Files
                </h4>
                <div className="space-y-2">
                  {result.generatedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-md bg-gradient-to-r from-green-50 to-emerald-50">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-green-600" />
                        <span className="font-medium">{file.fileName}</span>
                        <Badge variant="outline" className="text-xs bg-green-100 text-green-700">
                          {file.action}
                        </Badge>
                        <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700">
                          AI-Generated
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadFile(file.fileName, file.content)}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Removed Instructions */}
            {result.removedInstructions.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Removed Dockerfile Instructions</h4>
                <div className="space-y-2">
                  {result.removedInstructions.map((instruction, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                      <Trash2 className="h-4 w-4 text-red-600" />
                      <code className="text-sm text-red-800">{instruction}</code>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Final Dockerfile */}
            {result.finalDockerfile && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Updated Dockerfile</h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadFile('Dockerfile', result.finalDockerfile!)}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Download
                  </Button>
                </div>
                <pre className="bg-gray-100 p-4 rounded-md text-sm overflow-x-auto max-h-64">
                  {result.finalDockerfile}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
