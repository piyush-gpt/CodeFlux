#!/bin/bash

# Exit on any error
set -e

# Default DockerHub username, can be overridden
DOCKERHUB_USERNAME=${DOCKERHUB_USERNAME:-"piyushgpt"}

# Default image names and tags
RUNNER_IMAGE="${DOCKERHUB_USERNAME}/repl-runner:latest"
WORKER_IMAGE="${DOCKERHUB_USERNAME}/repl-worker:latest"

# Display usage information
show_usage() {
    echo "Usage: $0 [options]"
    echo "Options:"
    echo "  -u, --username USERNAME    DockerHub username (default: ${DOCKERHUB_USERNAME})"
    echo "  -r, --runner-tag TAG       Tag for runner image (default: latest)"
    echo "  -w, --worker-tag TAG       Tag for worker image (default: latest)"
    echo "  -h, --help                 Show this help message"
    exit 1
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    key="$1"
    case $key in
        -u|--username)
            DOCKERHUB_USERNAME="$2"
            RUNNER_IMAGE="${DOCKERHUB_USERNAME}/repl-runner:latest"
            WORKER_IMAGE="${DOCKERHUB_USERNAME}/repl-worker:latest"
            shift 2
            ;;
        -r|--runner-tag)
            RUNNER_IMAGE="${DOCKERHUB_USERNAME}/repl-runner:$2"
            shift 2
            ;;
        -w|--worker-tag)
            WORKER_IMAGE="${DOCKERHUB_USERNAME}/repl-worker:$2"
            shift 2
            ;;
        -h|--help)
            show_usage
            ;;
        *)
            echo "Unknown option: $1"
            show_usage
            ;;
    esac
done

echo "DockerHub username: ${DOCKERHUB_USERNAME}"
echo "Runner image: ${RUNNER_IMAGE}"
echo "Worker image: ${WORKER_IMAGE}"

# Check if user is logged in to DockerHub
echo "Checking DockerHub login status..."
if ! docker info | grep -q "Username"; then
    echo "You are not logged in to DockerHub. Please login:"
    docker login
fi

# Build the images
echo "Building runner image..."
docker build -t ${RUNNER_IMAGE} -f docker-react/Dockerfile.runner .

echo "Building worker image..."
docker build -t ${WORKER_IMAGE} -f docker-react/Dockerfile.worker .

# Push the images to DockerHub
echo "Pushing runner image to DockerHub..."
docker push ${RUNNER_IMAGE}

echo "Pushing worker image to DockerHub..."
docker push ${WORKER_IMAGE}

echo "Images successfully pushed to DockerHub!"
echo "Runner: ${RUNNER_IMAGE}"
echo "Worker: ${WORKER_IMAGE}" 