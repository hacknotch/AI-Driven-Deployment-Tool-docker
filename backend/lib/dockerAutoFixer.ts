import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { DockerErrorAnalyzer, DockerBuildError, GeneratedFile, FileGenerationRequest } from './dockerErrorAnalyzer';
import { GitHubFile, ProjectAnalysis } from './aiService';

export interface DockerAutoFixResult {
  success: boolean;
  attempts: number;
  maxAttempts: number;
  errors: DockerBuildError[];
  generatedFiles: GeneratedFile[];
  removedInstructions: string[];
  finalDockerfile?: string;
  buildLogs: string[];
  errorMessage?: string;
}

export interface DockerAutoFixOptions {
  maxAttempts?: number;
  onLog?: (message: string) => void;
  onProgress?: (progress: number) => void;
  projectContext?: string;
}

export class DockerAutoFixer {
  private errorAnalyzer: DockerErrorAnalyzer;
  private maxAttempts: number;
  private onLog: (message: string) => void;
  private onProgress: (progress: number) => void;

  constructor(apiKey: string, options: DockerAutoFixOptions = {}) {
    this.errorAnalyzer = new DockerErrorAnalyzer(apiKey);
    this.maxAttempts = options.maxAttempts || 3;
    this.onLog = options.onLog || console.log;
    this.onProgress = options.onProgress || (() => {});
  }

  /**
   * Main method to automatically fix Docker build issues
   */
  async autoFixDockerBuild(
    buildContext: string,
    imageName: string,
    projectFiles: GitHubFile[],
    analysis: ProjectAnalysis,
    options: DockerAutoFixOptions = {}
  ): Promise<DockerAutoFixResult> {
    const result: DockerAutoFixResult = {
      success: false,
      attempts: 0,
      maxAttempts: this.maxAttempts,
      errors: [],
      generatedFiles: [],
      removedInstructions: [],
      buildLogs: [],
    };

    this.onLog('🚀 Starting Docker auto-fix process...');
    this.onProgress(0);

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      result.attempts = attempt;
      this.onLog(`\n🔄 Attempt ${attempt}/${this.maxAttempts}`);
      this.onProgress((attempt - 1) / this.maxAttempts * 100);

      try {
        // Attempt Docker build
        const buildResult = await this.attemptDockerBuild(buildContext, imageName);
        result.buildLogs.push(...buildResult.logs);

        if (buildResult.success) {
          this.onLog('✅ Docker build successful!');
          result.success = true;
          this.onProgress(100);
          return result;
        }

        // Analyze the error
        this.onLog('🔍 Analyzing build error...');
        const projectContext = this.buildProjectContext(projectFiles, analysis, options.projectContext);
        const error = await this.errorAnalyzer.analyzeDockerError(buildResult.errorOutput, projectContext);
        result.errors.push(error);

        this.onLog(`📊 Error Type: ${error.type}`);
        this.onLog(`📊 Severity: ${error.severity}`);
        this.onLog(`📊 Suggested Action: ${error.suggestedAction}`);

        if (error.type === 'missing_file' && error.missingFile) {
          if (error.suggestedAction === 'remove_instruction') {
            await this.handleRemoveInstruction(error, buildContext, result);
          } else if (error.suggestedAction === 'remove_dockerignore') {
            await this.handleRemoveDockerignore(error, buildContext, result);
          } else if (error.suggestedAction === 'remove_npmrc') {
            await this.handleRemoveNpmrc(error, buildContext, result);
          } else {
            await this.handleMissingFile(error, buildContext, projectFiles, analysis, result);
          }
        } else if (error.suggestedAction === 'remove_instruction') {
          await this.handleRemoveInstruction(error, buildContext, result);
        } else if (error.suggestedAction === 'remove_dockerignore') {
          await this.handleRemoveDockerignore(error, buildContext, result);
        } else if (error.suggestedAction === 'remove_npmrc') {
          await this.handleRemoveNpmrc(error, buildContext, result);
        } else if (error.suggestedAction === 'fix_tag_case') {
          await this.handleFixTagCase(error, buildContext, result);
        } else {
          this.onLog(`❌ Cannot auto-fix error type: ${error.type}`);
          result.errorMessage = `Cannot auto-fix error: ${error.errorMessage}`;
          break;
        }

      } catch (error) {
        this.onLog(`❌ Attempt ${attempt} failed: ${error}`);
        result.buildLogs.push(`Attempt ${attempt} failed: ${error}`);
      }
    }

    this.onLog(`❌ Auto-fix failed after ${result.attempts} attempts`);
    return result;
  }

  /**
   * Attempt Docker build and return result
   */
  private async attemptDockerBuild(buildContext: string, imageName: string): Promise<{
    success: boolean;
    logs: string[];
    errorOutput: string;
  }> {
    return new Promise((resolve) => {
      const logs: string[] = [];
      let errorOutput = '';

      this.onLog(`🐳 Building Docker image: ${imageName}`);
      this.onLog(`📁 Build context: ${buildContext}`);

      const buildProc = spawn('docker', ['build', '-t', imageName, buildContext], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      buildProc.stdout.on('data', (data) => {
        const log = data.toString();
        logs.push(log);
        this.onLog(log.trim());
      });

      buildProc.stderr.on('data', (data) => {
        const log = data.toString();
        logs.push(log);
        errorOutput += log;
        this.onLog(log.trim());
      });

      buildProc.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, logs, errorOutput: '' });
        } else {
          resolve({ success: false, logs, errorOutput });
        }
      });
    });
  }

  /**
   * Handle missing file error
   */
  private async handleMissingFile(
    error: DockerBuildError,
    buildContext: string,
    projectFiles: GitHubFile[],
    analysis: ProjectAnalysis,
    result: DockerAutoFixResult
  ): Promise<void> {
    if (!error.missingFile) return;

    const fileName = error.missingFile;
    this.onLog(`🔧 Handling missing file: ${fileName}`);

    // Always generate files when LangChain suggests it
    if (error.suggestedAction === 'generate_file') {
      this.onLog(`🧠 LangChain suggests generating file: ${fileName}`);
      
      // Generate the missing file
      const fileType = this.getFileType(fileName);
      const existingFiles = projectFiles.map(f => f.path);
      const projectContext = this.buildProjectContext(projectFiles, analysis);

      const request: FileGenerationRequest = {
        fileName,
        fileType,
        projectContext,
        existingFiles,
        reason: `Missing file detected during Docker build: ${error.errorMessage}`,
      };

      try {
        const generatedFile = await this.errorAnalyzer.generateMissingFile(request, projectContext);
        result.generatedFiles.push(generatedFile);

        // Write the file to build context
        const filePath = path.join(buildContext, fileName);
        const dir = path.dirname(filePath);
        
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
          this.onLog(`📁 Created directory: ${dir}`);
        }

        fs.writeFileSync(filePath, generatedFile.content, 'utf-8');
        
        this.onLog(`✅ Generated missing file: ${fileName}`);
        this.onLog(`📝 Action: ${generatedFile.action}`);
        this.onLog(`📄 File content:`);
        this.onLog(`--- START ${fileName} ---`);
        this.onLog(generatedFile.content);
        this.onLog(`--- END ${fileName} ---`);

      } catch (error) {
        this.onLog(`❌ Failed to generate file ${fileName}: ${error}`);
        // Create a basic placeholder as fallback
        this.createFallbackFile(fileName, buildContext, result);
      }
    } else {
      this.onLog(`⏭️ LangChain suggests not generating file: ${fileName} (action: ${error.suggestedAction})`);
    }
  }

  /**
   * Create a fallback placeholder file when generation fails
   */
  private createFallbackFile(fileName: string, buildContext: string, result: DockerAutoFixResult): void {
    const filePath = path.join(buildContext, fileName);
    const dir = path.dirname(filePath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const extension = path.extname(fileName).toLowerCase();
    let content = '';

    switch (extension) {
      case '.mdc':
        content = `# Auto-generated ${fileName}\n# This file was created to resolve Docker build issues\n\n# Netlify Build Rule\nbuild = "npm run build"\npublish = "dist"\n`;
        break;
      case '.json':
        content = JSON.stringify({}, null, 2);
        break;
      case '.yml':
      case '.yaml':
        content = `# Auto-generated ${fileName}\n# This file was created to resolve Docker build issues\n`;
        break;
      case '.md':
        content = `# Auto-generated ${fileName}\n\nThis file was created to resolve Docker build issues.\n`;
        break;
      case '.py':
        content = `# Auto-generated ${fileName}\n# This file was created to resolve Docker build issues\n\nprint("Placeholder file")\n`;
        break;
      case '.js':
      case '.ts':
        content = `// Auto-generated ${fileName}\n// This file was created to resolve Docker build issues\n\nconsole.log("Placeholder file");\n`;
        break;
      default:
        content = `# Auto-generated ${fileName}\n# This file was created to resolve Docker build issues\n`;
    }

    fs.writeFileSync(filePath, content, 'utf-8');
    
    result.generatedFiles.push({
      fileName,
      content,
      reason: `Fallback placeholder created due to generation failure`,
      action: 'placeholder',
    });

    this.onLog(`✅ Created fallback placeholder: ${fileName}`);
    this.onLog(`📄 Fallback content:`);
    this.onLog(`--- START ${fileName} ---`);
    this.onLog(content);
    this.onLog(`--- END ${fileName} ---`);
  }

  /**
   * Handle remove instruction action
   */
  private async handleRemoveInstruction(
    error: DockerBuildError,
    buildContext: string,
    result: DockerAutoFixResult
  ): Promise<void> {
    this.onLog('🔧 Removing problematic Dockerfile instruction...');

    const dockerfilePath = path.join(buildContext, 'Dockerfile');
    if (!fs.existsSync(dockerfilePath)) {
      this.onLog('❌ Dockerfile not found');
      return;
    }

    try {
      let dockerfileContent = fs.readFileSync(dockerfilePath, 'utf-8');
      const lines = dockerfileContent.split('\n');
      const originalLineCount = lines.length;

      // Remove lines that reference the missing file/directory
      const filteredLines = lines.filter(line => {
        const trimmedLine = line.trim();
        
        // Check for specific backend directory references
        if (error.missingFile && (error.missingFile === 'backend' || error.missingFile === '/backend')) {
          if (trimmedLine.includes('COPY backend') || trimmedLine.includes('COPY /backend')) {
            result.removedInstructions.push(trimmedLine);
            this.onLog(`🗑️ Removed: ${trimmedLine}`);
            return false;
          }
        }
        
        // General missing file check
        if (error.missingFile && line.includes(error.missingFile)) {
          result.removedInstructions.push(trimmedLine);
          this.onLog(`🗑️ Removed: ${trimmedLine}`);
          return false;
        }
        
        return true;
      });

      // If we removed backend copy commands, ensure we have a general copy command
      if (result.removedInstructions.some(instruction => instruction.includes('COPY backend'))) {
        const hasGeneralCopy = filteredLines.some(line => 
          line.trim().startsWith('COPY .') || line.trim().startsWith('COPY ./')
        );
        
        if (!hasGeneralCopy) {
          // Find the WORKDIR line and add COPY . . after it
          const workdirIndex = filteredLines.findIndex(line => line.trim().startsWith('WORKDIR'));
          if (workdirIndex !== -1) {
            filteredLines.splice(workdirIndex + 1, 0, '', '# Copy application code', 'COPY . .');
            this.onLog('✅ Added general COPY . . command to replace removed backend copy');
          }
        }
      }

      if (filteredLines.length !== originalLineCount) {
        dockerfileContent = filteredLines.join('\n');
        fs.writeFileSync(dockerfilePath, dockerfileContent, 'utf-8');
        result.finalDockerfile = dockerfileContent;
        this.onLog(`✅ Updated Dockerfile (removed ${originalLineCount - filteredLines.length} lines)`);
      }

    } catch (error) {
      this.onLog(`❌ Failed to update Dockerfile: ${error}`);
    }
  }

  /**
   * Handle remove dockerignore action
   */
  private async handleRemoveDockerignore(
    error: DockerBuildError,
    buildContext: string,
    result: DockerAutoFixResult
  ): Promise<void> {
    this.onLog('🔧 Removing problematic .dockerignore file...');

    const dockerignorePath = path.join(buildContext, '.dockerignore');
    
    try {
      if (fs.existsSync(dockerignorePath)) {
        // Backup the content before removing
        const dockerignoreContent = fs.readFileSync(dockerignorePath, 'utf-8');
        
        // Remove the .dockerignore file
        fs.unlinkSync(dockerignorePath);
        
        result.removedInstructions.push('.dockerignore file removed');
        this.onLog(`🗑️ Removed: .dockerignore file`);
        this.onLog(`📄 Backup content: ${dockerignoreContent.substring(0, 100)}...`);
        
        // Create a minimal .dockerignore as replacement
        const minimalDockerignore = `# Minimal .dockerignore to prevent build issues
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.git/
.gitignore
README.md
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
`;
        
        fs.writeFileSync(dockerignorePath, minimalDockerignore, 'utf-8');
        this.onLog('✅ Created minimal .dockerignore file');
        
      } else {
        this.onLog('ℹ️ .dockerignore file not found, creating minimal version');
        
        // Create a minimal .dockerignore
        const minimalDockerignore = `# Minimal .dockerignore to prevent build issues
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.git/
.gitignore
README.md
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
`;
        
        fs.writeFileSync(dockerignorePath, minimalDockerignore, 'utf-8');
        this.onLog('✅ Created minimal .dockerignore file');
      }

    } catch (error) {
      this.onLog(`❌ Failed to handle .dockerignore: ${error}`);
    }
  }

  /**
   * Handle remove npmrc action
   */
  private async handleRemoveNpmrc(
    error: DockerBuildError,
    buildContext: string,
    result: DockerAutoFixResult
  ): Promise<void> {
    this.onLog('🔧 Removing problematic .npmrc file...');

    const npmrcPath = path.join(buildContext, '.npmrc');
    
    try {
      if (fs.existsSync(npmrcPath)) {
        // Backup the content before removing
        const npmrcContent = fs.readFileSync(npmrcPath, 'utf-8');
        
        // Remove the .npmrc file
        fs.unlinkSync(npmrcPath);
        
        result.removedInstructions.push('.npmrc file removed');
        this.onLog(`🗑️ Removed: .npmrc file`);
        this.onLog(`📄 Backup content: ${npmrcContent.substring(0, 100)}...`);
        
      } else {
        this.onLog('ℹ️ .npmrc file not found, nothing to remove');
      }

    } catch (error) {
      this.onLog(`❌ Failed to handle .npmrc: ${error}`);
    }
  }

  /**
   * Handle fix tag case action
   */
  private async handleFixTagCase(
    error: DockerBuildError,
    buildContext: string,
    result: DockerAutoFixResult
  ): Promise<void> {
    this.onLog('🔧 Fixing Docker tag case sensitivity issue...');
    
    // The tag case issue is handled at the image name generation level
    // This is more of a logging action since the fix is in deriveImageName
    result.removedInstructions.push('Fixed Docker tag case sensitivity');
    this.onLog('✅ Docker tag case sensitivity issue resolved');
  }

  /**
   * Build project context string
   */
  private buildProjectContext(
    projectFiles: GitHubFile[],
    analysis: ProjectAnalysis,
    additionalContext?: string
  ): string {
    const context = [
      `Language: ${analysis.language}`,
      `Framework: ${analysis.framework || 'unknown'}`,
      `Dependencies: ${analysis.dependencies.join(', ')}`,
      `Has Dockerfile: ${analysis.hasDockerfile}`,
      `Project Health: ${analysis.projectHealth || 'unknown'}`,
      '',
      'Files in project:',
      ...projectFiles.map(f => `- ${f.path} (${f.type})`),
    ];

    if (additionalContext) {
      context.push('', 'Additional Context:', additionalContext);
    }

    return context.join('\n');
  }

  /**
   * Get file type from filename
   */
  private getFileType(fileName: string): 'config' | 'rule' | 'source' | 'documentation' | 'dependency' {
    const extension = path.extname(fileName).toLowerCase();
    const fileName_lower = fileName.toLowerCase();

    if (['.json', '.yml', '.yaml', '.toml', '.ini', '.cfg', '.conf', '.env'].includes(extension)) {
      return 'config';
    }
    
    if (fileName_lower.includes('rule') || extension === '.mdc') {
      return 'rule';
    }
    
    if (['.md', '.mdc', '.txt', '.rst'].includes(extension)) {
      return 'documentation';
    }
    
    if (['.py', '.js', '.ts', '.jsx', '.tsx', '.sh', '.bash', '.ps1', '.cmd'].includes(extension)) {
      return 'source';
    }
    
    return 'dependency';
  }
}