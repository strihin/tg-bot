#!/bin/bash

# Quick Docker run script - assumes image is already built
# Usage: ./run.sh [tag] (default: latest)

IMAGE_NAME="bg-bot"
IMAGE_TAG="${1:-latest}"
CONTAINER_NAME="bg-bot-container"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 Starting Bulgarian Bot Container${NC}"
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

# Function to verify image exists
verify_image() {
    echo -e "\n${BLUE}🔍 Verifying image exists: ${IMAGE_NAME}:${IMAGE_TAG}${NC}"
    if ! docker images --format "{{.Repository}}:{{.Tag}}" | grep -q "^${IMAGE_NAME}:${IMAGE_TAG}$"; then
        echo -e "${RED}❌ Image not found: ${IMAGE_NAME}:${IMAGE_TAG}${NC}"
        echo -e "${YELLOW}💡 Run './build.sh' first to build the image${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Image found: ${IMAGE_NAME}:${IMAGE_TAG}${NC}"
}

# Function to cleanup running containers
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
    for container in "${CONTAINER_NAME}" "bg-bot-app"; do
        if docker ps --filter "name=^${container}$" --format '{{.Names}}' | grep -q "^${container}$"; then
            echo -e "${YELLOW}⚠️  Stopping running container: ${container}${NC}"
            docker stop "${container}" 2>/dev/null || true
            docker rm "${container}" 2>/dev/null || true
            echo -e "${GREEN}✅ Stopped ${container}${NC}"
        fi
    done
}

# Check .env file
verify_env() {
    echo -e "\n${BLUE}🔍 Checking configuration...${NC}"
    if [ ! -f .env ]; then
        echo -e "${RED}❌ .env file not found${NC}"
        echo -e "${YELLOW}⚠️  Create .env file with TELEGRAM_TOKEN and MONGO_URI before running${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ .env file found${NC}"
}

# Main execution
verify_docker
verify_env
verify_image
cleanup_containers

echo -e "\n${BLUE}▶️  Starting container: ${CONTAINER_NAME}${NC}"
docker run \
    --name "${CONTAINER_NAME}" \
    --env-file .env \
    -p 3000:3000 \
    -v "$(pwd)/data:/app/data" \
    --rm \
    "${IMAGE_NAME}:${IMAGE_TAG}"
