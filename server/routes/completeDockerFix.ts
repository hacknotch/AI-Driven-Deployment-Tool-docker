import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();

// Complete Docker fix for .builder/rules/deploy-app.mdc error
router.post('/complete-docker-fix', async (req: Request, res: Response) => {
  try {
    console.log('🔧 Starting complete Docker fix for .builder/rules/deploy-app.mdc error...');

    const result = {
      success: true,
      generatedFiles: [] as any[],
      updatedFiles: [] as any[],
      instructions: [] as string[],
      dockerBuildCommand: ''
    };

    // 1. Generate the missing .builder/rules/deploy-app.mdc file
    const builderDir = path.join(process.cwd(), '.builder', 'rules');
    const deployAppFile = path.join(builderDir, 'deploy-app.mdc');

    // Create directory if it doesn't exist
    if (!fs.existsSync(builderDir)) {
      fs.mkdirSync(builderDir, { recursive: true });
      console.log('📁 Created .builder/rules directory');
    }

    // Generate the Netlify build rule file
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

    fs.writeFileSync(deployAppFile, netlifyRuleContent, 'utf-8');
    console.log('✅ Generated .builder/rules/deploy-app.mdc file');

    result.generatedFiles.push({
      fileName: '.builder/rules/deploy-app.mdc',
      content: netlifyRuleContent,
      reason: 'Missing Netlify build rule file detected during Docker build',
      action: 'created'
    });

    // 2. Update .dockerignore to exclude .builder directory
    const dockerignorePath = path.join(process.cwd(), '.dockerignore');
    let dockerignoreContent = '';

    if (fs.existsSync(dockerignorePath)) {
      dockerignoreContent = fs.readFileSync(dockerignorePath, 'utf-8');
    }

    // Add .builder exclusion if not already present
    if (!dockerignoreContent.includes('.builder/')) {
      dockerignoreContent += '\n# Exclude Netlify builder files\n.builder/\n*.mdc\n';
      fs.writeFileSync(dockerignorePath, dockerignoreContent, 'utf-8');
      console.log('✅ Updated .dockerignore to exclude .builder/ directory');

      result.updatedFiles.push({
        fileName: '.dockerignore',
        content: dockerignoreContent,
        reason: 'Added .builder/ exclusion to prevent Docker build context issues',
        action: 'updated'
      });
    } else {
      console.log('ℹ️ .dockerignore already excludes .builder/ directory');
    }

    // 3. Provide instructions
    result.instructions = [
      '✅ Generated missing .builder/rules/deploy-app.mdc file',
      '✅ Updated .dockerignore to exclude .builder/ directory',
      '🚀 Your Docker build should now work!',
      '',
      'Next steps:',
      '1. Try running your Docker build again',
      '2. The .builder/ directory is now excluded from Docker context',
      '3. If you need the .builder files in Docker, remove the exclusion from .dockerignore'
    ];

    result.dockerBuildCommand = 'docker build -t your-app-name .';

    console.log('🎉 Complete Docker fix finished successfully!');
    res.json(result);

  } catch (error) {
    console.error('❌ Complete Docker fix failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

// Get the current project structure
router.get('/project-structure', async (req: Request, res: Response) => {
  try {
    const projectRoot = process.cwd();
    const structure = {
      root: projectRoot,
      files: [] as string[],
      directories: [] as string[],
      hasBuilder: false,
      hasDockerignore: false,
      dockerignoreContent: ''
    };

    // Read directory contents
    const items = fs.readdirSync(projectRoot);
    
    for (const item of items) {
      const itemPath = path.join(projectRoot, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        structure.directories.push(item);
        if (item === '.builder') {
          structure.hasBuilder = true;
        }
      } else {
        structure.files.push(item);
        if (item === '.dockerignore') {
          structure.hasDockerignore = true;
          structure.dockerignoreContent = fs.readFileSync(itemPath, 'utf-8');
        }
      }
    }

    res.json({
      success: true,
      structure
    });

  } catch (error) {
    console.error('❌ Failed to get project structure:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
