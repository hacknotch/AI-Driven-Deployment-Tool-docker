import { spawn } from 'child_process';
import { processDockerfileGeneration } from './aiService';
import { dockerStatusChecker } from './dockerStatusChecker';
import { advancedFileDetector, ProjectAnalysis } from './advancedFileDetector';
import * as fs from 'fs';
import * as path from 'path';

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

    // Handle problematic .dockerignore files before building
    await this.handleDockerignoreIssues(contextPath);
    
    // Handle problematic .npmrc files before building
    await this.handleNpmrcIssues(contextPath);
    
    // Handle problematic backend directory references before building
    await this.handleBackendIssues(dockerfilePath);

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

      // Check if this is a .dockerignore error and handle it specially
      const hasDockerignoreError = result.errors.some(error => 
        error.message.includes('.dockerignore') || 
        error.message.includes('invalid file request .dockerignore')
      );

      if (hasDockerignoreError && attempt < maxRetries) {
        console.log('🔧 Detected .dockerignore error, removing it completely...');
        const dockerignorePath = path.join(contextPath, '.dockerignore');
        try {
          if (fs.existsSync(dockerignorePath)) {
            fs.unlinkSync(dockerignorePath);
            console.log('🗑️ Removed problematic .dockerignore file');
          }
        } catch (error) {
          console.log(`⚠️ Could not remove .dockerignore: ${error}`);
        }
        continue; // Retry the build without .dockerignore
      }

      // Check if this is a .npmrc error and handle it specially
      const hasNpmrcError = result.errors.some(error => 
        error.message.includes('.npmrc') || 
        error.message.includes('invalid file request .npmrc') ||
        error.file === '.npmrc'
      );

      if (hasNpmrcError && attempt < maxRetries) {
        console.log('🔧 Detected .npmrc error, removing it completely...');
        const npmrcPath = path.join(contextPath, '.npmrc');
        try {
          if (fs.existsSync(npmrcPath)) {
            fs.unlinkSync(npmrcPath);
            console.log('🗑️ Removed problematic .npmrc file');
          }
        } catch (error) {
          console.log(`⚠️ Could not remove .npmrc: ${error}`);
        }
        continue; // Retry the build without .npmrc
      }

      // Check if this is a backend directory error and handle it specially
      const hasBackendError = result.errors.some(error => 
        error.message.includes('backend') || 
        error.message.includes('backend directory not found') ||
        error.file === 'backend' ||
        error.file === '/backend'
      );

      if (hasBackendError && attempt < maxRetries) {
        console.log('🔧 Detected backend directory error, fixing Dockerfile...');
        // The backend error will be handled by the remove_instruction logic
        // Continue to the normal error analysis
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

    // Missing backend directory - multiple patterns
    if ((output.includes('/backend') && output.includes('not found')) || 
        output.includes('"/backend": not found') ||
        output.includes('failed to calculate checksum') && output.includes('backend')) {
      errors.push({
        type: 'missing_file',
        message: 'backend directory not found',
        file: 'backend',
        suggestion: 'Remove or fix COPY command referencing backend directory',
        fix: 'Remove COPY backend ./ or create backend directory'
      });
    }

    // Missing any directory in COPY command
    const copyDirMatch = output.match(/COPY\s+([^\s]+)\s+.*not found/);
    if (copyDirMatch) {
      const missingDir = copyDirMatch[1];
      errors.push({
        type: 'missing_file',
        message: `Directory ${missingDir} not found`,
        file: missingDir,
        suggestion: `Remove or fix COPY command referencing ${missingDir}`,
        fix: `Remove COPY ${missingDir} or create the directory`
      });
    }

    // .dockerignore file issues
    if (output.includes('invalid file request .dockerignore')) {
      errors.push({
        type: 'missing_file',
        message: '.dockerignore file causing build issues',
        file: '.dockerignore',
        suggestion: 'Remove or recreate .dockerignore file',
        fix: 'Remove problematic .dockerignore and create minimal version'
      });
    }

    // .npmrc file issues - multiple patterns
    if (output.includes('invalid file request .npmrc') || 
        output.includes('ERROR: invalid file request .npmrc')) {
      errors.push({
        type: 'missing_file',
        message: '.npmrc file causing build issues',
        file: '.npmrc',
        suggestion: 'Remove problematic .npmrc file',
        fix: 'Remove .npmrc file to prevent build context issues'
      });
    }

    // Docker tag case sensitivity issues
    if (output.includes('repository name must be lowercase') || 
        output.includes('invalid tag')) {
      errors.push({
        type: 'syntax_error',
        message: 'Docker tag case sensitivity issue',
        file: 'image-tag',
        suggestion: 'Fix Docker image tag to use lowercase',
        fix: 'Convert image name to lowercase and remove special characters'
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

  /**
   * Handle problematic .dockerignore files by removing or replacing them
   */
  private async handleDockerignoreIssues(contextPath: string): Promise<void> {
    const dockerignorePath = path.join(contextPath, '.dockerignore');
    
    try {
      if (fs.existsSync(dockerignorePath)) {
        // Check if the .dockerignore file might be problematic
        const content = fs.readFileSync(dockerignorePath, 'utf-8');
        
        // If the file is very small or contains problematic patterns, replace it
        if (content.length < 50 || content.includes('*') || content.includes('..')) {
          console.log('🔧 Replacing potentially problematic .dockerignore...');
          
          // Create a minimal, safe .dockerignore
          const safeDockerignore = `# Safe .dockerignore to prevent build issues
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
.DS_Store
Thumbs.db
*.log
tmp/
temp/
`;
          
          fs.writeFileSync(dockerignorePath, safeDockerignore, 'utf-8');
          console.log('✅ Created safe .dockerignore file');
        } else {
          console.log('✅ .dockerignore file looks safe');
        }
      } else {
        console.log('ℹ️ No .dockerignore file found, creating minimal version');
        
        // Create a minimal .dockerignore
        const minimalDockerignore = `# Minimal .dockerignore
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.git/
.gitignore
README.md
.env
.env.local
`;
        
        fs.writeFileSync(dockerignorePath, minimalDockerignore, 'utf-8');
        console.log('✅ Created minimal .dockerignore file');
      }
    } catch (error) {
      console.log(`⚠️ Could not handle .dockerignore: ${error}`);
      // If we can't handle it, try to remove it completely
      try {
        if (fs.existsSync(dockerignorePath)) {
          fs.unlinkSync(dockerignorePath);
          console.log('🗑️ Removed problematic .dockerignore file');
        }
      } catch (removeError) {
        console.log(`❌ Could not remove .dockerignore: ${removeError}`);
      }
    }
  }

  /**
   * Handle problematic .npmrc files by removing them
   */
  private async handleNpmrcIssues(contextPath: string): Promise<void> {
    const npmrcPath = path.join(contextPath, '.npmrc');
    
    try {
      if (fs.existsSync(npmrcPath)) {
        console.log('🔧 Removing potentially problematic .npmrc...');
        
        // Remove the .npmrc file
        fs.unlinkSync(npmrcPath);
        console.log('✅ Removed .npmrc file');
      } else {
        console.log('ℹ️ No .npmrc file found');
      }
    } catch (error) {
      console.log(`⚠️ Could not handle .npmrc: ${error}`);
    }
  }

  /**
   * Handle problematic backend directory references in Dockerfile
   */
  private async handleBackendIssues(dockerfilePath: string): Promise<void> {
    try {
      if (fs.existsSync(dockerfilePath)) {
        let dockerfileContent = fs.readFileSync(dockerfilePath, 'utf-8');
        let modified = false;

        // Remove any COPY backend commands
        if (dockerfileContent.includes('COPY backend/')) {
          dockerfileContent = dockerfileContent.replace(/COPY\s+backend\/[^\n]*\n/g, '');
          modified = true;
          console.log('🔧 Removed COPY backend/ commands from Dockerfile');
        }

        if (dockerfileContent.includes('COPY backend ')) {
          dockerfileContent = dockerfileContent.replace(/COPY\s+backend\s+[^\n]*\n/g, '');
          modified = true;
          console.log('🔧 Removed COPY backend commands from Dockerfile');
        }

        // Add a general COPY . . if no general copy exists
        if (modified && !dockerfileContent.includes('COPY . .') && !dockerfileContent.includes('COPY ./')) {
          const workdirMatch = dockerfileContent.match(/(WORKDIR\s+\/app\s*\n)/);
          if (workdirMatch) {
            dockerfileContent = dockerfileContent.replace(
              workdirMatch[1],
              `${workdirMatch[1]}\n# Copy application code\nCOPY . .\n`
            );
            console.log('✅ Added general COPY . . command');
          }
        }

        if (modified) {
          fs.writeFileSync(dockerfilePath, dockerfileContent, 'utf-8');
          console.log('✅ Updated Dockerfile to remove backend references');
        }
      }
    } catch (error) {
      console.log(`⚠️ Could not handle backend issues: ${error}`);
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
          if (error.file === '/backend' || error.file === 'backend') {
            // Remove or fix COPY backend command
            dockerfile = dockerfile.replace(/COPY\s+backend\s+\.\/\s*/g, '');
            dockerfile = dockerfile.replace(/COPY\s+backend\/\*\.\*\s+\.\/\s*/g, '');
            // If we removed the backend copy, copy the current directory instead
            if (!dockerfile.includes('COPY . .') && !dockerfile.includes('COPY ./')) {
              dockerfile = dockerfile.replace(
                /(WORKDIR \/app\s*\n)/,
                '$1\n# Copy application code\nCOPY . .\n'
              );
            }
          }
          if (error.file === '.dockerignore') {
            // Handle .dockerignore issues by creating a minimal version
            const dockerignorePath = path.join(path.dirname(dockerfilePath), '.dockerignore');
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
            try {
              fs.writeFileSync(dockerignorePath, minimalDockerignore, 'utf-8');
              console.log('✅ Created minimal .dockerignore file');
            } catch (err) {
              console.error('❌ Failed to create .dockerignore:', err);
            }
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
