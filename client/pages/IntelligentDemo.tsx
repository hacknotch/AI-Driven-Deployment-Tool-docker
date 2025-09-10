import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { IntelligentFileAnalysis } from '../components/IntelligentFileAnalysis';
import { DockerDeployment } from '../components/DockerDeployment';
import { CheckCircle, AlertTriangle, XCircle, Info, Github, Upload, Zap, Brain } from 'lucide-react';

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

export default function IntelligentDemo() {
  const [repoUrl, setRepoUrl] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<FileAnalysisResult | null>(null);
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);
  const [dockerfile, setDockerfile] = useState('');
  const [error, setError] = useState('');
  const [projectHealth, setProjectHealth] = useState<string>('');
  const [deploymentId, setDeploymentId] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Test API connection
  const testAPI = async () => {
    try {
      const response = await fetch('/api/test');
      const result = await response.json();
      console.log('✅ API test successful:', result);
      return true;
    } catch (error) {
      console.error('❌ API test failed:', error);
      return false;
    }
  };

  const handleAnalyze = async () => {
    if (!repoUrl.trim()) {
      setError('Please enter a GitHub repository URL');
      return;
    }

    const apiWorking = await testAPI();
    if (!apiWorking) {
      setError('API connection failed. Please check if the server is running.');
      return;
    }

    setIsAnalyzing(true);
    setError('');
    setAnalysis(null);
    setGeneratedFiles([]);
    setDockerfile('');
    setLogs([]);

    try {
      // Start streaming directly via SSE (thinking out loud)
      const params = new URLSearchParams({ repoUrl: repoUrl.trim(), userPrompt: userPrompt.trim() });
      const es = new EventSource(`/api/deployments/stream?${params.toString()}`);
      setLogs((prev) => [...prev, '📡 Connected to analysis stream...']);

      es.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          if (data.done) {
            es.close();
            setIsAnalyzing(false);
            return;
          }
          if (data.error) {
            setLogs((p) => [...p, `❌ ${data.error}`]);
            setError(data.error);
            return;
          }
          if (data.message) {
            setLogs((p) => [...p, data.message]);
          }
          if (data.dockerfile) {
            setDockerfile(data.dockerfile);
            setLogs((p) => [...p, '✅ Dockerfile preview received']);
          }
        } catch {
          setLogs((p) => [...p, evt.data]);
        }
      };

      es.onerror = () => {
        setLogs((p) => [...p, '❌ Stream connection error']);
        es.close();
        setIsAnalyzing(false);
      };
    } catch (err) {
      console.error('❌ Analysis error:', err);
      setError(err instanceof Error ? err.message : 'Network error occurred. Please try again.');
      setIsAnalyzing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
            🧠 Intelligent File Generator Demo
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
            Experience the power of AI-driven code analysis and automatic file generation. 
            Upload a GitHub repository and watch as our system intelligently identifies 
            missing files and generates them using LangChain and GPT.
          </p>
        </div>

        {/* Main Demo Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Input Panel */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Github className="h-5 w-5" />
                  Repository Input
                </CardTitle>
                <CardDescription>
                  Enter a GitHub repository URL to analyze and generate missing files
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="repoUrl">GitHub Repository URL</Label>
                  <Input
                    id="repoUrl"
                    placeholder="https://github.com/username/repository"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="githubToken">GitHub Token (Optional)</Label>
                  <Input
                    id="githubToken"
                    type="password"
                    placeholder="ghp_xxxxxxxxxxxxx"
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Required for private repositories
                  </p>
                </div>

                <div>
                  <Label htmlFor="userPrompt">Custom Requirements (Optional)</Label>
                  <Textarea
                    id="userPrompt"
                    placeholder="Generate a production-ready Dockerfile with multi-stage builds..."
                    value={userPrompt}
                    onChange={(e) => setUserPrompt(e.target.value)}
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <Button 
                  onClick={handleAnalyze} 
                  disabled={isAnalyzing || !repoUrl.trim()}
                  className="w-full"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      Start Intelligent Analysis
                    </>
                  )}
                </Button>

                {/* Debug Buttons */}
                <div className="flex gap-2 mt-4">
                  <Button 
                    onClick={testAPI} 
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    Test API Connection
                  </Button>
                  <Button 
                    onClick={async () => {
                      try {
                        const response = await fetch('http://localhost:3001/api/debug/intelligent');
                        const result = await response.json();
                        console.log('🔍 Intelligent System Status:', result);
                        alert(`Status: ${result.status}\nOpenAI Key: ${result.openai.hasKey ? '✅ Found' : '❌ Missing'}`);
                      } catch (error) {
                        console.error('❌ Debug check failed:', error);
                        alert('Debug check failed. Check console for details.');
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    Check System Status
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Features Overview */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  AI-Powered Features
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Intelligent file analysis</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Automatic missing file generation</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">LangChain + GPT integration</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Project health assessment</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Production-ready file generation</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Results + Live Logs Panel */}
          <div className="lg:col-span-2">
            {/* Console-style live log stream */}
            <div className="mb-6 bg-slate-900/60 border border-slate-700 rounded-md p-3">
              <div className="font-mono text-[13px] text-slate-200 space-y-1 max-h-64 overflow-y-auto">
                {logs.map((line, idx) => (
                  <p key={idx} className="leading-6">{line}</p>
                ))}
                <div ref={logEndRef} />
              </div>
            </div>
            <Tabs defaultValue="analysis" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="analysis">File Analysis</TabsTrigger>
                <TabsTrigger value="generated">Generated Files</TabsTrigger>
                <TabsTrigger value="dockerfile">Dockerfile</TabsTrigger>
                <TabsTrigger value="deploy">Deploy</TabsTrigger>
              </TabsList>

              <TabsContent value="analysis" className="mt-6">
                <IntelligentFileAnalysis
                  analysis={analysis}
                  generatedFiles={generatedFiles}
                  projectHealth={projectHealth}
                  isLoading={isAnalyzing}
                />
              </TabsContent>

              <TabsContent value="generated" className="mt-6">
                {generatedFiles.length > 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        AI-Generated Files ({generatedFiles.length})
                      </CardTitle>
                      <CardDescription>
                        Files that were automatically generated to complete your project
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {generatedFiles.map((file, index) => (
                          <Card key={index} className="border-l-4 border-l-green-500">
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge variant={file.isRequired ? "destructive" : "secondary"}>
                                    {file.isRequired ? "Required" : "Optional"}
                                  </Badge>
                                  <span className="font-mono font-semibold">{file.fileName}</span>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => copyToClipboard(file.content)}
                                  >
                                    Copy
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => downloadFile(file.content, file.fileName)}
                                  >
                                    Download
                                  </Button>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm text-muted-foreground mb-3">
                                {file.reason}
                              </p>
                              <div className="bg-muted p-3 rounded-md">
                                <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                                  {file.content}
                                </pre>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center text-muted-foreground">
                        <Info className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No files have been generated yet.</p>
                        <p className="text-sm">Start an analysis to see AI-generated files.</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="dockerfile" className="mt-6">
                {dockerfile ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5" />
                        Generated Dockerfile
                      </CardTitle>
                      <CardDescription>
                        AI-generated Dockerfile optimized for your project
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2 mb-4">
                        <Button
                          onClick={() => copyToClipboard(dockerfile)}
                          variant="outline"
                        >
                          Copy to Clipboard
                        </Button>
                        <Button
                          onClick={() => downloadFile(dockerfile, 'Dockerfile')}
                          variant="outline"
                        >
                          Download Dockerfile
                        </Button>
                      </div>
                      <div className="bg-muted p-4 rounded-md">
                        <pre className="text-sm overflow-x-auto whitespace-pre-wrap">
                          {dockerfile}
                        </pre>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center text-muted-foreground">
                        <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No Dockerfile generated yet.</p>
                        <p className="text-sm">Start an analysis to generate a Dockerfile.</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="deploy" className="mt-6">
                {deploymentId && dockerfile ? (
                  <DockerDeployment
                    deploymentId={deploymentId}
                    dockerfile={dockerfile}
                    analysis={analysis}
                    generatedFiles={generatedFiles}
                    repoUrl={repoUrl}
                  />
                ) : (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center text-muted-foreground">
                        <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Complete the analysis first to enable Docker deployment.</p>
                        <p className="text-sm">Generate a Dockerfile to see deployment options.</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Alert className="border-red-200 bg-red-50 mb-6">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* How It Works */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>🔬 How the Intelligent File Generator Works</CardTitle>
            <CardDescription>
              Understanding the AI-powered analysis and generation process
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="bg-blue-100 dark:bg-blue-900 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-blue-600 dark:text-blue-400 font-bold">1</span>
                </div>
                <h3 className="font-semibold mb-2">Repository Analysis</h3>
                <p className="text-sm text-muted-foreground">
                  AI analyzes your GitHub repository structure, dependencies, and existing files
                </p>
              </div>
              
              <div className="text-center">
                <div className="bg-green-100 dark:bg-green-900 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-green-600 dark:text-green-400 font-bold">2</span>
                </div>
                <h3 className="font-semibold mb-2">Missing File Detection</h3>
                <p className="text-sm text-muted-foreground">
                  Identifies critical missing files based on project type and best practices
                </p>
              </div>
              
              <div className="text-center">
                <div className="bg-purple-100 dark:bg-purple-900 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">3</span>
                </div>
                <h3 className="font-semibold mb-2">AI Generation</h3>
                <p className="text-sm text-muted-foreground">
                  LangChain + GPT generates production-ready files tailored to your project
                </p>
              </div>
              
              <div className="text-center">
                <div className="bg-orange-100 dark:bg-orange-900 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-orange-600 dark:text-orange-400 font-bold">4</span>
                </div>
                <h3 className="font-semibold mb-2">Dockerfile Creation</h3>
                <p className="text-sm text-muted-foreground">
                  Generates optimized Dockerfile considering all generated and existing files
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 