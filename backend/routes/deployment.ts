import express from 'express';
import multer from 'multer';
import * as fs from 'fs';
import { processDockerfileGeneration, analyzeProject, generateDockerfile, GitHubFile } from '../lib/aiService';
import { IntelligentFileGenerator } from '../lib/intelligentFileGenerator_fixed';
import { build_docker_image, push_docker_image, deriveImageName, prepareBuildContext, LogSink } from '../lib/docker';
import type { Request, Response } from 'express';

const router = express.Router();
// Simple in-memory event listeners per streamId for upload streaming
const uploadStreams = new Map<string, ((data: any) => void)[]>();
function subscribeUploadStream(streamId: string, fn: (data: any)=>void) {
  const arr = uploadStreams.get(streamId) || [];
  arr.push(fn);
  uploadStreams.set(streamId, arr);
}
function publishUploadStream(streamId: string, data: any) {
  const arr = uploadStreams.get(streamId) || [];
  arr.forEach(f => {
    try { f(data); } catch (_) {}
  });
}
function closeUploadStream(streamId: string) {
  uploadStreams.delete(streamId);
}

// Debug endpoint to check if routes are working
router.get('/debug', (req, res) => {
  res.json({
    success: true,
    message: 'Deployment routes are working',
    timestamp: new Date().toISOString()
  });
});

// Create new deployment with intelligent file analysis
router.post('/deployments', async (req, res) => {
  try {
    console.log('📥 Received deployment request:', {
      body: req.body,
      headers: req.headers,
      method: req.method,
      url: req.url
    });

    const { repoUrl, userPrompt, githubToken, uploadedFiles } = req.body;

    // Check if we have either a repo URL or uploaded files
    if (!repoUrl && (!uploadedFiles || uploadedFiles.length === 0)) {
      console.log('❌ Missing repoUrl or uploadedFiles in request body');
      return res.status(400).json({
        success: false,
        error: 'Either repository URL or uploaded files are required',
        received: { repoUrl, userPrompt, githubToken, uploadedFiles: uploadedFiles?.length || 0 }
      });
    }

    console.log('🚀 Starting intelligent deployment analysis for:', repoUrl);

    // Process deployment with enhanced file analysis
    const result = await processDockerfileGeneration(repoUrl, userPrompt, githubToken);

    console.log('✅ Analysis result:', {
      success: result.success,
      hasDockerfile: !!result.dockerfile,
      hasAnalysis: !!result.analysis,
      generatedFilesCount: result.generatedFiles?.length || 0
    });

    if (result.success) {
      // Generate a deployment ID
      const deploymentId = `deploy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // 🚀 AUTOMATICALLY BUILD DOCKER IMAGE
      console.log('🐳 Starting automatic Docker build...');
      let buildResult = null;
      
      try {
        // Import the docker build monitor
        const { dockerBuildMonitor } = await import('../lib/dockerBuildMonitor');
        
        // Create a temporary Dockerfile
        const dockerfilePath = 'temp-deploy-dockerfile';
        fs.writeFileSync(dockerfilePath, result.dockerfile || '');

        // Generate image name
        const imageName = result.imageName || `deploy-${Date.now()}`;

        // Build with auto-fix
        buildResult = await dockerBuildMonitor.buildWithAutoFix(
          dockerfilePath,
          '.', // Build context
          imageName,
          3 // Max retry attempts
        );

        // Clean up temp file
        fs.unlinkSync(dockerfilePath);

        if (buildResult.success) {
          console.log(`✅ Docker image built successfully: ${imageName}`);
        } else {
          console.log(`❌ Docker build failed: ${buildResult.errors.map(e => e.message).join(', ')}`);
        }

      } catch (buildError) {
        console.error('❌ Docker build error:', buildError);
      }
      
      res.status(201).json({
        success: true,
        message: 'Deployment analysis and Docker build completed successfully',
        deploymentId,
        dockerfile: result.dockerfile,
        analysis: result.analysis || {},
        generatedFiles: result.generatedFiles || [],
        buildEndpoint: `/api/deployments/${deploymentId}/build`,
        buildResult: buildResult ? {
          success: buildResult.success,
          imageName: buildResult.success ? (result.imageName || `deploy-${Date.now()}`) : null,
          errors: buildResult.errors || []
        } : null,
        nextSteps: {
          build: {
            endpoint: `/api/deployments/${deploymentId}/build`,
            method: 'POST',
            description: 'Build Docker image and optionally push to Docker Hub',
            requiredFields: ['dockerfile', 'files'],
            optionalFields: ['dockerHubUsername', 'dockerHubPassword', 'imageName', 'pushToHub']
          }
        }
      });
    } else {
      console.log('❌ Analysis failed:', result.error);
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('❌ Deployment creation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      stack: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.stack : undefined : undefined
    });
  }
});

// SSE streaming endpoint for deployment analysis ("thinking out loud")
router.get('/deployments/stream', async (req: Request, res: Response) => {
  console.log('📡 SSE connection established');
  
  // Setup Server-Sent Events headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');
  res.flushHeaders?.();
  
  // Send initial connection confirmation
  res.write(`data: ${JSON.stringify({ type: 'connection', message: 'Stream connected successfully' })}\n\n`);

  const send = (data: any) => {
    try {
      const payload = typeof data === 'string' ? { message: data } : data;
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    } catch (err) {
      // best-effort; if client disconnects, write will throw
    }
  };

  const { repoUrl = '', userPrompt = '', githubToken = '' } = req.query as Record<string, string>;

  // Suggest client retry and heartbeat to keep connection alive
  try { res.write('retry: 3000\n\n'); } catch (_) {}
  const heartbeat = setInterval(() => {
    try { res.write(': ping\n\n'); } catch (_) {}
  }, 15000);

  req.on('close', () => {
    console.log('📡 SSE connection closed by client');
    clearInterval(heartbeat);
    try { res.end(); } catch (_) {}
  });

  req.on('error', (err) => {
    console.error('📡 SSE connection error:', err);
    clearInterval(heartbeat);
    try { res.end(); } catch (_) {}
  });

  try {
    send('🚀 Starting intelligent deployment analysis...');

    if (!repoUrl) {
      send({ error: 'Repository URL is required' });
      send({ done: true });
      return res.end();
    }

    send(`🔗 Repository: ${repoUrl}`);
    send('📂 Fetching repo...');

    // Run existing analysis but intercept console logs by temporarily patching console.log
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      originalLog.apply(console, args);
      const text = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
      if (text) send(text);
    };

    const result = await processDockerfileGeneration(String(repoUrl), String(userPrompt || ''), String(githubToken || ''));

    // restore console
    console.log = originalLog;

    if (!result.success) {
      send(`❌ Analysis failed: ${result.error || 'Unknown error'}`);
      send({ error: result.error || 'Analysis failed' });
      send({ done: true });
      return res.end();
    }

    send('✅ Analysis complete.');
    if (result.imageName) send(`🏷️ Suggested image: ${result.imageName}`);
    if (result.generatedFiles?.length) send(`📝 Generated files: ${result.generatedFiles.length}`);
    send('📦 Generating Dockerfile...');
    send({ dockerfile: result.dockerfile?.slice(0, 800) + '...'});

    send({ done: true });
    return res.end();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    send(`❌ Analysis error: ${message}`);
    send({ error: message });
    send({ done: true });
    try { return res.end(); } catch (_) { /* noop */ }
  }
});

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    files: 100 // Maximum 100 files
  },
  fileFilter: (req, file, cb) => {
    // Allow all file types but skip certain directories
    const skipFiles = ['.git', 'node_modules', '__pycache__', '.venv', 'dist', 'build'];
    const shouldSkip = skipFiles.some(skip => file.originalname.includes(skip));
    cb(null, !shouldSkip);
  }
});

// File upload endpoint for local project analysis
router.post('/deployments/upload', upload.array('files'), async (req, res) => {
  try {
    console.log('📁 Received file upload request');
    const files = req.files as Express.Multer.File[];
    const { userPrompt } = req.body;
    const streamId = (req.query.streamId as string) || '';

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
    }

    console.log(`📄 Processing ${files.length} uploaded files...`);
    if (streamId) publishUploadStream(streamId, { message: `📄 Processing ${files.length} uploaded files...` });

    // Convert uploaded files to GitHubFile format
    const gitHubFiles: GitHubFile[] = files.map(file => ({
      name: file.originalname.split('/').pop() || file.originalname,
      path: file.originalname,
      type: 'file' as const,
      content: file.buffer.toString('utf-8')
    }));

    console.log('🔍 Converted to GitHub file format:', gitHubFiles.length);
    if (streamId) publishUploadStream(streamId, { message: '🔍 Analyzing uploaded files...' });

    // Analyze the uploaded project
    const analysis = await analyzeProject(gitHubFiles);
    if (streamId) publishUploadStream(streamId, { message: '📊 Project analysis complete' });
    
    console.log('📊 Project analysis complete:', {
      language: analysis.language,
      framework: analysis.framework,
      dependencies: analysis.dependencies.length,
      hasDockerfile: analysis.hasDockerfile
    });

    // Generate Dockerfile
    const dockerfile = await generateDockerfile(
      analysis,
      userPrompt || 'Generate production-ready Dockerfile for uploaded project',
      'uploaded-project'
    );

    console.log('✅ Dockerfile generated for uploaded project');
    if (streamId) {
      publishUploadStream(streamId, { message: '✅ Dockerfile generated for uploaded project' });
      publishUploadStream(streamId, { dockerfilePreview: dockerfile.slice(0, 800) + '...' });
    }

    // 🚀 AUTOMATICALLY BUILD DOCKER IMAGE
    console.log('🐳 Starting automatic Docker build...');
    console.log('🔍 DEBUG: About to start Docker build process...');
    if (streamId) publishUploadStream(streamId, { message: '🐳 Starting automatic Docker build...' });

    let buildResult = null;
    try {
      // Import the docker build monitor
      const { dockerBuildMonitor } = await import('../lib/dockerBuildMonitor');
      
      // Create a temporary Dockerfile
      const dockerfilePath = 'temp-upload-dockerfile';
      fs.writeFileSync(dockerfilePath, dockerfile);

      // Generate image name
      const imageName = `uploaded-project-${Date.now()}`;

      // Build with auto-fix
      buildResult = await dockerBuildMonitor.buildWithAutoFix(
        dockerfilePath,
        '.', // Build context
        imageName,
        3 // Max retry attempts
      );

      // Clean up temp file
      fs.unlinkSync(dockerfilePath);

      if (buildResult.success) {
        console.log(`✅ Docker image built successfully: ${imageName}`);
        if (streamId) publishUploadStream(streamId, { 
          message: `✅ Docker image built successfully: ${imageName}`,
          imageName: imageName
        });
      } else {
        console.log(`❌ Docker build failed: ${buildResult.errors.map(e => e.message).join(', ')}`);
        if (streamId) publishUploadStream(streamId, { 
          message: `❌ Docker build failed: ${buildResult.errors.map(e => e.message).join(', ')}`,
          errors: buildResult.errors
        });
      }

    } catch (buildError) {
      console.error('❌ Docker build error:', buildError);
      if (streamId) publishUploadStream(streamId, { 
        message: `❌ Docker build error: ${buildError}`,
        error: buildError
      });
    }

    if (streamId) {
      publishUploadStream(streamId, { done: true });
      closeUploadStream(streamId);
    }

    res.status(201).json({
      success: true,
      message: 'Local project analysis and Docker build completed successfully',
      dockerfile,
      analysis,
      generatedFiles: analysis.generatedFiles || [],
      buildResult: buildResult ? {
        success: buildResult.success,
        imageName: buildResult.success ? `uploaded-project-${Date.now()}` : null,
        errors: buildResult.errors || []
      } : null
    });

  } catch (error) {
    console.error('❌ File upload processing error:', error);
    const streamId = (req.query.streamId as string) || '';
    if (streamId) {
      publishUploadStream(streamId, { error: error instanceof Error ? error.message : 'File upload processing failed' });
      publishUploadStream(streamId, { done: true });
      closeUploadStream(streamId);
    }
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'File upload processing failed'
    });
  }
});

// SSE endpoint to stream upload analysis logs
router.get('/deployments/upload/stream', (req: Request, res: Response) => {
  const { streamId } = req.query as Record<string, string>;
  if (!streamId) {
    return res.status(400).end('Missing streamId');
  }
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders?.();
  try { res.write('retry: 3000\n\n'); } catch (_) {}
  const heartbeat = setInterval(() => {
    try { res.write(': ping\n\n'); } catch(_) {}
  }, 15000);

  const send = (payload: any) => {
    try { res.write(`data: ${JSON.stringify(payload)}\n\n`); } catch(_) {}
  };
  subscribeUploadStream(streamId, send);

  req.on('close', () => {
    clearInterval(heartbeat);
    try { res.end(); } catch(_) {}
  });
});

// Get deployment by ID with detailed analysis
router.get('/deployments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // This would typically fetch from database
    // For now, return a placeholder response
    res.json({
      success: true,
      deployment: {
        id,
        status: 'completed',
        createdAt: new Date().toISOString(),
        analysis: {
          language: 'javascript',
          framework: 'react',
          projectHealth: 'good'
        }
      }
    });
  } catch (error) {
    console.error('❌ Error fetching deployment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch deployment'
    });
  }
});

// Get all deployments for user
router.get('/deployments', async (req, res) => {
  try {
    // This would typically fetch from database
    res.json({
      success: true,
      deployments: []
    });
  } catch (error) {
    console.error('❌ Error fetching deployments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch deployments'
    });
  }
});

// Enhanced file analysis endpoint
router.post('/analyze-files', async (req, res) => {
  try {
    const { files, analysis, userPrompt } = req.body;

    if (!files || !analysis) {
      return res.status(400).json({
        success: false,
        error: 'Files and analysis are required'
      });
    }

    console.log('🔍 Starting intelligent file analysis...');

    const fileGenerator = new IntelligentFileGenerator(process.env.OPENAI_API_KEY || '');
    
    // Analyze project files
    const fileAnalysis = await fileGenerator.analyzeProjectFiles(files, analysis);
    
    // Generate missing files if any
    let generatedFiles: any[] = [];
    if (fileAnalysis.missingFiles.length > 0) {
      console.log(`📝 Generating ${fileAnalysis.missingFiles.length} missing files...`);
      
      generatedFiles = await fileGenerator.generateMissingFiles(
        analysis,
        files,
        fileAnalysis.missingFiles,
        userPrompt
      );
    }

    res.json({
      success: true,
      analysis: fileAnalysis,
      generatedFiles,
      recommendations: fileAnalysis.recommendations,
      projectHealth: fileAnalysis.projectHealth
    });

  } catch (error) {
    console.error('❌ File analysis error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'File analysis failed'
    });
  }
});

// Docker build and deployment endpoint
router.post('/deployments/:id/build', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      repoUrl, 
      dockerfile, 
      files, 
      dockerHubUsername, 
      dockerHubPassword, 
      imageName,
      pushToHub = true 
    } = req.body;

    console.log('🐳 Starting Docker build and deployment for:', id);

    if (!dockerfile) {
      return res.status(400).json({
        success: false,
        error: 'Dockerfile is required for building'
      });
    }

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Project files are required for building'
      });
    }

    // Set up logging for real-time updates
    const logs: string[] = [];
    const logSink: LogSink = (chunk: string) => {
      logs.push(chunk);
      console.log('🐳 Docker:', chunk.trim());
    };

    // Prepare build context
    logSink('📁 Preparing build context...');
    const buildContext = prepareBuildContext(repoUrl || 'project', files, dockerfile);
    logSink(`✅ Build context prepared at: ${buildContext}`);

    // Derive image name if not provided
    const finalImageName = imageName || deriveImageName(repoUrl || 'project');
    logSink(`🏷️ Using image name: ${finalImageName}`);

    // Build Docker image
    logSink('🔨 Building Docker image...');
    await build_docker_image(buildContext, finalImageName, { onLog: logSink });
    logSink('✅ Docker image built successfully!');

    let pushResult = null;
    if (pushToHub && dockerHubUsername && dockerHubPassword) {
      try {
        logSink('🔐 Logging into Docker Hub...');
        
        // Login to Docker Hub
        const { spawn } = require('child_process');
        await new Promise<void>((resolve, reject) => {
          const loginProc = spawn('docker', ['login', '-u', dockerHubUsername, '-p', dockerHubPassword], { 
            stdio: ['ignore', 'pipe', 'pipe'] 
          });
          
          let output = '';
          loginProc.stdout.on('data', (d: Buffer) => output += d.toString());
          loginProc.stderr.on('data', (d: Buffer) => output += d.toString());
          
          loginProc.on('close', (code: number) => {
            if (code === 0) {
              logSink('✅ Successfully logged into Docker Hub');
              resolve();
            } else {
              logSink(`❌ Docker Hub login failed: ${output}`);
              reject(new Error(`Docker login failed: ${output}`));
            }
          });
        });

        // Push to Docker Hub
        logSink('📤 Pushing image to Docker Hub...');
        await push_docker_image(finalImageName, { onLog: logSink });
        logSink('🚀 Image pushed to Docker Hub successfully!');
        
        pushResult = {
          success: true,
          imageUrl: `https://hub.docker.com/r/${finalImageName.split(':')[0]}`,
          pullCommand: `docker pull ${finalImageName}`
        };
      } catch (pushError) {
        logSink(`⚠️ Push to Docker Hub failed: ${pushError}`);
        pushResult = {
          success: false,
          error: pushError instanceof Error ? pushError.message : 'Push failed'
        };
      }
    } else if (pushToHub) {
      logSink('⚠️ Docker Hub credentials not provided, skipping push');
      pushResult = {
        success: false,
        error: 'Docker Hub credentials required for push'
      };
    }

    // Clean up build context
    try {
      fs.rmSync(buildContext, { recursive: true, force: true });
      logSink('🧹 Build context cleaned up');
    } catch (cleanupError) {
      logSink(`⚠️ Cleanup warning: ${cleanupError}`);
    }

    res.json({
      success: true,
      message: 'Docker build and deployment completed',
      deploymentId: id,
      imageName: finalImageName,
      buildLogs: logs,
      pushResult,
      commands: {
        run: `docker run -p 8080:8080 ${finalImageName}`,
        pull: pushResult?.success ? `docker pull ${finalImageName}` : null
      }
    });

  } catch (error) {
    console.error('❌ Docker build error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Docker build failed',
      logs: []
    });
  }
});

// Docker Hub authentication test endpoint
router.post('/docker-hub/test', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Docker Hub username and password are required'
      });
    }

    const { spawn } = require('child_process');
    
    await new Promise<void>((resolve, reject) => {
      const loginProc = spawn('docker', ['login', '-u', username, '-p', password], { 
        stdio: ['ignore', 'pipe', 'pipe'] 
      });
      
      let output = '';
      loginProc.stdout.on('data', (d: Buffer) => output += d.toString());
      loginProc.stderr.on('data', (d: Buffer) => output += d.toString());
      
      loginProc.on('close', (code: number) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Login failed: ${output}`));
        }
      });
    });

    res.json({
      success: true,
      message: 'Docker Hub authentication successful'
    });

  } catch (error) {
    console.error('❌ Docker Hub auth test error:', error);
    res.status(401).json({
      success: false,
      error: error instanceof Error ? error.message : 'Docker Hub authentication failed'
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'AutoDeploy.AI - Intelligent File Generator'
  });
});

export default router;


