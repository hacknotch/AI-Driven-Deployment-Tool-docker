import express from 'express';
import multer from 'multer';
import { DockerBuildFixer } from '../lib/dockerBuildFixer';
import { analyzeProject } from '../lib/aiService';
import type { Request, Response } from 'express';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

/**
 * POST /api/docker-build-fix
 * Fix Docker build issues using LangChain
 */
router.post('/docker-build-fix', upload.array('files'), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    const { userPrompt } = req.body;

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded',
      });
    }

    console.log(`🔧 Processing ${files.length} files for Docker build fix...`);

    // Convert uploaded files to GitHubFile format
    const gitHubFiles = files.map(file => ({
      name: file.originalname.split('/').pop() || file.originalname,
      path: file.originalname,
      type: 'file' as const,
      content: file.buffer.toString('utf-8'),
    }));

    // Analyze the project
    const analysis = await analyzeProject(gitHubFiles);

    // Initialize the Docker build fixer
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'OpenAI API key not configured',
      });
    }

    const dockerBuildFixer = new DockerBuildFixer(apiKey);

    // Fix the Docker build issues
    const fixResult = await dockerBuildFixer.fixDockerBuild(
      gitHubFiles,
      analysis,
      userPrompt
    );

    if (!fixResult.success) {
      return res.status(500).json({
        success: false,
        error: fixResult.errorMessage || 'Failed to fix Docker build',
      });
    }

    console.log('✅ Docker build fix completed successfully');

    res.json({
      success: true,
      message: 'Docker build issues fixed successfully',
      result: fixResult,
      analysis: {
        language: analysis.language,
        framework: analysis.framework,
        dependencies: analysis.dependencies,
        projectHealth: analysis.projectHealth,
      },
    });

  } catch (error) {
    console.error('❌ Docker build fix error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
});

/**
 * GET /api/docker-build-fix/status
 * Get status of Docker build fix service
 */
router.get('/docker-build-fix/status', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Docker build fix service is running',
    features: [
      'LangChain-powered file analysis',
      'Automatic .dockerignore generation',
      'Intelligent Dockerfile creation',
      'Missing file detection and generation',
      'Docker build context optimization',
    ],
  });
});

export default router;


