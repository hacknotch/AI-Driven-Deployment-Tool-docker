import { Router } from 'express';
import { advancedFileDetector } from '../lib/advancedFileDetector';
import { dockerBuildMonitor } from '../lib/dockerBuildMonitor';
import * as fs from 'fs';

const router = Router();

/**
 * 🚀 ADVANCED DOCKER FIX ENDPOINTS
 * These endpoints provide advanced Docker error detection and auto-regeneration
 */

/**
 * POST /api/advanced-docker-fix/analyze-project
 * Analyze project structure and detect missing files
 */
router.post('/analyze-project', async (req, res) => {
  try {
    const { projectPath = '.' } = req.body;
    
    console.log('🔍 Running advanced project analysis...');
    const analysis = await advancedFileDetector.analyzeProject(projectPath);
    
    res.json({
      success: true,
      analysis,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Project analysis failed'
    });
  }
});

/**
 * POST /api/advanced-docker-fix/generate-missing-files
 * Generate missing dependency files
 */
router.post('/generate-missing-files', async (req, res) => {
  try {
    const { projectPath = '.' } = req.body;
    
    console.log('📝 Generating missing dependency files...');
    const analysis = await advancedFileDetector.analyzeProject(projectPath);
    const generatedFiles = await advancedFileDetector.generateMissingFiles(analysis, projectPath);
    
    res.json({
      success: true,
      generatedFiles,
      analysis,
      message: `Generated ${generatedFiles.length} missing files`
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'File generation failed'
    });
  }
});

/**
 * POST /api/advanced-docker-fix/fix-dockerfile
 * Fix Dockerfile using advanced AI analysis
 */
router.post('/fix-dockerfile', async (req, res) => {
  try {
    const { dockerfile, projectPath = '.' } = req.body;
    
    if (!dockerfile) {
      return res.status(400).json({
        success: false,
        error: 'Dockerfile content is required'
      });
    }

    console.log('🤖 Fixing Dockerfile with advanced AI...');
    
    // Write Dockerfile to temp file
    const dockerfilePath = 'temp-dockerfile';
    fs.writeFileSync(dockerfilePath, dockerfile);

    // Run advanced project analysis
    const analysis = await advancedFileDetector.analyzeProject(projectPath);
    
    // Generate missing files
    if (analysis.missingFiles.length > 0) {
      await advancedFileDetector.generateMissingFiles(analysis, projectPath);
    }

    // Generate intelligent prompt
    const intelligentPrompt = advancedFileDetector.generateIntelligentPrompt(analysis, dockerfile);
    
    // Use AI to fix the Dockerfile
    const fixedDockerfile = await dockerBuildMonitor['callAIForDockerfileFix'](intelligentPrompt);

    // Clean up temp file
    fs.unlinkSync(dockerfilePath);

    res.json({
      success: true,
      originalDockerfile: dockerfile,
      fixedDockerfile: fixedDockerfile || dockerfile,
      analysis,
      wasFixed: fixedDockerfile !== dockerfile,
      intelligentPrompt
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Dockerfile fix failed'
    });
  }
});

/**
 * POST /api/advanced-docker-fix/auto-regenerate
 * Automatically regenerate Dockerfile with advanced error detection
 */
router.post('/auto-regenerate', async (req, res) => {
  try {
    const { 
      dockerfile, 
      projectPath = '.', 
      maxRetries = 3,
      imageName = 'auto-regenerated-image'
    } = req.body;
    
    if (!dockerfile) {
      return res.status(400).json({
        success: false,
        error: 'Dockerfile content is required'
      });
    }

    console.log('🚀 Starting auto-regeneration with advanced error detection...');
    
    const results = {
      attempts: [] as any[],
      finalDockerfile: dockerfile,
      success: false,
      generatedFiles: [] as string[],
      analysis: null as any
    };

    let currentDockerfile = dockerfile;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`\n🔄 Auto-regeneration attempt ${attempt}/${maxRetries}`);
      
      // Write current Dockerfile
      const dockerfilePath = 'temp-dockerfile';
      fs.writeFileSync(dockerfilePath, currentDockerfile);

      // Run project analysis
      const analysis = await advancedFileDetector.analyzeProject(projectPath);
      results.analysis = analysis;

      // Generate missing files
      if (analysis.missingFiles.length > 0) {
        const generatedFiles = await advancedFileDetector.generateMissingFiles(analysis, projectPath);
        results.generatedFiles.push(...generatedFiles);
      }

      // Try to build
      const buildResult = await dockerBuildMonitor.buildWithAutoFix(
        dockerfilePath,
        projectPath,
        `${imageName}-attempt-${attempt}`,
        1 // Single retry per attempt
      );

      const attemptResult = {
        attempt,
        dockerfile: currentDockerfile,
        buildSuccess: buildResult.success,
        errors: buildResult.errors,
        generatedFiles: results.generatedFiles
      };

      results.attempts.push(attemptResult);

      if (buildResult.success) {
        console.log(`✅ Auto-regeneration successful on attempt ${attempt}`);
        results.success = true;
        results.finalDockerfile = currentDockerfile;
        break;
      } else {
        console.log(`❌ Attempt ${attempt} failed, regenerating...`);
        
        // Generate intelligent prompt for next attempt
        const intelligentPrompt = advancedFileDetector.generateIntelligentPrompt(
          analysis, 
          currentDockerfile
        );
        
        // Get AI-fixed Dockerfile for next attempt
        const fixedDockerfile = await dockerBuildMonitor['callAIForDockerfileFix'](intelligentPrompt);
        
        if (fixedDockerfile && fixedDockerfile !== currentDockerfile) {
          currentDockerfile = fixedDockerfile;
          console.log(`🔧 Generated improved Dockerfile for attempt ${attempt + 1}`);
        } else {
          console.log(`⚠️ Could not improve Dockerfile, stopping attempts`);
          break;
        }
      }

      // Clean up temp file
      fs.unlinkSync(dockerfilePath);
    }

    res.json({
      success: results.success,
      results,
      message: results.success 
        ? `Auto-regeneration successful after ${results.attempts.length} attempts`
        : `Auto-regeneration failed after ${results.attempts.length} attempts`
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Auto-regeneration failed'
    });
  }
});

/**
 * GET /api/advanced-docker-fix/test-your-error
 * Test the system with your specific go.mod error
 */
router.get('/test-your-error', async (req, res) => {
  try {
    // Your problematic Dockerfile from the screenshot
    const problematicDockerfile = `FROM golang:1.21 AS builder

WORKDIR /app

COPY go.mod go.sum ./

RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -o cursor-help .

FROM alpine:latest

WORKDIR /root/

COPY --from=builder /app/cursor-help .

RUN adduser -D appuser
USER appuser

EXPOSE 8080

CMD ["./cursor-help"]

HEALTHCHECK --interval=30s --timeout=10s CMD curl -f http://localhost:8080/ || exit 1`;

    console.log('🧪 Testing advanced fix system with your go.mod error...');
    
    // Run project analysis
    const analysis = await advancedFileDetector.analyzeProject('.');
    
    // Generate missing go.mod file
    const generatedFiles = await advancedFileDetector.generateMissingFiles(analysis, '.');
    
    // Generate intelligent prompt
    const intelligentPrompt = advancedFileDetector.generateIntelligentPrompt(analysis, problematicDockerfile);
    
    // Get AI-fixed Dockerfile
    const fixedDockerfile = await dockerBuildMonitor['callAIForDockerfileFix'](intelligentPrompt);

    res.json({
      success: true,
      originalDockerfile: problematicDockerfile,
      analysis,
      generatedFiles,
      fixedDockerfile: fixedDockerfile || problematicDockerfile,
      intelligentPrompt,
      wasFixed: fixedDockerfile !== problematicDockerfile,
      message: 'Advanced fix system tested with your specific error'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Test failed'
    });
  }
});

export default router;
