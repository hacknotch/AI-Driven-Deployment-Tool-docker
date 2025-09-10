import * as fs from 'fs';
import * as path from 'path';

export interface ProjectFile {
  name: string;
  path: string;
  exists: boolean;
  type: 'source' | 'config' | 'dependency' | 'build' | 'other';
  language?: string;
  framework?: string;
  isRequired: boolean;
  alternatives?: string[];
}

export interface ProjectAnalysis {
  language: string;
  framework?: string;
  hasRequiredFiles: boolean;
  missingFiles: ProjectFile[];
  existingFiles: ProjectFile[];
  recommendations: string[];
  dockerfileStrategy: 'simple' | 'multi-stage' | 'optimized';
}

export class AdvancedFileDetector {
  /**
   * 🔍 ADVANCED PROJECT FILE DETECTION
   * Analyzes project structure and detects missing files before Dockerfile generation
   */
  async analyzeProject(projectPath: string): Promise<ProjectAnalysis> {
    const analysis: ProjectAnalysis = {
      language: 'unknown',
      framework: undefined,
      hasRequiredFiles: false,
      missingFiles: [],
      existingFiles: [],
      recommendations: [],
      dockerfileStrategy: 'simple'
    };

    // Define file patterns for different languages
    const filePatterns = this.getFilePatterns();
    
    // Check for each file pattern
    for (const pattern of filePatterns) {
      const filePath = path.join(projectPath, pattern.name);
      const exists = fs.existsSync(filePath);
      
      const projectFile: ProjectFile = {
        name: pattern.name,
        path: filePath,
        exists,
        type: pattern.type,
        language: pattern.language,
        framework: pattern.framework,
        isRequired: pattern.isRequired,
        alternatives: pattern.alternatives
      };

      if (exists) {
        analysis.existingFiles.push(projectFile);
      } else if (pattern.isRequired) {
        analysis.missingFiles.push(projectFile);
      }
    }

    // Determine language and framework
    analysis.language = this.detectLanguage(analysis.existingFiles);
    analysis.framework = this.detectFramework(analysis.existingFiles);
    
    // Check if has required files for detected language
    analysis.hasRequiredFiles = this.checkRequiredFiles(analysis.language, analysis.existingFiles);
    
    // Generate recommendations
    analysis.recommendations = this.generateRecommendations(analysis);
    
    // Determine Dockerfile strategy
    analysis.dockerfileStrategy = this.determineDockerfileStrategy(analysis);

    return analysis;
  }

  /**
   * 🧠 ENHANCED LANGCHAIN PROMPT GENERATION
   * Creates intelligent prompts based on project analysis
   */
  generateIntelligentPrompt(analysis: ProjectAnalysis, originalDockerfile?: string): string {
    const missingFilesList = analysis.missingFiles.map(f => f.name).join(', ');
    const existingFilesList = analysis.existingFiles.map(f => f.name).join(', ');
    
    let prompt = `You are an expert Docker engineer. Generate a production-ready Dockerfile based on this project analysis:

PROJECT ANALYSIS:
- Language: ${analysis.language}
- Framework: ${analysis.framework || 'None detected'}
- Existing files: ${existingFilesList || 'None'}
- Missing files: ${missingFilesList || 'None'}
- Strategy: ${analysis.dockerfileStrategy}

CRITICAL REQUIREMENTS:
1. ONLY use files that actually exist in the project
2. NEVER reference missing files (${missingFilesList})
3. Generate missing dependency files if needed
4. Use appropriate base images for ${analysis.language}
5. Follow security best practices
6. Optimize for production deployment

`;

    if (originalDockerfile) {
      prompt += `ORIGINAL DOCKERFILE (HAS ERRORS):
\`\`\`dockerfile
${originalDockerfile}
\`\`\`

ERRORS TO FIX:
- The original Dockerfile references files that don't exist
- Fix all file dependency issues
- Ensure all COPY commands reference existing files
`;
    }

    prompt += `
RECOMMENDATIONS:
${analysis.recommendations.map(r => `- ${r}`).join('\n')}

Generate a corrected Dockerfile that:
1. Only uses existing files
2. Generates missing dependency files when needed
3. Uses the correct base image for ${analysis.language}
4. Follows Docker best practices
5. Is production-ready

Return ONLY the corrected Dockerfile, no explanations.`;

    return prompt;
  }

  /**
   * 🔧 AUTO-GENERATE MISSING FILES
   * Creates missing dependency files based on project analysis
   */
  async generateMissingFiles(analysis: ProjectAnalysis, projectPath: string): Promise<string[]> {
    const generatedFiles: string[] = [];

    for (const missingFile of analysis.missingFiles) {
      if (missingFile.type === 'dependency') {
        const content = this.generateDependencyFile(missingFile, analysis);
        if (content) {
          const filePath = path.join(projectPath, missingFile.name);
          fs.writeFileSync(filePath, content);
          generatedFiles.push(missingFile.name);
          console.log(`✅ Generated missing file: ${missingFile.name}`);
        }
      }
    }

    return generatedFiles;
  }

  private getFilePatterns(): Array<{
    name: string;
    type: ProjectFile['type'];
    language?: string;
    framework?: string;
    isRequired: boolean;
    alternatives?: string[];
  }> {
    return [
      // Go files
      { name: 'go.mod', type: 'dependency', language: 'go', isRequired: true },
      { name: 'go.sum', type: 'dependency', language: 'go', isRequired: false },
      { name: 'main.go', type: 'source', language: 'go', isRequired: true, alternatives: ['*.go'] },
      
      // Python files
      { name: 'requirements.txt', type: 'dependency', language: 'python', isRequired: true },
      { name: 'pyproject.toml', type: 'dependency', language: 'python', isRequired: false },
      { name: 'setup.py', type: 'dependency', language: 'python', isRequired: false },
      { name: 'main.py', type: 'source', language: 'python', isRequired: true, alternatives: ['app.py', '*.py'] },
      
      // Node.js files
      { name: 'package.json', type: 'dependency', language: 'nodejs', isRequired: true },
      { name: 'package-lock.json', type: 'dependency', language: 'nodejs', isRequired: false },
      { name: 'yarn.lock', type: 'dependency', language: 'nodejs', isRequired: false },
      { name: 'index.js', type: 'source', language: 'nodejs', isRequired: true, alternatives: ['app.js', 'server.js', '*.js'] },
      
      // Java files
      { name: 'pom.xml', type: 'dependency', language: 'java', isRequired: true },
      { name: 'build.gradle', type: 'dependency', language: 'java', isRequired: false },
      { name: 'src/main/java', type: 'source', language: 'java', isRequired: true },
      
      // Docker files
      { name: 'Dockerfile', type: 'build', isRequired: false },
      { name: '.dockerignore', type: 'build', isRequired: false },
      
      // Config files
      { name: '.env', type: 'config', isRequired: false },
      { name: 'config.json', type: 'config', isRequired: false },
      { name: 'appsettings.json', type: 'config', language: 'csharp', isRequired: false }
    ];
  }

  private detectLanguage(files: ProjectFile[]): string {
    const languageCounts: { [key: string]: number } = {};
    
    files.forEach(file => {
      if (file.language) {
        languageCounts[file.language] = (languageCounts[file.language] || 0) + 1;
      }
    });

    // Return the most common language
    return Object.keys(languageCounts).reduce((a, b) => 
      languageCounts[a] > languageCounts[b] ? a : b, 'unknown'
    );
  }

  private detectFramework(files: ProjectFile[]): string | undefined {
    // Look for framework-specific files
    const frameworkFiles = files.filter(f => f.framework);
    if (frameworkFiles.length > 0) {
      return frameworkFiles[0].framework;
    }
    return undefined;
  }

  private checkRequiredFiles(language: string, files: ProjectFile[]): boolean {
    const requiredFiles = files.filter(f => f.isRequired && f.language === language);
    return requiredFiles.length > 0;
  }

  private generateRecommendations(analysis: ProjectAnalysis): string[] {
    const recommendations: string[] = [];

    if (analysis.missingFiles.length > 0) {
      recommendations.push(`Generate missing ${analysis.language} dependency files`);
    }

    if (analysis.language === 'go' && analysis.missingFiles.some(f => f.name === 'go.mod')) {
      recommendations.push('Create go.mod file with: go mod init project-name');
    }

    if (analysis.language === 'python' && analysis.missingFiles.some(f => f.name === 'requirements.txt')) {
      recommendations.push('Create requirements.txt with project dependencies');
    }

    if (analysis.language === 'nodejs' && analysis.missingFiles.some(f => f.name === 'package.json')) {
      recommendations.push('Create package.json with project dependencies');
    }

    return recommendations;
  }

  private determineDockerfileStrategy(analysis: ProjectAnalysis): 'simple' | 'multi-stage' | 'optimized' {
    if (analysis.language === 'go') return 'multi-stage';
    if (analysis.language === 'nodejs') return 'optimized';
    if (analysis.language === 'python') return 'simple';
    return 'simple';
  }

  private generateDependencyFile(missingFile: ProjectFile, analysis: ProjectAnalysis): string | null {
    switch (missingFile.name) {
      case 'go.mod':
        return `module your-project-name

go 1.21

require (
    // Add your dependencies here
)`;

      case 'requirements.txt':
        return `# Python dependencies
flask==2.3.3
requests==2.31.0
# Add more dependencies as needed`;

      case 'package.json':
        return `{
  "name": "your-project-name",
  "version": "1.0.0",
  "description": "Your project description",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "express": "^4.18.0"
  }
}`;

      default:
        return null;
    }
  }
}

export const advancedFileDetector = new AdvancedFileDetector();
