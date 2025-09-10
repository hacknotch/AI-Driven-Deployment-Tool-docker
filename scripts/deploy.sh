#!/bin/bash

# Fusion Starter Docker Deployment Script
# This script builds and deploys the application using Docker

set -e  # Exit on any error

# Configuration
APP_NAME="fusion-starter"
IMAGE_NAME="${APP_NAME}:latest"
CONTAINER_NAME="${APP_NAME}-app"
PORT="${APP_PORT:-3000}"
HOST_PORT="${HOST_PORT:-3000}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    log_success "Docker is running"
}

# Check if .env file exists
check_env_file() {
    if [ ! -f ".env" ]; then
        log_warning ".env file not found. Creating from .env.example..."
        if [ -f ".env.example" ]; then
            cp .env.example .env
            log_warning "Please edit .env file with your actual configuration before running again."
            exit 1
        else
            log_error "No .env.example file found. Please create a .env file with your configuration."
            exit 1
        fi
    fi
    log_success ".env file found"
}

# Stop and remove existing container
cleanup_container() {
    if docker ps -a --format 'table {{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        log_info "Stopping existing container: ${CONTAINER_NAME}"
        docker stop "${CONTAINER_NAME}" || true
        log_info "Removing existing container: ${CONTAINER_NAME}"
        docker rm "${CONTAINER_NAME}" || true
        log_success "Container cleanup completed"
    else
        log_info "No existing container found"
    fi
}

# Build Docker image
build_image() {
    log_info "Building Docker image: ${IMAGE_NAME}"
    docker build -t "${IMAGE_NAME}" .
    log_success "Docker image built successfully"
}

# Run the container
run_container() {
    log_info "Starting container: ${CONTAINER_NAME}"
    docker run -d \
        --name "${CONTAINER_NAME}" \
        --restart unless-stopped \
        -p "${HOST_PORT}:${PORT}" \
        --env-file .env \
        -v "${PWD}/logs:/app/logs" \
        "${IMAGE_NAME}"
    log_success "Container started successfully"
}

# Wait for container to be ready
wait_for_container() {
    log_info "Waiting for container to be ready..."
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "http://localhost:${HOST_PORT}/api/ping" > /dev/null 2>&1; then
            log_success "Container is ready and responding"
            return 0
        fi
        
        log_info "Attempt ${attempt}/${max_attempts}: Container not ready yet, waiting 2 seconds..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    log_error "Container failed to become ready after ${max_attempts} attempts"
    return 1
}

# Show container status
show_status() {
    log_info "Container Status:"
    docker ps --filter "name=${CONTAINER_NAME}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    log_info "Application URLs:"
    echo "  Frontend: http://localhost:${HOST_PORT}"
    echo "  API: http://localhost:${HOST_PORT}/api"
    echo "  Health Check: http://localhost:${HOST_PORT}/api/ping"
}

# Show logs
show_logs() {
    log_info "Showing container logs (last 50 lines):"
    docker logs --tail 50 "${CONTAINER_NAME}"
}

# Main deployment function
deploy() {
    log_info "Starting deployment of ${APP_NAME}..."
    
    check_docker
    check_env_file
    cleanup_container
    build_image
    run_container
    
    if wait_for_container; then
        show_status
        log_success "Deployment completed successfully!"
        log_info "To view logs: docker logs -f ${CONTAINER_NAME}"
        log_info "To stop: docker stop ${CONTAINER_NAME}"
    else
        log_error "Deployment failed - container is not responding"
        show_logs
        exit 1
    fi
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        deploy
        ;;
    "stop")
        log_info "Stopping container: ${CONTAINER_NAME}"
        docker stop "${CONTAINER_NAME}" || true
        log_success "Container stopped"
        ;;
    "restart")
        log_info "Restarting container: ${CONTAINER_NAME}"
        docker restart "${CONTAINER_NAME}" || true
        log_success "Container restarted"
        ;;
    "logs")
        show_logs
        ;;
    "status")
        show_status
        ;;
    "clean")
        log_info "Cleaning up containers and images..."
        cleanup_container
        docker rmi "${IMAGE_NAME}" 2>/dev/null || true
        log_success "Cleanup completed"
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  deploy   - Build and deploy the application (default)"
        echo "  stop     - Stop the running container"
        echo "  restart  - Restart the container"
        echo "  logs     - Show container logs"
        echo "  status   - Show container status"
        echo "  clean    - Remove container and image"
        echo "  help     - Show this help message"
        echo ""
        echo "Environment variables:"
        echo "  APP_PORT     - Application port (default: 3000)"
        echo "  HOST_PORT    - Host port mapping (default: 3000)"
        ;;
    *)
        log_error "Unknown command: $1"
        echo "Use '$0 help' for available commands"
        exit 1
        ;;
esac
