import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import type { GitHubFile } from './aiService';

export type LogSink = (chunk: string) => void;

export interface DockerBuildOptions {
  onLog?: LogSink;
}

export function sanitizeDockerfileContent(raw: string): string {
  let content = raw.trim();
  // Remove fenced code block markers like ```Dockerfile ... ``` or ``` ... ```
  if (content.startsWith('```')) {
    content = content.replace(/^```[a-zA-Z]*\s*/i, '');
    content = content.replace(/\n?```\s*$/i, '');
  }
  // Also handle accidental inline backticks at the start of first line
  content = content.replace(/^`+\s*/g, '');
  return content;
}

export async function build_docker_image(repoPath: string, imageName: string, options: DockerBuildOptions = {}): Promise<void> {
  const onLog = options.onLog || (() => {});
  return new Promise((resolve, reject) => {
    onLog(`\n🐳 Starting Docker build for ${imageName}\n`);
    onLog(`📁 Context: ${path.resolve(repoPath)}\n`);

    let buildOutput = '';
    let errorOutput = '';

    const buildProc = spawn('docker', ['build', '-t', imageName, repoPath], { stdio: ['ignore', 'pipe', 'pipe'] });
    
    buildProc.stdout.on('data', d => {
      const output = d.toString();
      buildOutput += output;
      onLog(output);
    });
    
    buildProc.stderr.on('data', d => {
      const output = d.toString();
      errorOutput += output;
      onLog(output);
    });
    
    buildProc.on('close', code => {
      if (code !== 0) {
        onLog(`\n❌ Docker build failed with code ${code}\n`);
        
        // Detailed error analysis
        onLog(`\n🔍 DETAILED ERROR ANALYSIS:\n`);
        
        if (errorOutput.includes('repository name must be lowercase')) {
          onLog(`❌ ERROR TYPE: Docker tag case sensitivity\n`);
          onLog(`   - Image name: ${imageName}\n`);
          onLog(`   - Issue: Repository name contains uppercase letters\n`);
          onLog(`   - Solution: Image name should be lowercase\n`);
          onLog(`   - Expected: ${imageName.toLowerCase()}\n`);
        } else if (errorOutput.includes('invalid file request')) {
          onLog(`❌ ERROR TYPE: Invalid file request\n`);
          onLog(`   - Issue: Docker is trying to access a file that doesn't exist\n`);
          onLog(`   - Common causes: Missing .dockerignore, .npmrc, or other config files\n`);
          onLog(`   - Solution: Check build context and file permissions\n`);
        } else if (errorOutput.includes('no such file or directory')) {
          onLog(`❌ ERROR TYPE: Missing file or directory\n`);
          onLog(`   - Issue: Dockerfile references files/directories that don't exist\n`);
          onLog(`   - Common causes: Missing source files, incorrect COPY paths\n`);
          onLog(`   - Solution: Verify all files referenced in Dockerfile exist\n`);
        } else if (errorOutput.includes('permission denied')) {
          onLog(`❌ ERROR TYPE: Permission denied\n`);
          onLog(`   - Issue: Docker doesn't have permission to access files\n`);
          onLog(`   - Solution: Check file permissions and Docker daemon access\n`);
        } else if (errorOutput.includes('failed to solve')) {
          onLog(`❌ ERROR TYPE: Docker build context issue\n`);
          onLog(`   - Issue: Docker cannot process the build context\n`);
          onLog(`   - Common causes: Large build context, missing files, invalid Dockerfile\n`);
          onLog(`   - Solution: Check .dockerignore and build context size\n`);
        } else {
          onLog(`❌ ERROR TYPE: Unknown error\n`);
          onLog(`   - Please check the full error output above for details\n`);
        }
        
        onLog(`\n📋 FULL ERROR OUTPUT:\n${errorOutput}\n`);
        onLog(`📋 FULL BUILD OUTPUT:\n${buildOutput}\n`);
        
        return reject(new Error(`Docker build failed with code ${code}: ${errorOutput}`));
      }
      onLog(`\n✅ Build completed for ${imageName}\n`);
      resolve();
    });
  });
}

export async function push_docker_image(imageName: string, options: DockerBuildOptions = {}): Promise<void> {
  const onLog = options.onLog || (() => {});
  return new Promise((resolve, reject) => {
    onLog(`\n📤 Attempting to push ${imageName}...\n`);
    const pushProc = spawn('docker', ['push', imageName], { stdio: ['ignore', 'pipe', 'pipe'] });
    pushProc.stdout.on('data', d => onLog(d.toString()));
    pushProc.stderr.on('data', d => onLog(d.toString()));
    pushProc.on('close', code => {
      if (code !== 0) {
        onLog(`\n⚠️ Docker push failed with code ${code}. Are you logged in?\n`);
        return reject(new Error(`Docker push failed with code ${code}`));
      }
      onLog(`\n🚀 Image pushed successfully: ${imageName}\n`);
      resolve();
    });
  });
}

export function deriveImageName(repoUrlOrFolder: string): string {
  const dockerUser = (process.env.DOCKER_USER || 'anonymous').toLowerCase();
  let repoName = 'project';
  
  console.log(`🔍 Deriving image name from: ${repoUrlOrFolder}`);
  
  const githubMatch = repoUrlOrFolder.match(/github\.com\/([^\/]+)\/([^\/#?]+)/i);
  if (githubMatch) {
    repoName = githubMatch[2].replace(/\.git$/, '').toLowerCase();
    console.log(`📦 GitHub repo detected: ${repoName}`);
  } else {
    const parts = repoUrlOrFolder.split(/[\\\/]/).filter(Boolean);
    repoName = (parts[parts.length - 1] || 'project').toLowerCase();
    console.log(`📁 Local path detected: ${repoName}`);
  }
  
  // Ensure the image name is valid for Docker (lowercase, no special chars except hyphens)
  const originalRepoName = repoName;
  repoName = repoName.replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  
  // Ensure we have a valid name
  if (!repoName || repoName.length === 0) {
    repoName = 'project';
  }
  
  const finalImageName = `${dockerUser}/${repoName}:latest`;
  console.log(`🏷️ Generated image name: ${finalImageName} (from: ${originalRepoName})`);
  
  return finalImageName;
}

export function prepareBuildContext(repoIdentifier: string, files: GitHubFile[], dockerfileContent: string): string {
  const repoName = repoIdentifier.replace(/\.git$/, '').split(/[\\\/]/).pop() || 'project';
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), `autodeploy-${repoName}-`));

  for (const f of files) {
    if (f.type !== 'file' || !f.content) continue;
    
    // Ensure content is a string
    let content: string;
    if (typeof f.content === 'string') {
      content = f.content;
    } else if (typeof f.content === 'object') {
      content = JSON.stringify(f.content, null, 2);
    } else {
      content = String(f.content);
    }
    
    const relative = f.path || f.name;
    const target = path.join(baseDir, relative);
    const dir = path.dirname(target);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(target, content, 'utf-8');
  }

  const sanitized = sanitizeDockerfileContent(dockerfileContent);
  fs.writeFileSync(path.join(baseDir, 'Dockerfile'), sanitized, 'utf-8');

  return baseDir;
}


