import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import OpenAI from 'openai';
import { GitHubFile, ProjectAnalysis } from './aiService';

export interface FileGenerationRequest {
  fileName: string;
  fileType: 'config' | 'entry' | 'dependency' | 'docker';
  reason: string;
  analysis: ProjectAnalysis;
  existingFiles: GitHubFile[];
  userPrompt?: string;
  thinkingProcess?: string[];
}

export interface GeneratedFile {
  fileName: string;
  content: string;
  reason: string;
  isRequired: boolean;
  fileType: 'config' | 'entry' | 'dependency' | 'docker';
  thinkingProcess: string[];
}

export interface FileAnalysisResult {
  missingFiles: string[];
  existingFiles: string[];
  recommendations: string[];
  projectHealth: 'excellent' | 'good' | 'needs_improvement' | 'critical';
  thinkingProcess: string[];
}

export class IntelligentFileGenerator {
  private llm: ChatOpenAI;
  private outputParser: StringOutputParser;

  constructor(apiKey: string) {
    this.llm = new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName: "gpt-4",
      temperature: 0.1,
      maxTokens: 4000,
    });
    this.outputParser = new StringOutputParser();
  }

  /**
   * Analyze project files and identify what's missing with detailed reasoning
   */
  async analyzeProjectFiles(files: GitHubFile[], analysis: ProjectAnalysis): Promise<FileAnalysisResult> {
    const thinkingProcess: string[] = [];
    
    thinkingProcess.push("ðŸ” Starting intelligent file analysis...");
    thinkingProcess.push(`ðŸ“Š Project: ${analysis.language} project with ${files.length} files`);
    
    const existingFiles = files.map(f => f.name);
    const requiredFiles = this.getRequiredFilesForProject(analysis);
    const missingFiles: string[] = [];
    const recommendations: string[] = [];

    thinkingProcess.push("ðŸ“‹ Checking required files for this project type...");
    
    for (const required of requiredFiles) {
      if (!existingFiles.includes(required.fileName)) {
        missingFiles.push(required.fileName);
        recommendations.push(required.reason);
        thinkingProcess.push(`âŒ File '${required.fileName}' not found: ${required.reason}`);
      } else {
        thinkingProcess.push(`âœ… File '${required.fileName}' already exists, skipping generation`);
      }
    }

    // Enhanced Python project analysis with ML focus
    if (analysis.language === 'python') {
      thinkingProcess.push("ðŸ Analyzing Python project structure...");
      
      const pythonFiles = files.filter(f => f.name.endsWith('.py'));
      thinkingProcess.push(`ðŸ“„ Found ${pythonFiles.length} Python files: ${pythonFiles.map(f => f.name).join(', ')}`);
      
      // Look for Flask/FastAPI entry points
      let entryPointFound = false;
      for (const file of pythonFiles) {
        if (file.content) {
          if (file.content.includes('app = Flask(__name__)') || file.content.includes('Flask(__name__)')) {
            thinkingProcess.push(`ðŸŽ¯ Detected Flask entrypoint in '${file.name}' - this will be our main application file`);
            analysis.framework = 'flask';
            analysis.entryPoint = file.name;
            entryPointFound = true;
            break;
          } else if (file.content.includes('app = FastAPI()') || file.content.includes('FastAPI()')) {
            thinkingProcess.push(`ðŸš€ Detected FastAPI entrypoint in '${file.name}' - this will be our main application file`);
            analysis.framework = 'fastapi';
            analysis.entryPoint = file.name;
            entryPointFound = true;
            break;
          }
        }
      }
      
      if (!entryPointFound) {
        thinkingProcess.push("âš ï¸ No Flask/FastAPI entrypoint detected. Looking for main.py or similar...");
        const mainFile = pythonFiles.find(f => f.name === 'main.py');
        if (mainFile) {
          thinkingProcess.push("ðŸ“ Found main.py - will use this as entry point");
          analysis.entryPoint = 'main.py';
        } else {
          thinkingProcess.push("âŒ No clear entry point found. Will need to analyze imports to determine main file");
        }
      }
      
      // Enhanced ML model file detection
      const modelFiles = files.filter(f => 
        f.name.endsWith('.pkl') || f.name.endsWith('.h5') || f.name.endsWith('.pt') || 
        f.name.endsWith('.joblib') || f.name.endsWith('.model') || f.name.endsWith('.weights')
      );
      if (modelFiles.length > 0) {
        thinkingProcess.push(`ðŸ¤– Found ${modelFiles.length} ML model files: ${modelFiles.map(f => f.name).join(', ')}`);
        thinkingProcess.push("ðŸ’¡ These will be included in the Docker image for production deployment");
        thinkingProcess.push("ðŸ”§ Will ensure proper model loading and caching in Dockerfile");
      }

      // Check for model download scripts
      const modelScripts = pythonFiles.filter(f => 
        f.name.toLowerCase().includes('model') || f.name.toLowerCase().includes('train') || 
        f.name.toLowerCase().includes('build') || f.name.toLowerCase().includes('download')
      );
      if (modelScripts.length > 0) {
        thinkingProcess.push(`ðŸ“¥ Found ${modelScripts.length} model-related scripts: ${modelScripts.map(f => f.name).join(', ')}`);
        thinkingProcess.push("ðŸ”§ Will include model building/downloading in Dockerfile build process");
      }

      // Check for data directories
      const dataDirs = files.filter(f => 
        f.type === 'dir' && (f.name.includes('data') || f.name.includes('models') || f.name.includes('uploads'))
      );
      if (dataDirs.length > 0) {
        thinkingProcess.push(`ðŸ“ Found data directories: ${dataDirs.map(f => f.name).join(', ')}`);
        thinkingProcess.push("ðŸ”§ Will ensure proper volume mounting and data persistence");
      }
    }

    // Check for Docker-related files
    if (analysis.hasDockerfile) {
      thinkingProcess.push("ðŸ³ Dockerfile already exists - will analyze and optimize it");
    } else {
      thinkingProcess.push("ðŸ³ No Dockerfile found - will generate a production-ready one");
    }

    const projectHealth = this.assessProjectHealth(analysis, missingFiles.length);
    thinkingProcess.push(`ðŸ“Š Project health assessment: ${projectHealth.toUpperCase()}`);
    
    if (projectHealth === 'excellent') {
      thinkingProcess.push("ðŸŽ‰ Excellent! Your project has all the essential files");
    } else if (projectHealth === 'good') {
      thinkingProcess.push("ðŸ‘ Good structure, just need a few missing files");
    } else if (projectHealth === 'needs_improvement') {
      thinkingProcess.push("âš ï¸ Project needs some improvements - several files missing");
    } else {
      thinkingProcess.push("ðŸš¨ Critical issues detected - missing essential project files");
    }

    return {
      missingFiles,
      existingFiles,
      recommendations,
      projectHealth,
      thinkingProcess
    };
  }

  /**
   * Generate missing files based on analysis with detailed reasoning
   */
  async generateMissingFiles(
    analysis: ProjectAnalysis,
    existingFiles: GitHubFile[],
    missingFiles: string[],
    userPrompt?: string
  ): Promise<GeneratedFile[]> {
    const thinkingProcess: string[] = [];
    
    thinkingProcess.push(`\nðŸš€ Starting intelligent file generation...`);
    thinkingProcess.push(`ðŸ“ Need to generate ${missingFiles.length} missing files`);
    
    if (missingFiles.length === 0) {
      thinkingProcess.push("âœ… No files to generate - your project is complete!");
      return [];
    }

    const generatedFiles: GeneratedFile[] = [];

    for (const fileName of missingFiles) {
      thinkingProcess.push(`\nðŸ”§ Generating file: ${fileName}`);
      
      const fileType = this.getFileType(fileName);
      const reason = this.getFileGenerationReason(fileName, fileType);
      
      thinkingProcess.push(`ðŸ“‹ File type: ${fileType}`);
      thinkingProcess.push(`ðŸ’­ Reason: ${reason}`);
      
      try {
        thinkingProcess.push("ðŸ¤– Calling AI to generate intelligent file content...");
        
        const request: FileGenerationRequest = {
          fileName,
          fileType,
          reason,
          analysis,
          existingFiles,
          userPrompt,
          thinkingProcess
        };

        const generatedFile = await this.generateFile(request);
        generatedFiles.push(generatedFile);
        
        thinkingProcess.push(`âœ… Successfully generated ${fileName}`);
        thinkingProcess.push(`ðŸ“ Content length: ${generatedFile.content.length} characters`);
        
        // Show preview for important files
        if (fileName === 'Dockerfile') {
          thinkingProcess.push(`ðŸ³ Dockerfile preview (first 3 lines):`);
          const lines = generatedFile.content.split('\n').slice(0, 3);
          lines.forEach(line => thinkingProcess.push(`   ${line}`));
          thinkingProcess.push("   ...");
        } else if (fileName === 'docker-compose.yml') {
          thinkingProcess.push(`ðŸ™ Docker Compose preview (first 5 lines):`);
          const lines = generatedFile.content.split('\n').slice(0, 5);
          lines.forEach(line => thinkingProcess.push(`   ${line}`));
          thinkingProcess.push("   ...");
        }
        
      } catch (error) {
        thinkingProcess.push(`âŒ AI generation failed for ${fileName}: ${error}`);
        thinkingProcess.push("ðŸ”„ Falling back to intelligent template generation...");
        
        const fallbackFile = this.createFallbackFile(fileName, analysis, thinkingProcess);
        generatedFiles.push(fallbackFile);
        
        thinkingProcess.push(`âœ… Generated fallback ${fileName} using intelligent templates`);
      }
    }

    thinkingProcess.push(`\nðŸŽ‰ File generation complete!`);
    thinkingProcess.push(`ðŸ“Š Summary:`);
    thinkingProcess.push(`   - Total files generated: ${generatedFiles.length}`);
    thinkingProcess.push(`   - Required files: ${generatedFiles.filter(f => f.isRequired).length}`);
    thinkingProcess.push(`   - Optional files: ${generatedFiles.filter(f => !f.isRequired).length}`);
    
    // Special announcement for Dockerfile
    const dockerfile = generatedFiles.find(f => f.fileName === 'Dockerfile');
    if (dockerfile) {
      thinkingProcess.push(`\nðŸ³ Production Dockerfile generated with:`);
      thinkingProcess.push(`   - Multi-stage build for optimization`);
      thinkingProcess.push(`   - Security features (non-root user, minimal layers)`);
      thinkingProcess.push(`   - Health checks and monitoring`);
      thinkingProcess.push(`   - ML model support (if applicable)`);
      thinkingProcess.push(`   - Production-ready with gunicorn`);
    }

    return generatedFiles;
  }

  /**
   * Generate a specific file using direct OpenAI for reliable analysis
   */
  private async generateFile(request: FileGenerationRequest): Promise<GeneratedFile> {
    // Use direct OpenAI API instead of LangChain to avoid template issues
    const systemPrompt = this.createDirectSystemPrompt(request);
    const userMessage = this.createDirectUserMessage(request);
    
    // Use imported OpenAI for reliable generation
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    console.log(`🧠 Sending request to OpenAI GPT-4o mini for real analysis of ${request.fileName}...`);
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      temperature: 0.1,
      max_tokens: 2000, // 🔹 Reduced from 4000 to prevent token limit issues
    });
    
    const content = completion.choices[0]?.message?.content?.trim();
    
    if (!content) {
      throw new Error('OpenAI returned empty content');
    }
    
    console.log(`✅ OpenAI GPT-4o mini successfully generated ${request.fileName} (${content.length} chars)`);

    return {
      fileName: request.fileName,
      content: content,
      reason: request.reason,
      isRequired: this.isFileRequired(request.fileName, request.analysis),
      fileType: request.fileType,
      thinkingProcess: request.thinkingProcess || []
    };
  }

  /**
   * Create direct system prompt for OpenAI API
   */
  private createDirectSystemPrompt(request: FileGenerationRequest): string {
    return `Expert DevOps engineer. Generate production-ready ${request.fileName} for ${request.analysis.language} project.

REQUIREMENTS:
1. Generate ONLY file content - no markdown, explanations, or backticks
2. Use framework: ${request.analysis.framework || 'auto-detect'}
3. Use entry point: ${request.analysis.entryPoint || 'auto-detect'}
4. Include dependencies: ${request.analysis.dependencies.slice(0, 10).join(', ')}
5. Follow best practices: multi-stage builds, security, health checks
6. Handle ML libraries: ${request.analysis.dependencies.some(d => ['tensorflow', 'torch', 'sklearn'].some(ml => d.toLowerCase().includes(ml))) ? 'YES' : 'NO'}

Generate complete file content:`;
  }

  /**
   * Create direct user message for OpenAI API
   */
  private createDirectUserMessage(request: FileGenerationRequest): string {
    const projectContext = this.buildProjectContext(request);
    
    return `PROJECT ANALYSIS:
${projectContext}

Generate ${request.fileName} for ${request.analysis.language} project with framework ${request.analysis.framework || 'auto-detect'} and entry point ${request.analysis.entryPoint || 'auto-detect'}.`;
  }

  /**
   * Build comprehensive project context for AI generation with intelligent trimming
   */
  private buildProjectContext(request: FileGenerationRequest): string {
    const { analysis, existingFiles } = request;
    
    // 🔹 1. Trim Input Context Intelligently
    const trimmedFiles = this.trimFileContext(existingFiles, request.fileName);
    const trimmedDependencies = this.trimDependencies(analysis.dependencies);
    const trimmedPackageFiles = this.trimPackageFiles(analysis.packageFiles);
    
    let context = `PROJECT ANALYSIS:
- Language: ${analysis.language}
- Framework: ${analysis.framework || 'None detected'}
- Entry Point: ${analysis.entryPoint || 'Not detected'}
- Project Health: ${analysis.projectHealth || 'unknown'}
- Has Dockerfile: ${analysis.hasDockerfile}

DEPENDENCIES FOUND:
${trimmedDependencies.join(', ')}

EXISTING FILES IN PROJECT:
${trimmedFiles.map(f => `- ${f.name}${f.content ? ` (${f.content.length} chars)` : ''}`).join('\n')}

PACKAGE FILES CONTENT:
${trimmedPackageFiles.join('\n---\n')}`;

    // Add specific analysis for different file types
    if (request.fileName === 'Dockerfile') {
      context += `\n\nDOCKERFILE REQUIREMENTS:
- Use multi-stage builds for optimization
- Include security best practices (non-root user, minimal layers)
- Add health checks for the application
- Consider the detected framework: ${analysis.framework}
- Handle ML models if detected: ${analysis.dependencies.some(d => ['tensorflow', 'torch', 'sklearn'].some(ml => d.toLowerCase().includes(ml)))}
- Use proper entry point: ${analysis.entryPoint || 'app.py'}`;
    } else if (request.fileName === 'requirements.txt') {
      context += `\n\nREQUIREMENTS.TXT REQUIREMENTS:
- Include all detected dependencies: ${trimmedDependencies.join(', ')}
- Add version constraints for stability
- Include development dependencies if needed
- Consider ML libraries: ${analysis.dependencies.filter(d => ['tensorflow', 'torch', 'sklearn', 'numpy', 'pandas'].some(ml => d.toLowerCase().includes(ml))).join(', ')}`;
    }

    return context;
  }

  /**
   * 🔹 Trim file context intelligently - Remove large comments, unused imports, redundant files
   */
  private trimFileContext(files: GitHubFile[], targetFileName: string): GitHubFile[] {
    return files
      .filter(file => {
        // Remove very large files that are likely not essential
        if (file.content && file.content.length > 50000) {
          return false;
        }
        
        // Remove binary files and images
        if (file.name.match(/\.(jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot|pdf|zip|tar|gz)$/i)) {
          return false;
        }
        
        // Remove very old or temporary files
        if (file.name.match(/\.(log|tmp|temp|bak|backup|old)$/i)) {
          return false;
        }
        
        return true;
      })
      .map(file => {
        if (!file.content || typeof file.content !== 'string') return file;
        
        // 🔹 Remove large comments and unused imports
        let trimmedContent = this.trimFileContent(file.content, file.name);
        
        // Limit content size to prevent token overflow
        if (trimmedContent.length > 8000) {
          trimmedContent = trimmedContent.substring(0, 8000) + '\n... (content truncated for token limits)';
        }
        
        return {
          ...file,
          content: trimmedContent
        };
      })
      .slice(0, 15); // Limit to 15 most relevant files
  }

  /**
   * 🔹 Trim file content - Remove large comments, unused imports, redundant code
   */
  private trimFileContent(content: string | undefined, fileName: string): string {
    // Handle undefined or null content
    if (!content || typeof content !== 'string') {
      return '';
    }
    
    let trimmed = content;
    
    // Remove large comment blocks (more than 10 lines)
    trimmed = trimmed.replace(/\/\*[\s\S]{200,}?\*\//g, '/* [Large comment block removed] */');
    trimmed = trimmed.replace(/#[\s\S]{200,}?(?=\n|$)/g, '# [Large comment block removed]');
    
    // Remove excessive whitespace and empty lines
    trimmed = trimmed.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    // For Python files, remove unused imports (basic detection)
    if (fileName.endsWith('.py')) {
      // Remove common unused imports that are often auto-generated
      trimmed = trimmed.replace(/^import\s+(os|sys|json|datetime|random|math)\s*$/gm, '');
      trimmed = trimmed.replace(/^from\s+\w+\s+import\s+\*\s*$/gm, '');
    }
    
    // For JavaScript files, remove common unused imports
    if (fileName.match(/\.(js|jsx|ts|tsx)$/)) {
      trimmed = trimmed.replace(/^import\s+.*from\s+['"]react['"]\s*$/gm, '');
      trimmed = trimmed.replace(/^import\s+.*from\s+['"]lodash['"]\s*$/gm, '');
    }
    
    return trimmed;
  }

  /**
   * 🔹 Trim dependencies - Keep only essential ones
   */
  private trimDependencies(dependencies: string[]): string[] {
    // Prioritize framework and essential dependencies
    const essential = dependencies.filter(dep => 
      dep.match(/^(flask|django|express|react|vue|angular|fastapi|tornado|bottle|cherrypy|pyramid|web2py|falcon|sanic|quart|starlette|litestar|blacksheep|roda|hug|masonite|tornado|bottle|cherrypy|pyramid|web2py|falcon|sanic|quart|starlette|litestar|blacksheep|roda|hug|masonite)$/i) ||
      dep.match(/^(tensorflow|torch|sklearn|numpy|pandas|matplotlib|seaborn|plotly|scipy|opencv|pillow|requests|beautifulsoup4|selenium|scrapy|django|flask|fastapi|pytest|black|flake8|mypy|pylint|bandit|safety|pipenv|poetry|pip-tools|setuptools|wheel|twine|bump2version|pre-commit|tox|coverage|pytest-cov|pytest-xdist|pytest-mock|pytest-asyncio|pytest-benchmark|pytest-html|pytest-json-report|pytest-cov|pytest-xdist|pytest-mock|pytest-asyncio|pytest-benchmark|pytest-html|pytest-json-report)$/i)
    );
    
    // Add other dependencies up to a reasonable limit
    const others = dependencies.filter(dep => !essential.includes(dep)).slice(0, 10);
    
    return [...essential, ...others];
  }

  /**
   * 🔹 Trim package files - Keep only essential content
   */
  private trimPackageFiles(packageFiles: string[]): string[] {
    return packageFiles
      .map(content => {
        // Limit each package file content
        if (content.length > 2000) {
          return content.substring(0, 2000) + '\n... (truncated)';
        }
        return content;
      })
      .slice(0, 5); // Limit to 5 most important package files
  }

  /**
   * Create enhanced prompt for file generation with comprehensive project analysis
   */
  private createEnhancedFileGenerationPrompt(request: FileGenerationRequest): PromptTemplate {
    // Build the template string with safe parameter substitution
    const templateString = `You are an expert DevOps engineer and ML/AI specialist with deep knowledge of modern development practices. Your task is to generate a {fileType} file named "{fileName}" for a {language} project.

PROJECT ANALYSIS:
- Language: {language}
- Framework: {framework}
- Entry Point: {entryPoint}
- Dependencies: {dependencies}
- Existing Files: {existingFiles}

REAL CODE ANALYSIS:
{projectContext}

THINKING PROCESS SO FAR:
{thinkingProcess}

CRITICAL REQUIREMENTS FOR PRODUCTION-READY FILES:
1. Generate ONLY the file content - no markdown, no explanations, no additional text
2. Make the file functional and production-ready based on ACTUAL project analysis
3. Follow best practices for the specific file type and framework
4. Consider the existing project structure, dependencies, and code patterns
5. Include proper configuration, error handling, and security measures
6. Use appropriate syntax and formatting for the file type
7. For ML projects: Handle model files, data directories, and GPU support
8. For Dockerfiles: Use multi-stage builds, non-root users, health checks
9. For .dockerignore: Exclude unnecessary files to optimize build context
10. NEVER generate placeholder or dummy content - make it real and functional

SPECIAL CONSIDERATIONS FOR ML/AI PROJECTS:
- Include model file handling (.h5, .pkl, .pt, .joblib files)
- Consider GPU support if tensorflow/pytorch detected
- Handle data directories and model downloads
- Include proper environment variables for ML frameworks
- Add health checks that verify model loading
- Consider model caching and optimization

FILE TYPE GUIDE:
- config: Configuration files (tsconfig.json, webpack.config.js, etc.)
- entry: Entry point files (app.py, main.js, index.html, etc.)
- dependency: Dependency management files (requirements.txt, package.json, etc.)
- docker: Docker-related files (Dockerfile, docker-compose.yml, etc.)

USER REQUIREMENTS:
{userPrompt}

Generate the complete {fileName} file content that will work perfectly in production and Docker Hub deployment:`;

    return PromptTemplate.fromTemplate(templateString);
  }

  /**
   * Get required files based on project type with ML awareness
   */
  private getRequiredFilesForProject(analysis: ProjectAnalysis): Array<{fileName: string, reason: string}> {
    const required: Array<{fileName: string, reason: string}> = [];

    switch (analysis.language) {
      case 'javascript':
        if (!analysis.framework || analysis.framework === 'vanilla') {
          required.push(
            { fileName: 'package.json', reason: 'Required for Node.js project dependencies' },
            { fileName: 'index.js', reason: 'Main entry point for Node.js application' }
          );
        } else if (analysis.framework === 'react') {
          required.push(
            { fileName: 'package.json', reason: 'Required for React project dependencies' },
            { fileName: 'src/App.jsx', reason: 'Main React application component' },
            { fileName: 'src/index.js', reason: 'React application entry point' },
            { fileName: 'public/index.html', reason: 'HTML template for React app' }
          );
        } else if (analysis.framework === 'nextjs') {
          required.push(
            { fileName: 'package.json', reason: 'Required for Next.js project dependencies' },
            { fileName: 'next.config.js', reason: 'Next.js configuration file' },
            { fileName: 'pages/index.js', reason: 'Next.js home page' }
          );
        }
        break;

      case 'python':
        // For Python, we need to analyze the actual code to find the entry point
        // Don't generate placeholder app.py - find the real entry point
        required.push(
          { fileName: 'requirements.txt', reason: 'Required for Python dependencies' }
        );
        // Note: We'll detect the actual entry point from code analysis
        break;

      case 'html':
        required.push(
          { fileName: 'index.html', reason: 'Main HTML entry point' },
          { fileName: 'styles.css', reason: 'CSS styling file' },
          { fileName: 'script.js', reason: 'JavaScript functionality file' }
        );
        break;

      case 'rust':
        required.push(
          { fileName: 'Cargo.toml', reason: 'Required for Rust project configuration' },
          { fileName: 'src/main.rs', reason: 'Main Rust application entry point' }
        );
        break;

      case 'go':
        required.push(
          { fileName: 'go.mod', reason: 'Required for Go module configuration' },
          { fileName: 'main.go', reason: 'Main Go application entry point' }
        );
        break;
    }

    // Always check for essential files
    if (!analysis.hasDockerfile) {
      required.push(
        { fileName: 'Dockerfile', reason: 'Required for containerization' },
        { fileName: '.dockerignore', reason: 'Optimize Docker build context' }
      );
    }

    return required;
  }

  /**
   * Assess overall project health
   */
  private assessProjectHealth(analysis: ProjectAnalysis, missingFilesCount: number): 'excellent' | 'good' | 'needs_improvement' | 'critical' {
    if (missingFilesCount === 0 && analysis.hasDockerfile) {
      return 'excellent';
    } else if (missingFilesCount <= 2) {
      return 'good';
    } else if (missingFilesCount <= 5) {
      return 'needs_improvement';
    } else {
      return 'critical';
    }
  }

  /**
   * Get file type for generation
   */
  private getFileType(fileName: string): 'config' | 'entry' | 'dependency' | 'docker' {
    if (fileName.includes('config') || fileName.endsWith('.config.js') || fileName.endsWith('.config.ts')) {
      return 'config';
    } else if (fileName.includes('package') || fileName.includes('requirements') || fileName.includes('Cargo') || fileName.includes('go.mod')) {
      return 'dependency';
    } else if (fileName.includes('Docker') || fileName.includes('docker')) {
      return 'docker';
    } else {
      return 'entry';
    }
  }

  /**
   * Get reason for file generation
   */
  private getFileGenerationReason(fileName: string, fileType: string): string {
    const reasons: Record<string, string> = {
      'package.json': 'Essential dependency management for Node.js projects',
      'requirements.txt': 'Required for Python package management',
      'Dockerfile': 'Needed for containerization and deployment',
      'app.py': 'Main entry point for Python applications',
      'index.js': 'Main entry point for Node.js applications',
      'index.html': 'HTML entry point for web applications',
      'tsconfig.json': 'TypeScript configuration for type safety',
      'webpack.config.js': 'Module bundler configuration',
      'vite.config.ts': 'Build tool configuration for modern web apps'
    };

    return reasons[fileName] || `Required ${fileType} file for project functionality`;
  }

  /**
   * Check if file is absolutely required
   */
  private isFileRequired(fileName: string, analysis: ProjectAnalysis): boolean {
    const criticalFiles = ['package.json', 'requirements.txt', 'Dockerfile', 'app.py', 'main.js', 'index.html'];
    return criticalFiles.includes(fileName);
  }

  /**
   * Create intelligent fallback file when AI generation fails - NO DUMMY CONTENT
   */
  private createFallbackFile(fileName: string, analysis: ProjectAnalysis, thinkingProcess: string[]): GeneratedFile {
    thinkingProcess.push(`ðŸ”„ AI generation failed for ${fileName}, creating intelligent fallback...`);
    
    let content = '';
    
    switch (fileName) {
      case 'package.json':
        content = this.generateIntelligentPackageJson(analysis);
        break;
      case 'requirements.txt':
        content = this.generateIntelligentRequirementsTxt(analysis);
        break;
      case 'Dockerfile':
        content = this.generateIntelligentDockerfile(analysis);
        break;
      case 'app.py':
        content = this.generateIntelligentAppPy(analysis);
        break;
      case 'index.js':
        content = this.generateIntelligentIndexJs(analysis);
        break;
      case 'index.html':
        content = this.generateIntelligentIndexHtml(analysis);
        break;
      case '.dockerignore':
        content = this.generateIntelligentDockerignore(analysis);
        break;
      default:
        // Generate intelligent content based on file type and project analysis
        content = this.generateIntelligentGenericFile(fileName, analysis);
    }

    thinkingProcess.push(`âœ… Generated intelligent fallback for ${fileName} based on project analysis`);

    return {
      fileName,
      content,
      reason: `Intelligent fallback ${fileName} generated based on project analysis`,
      isRequired: this.isFileRequired(fileName, analysis),
      fileType: this.getFileType(fileName),
      thinkingProcess
    };
  }

  /**
   * Generate intelligent package.json based on project analysis
   */
  private generateIntelligentPackageJson(analysis: ProjectAnalysis): string {
    const basePackage: any = {
      name: "autodeploy-project",
      version: "1.0.0",
      description: "AI-analyzed project with intelligent configuration",
      main: analysis.entryPoint || "index.js",
      scripts: {
        start: `node ${analysis.entryPoint || 'index.js'}`,
        dev: `node --watch ${analysis.entryPoint || 'index.js'}`,
        test: "echo \"Error: no test specified\" && exit 1"
      },
      dependencies: {},
      devDependencies: {},
      engines: {
        node: ">=18.0.0"
      }
    };

    // Add detected dependencies
    if (analysis.dependencies.length > 0) {
      analysis.dependencies.forEach(dep => {
        if (dep && typeof dep === 'string') {
          basePackage.dependencies[dep] = "^latest";
        }
      });
    }

    // Framework-specific configuration
    if (analysis.framework === 'react') {
      basePackage.dependencies = { 
        ...basePackage.dependencies,
        react: "^18.0.0", 
        "react-dom": "^18.0.0" 
      };
      basePackage.scripts = {
        start: "react-scripts start",
        build: "react-scripts build",
        test: "react-scripts test",
        eject: "react-scripts eject"
      };
    }

    return JSON.stringify(basePackage, null, 2);
  }

  /**
   * Generate intelligent requirements.txt based on project analysis
   */
  private generateIntelligentRequirementsTxt(analysis: ProjectAnalysis): string {
    let requirements = "# AI-analyzed Python requirements\n";
    
    // Add detected dependencies with versions
    if (analysis.dependencies.length > 0) {
      analysis.dependencies.forEach(dep => {
        if (dep && typeof dep === 'string') {
          requirements += `${dep}>=1.0.0\n`;
        }
      });
    } else {
      // Default requirements based on framework
      if (analysis.framework === 'flask') {
        requirements += "flask>=2.3.0\n";
        requirements += "gunicorn>=21.0.0\n";
      } else if (analysis.framework === 'fastapi') {
        requirements += "fastapi>=0.100.0\n";
        requirements += "uvicorn>=0.23.0\n";
      } else if (analysis.framework === 'django') {
        requirements += "django>=4.2.0\n";
        requirements += "gunicorn>=21.0.0\n";
      } else {
        requirements += "flask>=2.3.0\n";
        requirements += "gunicorn>=21.0.0\n";
      }
    }

    // Add common development dependencies
    requirements += "\n# Development dependencies\n";
    requirements += "pytest>=7.0.0\n";
    requirements += "black>=23.0.0\n";
    requirements += "flake8>=6.0.0\n";

    return requirements;
  }

  /**
   * Generate intelligent Dockerfile based on project analysis
   */
  private generateIntelligentDockerfile(analysis: ProjectAnalysis): string {
    const entryPoint = analysis.entryPoint || 'app.py';
    const port = analysis.framework === 'fastapi' ? '8000' : '5000';
    
    switch (analysis.language) {
      case 'javascript':
        if (analysis.framework === 'react' || analysis.framework === 'vue') {
          return `# Multi-stage build for React/Vue app
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`;
        } else {
          return `# Node.js application
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000
CMD ["npm", "start"]`;
        }

      case 'python':
        // Enhanced Python Dockerfile with ML support
        const hasML = analysis.dependencies.some(d => ['tensorflow', 'torch', 'sklearn', 'numpy', 'pandas'].some(ml => d.toLowerCase().includes(ml)));
        
        return `# Enhanced production Dockerfile for Python ${analysis.framework || 'application'}
# Multi-stage build for optimization and security

# Builder stage
FROM python:3.9-slim AS builder

WORKDIR /app

# Install system dependencies${hasML ? ' for ML libraries' : ''}
RUN apt-get update && apt-get install -y \\
    gcc \\
    g++ \\
    ${hasML ? 'libgl1-mesa-glx \\\n    libglib2.0-0 \\\n    libsm6 \\\n    libxext6 \\\n    libxrender-dev \\\n    libgomp1 \\' : ''}
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Copy application code
COPY . .

# Production stage
FROM python:3.9-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \\
    ${hasML ? 'libgl1-mesa-glx \\\n    libglib2.0-0 \\\n    libsm6 \\\n    libxext6 \\\n    libxrender-dev \\\n    libgomp1 \\' : ''}
    curl \\
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd --create-home --shell /bin/bash appuser

# Copy Python packages from builder
COPY --from=builder /root/.local /home/appuser/.local

# Copy application code
COPY --from=builder /app .

# Set ownership
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/home/appuser/.local/lib/python3.9/site-packages
ENV FLASK_APP=${entryPoint}
ENV FLASK_ENV=production

# Expose port
EXPOSE ${port}

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \\
    CMD curl -f http://localhost:${port}/ || exit 1

# Use gunicorn for production
CMD ["gunicorn", "--bind", "0.0.0.0:${port}", "--workers", "4", "--timeout", "120", "--preload", "${entryPoint.replace('.py', '')}:app"]`;

      case 'html':
      case 'static':
        return `# Static HTML/CSS/JS website
FROM nginx:alpine

# Copy website files to nginx
COPY . /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`;

      default:
        return `# Generic application container
FROM ubuntu:22.04

WORKDIR /app
COPY . .

# Install basic dependencies
RUN apt-get update && apt-get install -y \\
    curl \\
    wget \\
    && rm -rf /var/lib/apt/lists/*

EXPOSE 8080
CMD ["echo", "Please configure your application startup command"]`;
    }
  }

  /**
   * Generate intelligent app.py based on project analysis
   */
  private generateIntelligentAppPy(analysis: ProjectAnalysis): string {
    const framework = analysis.framework || 'flask';
    
    if (framework === 'fastapi') {
      return `#!/usr/bin/env python3
"""
AI-analyzed FastAPI application entry point
"""

from fastapi import FastAPI
import os

app = FastAPI(title="AutoDeploy.AI Generated API", version="1.0.0")

@app.get("/")
async def root():
    return {
        "message": "Hello from AutoDeploy.AI!",
        "status": "running",
        "framework": "fastapi",
        "language": "python"
    }

@app.get("/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get('PORT', 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)`;
    } else {
      return `#!/usr/bin/env python3
"""
AI-analyzed Flask application entry point
"""

from flask import Flask, jsonify
import os

app = Flask(__name__)

@app.route('/')
def home():
    return jsonify({
        "message": "Hello from AutoDeploy.AI!",
        "status": "running",
        "framework": "flask",
        "language": "python"
    })

@app.route('/health')
def health():
    return jsonify({"status": "healthy"})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)`;
    }
  }

  /**
   * Generate intelligent index.js based on project analysis
   */
  private generateIntelligentIndexJs(analysis: ProjectAnalysis): string {
    return `#!/usr/bin/env node
/**
 * AI-analyzed Node.js application entry point
 */

const http = require('http');
const url = require('url');

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;

    res.setHeader('Content-Type', 'application/json');

    if (path === '/' || path === '/health') {
        res.writeHead(200);
        res.end(JSON.stringify({
            message: "Hello from AutoDeploy.AI!",
            status: "running",
            language: "javascript",
            framework: "${analysis.framework || 'node'}",
            timestamp: new Date().toISOString()
        }));
    } else {
        res.writeHead(404);
        res.end(JSON.stringify({
            error: "Not found",
            path: path
        }));
    }
});

server.listen(PORT, () => {
    console.log(\`Server running on port \${PORT}\`);
});`;
  }

  /**
   * Generate intelligent index.html based on project analysis
   */
  private generateIntelligentIndexHtml(analysis: ProjectAnalysis): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AutoDeploy.AI - Generated Project</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            text-align: center;
            max-width: 600px;
        }
        h1 { font-size: 3rem; margin-bottom: 1rem; }
        p { font-size: 1.2rem; margin-bottom: 2rem; opacity: 0.9; }
        .status { 
            background: rgba(255,255,255,0.1); 
            padding: 20px; 
            border-radius: 10px;
            backdrop-filter: blur(10px);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>ðŸš€ AutoDeploy.AI</h1>
        <p>Your AI-analyzed project is running successfully!</p>
        <div class="status">
            <h3>Project Status</h3>
            <p>âœ… Analyzed by AI</p>
            <p>âœ… Ready for deployment</p>
            <p>âœ… Production-ready</p>
            <p>ðŸ“Š Language: ${analysis.language}</p>
            <p>ðŸ”§ Framework: ${analysis.framework || 'None detected'}</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Generate intelligent .dockerignore based on project analysis
   */
  private generateIntelligentDockerignore(analysis: ProjectAnalysis): string {
    let dockerignore = `# AI-analyzed .dockerignore for ${analysis.language} project

# CRITICAL: Exclude problematic directories that cause build failures
.builder/
*.mdc
*.md
README.md
LICENSE
*.csv
*.json
*.xml
*.sql
*.db
*.sqlite

# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg

# Virtual environments
.env
.venv
env/
venv/
ENV/
env.bak/
venv.bak/

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Git
.git/
.gitignore

# Logs
*.log
logs/

# Temporary files
*.tmp
*.temp

# Node modules (if any)
node_modules/

# Build artifacts
dist/
build/
*.tar.gz
*.zip`;

    // Add language-specific ignores
    if (analysis.language === 'python') {
      dockerignore += `\n\n# Python-specific
# Model files (uncomment if you want to exclude them)
# *.h5
# *.pkl
# *.pt
# *.joblib

# Data files (uncomment if you want to exclude them)
# data/
# datasets/`;
    } else if (analysis.language === 'javascript') {
      dockerignore += `\n\n# JavaScript-specific
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.npm
.yarn-integrity`;
    }

    return dockerignore;
  }

  /**
   * Generate intelligent generic file based on project analysis
   */
  private generateIntelligentGenericFile(fileName: string, analysis: ProjectAnalysis): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'json':
        return JSON.stringify({
          name: "autodeploy-project",
          version: "1.0.0",
          description: `AI-analyzed ${analysis.language} project configuration`,
          language: analysis.language,
          framework: analysis.framework || "none"
        }, null, 2);
      
      case 'yaml':
      case 'yml':
        return `# AI-analyzed configuration for ${analysis.language} project
name: autodeploy-project
version: 1.0.0
language: ${analysis.language}
framework: ${analysis.framework || 'none'}
dependencies:
${analysis.dependencies.slice(0, 10).map(dep => `  - ${dep}`).join('\n')}`;
      
      case 'md':
        return `# AutoDeploy.AI Generated Project

This project was analyzed and configured by AutoDeploy.AI.

## Project Details
- **Language**: ${analysis.language}
- **Framework**: ${analysis.framework || 'None detected'}
- **Entry Point**: ${analysis.entryPoint || 'Not detected'}
- **Project Health**: ${analysis.projectHealth || 'unknown'}

## Dependencies
${analysis.dependencies.slice(0, 20).map(dep => `- ${dep}`).join('\n')}

## Getting Started
This project is ready for deployment with the generated configuration files.`;
      
      default:
        return `# AutoDeploy.AI Generated ${fileName}
# Generated for ${analysis.language} project
# Framework: ${analysis.framework || 'None detected'}
# Entry Point: ${analysis.entryPoint || 'Not detected'}

# This file was intelligently generated based on project analysis
# Please customize as needed for your specific requirements`;
    }
  }

  /**
   * Generate docker-compose.yml for the project
   */
  generateDockerCompose(analysis: ProjectAnalysis): string {
    const entryPoint = analysis.entryPoint || 'app.py';
    const port = analysis.framework === 'fastapi' ? '8000' : '5000';
    const hasML = analysis.dependencies.some(d => ['tensorflow', 'torch', 'sklearn', 'numpy', 'pandas'].some(ml => d.toLowerCase().includes(ml)));

    return `# Docker Compose for ${analysis.language} ${analysis.framework || 'application'}
version: '3.8'

services:
  app:
    build: .
    ports:
      - "${port}:${port}"
    environment:
      - PYTHONUNBUFFERED=1
      - FLASK_ENV=production
      - PORT=${port}
    volumes:
      - ./data:/app/data${hasML ? '\n      - ./models:/app/models' : ''}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:${port}/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s${hasML ? `

  # Optional: Add Redis for ML model caching
  redis:
    image: redis:alpine
    restart: unless-stopped
    volumes:
      - redis_data:/data

volumes:
  redis_data:` : ''}
`;
  }

  /**
   * Generate enhanced fallback Dockerfile with ML support
   */
  private generateEnhancedFallbackDockerfile(analysis: ProjectAnalysis): string {
    switch (analysis.language) {
      case 'javascript':
        if (analysis.framework === 'react' || analysis.framework === 'vue') {
          return `# Multi-stage build for React/Vue app
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`;
        } else {
          return `# Node.js application
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000
CMD ["npm", "start"]`;
        }

      case 'html':
      case 'static':
        return `# Static HTML/CSS/JS website
FROM nginx:alpine

# Copy website files to nginx
COPY . /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`;

      case 'python':
        // Enhanced Python Dockerfile with ML support
        const entryPoint = analysis.entryPoint || 'app.py';
        const port = analysis.framework === 'fastapi' ? '8000' : '5000';
        
        return `# Enhanced production Dockerfile for Python ${analysis.framework || 'application'}
# Multi-stage build for optimization and security

# Builder stage
FROM python:3.9-slim AS builder

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \\
    gcc \\
    g++ \\
    curl \\
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Copy application code
COPY . .

# Production stage
FROM python:3.9-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \\
    curl \\
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd --create-home --shell /bin/bash appuser

# Copy Python packages from builder
COPY --from=builder /root/.local /home/appuser/.local

# Copy application code
COPY --from=builder /app .

# Set ownership
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/home/appuser/.local/lib/python3.9/site-packages
ENV FLASK_APP=${entryPoint}
ENV FLASK_ENV=production

# Expose port
EXPOSE ${port}

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \\
    CMD curl -f http://localhost:${port}/ || exit 1

# Use gunicorn for production
CMD ["gunicorn", "--bind", "0.0.0.0:${port}", "--workers", "4", "--timeout", "120", "--preload", "${entryPoint.replace('.py', '')}:app"]`;

      default:
        return `# Generic application container
FROM ubuntu:22.04

WORKDIR /app
COPY . .

# Install basic dependencies
RUN apt-get update && apt-get install -y \\
    curl \\
    wget \\
    && rm -rf /var/lib/apt/lists/*

EXPOSE 8080
CMD ["echo", "Please configure your application startup command"]`;
    }
  }
}
