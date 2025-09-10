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

    const buildProc = spawn('docker', ['build', '-t', imageName, repoPath], { stdio: ['ignore', 'pipe', 'pipe'] });
    buildProc.stdout.on('data', d => onLog(d.toString()));
    buildProc.stderr.on('data', d => onLog(d.toString()));
    buildProc.on('close', code => {
      if (code !== 0) {
        onLog(`\n❌ Docker build failed with code ${code}\n`);
        return reject(new Error(`Docker build failed with code ${code}`));
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
  const dockerUser = process.env.DOCKER_USER || 'anonymous';
  let repoName = 'project';
  const githubMatch = repoUrlOrFolder.match(/github\.com\/([^\/]+)\/([^\/#?]+)/i);
  if (githubMatch) {
    repoName = githubMatch[2].replace(/\.git$/, '');
  } else {
    const parts = repoUrlOrFolder.split(/[\\\/]/).filter(Boolean);
    repoName = parts[parts.length - 1] || 'project';
  }
  return `${dockerUser}/${repoName}:latest`;
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


