import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import { GitHubFile, ProjectAnalysis } from './aiService';
import * as fs from 'fs';
import * as path from 'path';

export interface DockerBuildFixResult {
  success: boolean;
  fixedFiles: string[];
  generatedFiles: GeneratedFile[];
  dockerfileContent: string;
  errorMessage?: string;
}

export interface GeneratedFile {
  fileName: string;
  content: string;
  reason: string;
  fileType: 'config' | 'entry' | 'dependency' | 'docker' | 'ignore';
}

export class DockerBuildFixer {
  private llm: ChatOpenAI;
  private fileGenerator: IntelligentFileGenerator;

  constructor(apiKey: string) {
    this.llm = new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName: 'gpt-4o-mini',
      temperature: 0.1,
      maxTokens: 4000,
    });
    this.fileGenerator = new IntelligentFileGenerator(apiKey);
  }

  /**
   * Main method to fix Docker build issues using LangChain
   */
  async fixDockerBuild(
    files: GitHubFile[],
    analysis: ProjectAnalysis,
    userPrompt?: string
  ): Promise<DockerBuildFixResult> {
    try {
      console.log('🔧 Starting Docker build fix with LangChain...');

      // Step 1: Analyze the current project structure
      const projectAnalysis = await this.analyzeProjectStructure(files, analysis);
      
      // Step 2: Identify problematic files
      const problematicFiles = this.identifyProblematicFiles(files);
      
      // Step 3: Generate proper .dockerignore
      const dockerignoreContent = await this.generateDockerignore(files, problematicFiles);
      
      // Step 4: Generate proper Dockerfile
      const dockerfileContent = await this.generateDockerfile(files, analysis);
      
      // Step 5: Generate any missing essential files
      const missingFiles = await this.identifyMissingFiles(files, analysis);
      const generatedFiles = await this.generateMissingFiles(files, analysis, missingFiles);

      return {
        success: true,
        fixedFiles: ['.dockerignore', 'Dockerfile'],
        generatedFiles,
        dockerfileContent,
      };
    } catch (error) {
      console.error('❌ Docker build fix failed:', error);
      return {
        success: false,
        fixedFiles: [],
        generatedFiles: [],
        dockerfileContent: '',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Analyze project structure using LangChain
   */
  private async analyzeProjectStructure(files: GitHubFile[], analysis: ProjectAnalysis): Promise<ProjectAnalysis> {
    const analysisPrompt = PromptTemplate.fromTemplate(`
You are an expert DevOps engineer analyzing a project for Docker deployment issues.

Project Analysis:
- Language: {language}
- Framework: {framework}
- Dependencies: {dependencies}
- Has Dockerfile: {hasDockerfile}

Files in project:
{files}

Current Issues:
- Docker build failing with ".builder/rules/deploy-app.mdc" error
- This file is being included in Docker build context but shouldn't be

Please analyze the project structure and identify:
1. What type of application this is
2. What files are essential for the build
3. What files should be excluded from Docker build
4. What files are missing for proper deployment

Respond with a JSON object containing your analysis.
`);

    const chain = RunnableSequence.from([
      analysisPrompt,
      this.llm,
      new StringOutputParser(),
    ]);

    const filesList = files.map(f => `${f.path} (${f.type})`).join('\n');
    
    const result = await chain.invoke({
      language: analysis.language,
      framework: analysis.framework || 'unknown',
      dependencies: analysis.dependencies.join(', '),
      hasDockerfile: analysis.hasDockerfile,
      files: filesList,
    });

    console.log('📊 Project analysis result:', result);
    return analysis;
  }

  /**
   * Identify files that cause Docker build issues
   */
  private identifyProblematicFiles(files: GitHubFile[]): string[] {
    const problematicPatterns = [
      '.builder/',
      '*.mdc',
      '*.md',
      '.git/',
      'node_modules/',
      '.env',
      'logs/',
      '*.log',
      '.vscode/',
      '.idea/',
      '*.swp',
      '*.swo',
      '.DS_Store',
      'Thumbs.db',
    ];

    const problematicFiles: string[] = [];
    
    for (const file of files) {
      for (const pattern of problematicPatterns) {
        if (file.path.includes(pattern.replace('*', '')) || 
            file.path.endsWith(pattern.replace('*', ''))) {
          problematicFiles.push(file.path);
          break;
        }
      }
    }

    console.log('🚫 Problematic files identified:', problematicFiles);
    return problematicFiles;
  }

  /**
   * Generate proper .dockerignore using LangChain
   */
  private async generateDockerignore(files: GitHubFile[], problematicFiles: string[]): Promise<string> {
    const dockerignorePrompt = PromptTemplate.fromTemplate(`
You are an expert DevOps engineer creating a .dockerignore file.

Project files:
{files}

Problematic files that should be excluded:
{problematicFiles}

Create a comprehensive .dockerignore file that:
1. Excludes all problematic files
2. Excludes development files
3. Excludes build artifacts
4. Excludes documentation files
5. Excludes IDE files
6. Excludes OS-specific files
7. Excludes logs and temporary files

Return ONLY the .dockerignore content, no explanations.
`);

    const chain = RunnableSequence.from([
      dockerignorePrompt,
      this.llm,
      new StringOutputParser(),
    ]);

    const filesList = files.map(f => f.path).join('\n');
    const problematicList = problematicFiles.join('\n');

    const dockerignoreContent = await chain.invoke({
      files: filesList,
      problematicFiles: problematicList,
    });

    console.log('📝 Generated .dockerignore content');
    return dockerignoreContent;
  }

  /**
   * Generate proper Dockerfile using LangChain
   */
  private async generateDockerfile(files: GitHubFile[], analysis: ProjectAnalysis): Promise<string> {
    const dockerfilePrompt = PromptTemplate.fromTemplate(`
You are an expert DevOps engineer creating a Dockerfile.

Project Analysis:
- Language: {language}
- Framework: {framework}
- Dependencies: {dependencies}
- Entry Point: {entryPoint}

Key files in project:
{keyFiles}

Create an optimized, production-ready Dockerfile that:
1. Uses appropriate base image for the language/framework
2. Sets up proper working directory
3. Installs dependencies efficiently
4. Copies only necessary files
5. Exposes correct port
6. Sets proper entry point
7. Uses multi-stage build if beneficial
8. Follows Docker best practices

Return ONLY the Dockerfile content, no explanations.
`);

    const chain = RunnableSequence.from([
      dockerfilePrompt,
      this.llm,
      new StringOutputParser(),
    ]);

    const keyFiles = files
      .filter(f => f.type === 'file' && this.isKeyFile(f.name))
      .map(f => f.name)
      .join('\n');

    const dockerfileContent = await chain.invoke({
      language: analysis.language,
      framework: analysis.framework || 'unknown',
      dependencies: analysis.dependencies.join(', '),
      entryPoint: analysis.entryPoint || 'unknown',
      keyFiles: keyFiles,
    });

    console.log('🐳 Generated Dockerfile content');
    return dockerfileContent;
  }

  /**
   * Identify missing essential files
   */
  private async identifyMissingFiles(files: GitHubFile[], analysis: ProjectAnalysis): Promise<string[]> {
    const missingFiles: string[] = [];

    // Check for essential files based on project type
    if (analysis.language === 'javascript' || analysis.language === 'typescript') {
      if (!files.some(f => f.name === 'package.json')) {
        missingFiles.push('package.json');
      }
      if (!files.some(f => f.name === 'package-lock.json') && !files.some(f => f.name === 'yarn.lock')) {
        missingFiles.push('package-lock.json');
      }
    }

    if (analysis.language === 'python') {
      if (!files.some(f => f.name === 'requirements.txt') && !files.some(f => f.name === 'pyproject.toml')) {
        missingFiles.push('requirements.txt');
      }
    }

    // Always check for .dockerignore
    if (!files.some(f => f.name === '.dockerignore')) {
      missingFiles.push('.dockerignore');
    }

    console.log('📋 Missing files identified:', missingFiles);
    return missingFiles;
  }

  /**
   * Generate missing files using the existing file generator
   */
  private async generateMissingFiles(
    files: GitHubFile[],
    analysis: ProjectAnalysis,
    missingFiles: string[]
  ): Promise<GeneratedFile[]> {
    if (missingFiles.length === 0) {
      return [];
    }

    return await this.fileGenerator.generateMissingFiles(
      analysis,
      files,
      missingFiles,
      'Generate missing files for Docker deployment'
    );
  }

  /**
   * Check if a file is a key file for the project
   */
  private isKeyFile(fileName: string): boolean {
    const keyFilePatterns = [
      'package.json',
      'requirements.txt',
      'pyproject.toml',
      'Cargo.toml',
      'go.mod',
      'pom.xml',
      'build.gradle',
      'index.js',
      'index.ts',
      'main.py',
      'main.go',
      'app.py',
      'server.py',
      'Dockerfile',
      '.dockerignore',
    ];

    return keyFilePatterns.some(pattern => fileName.includes(pattern));
  }
}

// Import the IntelligentFileGenerator class
import { IntelligentFileGenerator } from './intelligentFileGenerator_fixed';


