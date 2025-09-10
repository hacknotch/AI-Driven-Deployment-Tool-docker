import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import * as fs from 'fs';
import * as path from 'path';

export interface DockerBuildError {
  type: 'missing_file' | 'permission' | 'syntax' | 'dependency' | 'unknown';
  missingFile?: string;
  errorMessage: string;
  lineNumber?: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestedAction: 'generate_file' | 'remove_instruction' | 'fix_permission' | 'manual_fix';
}

export interface FileGenerationRequest {
  fileName: string;
  fileType: 'config' | 'rule' | 'source' | 'documentation' | 'dependency';
  projectContext: string;
  existingFiles: string[];
  reason: string;
}

export interface GeneratedFile {
  fileName: string;
  content: string;
  reason: string;
  action: 'created' | 'placeholder' | 'template';
}

export class DockerErrorAnalyzer {
  private llm: ChatOpenAI;

  constructor(apiKey: string) {
    this.llm = new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName: 'gpt-4o-mini',
      temperature: 0.1,
      maxTokens: 2000,
    });
  }

  /**
   * Parse Docker build error and extract missing file information
   */
  async analyzeDockerError(errorOutput: string, projectContext: string): Promise<DockerBuildError> {
    console.log('🔍 Analyzing Docker build error...');

    const analysisPrompt = PromptTemplate.fromTemplate(`
You are an expert DevOps engineer analyzing Docker build errors.

Error Output:
{errorOutput}

Project Context:
{projectContext}

Analyze this Docker build error and determine:
1. What type of error this is (missing_file, permission, syntax, dependency, unknown)
2. If it's a missing file error, what file is missing
3. The severity level (low, medium, high, critical)
4. What action should be taken (generate_file, remove_instruction, fix_permission, manual_fix)

Common missing file patterns:
- "lstat ... no such file or directory"
- "COPY failed: file not found"
- "ADD failed: file not found"
- "failed to compute cache key"

Respond with a JSON object containing:
{{
  "type": "missing_file|permission|syntax|dependency|unknown",
  "missingFile": "path/to/missing/file" (if applicable),
  "errorMessage": "cleaned error message",
  "lineNumber": 123 (if applicable),
  "severity": "low|medium|high|critical",
  "suggestedAction": "generate_file|remove_instruction|fix_permission|manual_fix"
}}
`);

    const chain = RunnableSequence.from([
      analysisPrompt,
      this.llm,
      new StringOutputParser(),
    ]);

    try {
      const result = await chain.invoke({
        errorOutput,
        projectContext,
      });

      // Clean the result to extract JSON
      let cleanResult = result.trim();
      
      // Remove markdown code blocks if present
      if (cleanResult.includes('```json')) {
        cleanResult = cleanResult.replace(/```json\s*/, '').replace(/```\s*$/, '');
      }
      if (cleanResult.includes('```')) {
        cleanResult = cleanResult.replace(/```\s*/, '').replace(/```\s*$/, '');
      }

      const parsed = JSON.parse(cleanResult);
      console.log('📊 Error analysis result:', parsed);
      return parsed as DockerBuildError;
    } catch (error) {
      console.error('❌ Error parsing failed:', error);
      console.log('Raw result:', result);
      
      // Fallback: try to extract basic info from the error
      if (errorOutput.includes('invalid file request') || errorOutput.includes('no such file or directory')) {
        const missingFileMatch = errorOutput.match(/invalid file request\s+(.+)/) || 
                                errorOutput.match(/lstat\s+(.+?)\s+no such file/);
        
        return {
          type: 'missing_file',
          missingFile: missingFileMatch ? missingFileMatch[1].trim() : undefined,
          errorMessage: errorOutput,
          severity: 'high',
          suggestedAction: 'generate_file',
        };
      }
      
      return {
        type: 'unknown',
        errorMessage: errorOutput,
        severity: 'high',
        suggestedAction: 'manual_fix',
      };
    }
  }

  /**
   * Determine if a file should be generated or the instruction removed
   */
  shouldGenerateFile(fileName: string, projectContext: string): boolean {
    const fileExtension = path.extname(fileName).toLowerCase();
    const fileName_lower = fileName.toLowerCase();

    // Files that should be generated
    const generatePatterns = [
      '.mdc', '.md', '.json', '.yml', '.yaml', '.toml', '.ini', '.cfg', '.conf',
      '.env', '.env.example', '.gitignore', '.dockerignore', '.editorconfig'
    ];

    // Files that should be skipped (remove instruction)
    const skipPatterns = [
      'node_modules', '.git', 'dist', 'build', '.cache', '.tmp', 'logs',
      '.vscode', '.idea', '*.log', '*.pid', '.DS_Store', 'Thumbs.db'
    ];

    // Check if file should be skipped
    for (const pattern of skipPatterns) {
      if (fileName_lower.includes(pattern) || fileName_lower.endsWith(pattern.replace('*', ''))) {
        return false;
      }
    }

    // Check if file should be generated
    for (const pattern of generatePatterns) {
      if (fileName_lower.endsWith(pattern)) {
        return true;
      }
    }

    // For source files, generate placeholder
    const sourceExtensions = ['.py', '.js', '.ts', '.jsx', '.tsx', '.sh', '.bash', '.ps1', '.cmd'];
    if (sourceExtensions.includes(fileExtension)) {
      return true;
    }

    // Default: don't generate
    return false;
  }

  /**
   * Generate missing file content using LangChain
   */
  async generateMissingFile(
    request: FileGenerationRequest,
    projectContext: string
  ): Promise<GeneratedFile> {
    console.log(`🔧 Generating missing file: ${request.fileName}`);

    const generationPrompt = PromptTemplate.fromTemplate(`
You are an expert developer generating a missing file for a Docker build.

File Details:
- Name: {fileName}
- Type: {fileType}
- Reason: {reason}

Project Context:
{projectContext}

Existing Files in Project:
{existingFiles}

Generate appropriate content for this file. Follow these guidelines:

1. For config files (.json, .yml, .yaml, .toml, .ini, .cfg, .conf):
   - Create a minimal but valid configuration
   - Include common settings for the project type
   - Add comments explaining the purpose

2. For documentation files (.md, .mdc):
   - Create a basic template with proper structure
   - Include placeholder sections
   - Add metadata if needed

3. For source files (.py, .js, .ts, .sh, etc.):
   - Create a safe placeholder with clear comments
   - Include basic structure if it's an entry point
   - Add "Auto-generated placeholder" header

4. For environment files (.env, .env.example):
   - Create template with common variables
   - Add comments for required vs optional

5. For ignore files (.gitignore, .dockerignore):
   - Create comprehensive ignore patterns
   - Include common patterns for the project type

Return ONLY the file content, no explanations or markdown formatting.
`);

    const chain = RunnableSequence.from([
      generationPrompt,
      this.llm,
      new StringOutputParser(),
    ]);

    try {
      const content = await chain.invoke({
        fileName: request.fileName,
        fileType: request.fileType,
        reason: request.reason,
        projectContext,
        existingFiles: request.existingFiles.join('\n'),
      });

      const action = this.determineFileAction(request.fileName, content);
      
      return {
        fileName: request.fileName,
        content: content.trim(),
        reason: request.reason,
        action,
      };
    } catch (error) {
      console.error('❌ File generation failed:', error);
      return {
        fileName: request.fileName,
        content: this.generateFallbackContent(request.fileName),
        reason: `Fallback generation due to error: ${error}`,
        action: 'placeholder',
      };
    }
  }

  /**
   * Determine the action taken for the generated file
   */
  private determineFileAction(fileName: string, content: string): 'created' | 'placeholder' | 'template' {
    const fileName_lower = fileName.toLowerCase();
    
    if (fileName_lower.includes('placeholder') || content.includes('Auto-generated placeholder')) {
      return 'placeholder';
    }
    
    if (fileName_lower.endsWith('.md') || fileName_lower.endsWith('.mdc') || 
        fileName_lower.endsWith('.json') || fileName_lower.endsWith('.yml')) {
      return 'template';
    }
    
    return 'created';
  }

  /**
   * Generate fallback content when AI generation fails
   */
  private generateFallbackContent(fileName: string): string {
    const extension = path.extname(fileName).toLowerCase();
    
    switch (extension) {
      case '.json':
        return JSON.stringify({}, null, 2);
      case '.yml':
      case '.yaml':
        return '# Auto-generated placeholder file\n# This file was created to resolve Docker build issues\n';
      case '.md':
      case '.mdc':
        return '# Auto-generated placeholder\n\nThis file was created to resolve Docker build issues.\n';
      case '.py':
        return '# Auto-generated placeholder for ' + fileName + '\n# This file was created to resolve Docker build issues\n\nprint("Placeholder file")\n';
      case '.js':
      case '.ts':
        return '// Auto-generated placeholder for ' + fileName + '\n// This file was created to resolve Docker build issues\n\nconsole.log("Placeholder file");\n';
      case '.sh':
        return '#!/bin/bash\n# Auto-generated placeholder for ' + fileName + '\n# This file was created to resolve Docker build issues\n\necho "Placeholder file"\n';
      case '.env':
        return '# Auto-generated placeholder environment file\n# This file was created to resolve Docker build issues\n\n# Add your environment variables here\n';
      default:
        return `# Auto-generated placeholder for ${fileName}\n# This file was created to resolve Docker build issues\n`;
    }
  }

  /**
   * Extract file type from filename
   */
  private getFileType(fileName: string): 'config' | 'rule' | 'source' | 'documentation' | 'dependency' {
    const extension = path.extname(fileName).toLowerCase();
    const fileName_lower = fileName.toLowerCase();

    if (['.json', '.yml', '.yaml', '.toml', '.ini', '.cfg', '.conf', '.env'].includes(extension)) {
      return 'config';
    }
    
    if (fileName_lower.includes('rule') || extension === '.mdc') {
      return 'rule';
    }
    
    if (['.md', '.mdc', '.txt', '.rst'].includes(extension)) {
      return 'documentation';
    }
    
    if (['.py', '.js', '.ts', '.jsx', '.tsx', '.sh', '.bash', '.ps1', '.cmd'].includes(extension)) {
      return 'source';
    }
    
    return 'dependency';
  }
}


