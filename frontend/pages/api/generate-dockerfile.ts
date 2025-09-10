import { NextApiRequest, NextApiResponse } from 'next';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const execAsync = promisify(exec);

interface GitHubSource {
  type: 'github';
  repoUrl: string;
  apiKey?: string;
}

interface UploadSource {
  type: 'upload';
  files: any[];
}

type SourceData = GitHubSource | UploadSource;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const sourceData: SourceData = req.body;
    const tempDir = path.join(process.cwd(), 'temp', uuidv4());
    
    // Create temp directory
    await fs.mkdir(tempDir, { recursive: true });

    let projectPath = tempDir;
    
    if (sourceData.type === 'github') {
      // Clone GitHub repository
      projectPath = await cloneRepository(sourceData, tempDir);
    } else {
      // Handle uploaded files (for now, just create a placeholder)
      projectPath = await handleUploadedFiles(sourceData, tempDir);
    }

    // Generate Dockerfile using ML model
    const dockerfile = await generateDockerfileWithML(projectPath);

    // Clean up temp directory
    await fs.rmdir(tempDir, { recursive: true }).catch(console.error);

    res.status(200).json({
      success: true,
      dockerfile: dockerfile
    });

  } catch (error) {
    console.error('Dockerfile generation error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}

async function cloneRepository(source: GitHubSource, tempDir: string): Promise<string> {
  try {
    const repoPath = path.join(tempDir, 'repo');
    
    // Build git clone command
    let cloneUrl = source.repoUrl;
    if (source.apiKey) {
      // Add API key to URL for private repos
      const url = new URL(source.repoUrl);
      cloneUrl = `https://${source.apiKey}@${url.hostname}${url.pathname}`;
    }

    const command = `git clone ${cloneUrl} "${repoPath}"`;
    await execAsync(command);
    
    return repoPath;
  } catch (error) {
    throw new Error(`Failed to clone repository: ${error}`);
  }
}

async function handleUploadedFiles(source: UploadSource, tempDir: string): Promise<string> {
  // For now, create a placeholder directory
  // In a real implementation, you'd save the uploaded files here
  const uploadPath = path.join(tempDir, 'upload');
  await fs.mkdir(uploadPath, { recursive: true });
  
  // Create a sample file to analyze
  await fs.writeFile(
    path.join(uploadPath, 'package.json'), 
    JSON.stringify({ name: "sample-app", dependencies: {} }, null, 2)
  );
  
  return uploadPath;
}

async function generateDockerfileWithML(projectPath: string): Promise<string> {
  try {
    // Analyze project structure
    const projectInfo = await analyzeProject(projectPath);
    
    // Call ML model (using a simple Python script for now)
    const mlScript = `
import os
import json
import sys

def analyze_project(project_path):
    """Analyze project and generate Dockerfile"""
    
    # Check for different project types
    has_package_json = os.path.exists(os.path.join(project_path, 'package.json'))
    has_requirements_txt = os.path.exists(os.path.join(project_path, 'requirements.txt'))
    has_pom_xml = os.path.exists(os.path.join(project_path, 'pom.xml'))
    has_go_mod = os.path.exists(os.path.join(project_path, 'go.mod'))
    
    if has_package_json:
        return generate_node_dockerfile()
    elif has_requirements_txt:
        return generate_python_dockerfile()
    elif has_pom_xml:
        return generate_java_dockerfile()
    elif has_go_mod:
        return generate_go_dockerfile()
    else:
        return generate_generic_dockerfile()

def generate_node_dockerfile():
    return """# Node.js Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
"""

def generate_python_dockerfile():
    return """# Python Dockerfile
FROM python:3.9-slim

WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Expose port
EXPOSE 8000

# Start the application
CMD ["python", "app.py"]
"""

def generate_java_dockerfile():
    return """# Java Dockerfile
FROM openjdk:11-jre-slim

WORKDIR /app

# Copy JAR file
COPY target/*.jar app.jar

# Expose port
EXPOSE 8080

# Start the application
CMD ["java", "-jar", "app.jar"]
"""

def generate_go_dockerfile():
    return """# Go Dockerfile
FROM golang:1.19-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -o main .

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/

COPY --from=builder /app/main .

EXPOSE 8080
CMD ["./main"]
"""

def generate_generic_dockerfile():
    return """# Generic Dockerfile
FROM ubuntu:20.04

WORKDIR /app

# Update packages
RUN apt-get update && apt-get install -y \\
    curl \\
    && rm -rf /var/lib/apt/lists/*

# Copy application
COPY . .

# Expose port
EXPOSE 8080

# Start command (customize as needed)
CMD ["echo", "Please customize this Dockerfile for your application"]
"""

if __name__ == "__main__":
    project_path = sys.argv[1]
    dockerfile = analyze_project(project_path)
    print(dockerfile)
`;

    // Write ML script to temp file
    const scriptPath = path.join(process.cwd(), 'temp', 'generate_dockerfile.py');
    await fs.mkdir(path.dirname(scriptPath), { recursive: true });
    await fs.writeFile(scriptPath, mlScript);

    // Execute ML script
    const { stdout } = await execAsync(`python "${scriptPath}" "${projectPath}"`);
    
    // Clean up script
    await fs.unlink(scriptPath).catch(console.error);
    
    return stdout.trim();
    
  } catch (error) {
    console.error('ML generation error:', error);
    // Fallback to basic Dockerfile
    return `# Auto-generated Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
`;
  }
}

async function analyzeProject(projectPath: string) {
  const files = await fs.readdir(projectPath);
  return {
    files,
    hasPackageJson: files.includes('package.json'),
    hasRequirementsTxt: files.includes('requirements.txt'),
    hasPomXml: files.includes('pom.xml'),
    hasGoMod: files.includes('go.mod'),
  };
}
