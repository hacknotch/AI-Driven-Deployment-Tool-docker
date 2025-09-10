import express from 'express';
import multer from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { DockerAutoFixer } from '../lib/dockerAutoFixer';
import { analyzeProject } from '../lib/aiService';
import { prepareBuildContext, deriveImageName } from '../lib/docker';
import type { Request, Response } from 'express';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
});

/**
 * POST /api/docker-auto-fix
 * Automatically fix Docker build issues with intelligent error detection and file generation
 */
router.post('/docker-auto-fix', upload.array('files'), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    const { userPrompt, maxAttempts = 3 } = req.body;

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded',
      });
    }

    console.log(`🤖 Starting Docker auto-fix for ${files.length} files...`);

    // Convert uploaded files to GitHubFile format
    const gitHubFiles = files.map(file => ({
      name: file.originalname.split('/').pop() || file.originalname,
      path: file.originalname,
      type: 'file' as const,
      content: file.buffer.toString('utf-8'),
    }));

    // Analyze the project
    const analysis = await analyzeProject(gitHubFiles);

    // Initialize the Docker auto-fixer
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'OpenAI API key not configured',
      });
    }

    // Prepare build context
    const repoIdentifier = 'auto-fix-project';
    const dockerfileContent = gitHubFiles.find(f => f.name === 'Dockerfile')?.content || '';
    const buildContext = prepareBuildContext(repoIdentifier, gitHubFiles, dockerfileContent);
    const imageName = deriveImageName(repoIdentifier);

    // Set up logging
    const logs: string[] = [];
    const onLog = (message: string) => {
      logs.push(message);
      console.log(message);
    };

    let progress = 0;
    const onProgress = (newProgress: number) => {
      progress = newProgress;
    };

    // Initialize the auto-fixer
    const autoFixer = new DockerAutoFixer(apiKey, {
      maxAttempts: parseInt(maxAttempts) || 3,
      onLog,
      onProgress,
      projectContext: userPrompt,
    });

    // Start the auto-fix process
    const result = await autoFixer.autoFixDockerBuild(
      buildContext,
      imageName,
      gitHubFiles,
      analysis,
      { projectContext: userPrompt }
    );

    console.log('🎯 Docker auto-fix completed');

    res.json({
      success: result.success,
      message: result.success 
        ? 'Docker build issues fixed successfully!' 
        : 'Docker auto-fix completed with issues',
      result: {
        attempts: result.attempts,
        maxAttempts: result.maxAttempts,
        errors: result.errors,
        generatedFiles: result.generatedFiles,
        removedInstructions: result.removedInstructions,
        buildLogs: result.buildLogs,
        finalDockerfile: result.finalDockerfile,
      },
      analysis: {
        language: analysis.language,
        framework: analysis.framework,
        dependencies: analysis.dependencies,
        projectHealth: analysis.projectHealth,
      },
      logs: logs,
    });

  } catch (error) {
    console.error('❌ Docker auto-fix error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
});

/**
 * POST /api/docker-auto-fix/stream
 * Stream Docker auto-fix process with real-time updates
 */
router.post('/docker-auto-fix/stream', upload.array('files'), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    const { userPrompt, maxAttempts = 3 } = req.body;

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded',
      });
    }

    // Set up Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });

    const sendEvent = (type: string, data: any) => {
      res.write(`event: ${type}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      sendEvent('start', { message: 'Starting Docker auto-fix process...' });

      // Convert uploaded files to GitHubFile format
      const gitHubFiles = files.map(file => ({
        name: file.originalname.split('/').pop() || file.originalname,
        path: file.originalname,
        type: 'file' as const,
        content: file.buffer.toString('utf-8'),
      }));

      sendEvent('analyze', { message: 'Analyzing project structure...' });

      // Analyze the project
      const analysis = await analyzeProject(gitHubFiles);

      sendEvent('analyze_complete', { 
        message: 'Project analysis complete',
        analysis: {
          language: analysis.language,
          framework: analysis.framework,
          dependencies: analysis.dependencies,
          projectHealth: analysis.projectHealth,
        }
      });

      // Initialize the Docker auto-fixer
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OpenAI API key not configured');
      }

      // Prepare build context
      const repoIdentifier = 'auto-fix-project';
      const dockerfileContent = gitHubFiles.find(f => f.name === 'Dockerfile')?.content || '';
      const buildContext = prepareBuildContext(repoIdentifier, gitHubFiles, dockerfileContent);
      const imageName = deriveImageName(repoIdentifier);

      sendEvent('build_context', { 
        message: 'Build context prepared',
        buildContext,
        imageName
      });

      // Set up logging
      const onLog = (message: string) => {
        sendEvent('log', { message, timestamp: new Date().toISOString() });
      };

      let progress = 0;
      const onProgress = (newProgress: number) => {
        progress = newProgress;
        sendEvent('progress', { progress: newProgress });
      };

      // Initialize the auto-fixer
      const autoFixer = new DockerAutoFixer(apiKey, {
        maxAttempts: parseInt(maxAttempts) || 3,
        onLog,
        onProgress,
        projectContext: userPrompt,
      });

      // Start the auto-fix process
      const result = await autoFixer.autoFixDockerBuild(
        buildContext,
        imageName,
        gitHubFiles,
        analysis,
        { projectContext: userPrompt }
      );

      sendEvent('complete', {
        success: result.success,
        message: result.success 
          ? 'Docker build issues fixed successfully!' 
          : 'Docker auto-fix completed with issues',
        result: {
          attempts: result.attempts,
          maxAttempts: result.maxAttempts,
          errors: result.errors,
          generatedFiles: result.generatedFiles,
          removedInstructions: result.removedInstructions,
          buildLogs: result.buildLogs,
          finalDockerfile: result.finalDockerfile,
        }
      });

    } catch (error) {
      sendEvent('error', {
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      res.end();
    }

  } catch (error) {
    console.error('❌ Docker auto-fix stream error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
});

/**
 * POST /api/docker-auto-fix/start-docker
 * Attempt to start Docker Desktop before auto-fix
 */
router.post('/docker-auto-fix/start-docker', async (req: Request, res: Response) => {
  try {
    console.log('🚀 Attempting to start Docker Desktop...');
    
    const { dockerStatusChecker } = await import('../lib/dockerStatusChecker');
    const result = await dockerStatusChecker.startDockerDesktop();
    
    res.json({
      success: result.success,
      message: result.success 
        ? 'Docker Desktop start command sent. Please wait for it to fully start (30-60 seconds).'
        : 'Failed to start Docker Desktop automatically.',
      error: result.error,
      instructions: result.success ? [
        '1. Wait for Docker Desktop to start (30-60 seconds)',
        '2. Look for the whale icon in your system tray',
        '3. Wait for "Docker Desktop is running" notification',
        '4. Try the auto-fix again once Docker is running'
      ] : [
        '1. Manually start Docker Desktop from Start menu',
        '2. Wait for it to fully initialize',
        '3. Try the auto-fix again'
      ]
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start Docker Desktop'
    });
  }
});

/**
 * GET /api/docker-auto-fix/status
 * Get status of Docker auto-fix service
 */
router.get('/docker-auto-fix/status', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Docker auto-fix service is running',
    features: [
      'Intelligent error detection and parsing',
      'Automatic missing file generation using LangChain',
      'Smart Dockerfile instruction removal',
      'Multi-attempt build retry mechanism',
      'Real-time progress streaming',
      'Comprehensive error analysis',
      'Fallback content generation',
    ],
    capabilities: {
      errorTypes: ['missing_file', 'permission', 'syntax', 'dependency'],
      fileTypes: ['config', 'rule', 'source', 'documentation', 'dependency'],
      maxAttempts: 3,
      supportedFormats: ['.mdc', '.md', '.json', '.yml', '.py', '.js', '.ts', '.sh'],
    },
  });
});

/**
 * POST /api/docker-auto-fix/test-builder-error
 * Test the specific .builder/rules/organize-ui.mdc error with automatic file generation
 */
router.post('/test-builder-error', async (req: Request, res: Response) => {
  try {
    console.log('🧪 Testing .builder/rules/organize-ui.mdc error with auto-generation...');

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'OpenAI API key not configured',
      });
    }

    // Create a test build context
    const testBuildContext = path.join(process.cwd(), 'test-docker-build');
    if (!fs.existsSync(testBuildContext)) {
      fs.mkdirSync(testBuildContext, { recursive: true });
    }

    // Create a simple Dockerfile that references the missing file
    const dockerfileContent = `FROM node:18-alpine
WORKDIR /app
COPY . .
RUN echo "Building with .builder files"
`;
    fs.writeFileSync(path.join(testBuildContext, 'Dockerfile'), dockerfileContent);

    // Create mock project files
    const mockFiles = [
      {
        name: 'package.json',
        path: 'package.json',
        type: 'file' as const,
        content: JSON.stringify({ name: 'test-app', version: '1.0.0' }, null, 2),
      },
      {
        name: 'Dockerfile',
        path: 'Dockerfile',
        type: 'file' as const,
        content: dockerfileContent,
      },
    ];

    // Mock analysis
    const mockAnalysis = {
      language: 'JavaScript',
      framework: 'React',
      dependencies: ['react', 'node'],
      hasDockerfile: true,
      projectHealth: 'good' as const,
      packageFiles: ['package.json']
    };

    // Set up logging
    const logs: string[] = [];
    const onLog = (message: string) => {
      logs.push(message);
      console.log(message);
    };

    let progress = 0;
    const onProgress = (newProgress: number) => {
      progress = newProgress;
    };

    // Initialize the auto-fixer
    const autoFixer = new DockerAutoFixer(apiKey, {
      maxAttempts: 2,
      onLog,
      onProgress,
      projectContext: 'Test project with missing .builder/rules/organize-ui.mdc file',
    });

    // Start the auto-fix process
    const result = await autoFixer.autoFixDockerBuild(
      testBuildContext,
      'test-builder-app',
      mockFiles,
      mockAnalysis,
      { projectContext: 'Test project with missing .builder/rules/organize-ui.mdc file' }
    );

    // Clean up test directory
    if (fs.existsSync(testBuildContext)) {
      fs.rmSync(testBuildContext, { recursive: true, force: true });
    }

    console.log('🎯 Test completed');

    res.json({
      success: result.success,
      message: result.success 
        ? 'Test passed: .builder/rules/organize-ui.mdc was automatically generated!' 
        : 'Test completed with analysis',
      result: {
        attempts: result.attempts,
        maxAttempts: result.maxAttempts,
        errors: result.errors,
        generatedFiles: result.generatedFiles,
        removedInstructions: result.removedInstructions,
        buildLogs: result.buildLogs,
      },
      logs: logs,
    });

  } catch (error) {
    console.error('❌ Test error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
});

export default router;