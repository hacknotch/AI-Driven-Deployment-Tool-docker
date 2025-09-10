# Fusion Starter Docker Deployment Script for Windows PowerShell
# This script builds and deploys the application using Docker

param(
    [Parameter(Position=0)]
    [string]$Command = "deploy",
    [int]$AppPort = 3000,
    [int]$HostPort = 3000
)

# Configuration
$APP_NAME = "fusion-starter"
$IMAGE_NAME = "${APP_NAME}:latest"
$CONTAINER_NAME = "${APP_NAME}-app"
$PORT = $AppPort
$HOST_PORT = $HostPort

# Logging functions
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Check if Docker is running
function Test-Docker {
    try {
        docker info | Out-Null
        Write-Success "Docker is running"
        return $true
    }
    catch {
        Write-Error "Docker is not running. Please start Docker Desktop and try again."
        return $false
    }
}

# Check if .env file exists
function Test-EnvFile {
    if (-not (Test-Path ".env")) {
        Write-Warning ".env file not found. Creating from .env.example..."
        if (Test-Path ".env.example") {
            Copy-Item ".env.example" ".env"
            Write-Warning "Please edit .env file with your actual configuration before running again."
            exit 1
        }
        else {
            Write-Error "No .env.example file found. Please create a .env file with your configuration."
            exit 1
        }
    }
    Write-Success ".env file found"
}

# Stop and remove existing container
function Remove-ExistingContainer {
    $existingContainer = docker ps -a --format "{{.Names}}" | Where-Object { $_ -eq $CONTAINER_NAME }
    
    if ($existingContainer) {
        Write-Info "Stopping existing container: $CONTAINER_NAME"
        docker stop $CONTAINER_NAME 2>$null
        
        Write-Info "Removing existing container: $CONTAINER_NAME"
        docker rm $CONTAINER_NAME 2>$null
        
        Write-Success "Container cleanup completed"
    }
    else {
        Write-Info "No existing container found"
    }
}

# Build Docker image
function Build-Image {
    Write-Info "Building Docker image: $IMAGE_NAME"
    docker build -t $IMAGE_NAME .
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Docker image built successfully"
    }
    else {
        Write-Error "Failed to build Docker image"
        exit 1
    }
}

# Run the container
function Start-Container {
    Write-Info "Starting container: $CONTAINER_NAME"
    
    # Create logs directory if it doesn't exist
    if (-not (Test-Path "logs")) {
        New-Item -ItemType Directory -Path "logs" | Out-Null
    }
    
    docker run -d `
        --name $CONTAINER_NAME `
        --restart unless-stopped `
        -p "${HOST_PORT}:${PORT}" `
        --env-file .env `
        -v "${PWD}/logs:/app/logs" `
        $IMAGE_NAME
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Container started successfully"
    }
    else {
        Write-Error "Failed to start container"
        exit 1
    }
}

# Wait for container to be ready
function Wait-ForContainer {
    Write-Info "Waiting for container to be ready..."
    $maxAttempts = 30
    $attempt = 1
    
    while ($attempt -le $maxAttempts) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:${HOST_PORT}/api/ping" -TimeoutSec 2 -UseBasicParsing
            if ($response.StatusCode -eq 200) {
                Write-Success "Container is ready and responding"
                return $true
            }
        }
        catch {
            # Continue waiting
        }
        
        Write-Info "Attempt $attempt/$maxAttempts : Container not ready yet, waiting 2 seconds..."
        Start-Sleep -Seconds 2
        $attempt++
    }
    
    Write-Error "Container failed to become ready after $maxAttempts attempts"
    return $false
}

# Show container status
function Show-Status {
    Write-Info "Container Status:"
    docker ps --filter "name=$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    Write-Info "Application URLs:"
    Write-Host "  Frontend: http://localhost:${HOST_PORT}" -ForegroundColor Cyan
    Write-Host "  API: http://localhost:${HOST_PORT}/api" -ForegroundColor Cyan
    Write-Host "  Health Check: http://localhost:${HOST_PORT}/api/ping" -ForegroundColor Cyan
}

# Show logs
function Show-Logs {
    Write-Info "Showing container logs (last 50 lines):"
    docker logs --tail 50 $CONTAINER_NAME
}

# Main deployment function
function Deploy {
    Write-Info "Starting deployment of $APP_NAME..."
    
    if (-not (Test-Docker)) { exit 1 }
    Test-EnvFile
    Remove-ExistingContainer
    Build-Image
    Start-Container
    
    if (Wait-ForContainer) {
        Show-Status
        Write-Success "Deployment completed successfully!"
        Write-Info "To view logs: docker logs -f $CONTAINER_NAME"
        Write-Info "To stop: docker stop $CONTAINER_NAME"
    }
    else {
        Write-Error "Deployment failed - container is not responding"
        Show-Logs
        exit 1
    }
}

# Handle script commands
switch ($Command.ToLower()) {
    "deploy" {
        Deploy
    }
    "stop" {
        Write-Info "Stopping container: $CONTAINER_NAME"
        docker stop $CONTAINER_NAME 2>$null
        Write-Success "Container stopped"
    }
    "restart" {
        Write-Info "Restarting container: $CONTAINER_NAME"
        docker restart $CONTAINER_NAME 2>$null
        Write-Success "Container restarted"
    }
    "logs" {
        Show-Logs
    }
    "status" {
        Show-Status
    }
    "clean" {
        Write-Info "Cleaning up containers and images..."
        Remove-ExistingContainer
        docker rmi $IMAGE_NAME 2>$null
        Write-Success "Cleanup completed"
    }
    "help" {
        Write-Host "Usage: .\deploy.ps1 [command] [options]" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Commands:" -ForegroundColor Yellow
        Write-Host "  deploy   - Build and deploy the application (default)" -ForegroundColor White
        Write-Host "  stop     - Stop the running container" -ForegroundColor White
        Write-Host "  restart  - Restart the container" -ForegroundColor White
        Write-Host "  logs     - Show container logs" -ForegroundColor White
        Write-Host "  status   - Show container status" -ForegroundColor White
        Write-Host "  clean    - Remove container and image" -ForegroundColor White
        Write-Host "  help     - Show this help message" -ForegroundColor White
        Write-Host ""
        Write-Host "Options:" -ForegroundColor Yellow
        Write-Host "  -AppPort  - Application port (default: 3000)" -ForegroundColor White
        Write-Host "  -HostPort - Host port mapping (default: 3000)" -ForegroundColor White
        Write-Host ""
        Write-Host "Examples:" -ForegroundColor Yellow
        Write-Host "  .\deploy.ps1 deploy" -ForegroundColor White
        Write-Host "  .\deploy.ps1 deploy -HostPort 8080" -ForegroundColor White
        Write-Host "  .\deploy.ps1 logs" -ForegroundColor White
    }
    default {
        Write-Error "Unknown command: $Command"
        Write-Host "Use '.\deploy.ps1 help' for available commands" -ForegroundColor Yellow
        exit 1
    }
}
