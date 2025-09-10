import React from 'react';
import Layout from '../components/Layout';
import { LangChainErrorSolver } from '../components/LangChainErrorSolver';
import { Brain, Zap, FileCheck, AlertTriangle } from 'lucide-react';

export default function LangChainDockerFixPage() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Brain className="h-8 w-8 text-purple-600" />
              <h1 className="text-3xl font-bold text-gray-900">
                LangChain Docker Error Solver
              </h1>
            </div>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              AI-powered Docker build error analysis and automatic fixing using LangChain. 
              Paste your Docker error and let AI generate the perfect solution.
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border">
              <Brain className="h-8 w-8 text-purple-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Intelligent Analysis</h3>
              <p className="text-sm text-gray-600">
                LangChain analyzes Docker errors to understand the root cause and determine the best fix
              </p>
            </div>
            
            <div className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border">
              <FileCheck className="h-8 w-8 text-green-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Auto File Generation</h3>
              <p className="text-sm text-gray-600">
                Automatically generates missing config files, rules, and placeholders with proper content
              </p>
            </div>
            
            <div className="text-center p-6 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg border">
              <Zap className="h-8 w-8 text-yellow-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Instant Solutions</h3>
              <p className="text-sm text-gray-600">
                Get immediate recommendations and downloadable fixes for your Docker build issues
              </p>
            </div>
          </div>

          {/* Common Error Examples */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Common Docker Errors We Can Fix
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg border">
                <h4 className="font-medium text-gray-900 mb-2">Missing File Errors</h4>
                <code className="text-sm text-gray-600 block">
                  failed to solve: invalid file request .builder/rules/deploy-app.mdc
                </code>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border">
                <h4 className="font-medium text-gray-900 mb-2">Build Context Issues</h4>
                <code className="text-sm text-gray-600 block">
                  failed to compute cache key: lstat ... no such file or directory
                </code>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border">
                <h4 className="font-medium text-gray-900 mb-2">Permission Errors</h4>
                <code className="text-sm text-gray-600 block">
                  permission denied while trying to copy file
                </code>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border">
                <h4 className="font-medium text-gray-900 mb-2">Dependency Issues</h4>
                <code className="text-sm text-gray-600 block">
                  package not found or installation failed
                </code>
              </div>
            </div>
          </div>

          {/* Main Component */}
          <LangChainErrorSolver />
        </div>
      </div>
    </Layout>
  );
}
