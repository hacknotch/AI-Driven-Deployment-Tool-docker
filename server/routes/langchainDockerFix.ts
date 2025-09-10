import { Router, Request, Response } from 'express';
import { DockerErrorAnalyzer, DockerBuildError, FileGenerationRequest } from '../lib/dockerErrorAnalyzer';
import { DockerAutoFixer } from '../lib/dockerAutoFixer';
import { GitHubFile, ProjectAnalysis, analyzeProject, fetchGitHubRepo } from '../lib/aiService';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';

const router = Router();

// LangChain-powered Docker error solver
router.post('/langchain-docker-fix', async (req: Request, res: Response) => {
  try {
    const { errorMessage, projectFiles, repoUrl, githubToken } = req.body;

    console.log('🧠 Starting LangChain-powered Docker error analysis...');
    console.log('📋 Error message:', errorMessage);

    if (!errorMessage) {
      return res.status(400).json({
        success: false,
        error: 'Error message is required'
      });
    }

    // Initialize LangChain error analyzer
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'OpenAI API key not configured'
      });
    }

    const errorAnalyzer = new DockerErrorAnalyzer(apiKey);

    // Build project context
    let projectContext = 'Docker build error analysis\n';
    if (projectFiles && Array.isArray(projectFiles)) {
      projectContext += `Project files: ${projectFiles.length} files\n`;
      projectContext += projectFiles.map(f => `- ${f.path || f.name}`).join('\n');
    }

    // Analyze the error using LangChain
    console.log('🔍 Analyzing error with LangChain...');
    const errorAnalysis = await errorAnalyzer.analyzeDockerError(errorMessage, projectContext);

    console.log('📊 Error analysis result:', errorAnalysis);

    const result = {
      success: true,
      analysis: errorAnalysis,
      solutions: [] as any[],
      generatedFiles: [] as any[],
      recommendations: [] as string[]
    };

    // Handle different error types
    if (errorAnalysis.type === 'missing_file' && errorAnalysis.missingFile) {
      const fileName = errorAnalysis.missingFile;
      console.log(`🔧 Handling missing file: ${fileName}`);

      // Check if we should generate the file
      if (errorAnalyzer.shouldGenerateFile(fileName, projectContext)) {
        console.log(`✅ Will generate file: ${fileName}`);

        // Determine file type
        const fileType = getFileType(fileName);
        const existingFiles = projectFiles ? projectFiles.map((f: any) => f.path || f.name) : [];

        const request: FileGenerationRequest = {
          fileName,
          fileType,
          projectContext,
          existingFiles,
          reason: `Missing file detected during Docker build: ${errorMessage}`,
        };

        try {
          // Generate the missing file using LangChain
          const generatedFile = await errorAnalyzer.generateMissingFile(request, projectContext);
          result.generatedFiles.push(generatedFile);
          result.solutions.push({
            type: 'file_generated',
            fileName,
            action: generatedFile.action,
            content: generatedFile.content
          });

          console.log(`✅ Generated file: ${fileName}`);
        } catch (error) {
          console.error(`❌ Failed to generate file ${fileName}:`, error);
          result.solutions.push({
            type: 'generation_failed',
            fileName,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      } else {
        console.log(`⏭️ Skipping file generation for: ${fileName}`);
        result.solutions.push({
          type: 'skip_generation',
          fileName,
          reason: 'File should not be generated (likely unnecessary)'
        });
        result.recommendations.push(`Remove or update Dockerfile instruction referencing ${fileName}`);
      }
    }

    // Add specific recommendations based on error type
    switch (errorAnalysis.type) {
      case 'missing_file':
        result.recommendations.push('Check .dockerignore file to ensure unnecessary files are excluded');
        result.recommendations.push('Verify all COPY/ADD instructions reference existing files');
        break;
      case 'permission':
        result.recommendations.push('Check file permissions in the build context');
        result.recommendations.push('Consider using COPY --chown to set proper ownership');
        break;
      case 'syntax':
        result.recommendations.push('Review Dockerfile syntax and commands');
        result.recommendations.push('Check for typos in file paths and commands');
        break;
      case 'dependency':
        result.recommendations.push('Verify all dependencies are properly installed');
        result.recommendations.push('Check package manager configuration');
        break;
    }

    // Special handling for .builder/rules/deploy-app.mdc error
    if (errorMessage.includes('.builder/rules/deploy-app.mdc')) {
      console.log('🎯 Detected specific .builder/rules/deploy-app.mdc error');
      
      result.solutions.push({
        type: 'specific_fix',
        fileName: '.builder/rules/deploy-app.mdc',
        action: 'generate_netlify_rule',
        description: 'This appears to be a Netlify build rule file'
      });

      // Generate a proper Netlify rule file
      const netlifyRuleContent = `# Netlify Build Rule: Deploy App
# This file defines deployment rules for Netlify

# Build command
build = "npm run build"

# Publish directory
publish = "dist"

# Redirects for SPA
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

# Headers for security
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"

# Environment variables
[build.environment]
  NODE_VERSION = "18"
  NPM_VERSION = "9"
`;

      result.generatedFiles.push({
        fileName: '.builder/rules/deploy-app.mdc',
        content: netlifyRuleContent,
        reason: 'Generated Netlify deployment rule file',
        action: 'created'
      });

      result.recommendations.push('Update .dockerignore to exclude .builder/ directory if not needed in Docker build');
    }

    console.log('✅ LangChain analysis complete');
    console.log('📊 Results:', {
      solutions: result.solutions.length,
      generatedFiles: result.generatedFiles.length,
      recommendations: result.recommendations.length
    });

    res.json(result);

  } catch (error) {
    console.error('❌ LangChain Docker fix error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

// Test the specific .builder/rules/deploy-app.mdc error
router.post('/test-builder-error', async (req: Request, res: Response) => {
  try {
    console.log('🧪 Testing .builder/rules/deploy-app.mdc error fix...');

    const testError = 'failed to solve: invalid file request .builder/rules/deploy-app.mdc';
    const testProjectFiles = [
      { path: 'package.json', name: 'package.json' },
      { path: 'src/index.js', name: 'index.js' },
      { path: 'Dockerfile', name: 'Dockerfile' }
    ];

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'OpenAI API key not configured'
      });
    }

    const errorAnalyzer = new DockerErrorAnalyzer(apiKey);
    const projectContext = 'Test project with React/Node.js application';

    // Analyze the error
    const errorAnalysis = await errorAnalyzer.analyzeDockerError(testError, projectContext);
    console.log('📊 Test error analysis:', errorAnalysis);

    // Generate the missing file
    const request: FileGenerationRequest = {
      fileName: '.builder/rules/deploy-app.mdc',
      fileType: 'rule',
      projectContext,
      existingFiles: testProjectFiles.map(f => f.path),
      reason: 'Missing Netlify build rule file detected during Docker build',
    };

    const generatedFile = await errorAnalyzer.generateMissingFile(request, projectContext);
    console.log('✅ Generated test file:', generatedFile);

    res.json({
      success: true,
      testError,
      analysis: errorAnalysis,
      generatedFile,
      message: 'Successfully analyzed and generated fix for .builder/rules/deploy-app.mdc error'
    });

  } catch (error) {
    console.error('❌ Test error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Test failed'
    });
  }
});

// Helper function to determine file type
function getFileType(fileName: string): 'config' | 'rule' | 'source' | 'documentation' | 'dependency' {
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

export default router;
