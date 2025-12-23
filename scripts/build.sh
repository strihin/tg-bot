#!/bin/bash

# Bulgarian Language Learning Bot - Docker Build Script
# This script builds and optionally runs the Docker image locally

# Configuration
IMAGE_NAME="bg-bot"
IMAGE_TAG="${1:-latest}"
CONTAINER_NAME="bg-bot-container"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🐳 Bulgarian Bot Docker Builder${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Function to verify Docker is running
verify_docker() {
    echo -e "\n${BLUE}🔍 Verifying Docker...${NC}"
    if ! docker info > /dev/null 2>&1; then
        echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Docker is running${NC}"
}

# Function to stop any running bot containers
cleanup_containers() {
    echo -e "\n${BLUE}🧹 Checking for running bot containers...${NC}"
    
    # Check for docker-compose containers
    local compose_running=$(docker ps --filter "label=com.docker.compose.project" --format '{{.Names}}' 2>/dev/null | wc -l)
    
    if [ "$compose_running" -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Found running docker-compose services. Stopping them...${NC}"
        docker-compose -f config/docker-compose.yml down 2>/dev/null || true
        echo -e "${GREEN}✅ Docker-compose services stopped${NC}"
    fi
    
    # Check for standalone containers with our naming pattern
    for container in "bg-bot-container" "bg-bot-app"; do
        if docker ps --filter "name=^${container}$" --format '{{.Names}}' | grep -q "^${container}$"; then
            echo -e "${YELLOW}⚠️  Stopping running container: ${container}${NC}"
            docker stop "${container}" 2>/dev/null || true
            docker rm "${container}" 2>/dev/null || true
            echo -e "${GREEN}✅ Stopped ${container}${NC}"
        fi
    done
}

# Function to build the image
build_image() {
    echo -e "\n${BLUE}📦 Building Docker image: ${IMAGE_NAME}:${IMAGE_TAG}${NC}"
    
    if docker build -t "${IMAGE_NAME}:${IMAGE_TAG}" .; then
        echo -e "${GREEN}✅ Build successful!${NC}"
        return 0
    else
        echo -e "${RED}❌ Build failed!${NC}"
        return 1
    fi
}

# Function to display image info
show_image_info() {
    echo -e "\n${BLUE}📋 Image Details:${NC}"
    docker images "${IMAGE_NAME}:${IMAGE_TAG}" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
}

# Main execution
verify_docker
cleanup_containers

if ! build_image; then
    exit 1
fi

show_image_info

# Ask if user wants to run the container
echo -e "\n${BLUE}🚀 Do you want to run the container? (y/n)${NC}"
read -r -t 10 -p "Response (default: n): " run_container || run_container="n"

if [[ "$run_container" =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}▶️  Starting container...${NC}"
    
    # Run the container
    docker run \
        --name "${CONTAINER_NAME}" \
        --env-file .env \
        -p 3000:3000 \
        -p 3001:3001 \
        -v "$(pwd)/data:/app/data" \
        "${IMAGE_NAME}:${IMAGE_TAG}"
else
    echo -e "${GREEN}✅ Build complete. Image ready: ${IMAGE_NAME}:${IMAGE_TAG}${NC}"
    echo -e "\n${BLUE}To run the container manually:${NC}"
    echo "docker run --env-file .env -p 3000:3000 -p 3001:3001 -v \$(pwd)/data:/app/data ${IMAGE_NAME}:${IMAGE_TAG}"
fi
