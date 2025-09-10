import { spawn } from 'child_process';
import { processDockerfileGeneration } from './aiService';
import { dockerStatusChecker } from './dockerStatusChecker';
import { advancedFileDetector, ProjectAnalysis } from './advancedFileDetector';
import * as fs from 'fs';

export interface DockerBuildError {
  type: 'missing_file' | 'syntax_error' | 'dependency_error' | 'language_mismatch' | 'permission_error';
  message: string;
  line?: number;
  file?: string;
  suggestion: string;
  fix: string;
}

export interface DockerBuildResult {
  success: boolean;
  imageName?: string;
  errors: DockerBuildError[];
  fixedDockerfile?: string;
  logs: string[];
}

export class DockerBuildMonitor {
  private buildLogs: string[] = [];
  private errors: DockerBuildError[] = [];

  /**
   * 🚀 INTELLIGENT DOCKER BUILD WITH AUTO-ERROR FIXING
   * Monitors Docker build process and automatically fixes common errors
   */
  async buildWithAutoFix(
    dockerfilePath: string,
    contextPath: string,
    imageName: string,
    maxRetries: number = 3
  ): Promise<DockerBuildResult> {
    this.buildLogs = [];
    this.errors = [];

    console.log('🔍 Starting intelligent Docker build with auto-error fixing...');

    // First, check if Docker is available
    console.log('🔍 Checking Docker status...');
    const dockerStatus = await dockerStatusChecker.checkDockerStatus();
    
    if (!dockerStatus.canBuild) {
      const errorMessage = dockerStatus.error || 'Docker is not available for building';
      console.log(`❌ Docker not available: ${errorMessage}`);
      
      return {
        success: false,
        errors: [{
          type: 'dependency_error',
          message: errorMessage,
          suggestion: 'Please install and start Docker Desktop',
          fix: 'Install Docker Desktop and ensure it\'s running'
        }],
        logs: [`❌ Docker not available: ${errorMessage}`]
      };
    }

    console.log('✅ Docker is available and ready for building');

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`\n🔄 Build attempt ${attempt}/${maxRetries}`);
      
      const result = await this.attemptBuild(dockerfilePath, contextPath, imageName);
      
      if (result.success) {
        console.log('✅ Docker build successful!');
        return {
          success: true,
          imageName,
          errors: this.errors,
          logs: this.buildLogs
        };
      }

      // Analyze errors and attempt to fix
      const fixedDockerfile = await this.analyzeAndFixErrors(dockerfilePath, result.errors);
      
      if (fixedDockerfile && attempt < maxRetries) {
        console.log('🔧 Auto-fixing Dockerfile errors...');
              // Write the fixed Dockerfile
      fs.writeFileSync(dockerfilePath, fixedDockerfile);
        console.log('✅ Dockerfile auto-fixed, retrying build...');
      } else {
        console.log('❌ Could not auto-fix errors or max retries reached');
        break;
      }
    }

    return {
      success: false,
      errors: this.errors,
      logs: this.buildLogs
    };
  }

  private async attemptBuild(
    dockerfilePath: string,
    contextPath: string,
    imageName: string
  ): Promise<{ success: boolean; errors: DockerBuildError[] }> {
    return new Promise((resolve) => {
      const dockerBuild = spawn('docker', [
        'build',
        '-f', dockerfilePath,
        '-t', imageName,
        contextPath
      ]);

      let output = '';
      const errors: DockerBuildError[] = [];

      dockerBuild.stdout.on('data', (data) => {
        const log = data.toString();
        output += log;
        this.buildLogs.push(log);
        console.log(log.trim());
      });

      dockerBuild.stderr.on('data', (data) => {
        const error = data.toString();
        output += error;
        this.buildLogs.push(error);
        console.error(error.trim());
        
        // Parse common Docker errors
        const parsedErrors = this.parseDockerErrors(error);
        errors.push(...parsedErrors);
      });

      dockerBuild.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, errors: [] });
        } else {
          // Parse final output for errors
          const finalErrors = this.parseDockerErrors(output);
          errors.push(...finalErrors);
          this.errors.push(...errors);
          resolve({ success: false, errors });
        }
      });
    });
  }

  private parseDockerErrors(output: string): DockerBuildError[] {
    const errors: DockerBuildError[] = [];

    // Missing file errors - Enhanced detection
    const missingFileRegex = /"([^"]+)": not found/g;
    let match;
    while ((match = missingFileRegex.exec(output)) !== null) {
      const fileName = match[1];
      
      // Special handling for Go module files
      if (fileName === 'go.mod' || fileName === 'go.sum') {
        errors.push({
          type: 'missing_file',
          message: `Go module file not found: ${fileName}`,
          file: fileName,
          suggestion: `Generate ${fileName} or remove Go-specific commands from Dockerfile`,
          fix: `RUN go mod init your-project-name && go mod tidy`
        });
      } else {
        errors.push({
          type: 'missing_file',
          message: `File not found: ${fileName}`,
          file: fileName,
          suggestion: `Create missing file: ${fileName}`,
          fix: `COPY ${fileName} ./`
        });
      }
    }

    // Enhanced Go-specific error detection
    if (output.includes('go.mod') && output.includes('not found')) {
      errors.push({
        type: 'missing_file',
        message: 'Go module files (go.mod/go.sum) are missing but Dockerfile tries to use them',
        file: 'go.mod',
        suggestion: 'Either generate Go module files or use a different base image',
        fix: 'Remove Go-specific commands or generate go.mod with: RUN go mod init project-name'
      });
    }

    // Go build errors
    if (output.includes('go build') && output.includes('.py')) {
      errors.push({
        type: 'language_mismatch',
        message: 'Trying to build Python file with Go compiler',
        suggestion: 'Use Python runtime instead of Go for Python files',
        fix: 'Change FROM golang:1.21 to FROM python:3.11-slim'
      });
    }

    // Missing requirements.txt
    if (output.includes('requirements.txt') && output.includes('not found')) {
      errors.push({
        type: 'missing_file',
        message: 'requirements.txt not found',
        file: 'requirements.txt',
        suggestion: 'Create requirements.txt file',
        fix: 'Generate requirements.txt from Python dependencies'
      });
    }

    // Missing go.sum
    if (output.includes('go.sum') && output.includes('not found')) {
      errors.push({
        type: 'missing_file',
        message: 'go.sum not found',
        file: 'go.sum',
        suggestion: 'Generate go.sum file',
        fix: 'RUN go mod tidy'
      });
    }

    // Permission errors
    if (output.includes('permission denied') || output.includes('EACCES')) {
      errors.push({
        type: 'permission_error',
        message: 'Permission denied',
        suggestion: 'Fix file permissions or use proper user',
        fix: 'RUN chmod +x filename or add proper USER directive'
      });
    }

    return errors;
  }

  private async analyzeAndFixErrors(
    dockerfilePath: string,
    errors: DockerBuildError[]
  ): Promise<string | null> {
    if (errors.length === 0) return null;

    console.log('🤖 Analyzing errors with advanced AI...');
    
    try {
      // Read current Dockerfile
      const currentDockerfile = fs.readFileSync(dockerfilePath, 'utf8');

      // Advanced project analysis
      console.log('🔍 Running advanced project analysis...');
      const projectAnalysis = await advancedFileDetector.analyzeProject('.');
      
      // Generate missing files if needed
      if (projectAnalysis.missingFiles.length > 0) {
        console.log('📝 Generating missing dependency files...');
        await advancedFileDetector.generateMissingFiles(projectAnalysis, '.');
      }

      // Create intelligent prompt based on project analysis
      const intelligentPrompt = advancedFileDetector.generateIntelligentPrompt(
        projectAnalysis, 
        currentDockerfile
      );

      console.log('🧠 Using advanced LangChain prompt for error fixing...');
      
      // Use AI to fix the Dockerfile with advanced analysis
      const fixedDockerfile = await this.callAIForDockerfileFix(intelligentPrompt);
      
      if (fixedDockerfile && fixedDockerfile.includes('FROM')) {
        console.log('✅ Advanced AI successfully fixed Dockerfile');
        return fixedDockerfile;
      }
    } catch (error) {
      console.error('Error in advanced AI analysis:', error);
    }

    // Fallback: Apply basic fixes
    return this.applyBasicFixes(dockerfilePath, errors);
  }

  private async callAIForDockerfileFix(prompt: string): Promise<string> {
    try {
      // Use the existing AI service to fix the Dockerfile
      const result = await processDockerfileGeneration(
        'local',
        prompt,
        ''
      );

      return result.dockerfile || '';
    } catch (error) {
      console.error('AI service error:', error);
      return '';
    }
  }

  private applyBasicFixes(dockerfilePath: string, errors: DockerBuildError[]): string {
    let dockerfile = fs.readFileSync(dockerfilePath, 'utf8');

    // Apply basic fixes based on error types
    for (const error of errors) {
      switch (error.type) {
        case 'language_mismatch':
          // Replace Go with Python if building Python files
          if (dockerfile.includes('golang:1.21') && dockerfile.includes('.py')) {
            dockerfile = dockerfile.replace('FROM golang:1.21 AS builder', 'FROM python:3.11-slim');
            dockerfile = dockerfile.replace('RUN go build -o process_cursor_links process_cursor_links.py', 'RUN python -m py_compile process_cursor_links.py');
          }
          break;

        case 'missing_file':
          if (error.file === 'requirements.txt') {
            // Add requirements.txt generation
            dockerfile = dockerfile.replace(
              'RUN pip install --no-cache-dir -r requirements.txt',
              'RUN echo "flask==2.3.3\\nrequests==2.31.0" > requirements.txt && pip install --no-cache-dir -r requirements.txt'
            );
          }
          if (error.file === 'go.sum') {
            // Add go mod tidy
            dockerfile = dockerfile.replace(
              'RUN go mod download',
              'RUN go mod tidy && go mod download'
            );
          }
          break;
      }
    }

    return dockerfile;
  }

  /**
   * 🧪 TEST DOCKERFILE BEFORE BUILDING
   * Validates Dockerfile syntax and common issues
   */
  async validateDockerfile(dockerfilePath: string): Promise<DockerBuildError[]> {
    const dockerfile = fs.readFileSync(dockerfilePath, 'utf8');
    const errors: DockerBuildError[] = [];

    const lines = dockerfile.split('\n');

    // Check for common issues
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check for language mismatches
      if (line.includes('FROM golang:') && dockerfile.includes('.py')) {
        errors.push({
          type: 'language_mismatch',
          message: 'Using Go base image for Python project',
          line: i + 1,
          suggestion: 'Use Python base image for Python files',
          fix: 'FROM python:3.11-slim'
        });
      }

      // Check for go build with .py files
      if (line.includes('go build') && line.includes('.py')) {
        errors.push({
          type: 'language_mismatch',
          message: 'Trying to build Python file with Go compiler',
          line: i + 1,
          suggestion: 'Use Python to run .py files',
          fix: 'RUN python filename.py'
        });
      }

      // Check for missing COPY commands for required files
      if (line.includes('pip install -r requirements.txt') && !dockerfile.includes('COPY requirements.txt')) {
        errors.push({
          type: 'missing_file',
          message: 'Installing requirements.txt but not copying it',
          line: i + 1,
          suggestion: 'Add COPY requirements.txt ./ before pip install',
          fix: 'COPY requirements.txt ./'
        });
      }
    }

    return errors;
  }
}

export const dockerBuildMonitor = new DockerBuildMonitor();
