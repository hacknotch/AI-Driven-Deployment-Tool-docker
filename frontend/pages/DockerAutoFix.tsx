import React from 'react';
import Layout from '../components/Layout';
import { DockerAutoFixer } from '../components/DockerAutoFixer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { CheckCircle, AlertTriangle, Bot, FileText, Trash2, RotateCcw, Zap } from 'lucide-react';

export default function DockerAutoFixPage() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Docker Auto-Fixer
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Intelligent Docker build automation that automatically detects missing files, generates placeholders, 
              and retries builds until successful. Powered by LangChain AI.
            </p>
          </div>

          {/* Key Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-purple-600" />
                  AI-Powered Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Uses LangChain to intelligently analyze Docker build errors and determine the best fix strategy.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-green-600" />
                  Auto File Generation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Automatically generates missing files with appropriate content based on project context.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trash2 className="h-5 w-5 text-orange-600" />
                  Smart Cleanup
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Removes unnecessary Dockerfile instructions and cleans up build context automatically.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RotateCcw className="h-5 w-5 text-blue-600" />
                  Auto Retry
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Automatically retries Docker builds with intelligent fixes until successful or max attempts reached.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* How It Works */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-600" />
                How the Auto-Fix Process Works
              </CardTitle>
              <CardDescription>
                The system follows an intelligent workflow to automatically resolve Docker build issues:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <Badge variant="outline" className="mt-1 text-lg px-3 py-1">1</Badge>
                  <div>
                    <h4 className="font-medium text-lg">Error Detection & Analysis</h4>
                    <p className="text-gray-600 mt-1">
                      When a Docker build fails, the system uses LangChain to analyze the error output and identify:
                    </p>
                    <ul className="list-disc list-inside text-sm text-gray-600 mt-2 space-y-1">
                      <li>Missing file paths and types</li>
                      <li>Error severity and suggested actions</li>
                      <li>Whether to generate files or remove instructions</li>
                    </ul>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <Badge variant="outline" className="mt-1 text-lg px-3 py-1">2</Badge>
                  <div>
                    <h4 className="font-medium text-lg">Intelligent File Generation</h4>
                    <p className="text-gray-600 mt-1">
                      For missing files, the system generates appropriate content based on file type:
                    </p>
                    <ul className="list-disc list-inside text-sm text-gray-600 mt-2 space-y-1">
                      <li><strong>Config files</strong> (.json, .yml): Minimal valid configurations</li>
                      <li><strong>Documentation</strong> (.md, .mdc): Basic templates with proper structure</li>
                      <li><strong>Source files</strong> (.py, .js, .sh): Safe placeholders with clear headers</li>
                      <li><strong>Environment files</strong> (.env): Template with common variables</li>
                    </ul>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <Badge variant="outline" className="mt-1 text-lg px-3 py-1">3</Badge>
                  <div>
                    <h4 className="font-medium text-lg">Smart Instruction Removal</h4>
                    <p className="text-gray-600 mt-1">
                      For unnecessary files, the system automatically removes corresponding Dockerfile instructions:
                    </p>
                    <ul className="list-disc list-inside text-sm text-gray-600 mt-2 space-y-1">
                      <li>Development files (node_modules, .git, dist)</li>
                      <li>IDE files (.vscode, .idea)</li>
                      <li>Log files and temporary files</li>
                      <li>OS-specific files (.DS_Store, Thumbs.db)</li>
                    </ul>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <Badge variant="outline" className="mt-1 text-lg px-3 py-1">4</Badge>
                  <div>
                    <h4 className="font-medium text-lg">Automatic Retry & Validation</h4>
                    <p className="text-gray-600 mt-1">
                      The system automatically retries the Docker build after applying fixes:
                    </p>
                    <ul className="list-disc list-inside text-sm text-gray-600 mt-2 space-y-1">
                      <li>Up to 3 attempts (configurable)</li>
                      <li>Real-time progress tracking</li>
                      <li>Comprehensive logging of all actions</li>
                      <li>Success confirmation or detailed failure analysis</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Supported Error Types */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                Supported Error Types & Fixes
              </CardTitle>
              <CardDescription>
                The auto-fixer can handle these common Docker build issues:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-lg">Missing File Errors</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">"lstat ... no such file or directory"</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">"COPY failed: file not found"</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">"ADD failed: file not found"</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">"failed to compute cache key"</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-lg">File Types Handled</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Config files (.json, .yml, .toml, .ini)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Documentation (.md, .mdc, .txt)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Source files (.py, .js, .ts, .sh)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Environment files (.env, .env.example)</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Docker Auto-Fixer Component */}
          <DockerAutoFixer />

          {/* Benefits */}
          <Card>
            <CardHeader>
              <CardTitle>Why Use Docker Auto-Fixer?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-lg">🚀 Productivity Benefits</h4>
                  <ul className="list-disc list-inside text-gray-600 space-y-2">
                    <li>Eliminates manual error debugging time</li>
                    <li>Automatically generates missing files</li>
                    <li>Reduces build context size by removing unnecessary files</li>
                    <li>Provides real-time feedback and progress tracking</li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-lg">🛡️ Reliability Benefits</h4>
                  <ul className="list-disc list-inside text-gray-600 space-y-2">
                    <li>Consistent error handling across different projects</li>
                    <li>AI-powered analysis ensures appropriate fixes</li>
                    <li>Fallback content generation for edge cases</li>
                    <li>Comprehensive logging for troubleshooting</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Support */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Need help?</strong> The Docker Auto-Fixer is designed to handle most common missing file errors automatically. 
              If you encounter issues that the auto-fixer cannot resolve, check the detailed logs and consider manual intervention 
              for complex dependency or permission issues.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </Layout>
  );
}

