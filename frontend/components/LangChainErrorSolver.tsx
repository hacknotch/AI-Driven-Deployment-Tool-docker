import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Brain, Zap, FileCheck, Download, Play, TestTube, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface ErrorAnalysis {
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

interface Solution {
  type: 'file_generated' | 'generation_failed' | 'skip_generation' | 'specific_fix';
  fileName?: string;
  action?: string;
  content?: string;
  description?: string;
  error?: string;
  reason?: string;
}

interface LangChainResult {
  success: boolean;
  analysis: ErrorAnalysis;
  solutions: Solution[];
  generatedFiles: GeneratedFile[];
  recommendations: string[];
}

export function LangChainErrorSolver() {
  const [errorMessage, setErrorMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<LangChainResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const handleAnalyzeError = async () => {
    if (!errorMessage.trim()) {
      alert('Please enter an error message');
      return;
    }

    setIsProcessing(true);
    setResult(null);

    try {
      const response = await fetch('/api/langchain-docker-fix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          errorMessage: errorMessage.trim(),
          projectFiles: [
            { path: 'package.json', name: 'package.json' },
            { path: 'src/index.js', name: 'index.js' },
            { path: 'Dockerfile', name: 'Dockerfile' }
          ]
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data);
      } else {
        throw new Error(data.error || 'Failed to analyze error');
      }
    } catch (error) {
      console.error('Error analysis failed:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTestBuilderError = async () => {
    setIsTesting(true);
    setResult(null);

    try {
      const response = await fetch('/api/test-builder-error', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setResult({
          success: true,
          analysis: data.analysis,
          solutions: [{
            type: 'specific_fix',
            fileName: data.generatedFile.fileName,
            action: data.generatedFile.action,
            content: data.generatedFile.content,
            description: 'Generated Netlify build rule file'
          }],
          generatedFiles: [data.generatedFile],
          recommendations: [
            'Update .dockerignore to exclude .builder/ directory',
            'Verify the generated file meets your deployment requirements'
          ]
        });
      } else {
        throw new Error(data.error || 'Test failed');
      }
    } catch (error) {
      console.error('Test failed:', error);
      alert(`Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsTesting(false);
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
      case 'generate_file': return <FileCheck className="h-4 w-4" />;
      case 'remove_instruction': return <XCircle className="h-4 w-4" />;
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
            LangChain Docker Error Solver
          </CardTitle>
          <CardDescription>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              AI-powered analysis and automatic fixing of Docker build errors using LangChain
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="errorMessage" className="text-sm font-medium">
              Docker Build Error Message
            </label>
            <textarea
              id="errorMessage"
              value={errorMessage}
              onChange={(e) => setErrorMessage(e.target.value)}
              placeholder="Paste your Docker build error here, e.g., 'failed to solve: invalid file request .builder/rules/deploy-app.mdc'"
              className="w-full p-3 border border-gray-300 rounded-md resize-none font-mono text-sm"
              rows={4}
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleAnalyzeError}
              disabled={!errorMessage.trim() || isProcessing}
              className="flex-1"
            >
              <Brain className="h-4 w-4 mr-2" />
              {isProcessing ? 'Analyzing...' : 'Analyze with LangChain'}
            </Button>

            <Button
              onClick={handleTestBuilderError}
              disabled={isTesting}
              variant="outline"
              className="flex-1"
            >
              <TestTube className="h-4 w-4 mr-2" />
              {isTesting ? 'Testing...' : 'Test .builder Error'}
            </Button>
          </div>
        </CardContent>
      </Card>

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
              LangChain Analysis Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Error Analysis */}
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Brain className="h-4 w-4 text-purple-600" />
                AI Error Analysis
              </h4>
              <div className="p-3 border rounded-md bg-gradient-to-r from-purple-50 to-blue-50">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium">Type:</span>
                  <Badge variant="outline">{result.analysis.type}</Badge>
                  <Badge className={getSeverityColor(result.analysis.severity)}>
                    {result.analysis.severity}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium">Action:</span>
                  <Badge variant="outline" className="bg-blue-100 text-blue-700">
                    {result.analysis.suggestedAction}
                  </Badge>
                </div>
                {result.analysis.missingFile && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Missing File:</span>
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                      {result.analysis.missingFile}
                    </code>
                  </div>
                )}
              </div>
            </div>

            {/* Solutions */}
            {result.solutions.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-600" />
                  AI-Generated Solutions
                </h4>
                <div className="space-y-2">
                  {result.solutions.map((solution, index) => (
                    <div key={index} className="p-3 border rounded-md bg-gradient-to-r from-yellow-50 to-orange-50">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-700">
                          {solution.type}
                        </Badge>
                        {solution.fileName && (
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                            {solution.fileName}
                          </code>
                        )}
                      </div>
                      {solution.description && (
                        <p className="text-sm text-gray-700">{solution.description}</p>
                      )}
                      {solution.reason && (
                        <p className="text-sm text-gray-600">{solution.reason}</p>
                      )}
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
                    <div key={index} className="p-3 border rounded-md bg-gradient-to-r from-green-50 to-emerald-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <FileCheck className="h-4 w-4 text-green-600" />
                          <span className="font-medium">{file.fileName}</span>
                          <Badge variant="outline" className="bg-green-100 text-green-700">
                            {file.action}
                          </Badge>
                          <Badge variant="outline" className="bg-purple-100 text-purple-700">
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
                      <p className="text-sm text-gray-700 mb-2">{file.reason}</p>
                      <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto max-h-32">
                        {file.content.substring(0, 200)}
                        {file.content.length > 200 && '...'}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  AI Recommendations
                </h4>
                <div className="space-y-2">
                  {result.recommendations.map((recommendation, index) => (
                    <div key={index} className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-blue-800">{recommendation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
