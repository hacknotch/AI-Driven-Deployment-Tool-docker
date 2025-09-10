import { Router } from 'express';
import { dockerBuildMonitor } from '../lib/dockerBuildMonitor';
import { spawn } from 'child_process';
import * as fs from 'fs';

const router = Router();

/**
 * 🔍 DOCKER BUILD MONITOR ENDPOINTS
 * These endpoints help monitor and fix Docker build issues automatically
 */

/**
 * POST /api/docker-monitor/validate-dockerfile
 * Validates a Dockerfile for common issues before building
 */
router.post('/validate-dockerfile', async (req, res) => {
  try {
    const { dockerfile } = req.body;

    if (!dockerfile) {
      return res.status(400).json({
        success: false,
        error: 'Dockerfile content is required'
      });
    }

    // Write Dockerfile to temp file

    const dockerfilePath = 'temp-dockerfile';
    fs.writeFileSync(dockerfilePath, dockerfile);

    // Validate the Dockerfile
    const errors = await dockerBuildMonitor.validateDockerfile(dockerfilePath);

    // Clean up temp file
    fs.unlinkSync(dockerfilePath);

    res.json({
      success: true,
      errors,
      errorCount: errors.length,
      hasErrors: errors.length > 0
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Validation failed'
    });
  }
});

/**
 * POST /api/docker-monitor/build-with-auto-fix
 * Builds a Docker image with automatic error fixing
 */
router.post('/build-with-auto-fix', async (req, res) => {
  try {
    const { 
      dockerfile, 
      contextPath = '.', 
      imageName = 'test-image',
      maxRetries = 3 
    } = req.body;

    if (!dockerfile) {
      return res.status(400).json({
        success: false,
        error: 'Dockerfile content is required'
      });
    }

    console.log('🔍 Starting Docker build with auto-error fixing...');

    // Write Dockerfile to disk

    const dockerfilePath = 'Dockerfile';
    fs.writeFileSync(dockerfilePath, dockerfile);

    // Build with auto-error fixing
    const result = await dockerBuildMonitor.buildWithAutoFix(
      dockerfilePath,
      contextPath,
      imageName,
      maxRetries
    );

    // Clean up Dockerfile
    if (fs.existsSync(dockerfilePath)) {
      fs.unlinkSync(dockerfilePath);
    }

    res.json({
      success: result.success,
      imageName: result.imageName,
      errors: result.errors,
      logs: result.logs,
      fixedDockerfile: result.fixedDockerfile
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Build failed'
    });
  }
});

/**
 * POST /api/docker-monitor/fix-dockerfile
 * Analyzes and fixes a Dockerfile using AI
 */
router.post('/fix-dockerfile', async (req, res) => {
  try {
    const { dockerfile, errors } = req.body;

    if (!dockerfile) {
      return res.status(400).json({
        success: false,
        error: 'Dockerfile content is required'
      });
    }

    console.log('🤖 Analyzing Dockerfile with AI for fixes...');

    // Write Dockerfile to temp file

    const dockerfilePath = 'temp-dockerfile';
    fs.writeFileSync(dockerfilePath, dockerfile);

    // Use AI to fix the Dockerfile
    const fixedDockerfile = await dockerBuildMonitor['analyzeAndFixErrors'](
      dockerfilePath,
      errors || []
    );

    // Clean up temp file
    fs.unlinkSync(dockerfilePath);

    res.json({
      success: true,
      originalDockerfile: dockerfile,
      fixedDockerfile: fixedDockerfile || dockerfile,
      wasFixed: fixedDockerfile !== dockerfile
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Fix failed'
    });
  }
});

/**
 * GET /api/docker-monitor/test-build
 * Test endpoint to demonstrate the auto-fix system with your problematic Dockerfile
 */
router.get('/test-build', async (req, res) => {
  try {
    // Your problematic Dockerfile
    const problematicDockerfile = `FROM golang:1.21 AS builder

WORKDIR /app

COPY go.mod go.sum ./

RUN go mod download

COPY . .

RUN go build -o process_cursor_links process_cursor_links.py

FROM python:3.11-slim

WORKDIR /app

COPY --from=builder /app/process_cursor_links .

COPY . .

RUN pip install --no-cache-dir -r requirements.txt

RUN adduser --disabled-password --gecos '' appuser
USER appuser

EXPOSE 8080

CMD ["python", "process_cursor_links.py"]

HEALTHCHECK --interval=30s --timeout=3s CMD curl -f http://localhost:8080/ || exit 1`;

    console.log('🧪 Testing auto-fix system with problematic Dockerfile...');

    // Step 1: Validate the problematic Dockerfile

    const dockerfilePath = 'test-dockerfile';
    fs.writeFileSync(dockerfilePath, problematicDockerfile);

    const validationErrors = await dockerBuildMonitor.validateDockerfile(dockerfilePath);
    
    console.log(`Found ${validationErrors.length} issues:`);
    validationErrors.forEach(error => {
      console.log(`- ${error.type}: ${error.message}`);
    });

    // Step 2: Try to fix the Dockerfile
    const fixedDockerfile = await dockerBuildMonitor['analyzeAndFixErrors'](
      dockerfilePath,
      validationErrors
    );

    // Clean up
    fs.unlinkSync(dockerfilePath);

    res.json({
      success: true,
      originalDockerfile: problematicDockerfile,
      validationErrors,
      fixedDockerfile: fixedDockerfile || problematicDockerfile,
      wasFixed: fixedDockerfile !== problematicDockerfile,
      analysis: {
        issuesFound: validationErrors.length,
        issuesFixed: fixedDockerfile !== problematicDockerfile ? validationErrors.length : 0,
        mainProblems: [
          'Mixed Go and Python base images',
          'Building .py file with go build command',
          'Missing requirements.txt file',
          'Missing go.sum file'
        ]
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Test failed'
    });
  }
});

export default router;
