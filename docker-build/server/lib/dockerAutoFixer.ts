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
          await this.handleMissingFile(error, buildContext, projectFiles, analysis, result);
        } else if (error.suggestedAction === 'remove_instruction') {
          await this.handleRemoveInstruction(error, buildContext, result);
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

    // Check if we should generate the file
    const projectContext = this.buildProjectContext(projectFiles, analysis);
    if (!this.errorAnalyzer.shouldGenerateFile(fileName, projectContext)) {
      this.onLog(`⏭️ Skipping file generation for: ${fileName}`);
      return;
    }

    // Generate the missing file
    const fileType = this.getFileType(fileName);
    const existingFiles = projectFiles.map(f => f.path);

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
      }

      fs.writeFileSync(filePath, generatedFile.content, 'utf-8');
      
      this.onLog(`✅ Generated file: ${fileName}`);
      this.onLog(`📝 Action: ${generatedFile.action}`);
      this.onLog(`📄 Content preview: ${generatedFile.content.substring(0, 100)}...`);

    } catch (error) {
      this.onLog(`❌ Failed to generate file ${fileName}: ${error}`);
    }
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

      // Remove lines that reference the missing file
      const filteredLines = lines.filter(line => {
        if (error.missingFile && line.includes(error.missingFile)) {
          result.removedInstructions.push(line.trim());
          this.onLog(`🗑️ Removed: ${line.trim()}`);
          return false;
        }
        return true;
      });

      if (filteredLines.length < originalLineCount) {
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