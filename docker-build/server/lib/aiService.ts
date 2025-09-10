import OpenAI from 'openai';
import axios from 'axios';
import { IntelligentFileGenerator, FileAnalysisResult, GeneratedFile } from './intelligentFileGenerator_fixed';
import { build_docker_image, push_docker_image, deriveImageName, prepareBuildContext } from './docker';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// GitHub API interfaces
export interface GitHubFile {
  name: string;
  path: string;
  type: 'file' | 'dir';
  content?: string;
  download_url?: string;
}

export interface ProjectAnalysis {
  language: string;
  framework?: string;
  dependencies: string[];
  packageFiles: string[];
  hasDockerfile: boolean;
  existingDockerfile?: string;
  missingFiles?: string[];
  generatedFiles?: GeneratedFile[];
  projectHealth?: 'excellent' | 'good' | 'needs_improvement' | 'critical';
  entryPoint?: string; // Added for Python entry points
}

// Fetch GitHub repository contents
export async function fetchGitHubRepo(repoUrl: string, githubToken?: string): Promise<GitHubFile[]> {
  try {
    console.log('🔍 Fetching GitHub repo:', repoUrl);

    // Extract owner and repo from GitHub URL
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      throw new Error('Invalid GitHub URL format');
    }

    const [, owner, repo] = match;
    const cleanRepo = repo.replace(/\.git$/, '');

    console.log('📁 Repository details:', { owner, repo: cleanRepo });

    // Set up headers
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'AutoDeploy-AI'
    };

    if (githubToken) {
      headers['Authorization'] = `token ${githubToken}`;
    }

    // Fetch repository contents recursively
    const files: GitHubFile[] = [];
    await fetchRepoContentsRecursive(owner, cleanRepo, '', files, headers);

    console.log('📄 Files found:', files.length);

    return files;
  } catch (error) {
    console.error('❌ Error fetching GitHub repo:', error);
    throw new Error(`Failed to fetch repository: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Recursively fetch repository contents with enhanced depth and file content analysis
async function fetchRepoContentsRecursive(
  owner: string,
  repo: string,
  path: string,
  files: GitHubFile[],
  headers: Record<string, string>,
  maxDepth: number = 6, // Increased depth for thorough analysis
  currentDepth: number = 0
): Promise<void> {
  if (currentDepth >= maxDepth) return;

  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  
  try {
    console.log(`📂 Fetching depth ${currentDepth}: ${url}`);

    const response = await axios.get(url, { headers });

    const contents = Array.isArray(response.data) ? response.data : [response.data];
    console.log(`📋 Found ${contents.length} items in ${path || 'root'} at depth ${currentDepth}`);

    for (const item of contents) {
      if (item.type === 'file') {
        const fileInfo: GitHubFile = {
          name: item.name,
          path: item.path,
          type: 'file',
          download_url: item.download_url
        };

        // Immediately fetch content for important files for deeper analysis
        if (isImportantFile(item.name, item.path)) {
          try {
            console.log(`🔍 Fetching important file content: ${item.name}`);
            const fileResponse = await axios.get(item.download_url, { headers });
            fileInfo.content = fileResponse.data;
            console.log(`✅ Downloaded ${item.name} (${fileInfo.content.length} chars)`);
          } catch (error) {
            console.log(`⚠️ Failed to fetch content for ${item.name}:`, error);
          }
        }

        files.push(fileInfo);
        console.log(`📄 Added file: ${item.name} (${fileInfo.content ? 'with content' : 'metadata only'})`);
      } else if (item.type === 'dir' && !shouldSkipDirectory(item.name)) {
        console.log(`📁 Entering directory: ${item.name} (depth ${currentDepth + 1})`);
        await fetchRepoContentsRecursive(owner, repo, item.path, files, headers, maxDepth, currentDepth + 1);
      }
    }
  } catch (error) {
    console.error(`❌ Error fetching contents for path ${path}:`, error);
    if (axios.isAxiosError(error)) {
      console.error('Response status:', error.response?.status);
      console.error('Response data:', error.response?.data);
      console.error('Request URL:', url);
      
      // Specific GitHub API error handling
      if (error.response?.status === 403) {
        console.error('🚫 GitHub API rate limit exceeded or access denied');
        console.error('💡 Solution: Add a GitHub personal access token to your .env file');
        console.error('   GITHUB_TOKEN=your_token_here');
      } else if (error.response?.status === 404) {
        console.error('🔍 Repository or path not found');
        console.error('   Check if the repository exists and is public');
      }
    }
  }
}

// Enhanced file importance detection for comprehensive code analysis
function isImportantFile(fileName: string, filePath: string): boolean {
  const importantFiles = [
    // Package and dependency files
    'package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
    'requirements.txt', 'pyproject.toml', 'Pipfile', 'poetry.lock', 'setup.py', 'setup.cfg',
    'Cargo.toml', 'Cargo.lock', 'go.mod', 'go.sum',
    'pom.xml', 'build.gradle', 'build.gradle.kts', 'gradle.properties',
    'composer.json', 'composer.lock', 'Gemfile', 'Gemfile.lock',
    'mix.exs', 'mix.lock', 'project.clj', 'deps.edn',

    // Configuration files
    'Dockerfile', 'docker-compose.yml', '.dockerignore',
    'tsconfig.json', 'jsconfig.json', 'webpack.config.js', 'webpack.config.ts',
    'vite.config.ts', 'vite.config.js', 'next.config.js', 'next.config.ts',
    'tailwind.config.js', 'tailwind.config.ts', 'postcss.config.js',
    'babel.config.js', 'babel.config.json', '.babelrc',
    'eslint.config.js', '.eslintrc.js', '.eslintrc.json',
    'prettier.config.js', '.prettierrc', '.prettierrc.json',

    // Environment and deployment files
    '.env', '.env.example', '.env.local', '.env.production',
    'netlify.toml', 'vercel.json', 'now.json',
    'railway.json', 'render.yaml', 'fly.toml',

    // Entry point files
    'app.py', 'main.py', 'server.py', 'wsgi.py', 'asgi.py', 'manage.py',
    'index.js', 'server.js', 'app.js', 'main.js',
    'index.ts', 'server.ts', 'app.ts', 'main.ts',
    'index.html', 'app.html', 'main.html',
    'main.go', 'main.rs', 'lib.rs',

    // Framework-specific files
    'angular.json', 'vue.config.js', 'nuxt.config.js', 'nuxt.config.ts',
    'gatsby-config.js', 'gatsby-node.js', 'svelte.config.js',
    'astro.config.mjs', 'remix.config.js',
    'django_settings.py', 'settings.py', 'urls.py',

    // ML/AI specific files
    'model.py', 'train.py', 'predict.py', 'inference.py',
    'data.py', 'dataset.py', 'preprocessing.py',
    'config.yaml', 'config.json', 'params.yaml',
    'dvc.yaml', 'dvc.lock',

    // Database and API files
    'database.py', 'db.py', 'models.py', 'schema.py',
    'api.py', 'routes.py', 'views.py', 'handlers.py',
    'middleware.py', 'auth.py', 'utils.py',

    // Documentation and README
    'README.md', 'README.rst', 'README.txt',
    'CHANGELOG.md', 'CONTRIBUTING.md', 'LICENSE'
  ];

  // Check exact filename matches
  if (importantFiles.includes(fileName)) return true;

  // Check file extensions for thorough analysis
  const importantExtensions = [
    '.py', '.js', '.ts', '.jsx', '.tsx', '.vue', '.svelte',
    '.html', '.css', '.scss', '.sass', '.less',
    '.json', '.yaml', '.yml', '.toml', '.ini', '.cfg',
    '.dockerfile', '.sh', '.bash', '.ps1',
    '.sql', '.db', '.sqlite',
    '.md', '.rst', '.txt'
  ];

  // Check if file has important extension
  if (importantExtensions.some(ext => fileName.toLowerCase().endsWith(ext))) {
    return true;
  }

  // Special path-based checks
  if (filePath.includes('src/') && (fileName.endsWith('.py') || fileName.endsWith('.js') || fileName.endsWith('.ts'))) {
    return true;
  }

  // ML model files
  const modelExtensions = ['.pkl', '.h5', '.pt', '.pth', '.joblib', '.model', '.weights', '.bin'];
  if (modelExtensions.some(ext => fileName.toLowerCase().endsWith(ext))) {
    return true;
  }

  // Config files without extensions
  const configFiles = ['Procfile', 'Makefile', 'CMakeLists.txt', 'Vagrantfile'];
  if (configFiles.includes(fileName)) return true;

  return false;
}

// Skip certain directories
function shouldSkipDirectory(dirName: string): boolean {
  const skipDirs = [
    'node_modules', '.git', '.github', 'dist', 'build', '__pycache__',
    '.venv', 'venv', 'env', '.env', 'target', 'vendor', '.next'
  ];
  return skipDirs.includes(dirName);
}

// Comprehensive deployment issue detection
function detectDeploymentIssues(analysis: ProjectAnalysis, files: GitHubFile[]): string[] {
  const issues: string[] = [];
  
  console.log('🔍 Checking for deployment issues...');
  
  // Check for missing entry point
  if (!analysis.entryPoint && analysis.language === 'python') {
    const pythonFiles = files.filter(f => f.name.endsWith('.py'));
    if (pythonFiles.length > 0) {
      issues.push('No clear Python entry point detected. Found .py files but no main execution pattern.');
    }
  }
  
  // Check for missing dependencies file
  if (analysis.language === 'python' && !files.some(f => f.name === 'requirements.txt' || f.name === 'pyproject.toml')) {
    issues.push('Python project missing requirements.txt or pyproject.toml - dependencies cannot be installed');
  }
  
  if (analysis.language === 'javascript' && !files.some(f => f.name === 'package.json')) {
    issues.push('JavaScript/Node.js project missing package.json - dependencies cannot be installed');
  }
  
  // Check for framework-specific issues
  if (analysis.framework === 'flask' && !analysis.dependencies.some(d => d.toLowerCase().includes('flask'))) {
    issues.push('Flask framework detected in code but Flask not found in dependencies');
  }
  
  if (analysis.framework === 'fastapi' && !analysis.dependencies.some(d => d.toLowerCase().includes('fastapi'))) {
    issues.push('FastAPI framework detected in code but FastAPI not found in dependencies');
  }
  
  // Check for ML project issues
  const hasMLCode = files.some(f => f.content && typeof f.content === 'string' && (
    f.content.includes('model.fit(') || 
    f.content.includes('load_model') || 
    f.content.includes('.predict(') ||
    f.content.includes('tensorflow') ||
    f.content.includes('torch')
  ));
  
  if (hasMLCode) {
    const hasMLDeps = analysis.dependencies.some(d => 
      ['tensorflow', 'torch', 'sklearn', 'numpy', 'pandas'].some(ml => d.toLowerCase().includes(ml))
    );
    if (!hasMLDeps) {
      issues.push('ML/AI code patterns detected but no ML libraries in dependencies');
    }
    
    // Check for model files
    const modelFiles = files.filter(f => 
      f.name.endsWith('.pkl') || f.name.endsWith('.h5') || f.name.endsWith('.pt') || f.name.endsWith('.joblib')
    );
    if (modelFiles.length === 0) {
      issues.push('ML project detected but no model files found - may need model download/training step');
    }
  }
  
  // Check for port configuration issues
  if (analysis.framework === 'flask') {
    const hasPortConfig = files.some(f => f.content && typeof f.content === 'string' && (
      f.content.includes('app.run(') || 
      f.content.includes('port=') ||
      f.content.includes('host=')
    ));
    if (!hasPortConfig) {
      issues.push('Flask app may not have proper port configuration for production deployment');
    }
  }
  
  // Check for security issues
  const hasDebugMode = files.some(f => f.content && typeof f.content === 'string' && (
    f.content.includes('debug=True') ||
    f.content.includes('DEBUG = True')
  ));
  if (hasDebugMode) {
    issues.push('Debug mode detected in code - should be disabled for production');
  }
  
  // Check for missing production server
  if (analysis.language === 'python' && analysis.framework && !analysis.dependencies.some(d => 
    d.toLowerCase().includes('gunicorn') || d.toLowerCase().includes('uvicorn')
  )) {
    issues.push('Python web app missing production server (gunicorn/uvicorn) in dependencies');
  }
  
  // Check for environment variable issues
  const hasEnvUsage = files.some(f => f.content && typeof f.content === 'string' && (
    f.content.includes('os.environ') ||
    f.content.includes('process.env') ||
    f.content.includes('getenv(')
  ));
  if (hasEnvUsage && !files.some(f => f.name === '.env.example')) {
    issues.push('Environment variables used in code but no .env.example file for reference');
  }
  
  return issues;
}

// Analyze project structure and dependencies
export async function analyzeProject(files: GitHubFile[], githubToken?: string): Promise<ProjectAnalysis> {
  const analysis: ProjectAnalysis = {
    language: 'unknown',
    dependencies: [],
    packageFiles: [],
    hasDockerfile: false
  };
  
  console.log(`\n🔍 Starting comprehensive project analysis of ${files.length} files...`);
  
  // Download and analyze important files
  for (const file of files) {
    if (file.download_url && !file.content) {
      try {
        const headers: Record<string, string> = {};
        if (githubToken) {
          headers['Authorization'] = `token ${githubToken}`;
        }
        
        const response = await axios.get(file.download_url, { headers });
        file.content = response.data;
        console.log(`📥 Downloaded additional content for: ${file.name}`);
      } catch (error) {
        console.error(`Error downloading file ${file.path}:`, error);
      }
    }
    
    // Analyze file content
    if (file.content) {
      analyzeFileContent(file, analysis, files);
    }
  }

      // Enhanced analysis: Check for missing files and generate them
    if (analysis.language !== 'unknown') {
      try {
        const fileGenerator = new IntelligentFileGenerator(process.env.OPENAI_API_KEY || '');
        
        // Analyze what files are missing with detailed reasoning
        const fileAnalysis = await fileGenerator.analyzeProjectFiles(files, analysis);
        
        // Log the thinking process
        console.log('\n🧠 AI Thinking Process:');
        fileAnalysis.thinkingProcess.forEach(thought => console.log(thought));
        
        // Generate missing files using LangChain and GPT
        if (fileAnalysis.missingFiles.length > 0) {
          console.log(`\n🔍 Found ${fileAnalysis.missingFiles.length} missing files:`, fileAnalysis.missingFiles);
          
          const generatedFiles = await fileGenerator.generateMissingFiles(
            analysis,
            files,
            fileAnalysis.missingFiles
          );
          
          // Update analysis with generated files
          analysis.missingFiles = fileAnalysis.missingFiles;
          analysis.generatedFiles = generatedFiles;
          analysis.projectHealth = fileAnalysis.projectHealth;
          
          console.log(`✅ Generated ${generatedFiles.length} missing files`);
          
          // Log thinking process for each generated file
          generatedFiles.forEach(file => {
            console.log(`\n📝 Generated ${file.fileName}:`);
            file.thinkingProcess.forEach(thought => console.log(`   ${thought}`));
          });
          
          // Add generated files to the files array for Dockerfile generation
          for (const generatedFile of generatedFiles) {
            const virtualFile: GitHubFile = {
              name: generatedFile.fileName,
              path: generatedFile.fileName,
              type: 'file',
              content: generatedFile.content
            };
            files.push(virtualFile);
          }
        } else {
          analysis.projectHealth = fileAnalysis.projectHealth;
          console.log('✅ All required files are present');
        }
      } catch (error) {
        console.error('❌ Error in intelligent file analysis:', error);
        // Continue with basic analysis if intelligent analysis fails
      }
    }
  
  // Add comprehensive error detection after all files are analyzed
  console.log('\n🔍 Running deployment readiness checks...');
  const deploymentIssues = detectDeploymentIssues(analysis, files);
  if (deploymentIssues.length > 0) {
    console.log(`⚠️ Found ${deploymentIssues.length} potential deployment issues:`);
    deploymentIssues.forEach(issue => console.log(`   - ${issue}`));
  } else {
    console.log('✅ No deployment issues detected');
  }
  
  return analysis;
}

// Enhanced file content analysis for thorough code understanding
function analyzeFileContent(file: GitHubFile, analysis: ProjectAnalysis, files: GitHubFile[]): void {
  const { name, content, path } = file;

  if (!content) return;

  console.log(`🔍 Analyzing file content: ${name} (${content.length} chars)`);

  // Detect language and framework
  switch (name) {
    case 'package.json':
      analysis.language = 'javascript';
      analysis.packageFiles.push(`Package JSON Content:\n${content}`);
      try {
        const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
        const pkg = typeof content === 'string' ? JSON.parse(content) : content;
        console.log(`📦 Found package.json with ${Object.keys(pkg.dependencies || {}).length} dependencies`);
        
        if (pkg.dependencies) {
          analysis.dependencies.push(...Object.keys(pkg.dependencies));
        }
        if (pkg.devDependencies) {
          analysis.dependencies.push(...Object.keys(pkg.devDependencies));
        }
        
        // Enhanced framework detection
        if (pkg.dependencies?.react || pkg.devDependencies?.react) {
          analysis.framework = 'react';
          console.log('🎯 Detected React framework');
        } else if (pkg.dependencies?.vue || pkg.devDependencies?.vue) {
          analysis.framework = 'vue';
          console.log('🎯 Detected Vue framework');
        } else if (pkg.dependencies?.next || pkg.devDependencies?.next) {
          analysis.framework = 'nextjs';
          console.log('🎯 Detected Next.js framework');
        } else if (pkg.dependencies?.express || pkg.devDependencies?.express) {
          analysis.framework = 'express';
          console.log('🎯 Detected Express framework');
        }
        
        // Detect build scripts for deployment insights
        if (pkg.scripts?.build) {
          console.log(`🔧 Found build script: ${pkg.scripts.build}`);
        }
        if (pkg.scripts?.start) {
          console.log(`🚀 Found start script: ${pkg.scripts.start}`);
        }
      } catch (e) {
        console.error('Error parsing package.json:', e);
      }
      break;

    case 'index.html':
      // If no other language detected, assume static HTML
      if (analysis.language === 'unknown') {
        analysis.language = 'html';
        analysis.framework = 'static';
        console.log('🌐 Detected static HTML project');
      }
      analysis.packageFiles.push(`HTML Entry Point:\n${content.substring(0, 1000)}`);
      
      // Analyze HTML content for framework clues
      if (content.includes('react') || content.includes('React')) {
        console.log('🎯 HTML contains React references');
      }
      if (content.includes('vue') || content.includes('Vue')) {
        console.log('🎯 HTML contains Vue references');
      }
      break;

    case 'requirements.txt':
      analysis.language = 'python';
      analysis.packageFiles.push(`Python Requirements:\n${content}`);
      const deps = content.split('\n').filter(line => line.trim() && !line.startsWith('#') && !line.startsWith('-'));
      analysis.dependencies.push(...deps);
      console.log(`🐍 Found requirements.txt with ${deps.length} Python dependencies`);
      
      // Detect ML/AI libraries
      const mlLibraries = deps.filter(dep => 
        ['tensorflow', 'torch', 'sklearn', 'numpy', 'pandas', 'opencv', 'keras', 'scipy'].some(ml => 
          dep.toLowerCase().includes(ml)
        )
      );
      if (mlLibraries.length > 0) {
        console.log(`🤖 Detected ML/AI libraries: ${mlLibraries.join(', ')}`);
      }
      
      // Detect web frameworks
      const webFrameworks = deps.filter(dep => 
        ['flask', 'fastapi', 'django', 'tornado', 'bottle'].some(fw => 
          dep.toLowerCase().includes(fw)
        )
      );
      if (webFrameworks.length > 0) {
        console.log(`🌐 Detected web frameworks: ${webFrameworks.join(', ')}`);
        if (webFrameworks.some(fw => fw.toLowerCase().includes('flask'))) {
          analysis.framework = 'flask';
        } else if (webFrameworks.some(fw => fw.toLowerCase().includes('fastapi'))) {
          analysis.framework = 'fastapi';
        } else if (webFrameworks.some(fw => fw.toLowerCase().includes('django'))) {
          analysis.framework = 'django';
        }
      }
      break;

    case 'pyproject.toml':
      analysis.language = 'python';
      analysis.packageFiles.push(`Python Project TOML:\n${content}`);
      console.log('🐍 Found pyproject.toml - modern Python project');
      
      // Enhanced TOML parsing for dependencies
      const depMatches = content.match(/dependencies\s*=\s*\[([\s\S]*?)\]/g);
      if (depMatches) {
        depMatches.forEach(match => {
          const deps = match.match(/"([^"]+)"/g);
          if (deps) {
            const cleanDeps = deps.map(dep => dep.replace(/"/g, '').split('>=')[0].split('==')[0]);
            analysis.dependencies.push(...cleanDeps);
            console.log(`📦 Extracted ${cleanDeps.length} dependencies from pyproject.toml`);
          }
        });
      }
      break;

    case 'Cargo.toml':
      analysis.language = 'rust';
      analysis.packageFiles.push(`Rust Cargo.toml:\n${content}`);
      console.log('🦀 Detected Rust project with Cargo.toml');
      break;

    case 'go.mod':
      analysis.language = 'go';
      analysis.packageFiles.push(`Go Module:\n${content}`);
      console.log('🐹 Detected Go project with go.mod');
      break;

    case 'Dockerfile':
      analysis.hasDockerfile = true;
      analysis.existingDockerfile = content;
      console.log('🐳 Found existing Dockerfile - will analyze and optimize');
      break;

    default:
      // Enhanced Python file analysis with deeper code understanding
      if (name.endsWith('.py')) {
        if (analysis.language === 'unknown') {
          analysis.language = 'python';
          console.log('🐍 Detected Python project from .py files');
        }
        
        // Store full Python file content for thorough analysis
        analysis.packageFiles.push(`Python File: ${name} (${path})\n${content}`);
        console.log(`📄 Analyzing Python file: ${name}`);
        
        // Enhanced Flask/FastAPI/Django detection
        if (content.includes('app = Flask(__name__)') || content.includes('Flask(__name__)')) {
          analysis.framework = 'flask';
          analysis.entryPoint = name;
          console.log(`🎯 Detected Flask app entry point: ${name}`);
        } else if (content.includes('app = FastAPI()') || content.includes('FastAPI()')) {
          analysis.framework = 'fastapi';
          analysis.entryPoint = name;
          console.log(`🚀 Detected FastAPI app entry point: ${name}`);
        } else if (content.includes('from django') || content.includes('import django')) {
          analysis.framework = 'django';
          console.log(`🌟 Detected Django framework in: ${name}`);
        }
        
        // Enhanced import analysis with detailed logging
        const importMatches = content.match(/^(?:from|import)\s+([a-zA-Z_][a-zA-Z0-9_\.]*)/gm);
        if (importMatches) {
          const imports = importMatches.map(match => {
            const parts = match.split(/\s+/);
            return parts[parts.length - 1].split('.')[0]; // Get base module name
          }).filter(imp => {
            // Filter out standard library modules
            const stdLibModules = ['os', 'sys', 'json', 'datetime', 'time', 'pathlib', 'path', 're', 'urllib', 'collections', 'itertools', 'functools', 'math', 'random'];
            return !stdLibModules.includes(imp);
          });
          
          if (imports.length > 0) {
            console.log(`📚 Found imports in ${name}: ${imports.join(', ')}`);
            analysis.dependencies.push(...imports);
          }
        }
        
        // Detect ML/AI specific patterns
        if (content.includes('model.fit(') || content.includes('train_model') || content.includes('load_model')) {
          console.log(`🤖 Detected ML training/inference patterns in ${name}`);
        }
        if (content.includes('.predict(') || content.includes('prediction') || content.includes('inference')) {
          console.log(`🎯 Detected ML prediction patterns in ${name}`);
        }
        
        // Check for main execution block
        if (content.includes('if __name__ == "__main__"')) {
          console.log(`🚀 Found main execution block in ${name}`);
          if (!analysis.entryPoint) {
            analysis.entryPoint = name;
            console.log(`🎯 Set ${name} as entry point`);
          }
        }
      }
      
      // Enhanced JavaScript/TypeScript file analysis
      else if (name.endsWith('.js') || name.endsWith('.ts') || name.endsWith('.jsx') || name.endsWith('.tsx')) {
        if (analysis.language === 'unknown') {
          analysis.language = name.endsWith('.ts') || name.endsWith('.tsx') ? 'typescript' : 'javascript';
          console.log(`📄 Detected ${analysis.language} project from ${name}`);
        }
        
        analysis.packageFiles.push(`${analysis.language.toUpperCase()} File: ${name} (${path})\n${content.substring(0, 1500)}`);
        console.log(`📄 Analyzing ${analysis.language} file: ${name}`);
        
        // Detect React components
        if (content.includes('import React') || content.includes('from react') || content.includes('jsx') || content.includes('JSX')) {
          analysis.framework = 'react';
          console.log(`⚛️ Detected React patterns in ${name}`);
        }
        
        // Detect Vue components
        if (content.includes('Vue.component') || content.includes('<template>') || content.includes('vue')) {
          analysis.framework = 'vue';
          console.log(`💚 Detected Vue patterns in ${name}`);
        }
        
        // Detect Express server
        if (content.includes('express()') || content.includes('require(\'express\')') || content.includes('from express')) {
          analysis.framework = 'express';
          console.log(`🚂 Detected Express server in ${name}`);
          if (!analysis.entryPoint) {
            analysis.entryPoint = name;
          }
        }
        
        // Extract import/require statements
        const jsImportMatches = content.match(/(?:import\s+.+\s+from\s+['"])([^'"]+)(?:['"])|(?:require\(['"])([^'"]+)(?:['"]\))/g);
        if (jsImportMatches) {
          const jsImports = jsImportMatches.map(match => {
            const fromMatch = match.match(/from\s+['"]([^'"]+)['"]/);
            const requireMatch = match.match(/require\(['"]([^'"]+)['"]\)/);
            return fromMatch ? fromMatch[1] : requireMatch ? requireMatch[1] : null;
          }).filter(imp => imp && !imp.startsWith('.') && !imp.startsWith('/'));
          
          if (jsImports.length > 0) {
            console.log(`📚 Found JS imports in ${name}: ${jsImports.join(', ')}`);
            analysis.dependencies.push(...jsImports);
          }
        }
      }
      
      // Analyze CSS files
      else if (name.endsWith('.css') || name.endsWith('.scss') || name.endsWith('.sass')) {
        console.log(`🎨 Found stylesheet: ${name}`);
        if (content.includes('@tailwind') || content.includes('tailwind')) {
          console.log('🎨 Detected Tailwind CSS usage');
        }
      }
      
      // Analyze configuration files
      else if (name.endsWith('.json') && !name.includes('package')) {
        console.log(`⚙️ Found configuration file: ${name}`);
        try {
          const config = JSON.parse(content);
          if (name === 'tsconfig.json') {
            console.log('📘 Found TypeScript configuration');
            analysis.language = 'typescript';
          }
        } catch (e) {
          console.log(`⚠️ Could not parse JSON in ${name}`);
        }
      }
      
      // Analyze README and documentation
      else if (name.toLowerCase().includes('readme')) {
        console.log(`📖 Found README: ${name}`);
        analysis.packageFiles.push(`README Content:\n${content.substring(0, 1000)}`);
        
        // Extract insights from README
        if (content.toLowerCase().includes('flask')) {
          console.log('🌐 README mentions Flask');
        }
        if (content.toLowerCase().includes('fastapi')) {
          console.log('🚀 README mentions FastAPI');
        }
        if (content.toLowerCase().includes('machine learning') || content.toLowerCase().includes('ml')) {
          console.log('🤖 README mentions Machine Learning');
        }
      }
  }
  
  // Remove duplicates from dependencies
  analysis.dependencies = [...new Set(analysis.dependencies)];
}

// Generate Dockerfile using OpenAI
export async function generateDockerfile(
  analysis: ProjectAnalysis,
  userPrompt: string,
  repoUrl: string
): Promise<string> {
  try {
    // Get API key from environment variables
    const apiKey = process.env.OPENAI_API_KEY;

    console.log('🔑 API Key check:', apiKey ? `Found key starting with: ${apiKey.substring(0, 15)}...` : 'No API key found');
    console.log('🔑 Full API key length:', apiKey?.length || 0);

    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const openai = new OpenAI({
      apiKey: apiKey,
    });

    // Enhanced system prompt with comprehensive analysis context
    const systemPrompt = `You are an elite DevOps engineer and container specialist with deep expertise in production deployments, ML/AI systems, and modern application architecture.

Your mission: Analyze this REAL project thoroughly and generate a production-ready Dockerfile that will successfully deploy to Docker Hub without errors.

CRITICAL REQUIREMENTS:
1. ANALYZE THE ACTUAL CODE FILES - This is not a demo, these are real project files
2. Return ONLY the Dockerfile content - no markdown, no explanations, no additional text
3. Use the ACTUAL entry point file detected from code analysis: ${analysis.entryPoint || 'DETECT FROM CODE'}
4. Use the ACTUAL dependencies found in the project: ${analysis.dependencies.length} dependencies detected
5. Generate for the ACTUAL framework: ${analysis.framework || 'ANALYZE CODE TO DETECT'}
6. Handle REAL ML models if detected: ${analysis.dependencies.some(d => ['tensorflow', 'torch', 'sklearn', 'numpy', 'pandas'].some(ml => d.toLowerCase().includes(ml))) ? 'ML DETECTED' : 'NO ML'}

PRODUCTION DOCKERFILE REQUIREMENTS:
✅ Multi-stage builds (builder + production) for optimization
✅ Docker security best practices (non-root user, minimal attack surface)
✅ Proper health checks for the detected application type
✅ Correct port exposure based on framework
✅ Proper system dependencies for detected libraries
✅ Production server configuration (gunicorn for Python, nginx for static)
✅ Environment variables for production deployment
✅ Error handling and graceful startup
✅ Proper file permissions and ownership
✅ Cache optimization for faster builds

CODE ANALYSIS RESULTS:
🔍 Language: ${analysis.language}
🎯 Framework: ${analysis.framework || 'ANALYZING...'}
🚀 Entry Point: ${analysis.entryPoint || 'DETECTING FROM CODE...'}
📦 Dependencies Count: ${analysis.dependencies.length}
🏥 Project Health: ${analysis.projectHealth || 'ASSESSING...'}
🐳 Has Dockerfile: ${analysis.hasDockerfile ? 'YES - WILL OPTIMIZE' : 'NO - WILL CREATE'}

${analysis.hasDockerfile ? `
EXISTING DOCKERFILE TO OPTIMIZE:
${analysis.existingDockerfile}
` : ''}

DETECTED DEPENDENCIES (First 30):
${analysis.dependencies.slice(0, 30).join(', ')}${analysis.dependencies.length > 30 ? '... and more' : ''}

ML/AI LIBRARIES DETECTED:
${analysis.dependencies.filter(d => ['tensorflow', 'torch', 'sklearn', 'numpy', 'pandas', 'opencv', 'keras', 'scipy', 'matplotlib', 'seaborn'].some(ml => d.toLowerCase().includes(ml))).join(', ') || 'None detected'}

WEB FRAMEWORKS DETECTED:
${analysis.dependencies.filter(d => ['flask', 'fastapi', 'django', 'express', 'react', 'vue', 'nextjs'].some(fw => d.toLowerCase().includes(fw))).join(', ') || 'None detected'}

ACTUAL PROJECT FILES ANALYZED:
${analysis.packageFiles.map((content, index) => `\nFILE ${index + 1}:\n${content.substring(0, 800)}${content.length > 800 ? '\n... (truncated)' : ''}`).join('\n---\n')}

ERROR DETECTION AND PREVENTION:
- Analyze the code for common deployment issues
- Ensure all required files are properly copied
- Validate entry points exist and are executable
- Check for missing system dependencies
- Verify port configuration matches the application
- Ensure proper permissions for file access
- Add health checks that actually work with this application
- Include proper error handling and logging

BASED ON THIS COMPREHENSIVE ANALYSIS, generate a production-ready Dockerfile that:
1. Uses the ACTUAL entry point: ${analysis.entryPoint || 'DETECT FROM CODE ANALYSIS'}
2. Includes the ACTUAL dependencies found
3. Works with the ACTUAL framework detected
4. Follows security and optimization best practices
5. Will successfully deploy without errors`

    const userMessage = `Repository: ${repoUrl}
User Requirements: ${userPrompt}

Generate an optimized Dockerfile for this ${analysis.language} project.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const dockerfile = completion.choices[0]?.message?.content?.trim();
    
    if (!dockerfile) {
      throw new Error('Failed to generate Dockerfile content');
    }
    
    return dockerfile;
  } catch (error) {
    console.error('❌ Error generating Dockerfile:', error);

    // If OpenAI fails, provide a fallback Dockerfile
    if (error instanceof Error && error.message.includes('401')) {
      console.log('🔄 OpenAI API key invalid, generating fallback Dockerfile...');
      return generateFallbackDockerfile(analysis);
    }

    throw new Error(`AI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Generate a fallback Dockerfile when OpenAI is not available
function generateFallbackDockerfile(analysis: ProjectAnalysis): string {
  console.log('🛠️ Generating fallback Dockerfile for:', analysis.language);

  switch (analysis.language) {
    case 'javascript':
      if (analysis.framework === 'react' || analysis.framework === 'vue') {
        return `# Multi-stage build for React/Vue app
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`;
      } else {
        return `# Node.js application
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000
CMD ["npm", "start"]`;
      }

    case 'html':
    case 'static':
      return `# Static HTML/CSS/JS website
FROM nginx:alpine

# Copy website files to nginx
COPY . /usr/share/nginx/html

# Copy custom nginx config if needed
# COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`;

    case 'python':
      return `# Python application
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd --create-home --shell /bin/bash app
USER app

EXPOSE 8000
CMD ["python", "app.py"]`;

    default:
      return `# Generic application container
FROM ubuntu:22.04

WORKDIR /app
COPY . .

# Install basic dependencies
RUN apt-get update && apt-get install -y \\
    curl \\
    wget \\
    && rm -rf /var/lib/apt/lists/*

EXPOSE 8080
CMD ["echo", "Please configure your application startup command"]`;
  }
}

// Main function to process deployment request
export async function processDockerfileGeneration(
  repoUrl: string,
  userPrompt?: string,
  githubToken?: string
): Promise<{ success: boolean; dockerfile?: string; error?: string; analysis?: ProjectAnalysis; generatedFiles?: any[]; imageName?: string }> {
  try {
    console.log(`\n🚀 Starting intelligent deployment analysis...`);
    console.log(`🔗 Repository: ${repoUrl}`);
    console.log(`💭 User prompt: ${userPrompt || 'Generate production-ready Dockerfile'}`);
    console.log(`🔑 GitHub token: ${githubToken ? 'Provided' : 'Not provided (using public access)'}`);
    
    // Parse GitHub URL
    const urlMatch = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!urlMatch) {
      console.log("❌ Invalid GitHub URL format");
      return { success: false, error: "Invalid GitHub URL format" };
    }

    const [, owner, repo] = urlMatch;
    const cleanRepo = repo.replace(/\.git$/, '');
    console.log(`📁 Repository details: { owner: '${owner}', repo: '${cleanRepo}' }`);

    // Fetch repository contents
    console.log(`📂 Fetching repository contents from GitHub API...`);
    const files = await fetchGitHubRepo(repoUrl, githubToken);
    
    if (files.length === 0) {
      console.log("❌ No files found in repository");
      return { success: false, error: "No accessible files found in repository. Check if the repository is public or provide a valid GitHub token." };
    }

    console.log(`📄 Successfully fetched ${files.length} files from repository`);
    
    // Analyze project structure
    console.log(`\n🔍 Starting intelligent project analysis...`);
    const analysis = await analyzeProject(files, githubToken);
    
    console.log(`📊 Analysis results:`);
    console.log(`   - Language: ${analysis.language}`);
    console.log(`   - Framework: ${analysis.framework || 'None detected'}`);
    console.log(`   - Dependencies found: ${analysis.dependencies.length}`);
    console.log(`   - Has Dockerfile: ${analysis.hasDockerfile}`);
    console.log(`   - Entry point: ${analysis.entryPoint || 'Not detected'}`);

    // Use intelligent file generator
    console.log(`\n🧠 Initializing intelligent file generation system...`);
    const fileGenerator = new IntelligentFileGenerator(process.env.OPENAI_API_KEY || '');
    
    console.log(`🔍 Analyzing project files for missing components...`);
    const fileAnalysis = await fileGenerator.analyzeProjectFiles(files, analysis);
    
    console.log(`📋 File analysis complete:`);
    console.log(`   - Missing files: ${fileAnalysis.missingFiles.length}`);
    console.log(`   - Project health: ${fileAnalysis.projectHealth}`);
    
    if (fileAnalysis.missingFiles.length > 0) {
      console.log(`\n📝 Generating missing files using AI...`);
      const generatedFiles = await fileGenerator.generateMissingFiles(
        analysis,
        files,
        fileAnalysis.missingFiles,
        userPrompt
      );
      analysis.generatedFiles = generatedFiles;
      analysis.missingFiles = fileAnalysis.missingFiles;
      analysis.projectHealth = fileAnalysis.projectHealth;
      
      console.log(`✅ File generation complete: ${generatedFiles.length} files created`);
    } else {
      console.log(`✅ No missing files detected - project is complete!`);
    }

    // Generate or optimize Dockerfile
    console.log(`\n🐳 Generating production-ready Dockerfile...`);
    const dockerfile = await generateDockerfile(analysis, userPrompt || 'Generate production-ready Dockerfile', repoUrl);
    
    if (dockerfile) {
      console.log(`✅ Dockerfile generated successfully`);
      console.log(`📏 Dockerfile length: ${dockerfile.length} characters`);
      
      // Show Dockerfile preview
      console.log(`\n🐳 Dockerfile preview (first 5 lines):`);
      const lines = dockerfile.split('\n').slice(0, 5);
      lines.forEach(line => console.log(`   ${line}`));
      console.log("   ...");
      
      // Generate docker-compose.yml if it's a Python project
      if (analysis.language === 'python' && !analysis.hasDockerfile) {
        console.log(`\n🐙 Generating docker-compose.yml for easy deployment...`);
        try {
          const dockerCompose = fileGenerator.generateDockerCompose(analysis);
          console.log(`✅ Docker Compose generated with production configuration`);
          console.log(`📏 Docker Compose length: ${dockerCompose.length} characters`);
        } catch (error) {
          console.log(`⚠️ Docker Compose generation failed: ${error}`);
        }
      }
    } else {
      console.log(`❌ Dockerfile generation failed`);
      return { success: false, error: "Failed to generate Dockerfile" };
    }

    // 🔹 Automatically build the Docker image (gated by AUTO_BUILD)
    let imageName: string | undefined;
    if (process.env.AUTO_BUILD === 'true') {
      try {
        console.log(`\n📦 Preparing Docker build context...`);
        const buildContextPath = prepareBuildContext(repoUrl, files, dockerfile);
        imageName = deriveImageName(repoUrl);
        console.log(`🏷️ Image name: ${imageName}`);

        console.log(`\n🚚 Starting Docker build...`);
        await build_docker_image(buildContextPath, imageName, {
          onLog: (chunk) => process.stdout.write(chunk)
        });
        console.log(`\n✅ Docker image built: ${imageName}`);

        if (process.env.DOCKER_USER) {
          try {
            await push_docker_image(imageName, { onLog: (c) => process.stdout.write(c) });
          } catch (pushErr) {
            console.warn('⚠️ Docker push failed (optional):', pushErr);
          }
        }
      } catch (dockerErr) {
        console.error('❌ Docker build failed:', dockerErr);
        // TODO: forward logs to AI repair pipeline
      }
    } else {
      console.log('ℹ️ AUTO_BUILD is disabled. Skipping Docker build.');
    }

    console.log(`\n🎉 Intelligent deployment analysis complete!`);
    console.log(`📊 Final summary:`);
    console.log(`   - Repository analyzed: ${repoUrl}`);
    console.log(`   - Files processed: ${files.length}`);
    console.log(`   - Missing files generated: ${analysis.generatedFiles?.length || 0}`);
    console.log(`   - Project health: ${analysis.projectHealth}`);
    console.log(`   - Dockerfile: Generated and optimized`);
    console.log(`   - Ready for production deployment! 🚀`);

    return {
      success: true,
      dockerfile,
      analysis,
      generatedFiles: analysis.generatedFiles || [],
      imageName
    };

  } catch (error) {
    console.error(`❌ Analysis failed:`, error);
    return { success: false, error: `Analysis failed: ${error}` };
  }
}
