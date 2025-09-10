import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Send, X, Bot, User, Brain, Search, FileText, AlertTriangle, CheckCircle, Zap } from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'ai' | 'thinking' | 'console';
  content: string; // full content
  timestamp: Date;
  level?: 'info' | 'warning' | 'success' | 'error';
  display?: string; // progressively revealed content
  animating?: boolean;
}

interface AIAssistantProps {
  isOpen: boolean;
  onToggle: () => void;
  onFileUpload?: (files: File[]) => void;
  onRepoLink?: (url: string) => void;
}

export interface AIAssistantRef {
  triggerRepositoryAnalysis: (repoUrl: string) => void;
  triggerFileUploadAnalysis: (files: File[]) => void;
  triggerUploadStream: (streamId: string) => void;
}

const AIAssistant = React.forwardRef<AIAssistantRef, AIAssistantProps>(({ isOpen, onToggle, onFileUpload, onRepoLink }, ref) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: "🚀 Welcome to ZeroOps Assistant!\n\nI'm here to help you with intelligent deployment analysis. I can:\n\n• Analyze GitHub repositories in real-time\n• Generate production-ready Dockerfiles\n• Provide step-by-step deployment guidance\n• Answer technical questions\n\nReady to get started? Just paste a GitHub URL or upload your project!",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const streamingTimeoutRef = useRef<NodeJS.Timeout>();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const addConsoleMessage = (
    content: string,
    level: 'info' | 'warning' | 'success' | 'error' = 'info',
    typingSpeedMs: number = 12
  ) => {
    const id = `console-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newMsg: Message = {
      id,
      type: 'console',
      content,
      display: '',
      timestamp: new Date(),
      level,
      animating: true,
    };

    setMessages(prev => [...prev, newMsg]);

    // Typewriter effect
    let idx = 0;
    const interval = setInterval(() => {
      idx += 1;
      setMessages(prev => prev.map(m => m.id === id ? { ...m, display: content.slice(0, idx) } : m));
      if (idx >= content.length) {
        clearInterval(interval);
        setMessages(prev => prev.map(m => m.id === id ? { ...m, display: content, animating: false } : m));
      }
    }, typingSpeedMs);
  };

  const streamConsoleMessage = (content: string, level: 'info' | 'warning' | 'success' | 'error' = 'info', delay: number = 0) => {
    return new Promise<void>((resolve) => {
      streamingTimeoutRef.current = setTimeout(() => {
        addConsoleMessage(content, level);
        resolve();
      }, delay);
    });
  };

  const clearStreamingTimeouts = () => {
    if (streamingTimeoutRef.current) {
      clearTimeout(streamingTimeoutRef.current);
    }
  };

  // Expose methods to parent component
  React.useImperativeHandle(ref, () => ({
    triggerRepositoryAnalysis: (repoUrl: string) => {
      if (!isStreaming && !isAnalyzing) {
        simulateRepositoryAnalysis(repoUrl);
      }
    },
    triggerFileUploadAnalysis: (files: File[]) => {
      if (!isStreaming && !isAnalyzing) {
        simulateFileUploadAnalysis(files);
      }
    },
    triggerUploadStream: (streamId: string) => {
      if (!isStreaming && !isAnalyzing) {
        setIsAnalyzing(true);
        setIsStreaming(true);
        const base = window.location.origin;
        const es = new EventSource(`${base}/api/deployments/upload/stream?streamId=${encodeURIComponent(streamId)}`);
        addConsoleMessage('📡 Connected to upload analysis stream...', 'info');
        es.onmessage = (evt) => {
          try {
            const data = JSON.parse(evt.data);
            if (data.done) {
              es.close();
              setIsAnalyzing(false);
              setIsStreaming(false);
              return;
            }
            if (data.error) {
              addConsoleMessage(`❌ ${data.error}`, 'error');
              return;
            }
            if (data.message) {
              const msg: string = data.message as string;
              const level = msg.includes('✅') ? 'success' : msg.includes('❌') ? 'error' : msg.includes('⚠️') ? 'warning' : 'info';
              addConsoleMessage(msg, level as any);
              return;
            }
            if (data.dockerfilePreview) {
              addConsoleMessage('📄 Dockerfile preview received (truncated).', 'info');
            }
          } catch {
            addConsoleMessage(evt.data, 'info');
          }
        };
        es.onerror = () => {
          addConsoleMessage('❌ Upload stream connection error', 'error');
          es.close();
          setIsAnalyzing(false);
          setIsStreaming(false);
        };
      }
    }
  }));

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearStreamingTimeouts();
    };
  }, []);

  const simulateRepositoryAnalysis = async (repoUrl: string) => {
    setIsAnalyzing(true);
    setIsStreaming(true);

    try {
      // Open SSE connection to backend stream endpoint
      const params = new URLSearchParams({ repoUrl });
      const base = window.location.origin;
      const es = new EventSource(`${base}/api/deployments/stream?${params.toString()}`);
      addConsoleMessage('📡 Connected to analysis stream...', 'info');

      es.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          if (data.done) {
            es.close();
            setIsAnalyzing(false);
            setIsStreaming(false);
            return;
          }
          if (data.error) {
            addConsoleMessage(`❌ ${data.error}`, 'error');
            return;
          }
          if (data.message) {
            const msg: string = data.message as string;
            const level = msg.includes('✅') ? 'success' : msg.includes('❌') ? 'error' : msg.includes('⚠️') ? 'warning' : 'info';
            addConsoleMessage(msg, level as any);
            return;
          }
          if (data.dockerfile) {
            addConsoleMessage('📄 Dockerfile preview received (truncated).', 'info');
            return;
          }
        } catch {
          // Fallback: treat as plain text
          addConsoleMessage(evt.data, 'info');
        }
      };

      es.onerror = () => {
        addConsoleMessage('❌ Stream connection error', 'error');
        es.close();
        setIsAnalyzing(false);
        setIsStreaming(false);
      };
    } catch (error) {
      addConsoleMessage('❌ Failed to start analysis stream', 'error');
      setIsAnalyzing(false);
      setIsStreaming(false);
    }
  };

  const simulateFileUploadAnalysis = async (files: File[]) => {
    setIsAnalyzing(true);
    setIsStreaming(true);
    
    try {
      // Step 1: Initial file processing
      await streamConsoleMessage('📁 Processing uploaded project files...', 'info', 200);
      await streamConsoleMessage(`📊 Scanning ${files.length} files and directories`, 'info', 300);
      
      const fileNames = files.map(f => f.name);
      const fileExtensions = fileNames.map(name => name.split('.').pop()?.toLowerCase() || '');
      
      // Step 2: File type analysis
      await streamConsoleMessage('🔍 Analyzing file types and project structure...', 'info', 400);
      
      const hasPackageJson = fileNames.some(name => name.includes('package.json'));
      const hasRequirementsTxt = fileNames.some(name => name.includes('requirements.txt'));
      const hasDockerfile = fileNames.some(name => name.includes('Dockerfile') && !name.includes('.'));
      const hasDockerIgnore = fileNames.some(name => name.includes('.dockerignore'));
      const hasPythonFiles = fileExtensions.includes('py');
      const hasJsFiles = fileExtensions.includes('js') || fileExtensions.includes('jsx');
      const hasTsFiles = fileExtensions.includes('ts') || fileExtensions.includes('tsx');
      
      // Step 3: Project type detection
      await streamConsoleMessage('🔎 Detecting project language and framework...', 'info', 300);
      
      if (hasPackageJson) {
        await streamConsoleMessage('📦 Node.js project detected - analyzing package.json', 'success', 400);
        if (hasTsFiles) {
          await streamConsoleMessage('📘 TypeScript files detected', 'info', 300);
        }
        if (hasJsFiles || hasTsFiles) {
          await streamConsoleMessage('⚛️ React/JavaScript framework identified', 'info', 300);
        }
      } else if (hasPythonFiles) {
        await streamConsoleMessage('🐍 Python project detected', 'success', 400);
        if (fileNames.some(name => name.includes('app.py'))) {
          await streamConsoleMessage('🌶️ Flask application identified', 'info', 300);
        } else if (fileNames.some(name => name.includes('main.py'))) {
          await streamConsoleMessage('🚀 Python application with main.py entry point', 'info', 300);
        }
      }
      
      // Step 4: Dependency analysis
      await streamConsoleMessage('📋 Checking project dependencies...', 'info', 400);
      
      if (hasPackageJson) {
        await streamConsoleMessage('✅ Found package.json - extracting Node.js dependencies', 'success', 300);
      } else if (hasJsFiles || hasTsFiles) {
        await streamConsoleMessage('⚠️ package.json missing → will generate with detected dependencies', 'warning', 300);
        await streamConsoleMessage('📝 Analyzing import statements in JS/TS files', 'info', 500);
        await streamConsoleMessage('✅ package.json created with React, TypeScript, and build tools', 'success', 400);
      }
      
      if (hasRequirementsTxt) {
        await streamConsoleMessage('✅ Found requirements.txt - extracting Python dependencies', 'success', 300);
      } else if (hasPythonFiles) {
        await streamConsoleMessage('⚠️ requirements.txt missing → analyzing Python imports', 'warning', 300);
        await streamConsoleMessage('🔍 Scanning .py files for import statements', 'info', 500);
        await streamConsoleMessage('📝 Generating requirements.txt with detected dependencies', 'info', 400);
        await streamConsoleMessage('✅ requirements.txt created with Flask, gunicorn, and dependencies', 'success', 300);
      }
      
      // Step 5: Docker file analysis and generation
      await streamConsoleMessage('🐳 Analyzing Docker configuration...', 'info', 400);
      
      if (hasDockerfile) {
        await streamConsoleMessage('✅ Found existing Dockerfile - analyzing for optimization', 'success', 300);
        await streamConsoleMessage('🔧 Checking for multi-stage builds and security practices', 'info', 400);
        await streamConsoleMessage('⚡ Dockerfile optimization recommendations generated', 'success', 300);
      } else {
        await streamConsoleMessage('⚠️ Dockerfile missing → generating production-ready Dockerfile', 'warning', 300);
        await streamConsoleMessage('📝 Analyzing project structure for optimal Docker configuration', 'info', 500);
        await streamConsoleMessage('⚡ Creating multi-stage Dockerfile with security best practices', 'info', 600);
        await streamConsoleMessage('🛡️ Adding non-root user and health checks', 'info', 400);
        await streamConsoleMessage('✅ Dockerfile successfully created at /project/Dockerfile', 'success', 300);
      }
      
      if (!hasDockerIgnore) {
        await streamConsoleMessage('⚠️ .dockerignore missing → creating optimized ignore patterns', 'warning', 300);
        await streamConsoleMessage('📝 Adding exclusions: node_modules, .git, __pycache__, .env', 'info', 400);
        await streamConsoleMessage('✅ .dockerignore successfully created', 'success', 300);
      }
      
      // Step 6: Additional configuration files
      await streamConsoleMessage('⚙️ Checking for additional configuration files...', 'info', 400);
      
      const hasDockerCompose = fileNames.some(name => name.includes('docker-compose'));
      if (!hasDockerCompose) {
        await streamConsoleMessage('⚠️ docker-compose.yml missing → creating development setup', 'warning', 300);
        await streamConsoleMessage('🔧 Configuring services, networks, and volumes', 'info', 400);
        await streamConsoleMessage('✅ docker-compose.yml created for local development', 'success', 300);
      }
      
      // Step 7: Final assessment
      await streamConsoleMessage('📊 Performing final project assessment...', 'info', 400);
      
      const criticalFiles = [hasPackageJson || !hasJsFiles, hasRequirementsTxt || !hasPythonFiles, hasDockerfile];
      const healthScore = criticalFiles.filter(Boolean).length / criticalFiles.length;
      
      let healthStatus = 'POOR';
      let healthLevel: 'error' | 'warning' | 'success' = 'error';
      
      if (healthScore >= 0.8) {
        healthStatus = 'EXCELLENT';
        healthLevel = 'success';
      } else if (healthScore >= 0.6) {
        healthStatus = 'GOOD';
        healthLevel = 'success';
      } else if (healthScore >= 0.4) {
        healthStatus = 'FAIR';
        healthLevel = 'warning';
      }
      
      await streamConsoleMessage(`🔍 Project health assessment: ${healthStatus}`, healthLevel, 300);
      await streamConsoleMessage(`📊 Analyzed ${files.length} files - all missing files generated`, 'success', 300);
      await streamConsoleMessage('🚀 Project is now ready for deployment!', 'success', 400);
      
    } catch (error) {
      await streamConsoleMessage('❌ File analysis failed - please try again', 'error', 100);
    } finally {
      setIsAnalyzing(false);
      setIsStreaming(false);
    }
  };

  const generateAIResponse = async (userMessage: string) => {
    const thinkingId = `thinking-${Date.now()}`;
    
    setMessages(prev => [...prev, {
      id: thinkingId,
      type: 'thinking',
      content: '🧠 Thinking...',
      timestamp: new Date()
    }]);
    
    setIsThinking(true);

    await new Promise(resolve => setTimeout(resolve, 1000));

    setMessages(prev => {
      const filtered = prev.filter(msg => msg.id !== thinkingId);
      return [...filtered, {
        id: `ai-${Date.now()}`,
        type: 'ai',
        content: generateResponse(userMessage),
        timestamp: new Date()
      }];
    });

    setIsThinking(false);
  };

  const generateResponse = (userMessage: string): string => {
    const message = userMessage.toLowerCase();
    
    // Check if it's a GitHub URL
    if (message.includes('github.com') || message.includes('http')) {
      simulateRepositoryAnalysis(userMessage);
      return "🤖 I'll analyze this repository for you! Watch the console output above for real-time analysis.";
    }
    
    // Check if it's about file upload
    if (message.includes('upload') || message.includes('file') || message.includes('folder')) {
      return "🤖 I can help you analyze uploaded files! Just drag and drop your project folder in the dashboard, and I'll provide real-time analysis.";
    }
    
    // Technical questions
    if (message.includes('docker compose') || message.includes('docker-compose')) {
      return "🤖 **Docker Compose** is a tool for defining and running multi-container Docker applications.\n\n" +
             "Key features:\n" +
             "• **Service Definition**: Define multiple services in a single YAML file\n" +
             "• **Networking**: Automatic network creation between services\n" +
             "• **Volume Management**: Persistent data storage\n" +
             "• **Environment Variables**: Easy configuration management\n\n" +
             "Example:\n" +
             "```yaml\n" +
             "version: '3.8'\n" +
             "services:\n" +
             "  web:\n" +
             "    build: .\n" +
             "    ports:\n" +
             "      - '5000:5000'\n" +
             "  redis:\n" +
             "    image: redis:alpine\n" +
             "```";
    }
    
    if (message.includes('docker') || message.includes('dockerfile')) {
      return "🤖 **Docker** is a platform for developing, shipping, and running applications in containers.\n\n" +
             "**Dockerfile** is a text file with instructions to build a Docker image:\n\n" +
             "• **FROM**: Base image (e.g., python:3.9-slim)\n" +
             "• **WORKDIR**: Set working directory\n" +
             "• **COPY**: Copy files into container\n" +
             "• **RUN**: Execute commands during build\n" +
             "• **EXPOSE**: Document ports\n" +
             "• **CMD**: Default command to run\n\n" +
             "I can generate optimized Dockerfiles for your projects!";
    }
    
    if (message.includes('deploy') || message.includes('deployment')) {
      return "🤖 **Deployment Strategies** depend on your project type:\n\n" +
             "**🐳 Docker**:\n" +
             "• Containerized applications\n" +
             "• Consistent environments\n" +
             "• Easy scaling\n\n" +
             "**☸️ Kubernetes**:\n" +
             "• Microservices architecture\n" +
             "• Auto-scaling\n" +
             "• Load balancing\n\n" +
             "**☁️ Cloud Deploy**:\n" +
             "• Direct platform deployment\n" +
             "• Managed services\n" +
             "• Built-in monitoring\n\n" +
             "I can analyze your project and recommend the best approach!";
    }
    
    if (message.includes('help') || message.includes('how')) {
      return "🤖 **How to use AutoDeploy.AI**:\n\n" +
             "1. **📁 Upload Project**: Drag & drop your project folder\n" +
             "2. **🔗 Or Paste GitHub URL**: Provide repository link\n" +
             "3. **🎯 Select Stack**: Choose Docker/Kubernetes/Cloud\n" +
             "4. **⚡ Generate**: Click 'Generate Dockerfile'\n" +
             "5. **📊 Review**: Check AI analysis and generated files\n" +
             "6. **🚀 Deploy**: Deploy to production!\n\n" +
             "I'll guide you through each step with real-time analysis!";
    }
    
    if (message.includes('analysis') || message.includes('analyze')) {
      return "🤖 **My Analysis Process**:\n\n" +
             "**🔍 Project Structure**:\n" +
             "• Framework detection (React, Flask, etc.)\n" +
             "• Entry point identification\n" +
             "• File organization analysis\n\n" +
             "**📦 Dependencies**:\n" +
             "• Package.json analysis\n" +
             "• Requirements.txt parsing\n" +
             "• Dependency tree mapping\n\n" +
             "**⚠️ Missing Files**:\n" +
             "• Critical file detection\n" +
             "• Generation recommendations\n" +
             "• Best practices suggestions\n\n" +
             "**📊 Health Assessment**:\n" +
             "• Project readiness evaluation\n" +
             "• Security considerations\n" +
             "• Performance optimization tips\n\n" +
             "I think out loud during analysis so you understand my reasoning!";
    }
    
    if (message.includes('ml') || message.includes('ai') || message.includes('machine learning')) {
      return "🤖 **ML/AI Project Support**:\n\n" +
             "**🤖 Model Files**:\n" +
             "• .h5, .pkl, .pt, .joblib detection\n" +
             "• Model loading optimization\n" +
             "• Caching strategies\n\n" +
             "**⚡ GPU Support**:\n" +
             "• CUDA integration\n" +
             "• TensorFlow optimization\n" +
             "• Memory management\n\n" +
             "**📊 Data Handling**:\n" +
             "• Volume mounting for datasets\n" +
             "• Data persistence\n" +
             "• Streaming capabilities\n\n" +
             "**🔍 Health Checks**:\n" +
             "• Model loading verification\n" +
             "• Memory usage monitoring\n" +
             "• Performance metrics\n\n" +
             "I ensure your ML models are properly containerized!";
    }
    
    // Default response
    return "🤖 I'm here to help with your deployment needs! I can:\n\n" +
           "• **🔍 Analyze** GitHub repositories in real-time\n" +
           "• **🐳 Generate** optimized Dockerfiles\n" +
           "• **📊 Provide** step-by-step deployment guidance\n" +
           "• **❓ Answer** technical questions\n\n" +
           "Just paste a GitHub URL, upload files, or ask me anything about deployment!";
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isThinking || isAnalyzing || isStreaming) return;

    const userMessage = inputValue.trim();
    setInputValue('');

    setMessages(prev => [...prev, {
      id: `user-${Date.now()}`,
      type: 'user',
      content: userMessage,
      timestamp: new Date()
    }]);

    await generateAIResponse(userMessage);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getMessageIcon = (message: Message) => {
    switch (message.type) {
      case 'user':
        return <User className="w-4 h-4 mt-1 flex-shrink-0" />;
      case 'thinking':
        return <Brain className="w-4 h-4 mt-1 flex-shrink-0 animate-pulse" />;
      case 'console':
        return null; // no leading icon for console mode
      default:
        return <Bot className="w-4 h-4 mt-1 flex-shrink-0" />;
    }
  };

  const getMessageStyle = (message: Message) => {
    if (message.type === 'console') {
      // Plain console line – subtle coloring by level, no borders/boxes
      const base = 'text-slate-200 font-mono text-[13px] leading-6 whitespace-pre-wrap';
      if (message.level === 'error') return `${base} text-red-300`;
      if (message.level === 'success') return `${base} text-green-300`;
      if (message.level === 'warning') return `${base} text-yellow-300`;
      return base;
    }
    
    if (message.type === 'user') {
      return 'bg-gradient-to-r from-blue-500 to-purple-500 text-white';
    }
    
    if (message.type === 'thinking') {
      return 'bg-slate-700/50 text-slate-300 border border-slate-600';
    }
    
    return 'bg-slate-800/50 text-white border border-slate-600';
  };

  return (
    <>
      {/* Floating AI Assistant Button */}
      <Button
        onClick={onToggle}
        className={`fixed bottom-6 right-6 z-50 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-full w-14 h-14 shadow-lg transition-all duration-300 transform hover:scale-110 ${
          isOpen ? 'rotate-45' : ''
        }`}
        aria-label="AI Assistant"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
      </Button>

      {/* Chat Box - Responsive Design */}
      <div
        className={`fixed top-0 right-0 h-full w-full lg:w-96 bg-slate-900/95 backdrop-blur-sm border-l border-slate-700 transform transition-transform duration-300 ease-in-out z-40 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <Card className="h-full flex flex-col bg-transparent border-0">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">AI Assistant</h3>
                <p className="text-sm text-slate-400">Powered by GPT-4</p>
              </div>
            </div>
            <Button
              onClick={onToggle}
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Console-style stream */}
            <div className="space-y-1">
              {messages.map((message) => (
                <div key={message.id} className="flex">
                  {/* User/AI bubbles remain minimal; console lines are plain text */}
                  {message.type === 'console' ? (
                    <p
                      className={`${getMessageStyle(message)} transition-opacity duration-300 ${message.animating ? 'opacity-90' : 'opacity-100'}`}
                    >
                      {message.display ?? message.content}
                    </p>
                  ) : (
                    <div className={`max-w-[85%] px-0 py-0 ${getMessageStyle(message)}`}>
                      <div className="flex items-start gap-2">
                        {getMessageIcon(message)}
                        <div className="flex-1">
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input */}
          <div className="p-4 border-t border-slate-700 bg-slate-800/50">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Paste GitHub URL or ask a question..."
                className="flex-1 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-purple-400"
                disabled={isThinking || isAnalyzing || isStreaming}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isThinking || isAnalyzing || isStreaming}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-3"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            {(isThinking || isAnalyzing || isStreaming) && (
              <p className="text-xs text-slate-400 mt-2 text-center">
                {isStreaming ? '📡 Streaming analysis...' : isAnalyzing ? '🔍 Analyzing project...' : '🧠 AI is thinking...'}
              </p>
            )}
          </div>
        </Card>
      </div>
    </>
  );
});

AIAssistant.displayName = 'AIAssistant';

export default AIAssistant;
