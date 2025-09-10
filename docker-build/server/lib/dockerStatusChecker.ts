import { spawn } from 'child_process';

export interface DockerStatus {
  isInstalled: boolean;
  isRunning: boolean;
  version?: string;
  error?: string;
  canBuild: boolean;
}

export class DockerStatusChecker {
  /**
   * 🔍 Check Docker installation and status
   */
  async checkDockerStatus(): Promise<DockerStatus> {
    try {
      console.log('🔍 Checking Docker installation...');
      
      // Check if Docker is installed with a shorter timeout
      const versionResult = await this.runCommand('docker', ['--version'], 5000);
      
      if (!versionResult.success) {
        console.log('❌ Docker not installed or not in PATH');
        return {
          isInstalled: false,
          isRunning: false,
          canBuild: false,
          error: versionResult.error || 'Docker is not installed or not in PATH'
        };
      }

      console.log('✅ Docker is installed:', versionResult.output);

      // Check if Docker daemon is running with a shorter timeout
      console.log('🔍 Checking Docker daemon status...');
      const psResult = await this.runCommand('docker', ['ps', '--format', 'table'], 8000);
      
      if (!psResult.success) {
        console.log('❌ Docker daemon not running:', psResult.error);
        return {
          isInstalled: true,
          isRunning: false,
          version: versionResult.output,
          canBuild: false,
          error: psResult.error || 'Docker Desktop is not running. Please start Docker Desktop.'
        };
      }

      console.log('✅ Docker daemon is running');
      
      return {
        isInstalled: true,
        isRunning: true,
        version: versionResult.output,
        canBuild: true
      };

    } catch (error) {
      console.log('❌ Docker status check failed:', error);
      return {
        isInstalled: false,
        isRunning: false,
        canBuild: false,
        error: error instanceof Error ? error.message : 'Unknown error during Docker status check'
      };
    }
  }

  /**
   * 🚀 Start Docker Desktop (Windows)
   */
  async startDockerDesktop(): Promise<{ success: boolean; error?: string }> {
    try {
      // Try common Docker Desktop paths
      const possiblePaths = [
        'C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe',
        'C:\\Program Files (x86)\\Docker\\Docker\\Docker Desktop.exe',
        'C:\\Users\\' + process.env.USERNAME + '\\AppData\\Local\\Docker\\Docker Desktop.exe'
      ];

      for (const path of possiblePaths) {
        try {
          const fs = require('fs');
          if (fs.existsSync(path)) {
            const { spawn } = require('child_process');
            spawn(path, [], { detached: true, stdio: 'ignore' });
            return { success: true };
          }
        } catch (e) {
          // Continue to next path
        }
      }

      return { 
        success: false, 
        error: 'Docker Desktop not found in common installation paths' 
      };

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to start Docker Desktop' 
      };
    }
  }

  /**
   * 🧪 Test Docker build capability
   */
  async testDockerBuild(): Promise<{ success: boolean; error?: string; output?: string }> {
    try {
      console.log('🧪 Testing Docker build capability...');
      
      // Create a simple test Dockerfile
      const testDockerfile = `FROM alpine:latest
RUN echo "Docker build test successful"
CMD ["echo", "Hello from Docker!"]`;

      const fs = require('fs');
      const path = require('path');
      const testDir = path.join(process.cwd(), 'temp-docker-test');
      const testDockerfilePath = path.join(testDir, 'Dockerfile');
      
      // Create test directory
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }
      
      fs.writeFileSync(testDockerfilePath, testDockerfile);

      // Try to build the test image with a longer timeout for build operations
      console.log('🔨 Building test Docker image...');
      const result = await this.runCommand('docker', [
        'build', 
        '-f', testDockerfilePath, 
        '-t', 'docker-test-image', 
        testDir
      ], 30000); // 30 second timeout for build

      // Clean up
      try {
        console.log('🧹 Cleaning up test files...');
        fs.unlinkSync(testDockerfilePath);
        fs.rmdirSync(testDir);
        await this.runCommand('docker', ['rmi', 'docker-test-image'], 10000);
      } catch (e) {
        console.log('⚠️ Cleanup warning:', e);
        // Ignore cleanup errors
      }

      console.log('✅ Docker build test completed');
      return {
        success: result.success,
        error: result.success ? undefined : result.error,
        output: result.output
      };

    } catch (error) {
      console.log('❌ Docker build test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Docker build test failed'
      };
    }
  }

  /**
   * 🔧 Get Docker installation instructions
   */
  getInstallationInstructions(): {
    windows: string[];
    macos: string[];
    linux: string[];
  } {
    return {
      windows: [
        '1. Download Docker Desktop from: https://www.docker.com/products/docker-desktop/',
        '2. Run the installer and follow the setup wizard',
        '3. Restart your computer if prompted',
        '4. Start Docker Desktop from the Start menu',
        '5. Wait for Docker Desktop to fully start (whale icon in system tray)',
        '6. Verify installation by running: docker --version'
      ],
      macos: [
        '1. Download Docker Desktop from: https://www.docker.com/products/docker-desktop/',
        '2. Drag Docker.app to Applications folder',
        '3. Start Docker Desktop from Applications',
        '4. Wait for Docker Desktop to fully start',
        '5. Verify installation by running: docker --version'
      ],
      linux: [
        '1. Install Docker Engine: https://docs.docker.com/engine/install/',
        '2. Start Docker service: sudo systemctl start docker',
        '3. Enable Docker service: sudo systemctl enable docker',
        '4. Add your user to docker group: sudo usermod -aG docker $USER',
        '5. Log out and log back in',
        '6. Verify installation by running: docker --version'
      ]
    };
  }

  private async runCommand(command: string, args: string[], timeoutMs: number = 10000): Promise<{
    success: boolean;
    output?: string;
    error?: string;
  }> {
    return new Promise((resolve) => {
      const process = spawn(command, args, { 
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true 
      });

      let output = '';
      let error = '';
      let isResolved = false;

      // Set up timeout
      const timeout = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          process.kill('SIGTERM');
          resolve({
            success: false,
            error: `Command timed out after ${timeoutMs}ms`
          });
        }
      }, timeoutMs);

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        error += data.toString();
      });

      process.on('close', (code) => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeout);
          resolve({
            success: code === 0,
            output: output.trim(),
            error: error.trim()
          });
        }
      });

      process.on('error', (err) => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeout);
          resolve({
            success: false,
            error: err.message
          });
        }
      });
    });
  }
}

export const dockerStatusChecker = new DockerStatusChecker();
