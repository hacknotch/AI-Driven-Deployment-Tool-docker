import React, { useState, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import DeploymentStepper from "@/components/DeploymentStepper";
import DeploymentsTable from "@/components/DeploymentsTable";
import ProgressTimeline from "@/components/ProgressTimeline";
import AIAgent from "@/components/AIAgent";
import AIAssistant, { AIAssistantRef } from "@/components/AIAssistant";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Upload, Clock, Server, GitBranch } from "lucide-react";
import { deploymentService, DeploymentRequest } from "@/services/deploymentService";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const timelineSteps = [
  {
    id: "upload",
    title: "Code Uploaded",
    description: "Project files successfully uploaded to the platform",
    status: "completed" as const,
    timestamp: "2 minutes ago",
  },
  {
    id: "analyze",
    title: "AI Analysis",
    description: "Analyzing project structure and dependencies",
    status: "active" as const,
    timestamp: "1 minute ago",
  },
  {
    id: "build",
    title: "Build Process",
    description: "Building application for deployment",
    status: "pending" as const,
  },
  {
    id: "deploy",
    title: "Deployment",
    description: "Deploying to production environment",
    status: "pending" as const,
  },
  {
    id: "monitor",
    title: "Monitoring",
    description: "Setting up monitoring and alerts",
    status: "pending" as const,
  },
];

export default function Dashboard() {
  const [repoLink, setRepoLink] = useState("");
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isGeneratingDockerfile, setIsGeneratingDockerfile] = useState(false);
  const [dockerfileContent, setDockerfileContent] = useState<string>("");
  const [deploymentOutput, setDeploymentOutput] = useState<string | null>(null);
  const [selectedStack, setSelectedStack] = useState<string>('docker');
  const [analysis, setAnalysis] = useState<any>(null);
  const [generatedFiles, setGeneratedFiles] = useState<any[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();
  const aiAssistantRef = useRef<AIAssistantRef>(null);

  const handleGenerateDockerfile = async () => {
    // Validate inputs - either repo link or uploaded files
    if (!repoLink && uploadedFiles.length === 0) {
      toast({
        title: "Missing Input",
        description: "Please provide either a GitHub repository link or upload project files.",
        variant: "destructive",
      });
      return;
    }

    if (repoLink) {
      const urlValidation = deploymentService.validateGitHubUrl(repoLink);
      if (!urlValidation.valid) {
        toast({
          title: "Invalid Repository URL",
          description: urlValidation.message,
          variant: "destructive",
        });
        return;
      }
    }

    setIsGeneratingDockerfile(true);
    setDockerfileContent("");
    setDeploymentOutput(null);

    try {
      // Start streaming if repoLink provided
      if (isAIAssistantOpen && aiAssistantRef.current && repoLink.trim()) {
        aiAssistantRef.current.triggerRepositoryAnalysis(repoLink.trim());
      }

      // Trigger AI Assistant analysis if it's open
      if (isAIAssistantOpen && aiAssistantRef.current && uploadedFiles.length > 0) {
        const streamId = `upl-${Date.now()}`;
        aiAssistantRef.current.triggerUploadStream(streamId);
        // store streamId in a ref for upload call below
        (window as any).__uploadStreamId = streamId;
      }

      let response;

      if (uploadedFiles.length > 0) {
        // Handle file uploads
        console.log('📁 Processing uploaded files:', uploadedFiles.length);
        const streamId = (window as any).__uploadStreamId as string | undefined;
        response = await deploymentService.createDeploymentFromFiles(uploadedFiles, "Generate an optimized Dockerfile for this uploaded project", streamId);
      } else {
        // Handle GitHub repository
        const deploymentRequest: DeploymentRequest = {
          prompt: "Generate an optimized Dockerfile for this project based on the repository structure and dependencies",
          repoLink: repoLink.trim(),
          deploymentStack: ["Docker"]
        };
        response = await deploymentService.createDeployment(deploymentRequest);
      }

      if (response.success && response.dockerfile) {
        setDockerfileContent(response.dockerfile);
        setAnalysis(response.analysis || null);
        setGeneratedFiles(response.generatedFiles || []);
        setDeploymentOutput("✅ Dockerfile generated successfully using AI analysis!");
        toast({
          title: "Dockerfile Generated!",
          description: "Your AI-powered Dockerfile is ready for deployment.",
        });
      } else {
        throw new Error(response.message || 'Failed to generate Dockerfile');
      }
    } catch (error) {
      console.error('Deployment error:', error);
      setDeploymentOutput(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingDockerfile(false);
    }
  };



  return (
    <DashboardLayout isAIAssistantOpen={isAIAssistantOpen}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-7xl">
        {/* Welcome Section */}
        <Card className="bg-gradient-to-r from-slate-800/50 to-slate-900/50 border-slate-700 p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-neon-blue to-neon-purple flex items-center justify-center flex-shrink-0">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-white">Welcome to ZeroOps</h1>
              <p className="text-slate-400 text-sm sm:text-base">Deploy your applications with AI-powered automation</p>
              <div className="mt-3">
                <a 
                  href="/intelligent-demo" 
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg text-sm font-medium transition-all duration-300"
                >
                  🧠 Try Intelligent File Generator
                </a>
              </div>
            </div>
          </div>
        </Card>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-6 mb-6">
          {/* Main Content */}
          <div className="space-y-6">
            {/* Deployment Stepper */}
            <Card className="bg-slate-800/50 border-slate-700 p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                <Upload className="w-5 h-5 text-neon-cyan flex-shrink-0" />
                <h2 className="text-lg sm:text-xl font-semibold text-white">Deployment Process</h2>
              </div>
              <DeploymentStepper currentStep={0} />
            </Card>

            {/* Deploy with ZerOps Section - Full Width with Increased Height */}
            <Card className="bg-slate-800/50 border-slate-700 p-8 py-12">
              <div className="text-center mb-10">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-4">
                  AI-Powered Docker Generator
                </h2>
                <p className="text-slate-400 text-lg">
                  Generate optimized Dockerfiles automatically using machine learning
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Deployment Stack */}
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-white mb-6">Deployment Stack</h3>
                  <div className="space-y-3">
                    {/* Docker - Functional */}
                    <button
                      onClick={() => setSelectedStack('docker')}
                      className={`w-full flex items-center gap-4 p-4 rounded-lg text-white font-medium text-lg transition-colors ${
                        selectedStack === 'docker'
                          ? 'bg-orange-500'
                          : 'bg-orange-500 hover:bg-orange-600'
                      }`}
                    >
                      <div className="w-8 h-8 bg-white/20 rounded flex items-center justify-center">
                        🐳
                      </div>
                      <span>Docker</span>
                    </button>

                    {/* Kubernetes - Visual only */}
                    <button className="w-full flex items-center gap-4 p-4 bg-orange-500 hover:bg-orange-600 rounded-lg text-white font-medium text-lg transition-colors">
                      <div className="w-8 h-8 bg-white/20 rounded flex items-center justify-center">
                        ☸️
                      </div>
                      <span>Kubernetes</span>
                    </button>

                    {/* Cloud Deploy - Visual only */}
                    <button className="w-full flex items-center gap-4 p-4 bg-orange-500 hover:bg-orange-600 rounded-lg text-white font-medium text-lg transition-colors">
                      <div className="w-8 h-8 bg-white/20 rounded flex items-center justify-center">
                        ☁️
                      </div>
                      <span>Cloud Deploy</span>
                    </button>
                  </div>
                </div>

                {/* Deployment Configuration */}
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-white mb-6">Deployment Configuration</h3>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-base font-medium text-slate-300 mb-3">
                        Upload Project Folder
                      </label>
                      <div
                        className="w-full p-8 bg-slate-700/30 border-2 border-dashed border-slate-600 rounded-lg text-center hover:border-purple-400 transition-colors cursor-pointer"
                        onClick={() => document.getElementById('folder-upload')?.click()}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.add('border-purple-400');
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove('border-purple-400');
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove('border-purple-400');
                          const files = Array.from(e.dataTransfer.files);
                          setUploadedFiles(files);
                          
                          // Trigger AI Assistant analysis if open
                          if (isAIAssistantOpen && aiAssistantRef.current && files.length > 0) {
                            setTimeout(() => {
                              aiAssistantRef.current?.triggerFileUploadAnalysis(files);
                            }, 500); // Small delay for better UX
                          }
                          
                          toast({
                            title: "Files Uploaded",
                            description: `${files.length} files uploaded successfully`,
                          });
                        }}
                      >
                        <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                        <p className="text-slate-300 text-lg font-medium mb-2">
                          Drag & Drop your project folder here
                        </p>
                        <p className="text-slate-400 text-sm">
                          or click to browse files
                        </p>
                        <input
                          type="file"
                          {...({ webkitdirectory: "" } as any)}
                          multiple
                          className="hidden"
                          id="folder-upload"
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            setUploadedFiles(files);
                            
                            // Trigger AI Assistant analysis if open
                            if (isAIAssistantOpen && aiAssistantRef.current && files.length > 0) {
                              setTimeout(() => {
                                aiAssistantRef.current?.triggerFileUploadAnalysis(files);
                              }, 500); // Small delay for better UX
                            }
                            
                            toast({
                              title: "Files Uploaded",
                              description: `${files.length} files uploaded successfully`,
                            });
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-base font-medium text-slate-300 mb-3">
                        GitHub Repository Link
                      </label>
                      <input
                        type="url"
                        placeholder="https://github.com/username/repository"
                        value={repoLink}
                        onChange={(e) => setRepoLink(e.target.value)}
                        className="w-full p-4 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder:text-slate-400 focus:border-purple-400 focus:outline-none text-base"
                      />
                    </div>



                    <Button
                      onClick={handleGenerateDockerfile}
                      disabled={isGeneratingDockerfile || (!repoLink && uploadedFiles.length === 0)}
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold py-4 px-8 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-lg"
                    >
                      {isGeneratingDockerfile ? (
                        <>
                          <div className="w-5 h-5 mr-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Generating Dockerfile...
                        </>
                      ) : (
                        <>
                          <GitBranch className="w-5 h-5 mr-3" />
                          🐳 Generate Dockerfile
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            {/* Intelligent Analysis Results */}
            {analysis && (
              <Card className="bg-slate-800/50 border-slate-700 p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center">
                    🧠
                  </div>
                  <h3 className="text-xl font-semibold text-white">AI Analysis Results</h3>
                </div>
                
                {/* Project Health */}
                {analysis.projectHealth && (
                  <div className="mb-4 p-4 bg-slate-900/50 rounded-lg border border-slate-600">
                    <h4 className="text-lg font-medium text-white mb-2">Project Health</h4>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        analysis.projectHealth === 'excellent' ? 'bg-green-600 text-white' :
                        analysis.projectHealth === 'good' ? 'bg-blue-600 text-white' :
                        analysis.projectHealth === 'needs_improvement' ? 'bg-yellow-600 text-white' :
                        'bg-red-600 text-white'
                      }`}>
                        {analysis.projectHealth.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>
                )}

                {/* Generated Files */}
                {generatedFiles && generatedFiles.length > 0 && (
                  <div className="mb-4 p-4 bg-slate-900/50 rounded-lg border border-slate-600">
                    <h4 className="text-lg font-medium text-white mb-3">AI-Generated Files ({generatedFiles.length})</h4>
                    <div className="space-y-3">
                      {generatedFiles.map((file, index) => (
                        <div key={index} className="p-3 bg-slate-800/50 rounded border border-slate-600">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-mono text-sm text-blue-400">{file.fileName}</span>
                            <span className={`px-2 py-1 rounded text-xs ${
                              file.isRequired ? 'bg-red-600 text-white' : 'bg-slate-600 text-white'
                            }`}>
                              {file.isRequired ? 'Required' : 'Optional'}
                            </span>
                          </div>
                          <p className="text-sm text-slate-300 mb-2">{file.reason}</p>
                          <details className="group">
                            <summary className="cursor-pointer text-sm font-medium text-blue-400 hover:text-blue-300">
                              View generated content
                            </summary>
                            <div className="mt-2 p-3 bg-slate-900/50 rounded">
                              <pre className="text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap">
                                {file.content}
                              </pre>
                            </div>
                          </details>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* Generated Dockerfile Display */}
            {dockerfileContent && (
              <Card className="bg-slate-800/50 border-slate-700 p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                    🐳
                  </div>
                  <h3 className="text-xl font-semibold text-white">Generated Dockerfile</h3>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-600">
                  <pre className="text-green-400 text-sm overflow-x-auto whitespace-pre-wrap">
                    {dockerfileContent}
                  </pre>
                </div>
                <div className="flex gap-3 mt-4">
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(dockerfileContent);
                      toast({
                        title: "Copied!",
                        description: "Dockerfile copied to clipboard",
                      });
                    }}
                    className="bg-slate-700 hover:bg-slate-600 text-white"
                  >
                    📋 Copy Dockerfile
                  </Button>
                  <Button
                    onClick={() => {
                      const blob = new Blob([dockerfileContent], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'Dockerfile';
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    💾 Download Dockerfile
                  </Button>
                </div>
              </Card>
            )}

            {/* Deployment Output */}
            {deploymentOutput && (
              <Card className="bg-slate-800/50 border-slate-700 p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Server className="w-5 h-5 text-neon-cyan flex-shrink-0" />
                  <h3 className="text-base sm:text-lg font-semibold text-white">Deployment Output</h3>
                </div>
                <pre className="bg-slate-900/50 p-4 rounded-lg text-sm font-mono text-slate-300 whitespace-pre-wrap overflow-auto max-h-64 border border-slate-600">
                  {deploymentOutput}
                </pre>
              </Card>
            )}

            {/* Deployment Timeline - Moved Below */}
            <Card className="bg-slate-800/50 border-slate-700 p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="w-5 h-5 text-neon-cyan flex-shrink-0" />
                <h3 className="text-base sm:text-lg font-semibold text-white">Deployment Timeline</h3>
              </div>
              <ProgressTimeline steps={timelineSteps} />
            </Card>

            {/* Deployments Table - Full Width */}
            <Card className="bg-slate-800/50 border-slate-700 p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                <Server className="w-5 h-5 text-neon-cyan flex-shrink-0" />
                <h3 className="text-base sm:text-lg font-semibold text-white">Recent Deployments</h3>
              </div>
              <div className="overflow-x-auto">
                <DeploymentsTable />
              </div>
            </Card>
          </div>
        </div>
      </div>
      
      {/* AI Assistant */}
      <AIAssistant 
        ref={aiAssistantRef}
        isOpen={isAIAssistantOpen} 
        onToggle={() => setIsAIAssistantOpen(!isAIAssistantOpen)}
      />
    </DashboardLayout>
  );
}
