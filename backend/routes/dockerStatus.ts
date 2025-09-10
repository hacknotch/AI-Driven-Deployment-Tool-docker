import { Router } from 'express';
import { dockerStatusChecker } from '../lib/dockerStatusChecker';

const router = Router();

/**
 * 🔍 DOCKER STATUS ENDPOINTS
 * These endpoints help check Docker installation and status
 */

/**
 * GET /api/docker-status/check
 * Check Docker installation and running status
 */
router.get('/check', async (req, res) => {
  try {
    console.log('🔍 Checking Docker status...');
    
    // Set a timeout for the entire operation
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Docker status check timed out after 15 seconds')), 15000);
    });
    
    const statusPromise = dockerStatusChecker.checkDockerStatus();
    
    const status = await Promise.race([statusPromise, timeoutPromise]) as any;
    
    res.json({
      success: true,
      status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Docker status check failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check Docker status'
    });
  }
});

/**
 * POST /api/docker-status/start-desktop
 * Attempt to start Docker Desktop
 */
router.post('/start-desktop', async (req, res) => {
  try {
    console.log('🚀 Attempting to start Docker Desktop...');
    const result = await dockerStatusChecker.startDockerDesktop();
    
    res.json({
      success: result.success,
      message: result.success 
        ? 'Docker Desktop start command sent. Please wait for it to fully start.'
        : 'Failed to start Docker Desktop',
      error: result.error
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start Docker Desktop'
    });
  }
});

/**
 * GET /api/docker-status/test-build
 * Test Docker build capability
 */
router.get('/test-build', async (req, res) => {
  try {
    console.log('🧪 Testing Docker build capability...');
    const result = await dockerStatusChecker.testDockerBuild();
    
    res.json({
      success: result.success,
      message: result.success 
        ? 'Docker build test successful!'
        : 'Docker build test failed',
      error: result.error,
      output: result.output
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Docker build test failed'
    });
  }
});

/**
 * GET /api/docker-status/installation-guide
 * Get Docker installation instructions
 */
router.get('/installation-guide', async (req, res) => {
  try {
    const instructions = dockerStatusChecker.getInstallationInstructions();
    
    res.json({
      success: true,
      instructions,
      quickStart: {
        windows: 'Download and install Docker Desktop from https://www.docker.com/products/docker-desktop/',
        macos: 'Download and install Docker Desktop from https://www.docker.com/products/docker-desktop/',
        linux: 'Follow the official Docker installation guide for your distribution'
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get installation guide'
    });
  }
});

/**
 * GET /api/docker-status/quick
 * Quick Docker installation check (no daemon check)
 */
router.get('/quick', async (req, res) => {
  try {
    console.log('⚡ Quick Docker check...');
    
    const { spawn } = require('child_process');
    
    const quickCheck = new Promise((resolve) => {
      const process = spawn('docker', ['--version'], { 
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true,
        timeout: 3000
      });

      let output = '';
      let error = '';

      process.stdout.on('data', (data: any) => {
        output += data.toString();
      });

      process.stderr.on('data', (data: any) => {
        error += data.toString();
      });

      process.on('close', (code: any) => {
        resolve({
          isInstalled: code === 0,
          version: output.trim(),
          error: error.trim()
        });
      });

      process.on('error', (err: any) => {
        resolve({
          isInstalled: false,
          error: err.message
        });
      });
    });

    const result = await quickCheck;
    
    res.json({
      success: true,
      isInstalled: (result as any).isInstalled,
      version: (result as any).version,
      error: (result as any).error,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Quick check failed'
    });
  }
});

/**
 * GET /api/docker-status/health
 * Comprehensive Docker health check
 */
router.get('/health', async (req, res) => {
  try {
    console.log('🏥 Running comprehensive Docker health check...');
    
    const [status, buildTest] = await Promise.all([
      dockerStatusChecker.checkDockerStatus(),
      dockerStatusChecker.testDockerBuild()
    ]);

    const health = {
      docker: status,
      buildTest,
      overall: status.canBuild && buildTest.success ? 'healthy' : 'unhealthy',
      recommendations: [] as string[]
    };

    // Add recommendations based on status
    if (!status.isInstalled) {
      health.recommendations.push('Install Docker Desktop from https://www.docker.com/products/docker-desktop/');
    } else if (!status.isRunning) {
      health.recommendations.push('Start Docker Desktop and wait for it to fully initialize');
    } else if (!buildTest.success) {
      health.recommendations.push('Docker is running but build test failed. Check Docker Desktop settings.');
    }

    res.json({
      success: true,
      health,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Health check failed'
    });
  }
});

export default router;
