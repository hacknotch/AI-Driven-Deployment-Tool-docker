import React from 'react';
import Layout from '../components/Layout';
import { DockerBuildFixer } from '../components/DockerBuildFixer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { CheckCircle, AlertTriangle, Wrench, FileText, Container } from 'lucide-react';

export default function DockerBuildFixPage() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Docker Build Fixer
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Fix Docker build issues automatically using LangChain-powered analysis. 
              Upload your project files and get proper Dockerfile and .dockerignore generated.
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-blue-600" />
                  Intelligent Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Uses LangChain to analyze your project structure and identify Docker build issues automatically.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-green-600" />
                  Auto-Generated Files
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Generates proper .dockerignore and Dockerfile files optimized for your specific project.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                                 <CardTitle className="flex items-center gap-2">
                   <Container className="h-5 w-5 text-purple-600" />
                   Production Ready
                 </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Creates production-ready Docker configurations following best practices and security guidelines.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Common Issues */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                Common Docker Build Issues Fixed
              </CardTitle>
              <CardDescription>
                This tool automatically fixes these common Docker build problems:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Invalid file requests (.builder/rules/deploy-app.mdc)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Missing .dockerignore files</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Incorrect Dockerfile configurations</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Development files in build context</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Missing dependency files</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Incorrect base images</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Security vulnerabilities</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Build optimization issues</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* How It Works */}
          <Card>
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
              <CardDescription>
                The Docker Build Fixer uses advanced AI to analyze and fix your Docker build issues:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-1">1</Badge>
                  <div>
                    <h4 className="font-medium">Project Analysis</h4>
                    <p className="text-sm text-gray-600">
                      LangChain analyzes your project structure, dependencies, and identifies the application type.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-1">2</Badge>
                  <div>
                    <h4 className="font-medium">Issue Detection</h4>
                    <p className="text-sm text-gray-600">
                      Identifies problematic files and Docker build issues automatically.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-1">3</Badge>
                  <div>
                    <h4 className="font-medium">File Generation</h4>
                    <p className="text-sm text-gray-600">
                      Generates proper .dockerignore, Dockerfile, and any missing essential files.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-1">4</Badge>
                  <div>
                    <h4 className="font-medium">Download & Deploy</h4>
                    <p className="text-sm text-gray-600">
                      Download the generated files and use them in your Docker build process.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Docker Build Fixer Component */}
          <DockerBuildFixer />

          {/* Support */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Need help?</strong> If you're still experiencing Docker build issues after using this tool, 
              please check that all your project dependencies are properly specified and that your application 
              can run locally before containerizing.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </Layout>
  );
}
