import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';

interface GeneratedFile {
  fileName: string;
  content: string;
  reason: string;
  isRequired: boolean;
}

interface FileAnalysisResult {
  missingFiles: string[];
  existingFiles: string[];
  recommendations: string[];
  projectHealth: 'excellent' | 'good' | 'needs_improvement' | 'critical';
}

interface IntelligentFileAnalysisProps {
  analysis?: FileAnalysisResult;
  generatedFiles?: GeneratedFile[];
  projectHealth?: string;
  isLoading?: boolean;
}

const HealthStatusIcon = ({ health }: { health: string }) => {
  switch (health) {
    case 'excellent':
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case 'good':
      return <CheckCircle className="h-5 w-5 text-blue-500" />;
    case 'needs_improvement':
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    case 'critical':
      return <XCircle className="h-5 w-5 text-red-500" />;
    default:
      return <Info className="h-5 w-5 text-gray-500" />;
  }
};

const HealthStatusBadge = ({ health }: { health: string }) => {
  const getHealthColor = (health: string) => {
    switch (health) {
      case 'excellent':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'good':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'needs_improvement':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Badge className={`${getHealthColor(health)} border`}>
      {health.replace('_', ' ').toUpperCase()}
    </Badge>
  );
};

export const IntelligentFileAnalysis: React.FC<IntelligentFileAnalysisProps> = ({
  analysis,
  generatedFiles = [],
  projectHealth,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            Analyzing Project Files...
          </CardTitle>
          <CardDescription>
            Using AI to analyze your project structure and identify missing files
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!analysis && !generatedFiles.length) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Project Health Overview */}
      {projectHealth && (
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HealthStatusIcon health={projectHealth} />
              Project Health Assessment
            </CardTitle>
            <CardDescription>
              AI-powered analysis of your project structure and completeness
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Overall project health based on file completeness and structure
                </p>
                <HealthStatusBadge health={projectHealth} />
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">
                  {analysis?.existingFiles.length || 0}
                </p>
                <p className="text-sm text-muted-foreground">existing files</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generated Files */}
      {generatedFiles.length > 0 && (
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              AI-Generated Files ({generatedFiles.length})
            </CardTitle>
            <CardDescription>
              Missing files that were automatically generated using LangChain and GPT
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {generatedFiles.map((file, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={file.isRequired ? "destructive" : "secondary"}>
                        {file.isRequired ? "Required" : "Optional"}
                      </Badge>
                      <span className="font-mono text-sm bg-muted px-2 py-1 rounded">
                        {file.fileName}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {file.reason}
                  </p>
                  <details className="group">
                    <summary className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-800">
                      View generated content
                    </summary>
                    <div className="mt-2 p-3 bg-muted rounded-md">
                      <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                        {file.content}
                      </pre>
                    </div>
                  </details>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* File Analysis Results */}
      {analysis && (
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-500" />
              File Analysis Results
            </CardTitle>
            <CardDescription>
              Detailed breakdown of your project's file structure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Existing Files */}
              <div>
                <h4 className="font-semibold mb-3 text-green-700">
                  ✅ Existing Files ({analysis.existingFiles.length})
                </h4>
                <div className="space-y-1">
                  {analysis.existingFiles.slice(0, 10).map((file, index) => (
                    <div key={index} className="text-sm text-muted-foreground">
                      • {file}
                    </div>
                  ))}
                  {analysis.existingFiles.length > 10 && (
                    <div className="text-sm text-muted-foreground">
                      ... and {analysis.existingFiles.length - 10} more files
                    </div>
                  )}
                </div>
              </div>

              {/* Missing Files */}
              {analysis.missingFiles.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 text-red-700">
                    ❌ Missing Files ({analysis.missingFiles.length})
                  </h4>
                  <div className="space-y-1">
                    {analysis.missingFiles.map((file, index) => (
                      <div key={index} className="text-sm text-muted-foreground">
                        • {file}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Recommendations */}
            {analysis.recommendations.length > 0 && (
              <div className="mt-6">
                <h4 className="font-semibold mb-3">💡 Recommendations</h4>
                <div className="space-y-2">
                  {analysis.recommendations.map((rec, index) => (
                    <Alert key={index}>
                      <Info className="h-4 w-4" />
                      <AlertDescription>{rec}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Success Message */}
      {generatedFiles.length > 0 && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Success!</strong> Your project is now complete with all required files. 
            The AI has analyzed your codebase and generated missing files to ensure your project 
            is ready for deployment.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}; 