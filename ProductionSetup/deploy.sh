#!/bin/bash

# Exit on error
set -e

# Docker Hub username
DOCKER_USERNAME="piyushgpt"

# Build and push Docker images
echo "Building and pushing Docker images..."

# Frontend
echo "Building frontend image..."
docker build --no-cache -t $DOCKER_USERNAME/repl-frontend:latest ../frontend --build-arg VITE_API_URL=http://api.127.0.0.1.nip.io --build-arg VITE_POD_DEPLOYMENT_URL=http://poddeployment.127.0.0.1.nip.io
docker push $DOCKER_USERNAME/repl-frontend:latest

# Server
echo "Building server image..."
docker build --no-cache -t $DOCKER_USERNAME/repl-server:latest ../server
docker push $DOCKER_USERNAME/repl-server:latest

# PodDeployment
echo "Building poddeployment image..."
docker build --no-cache -t $DOCKER_USERNAME/repl-pod-deployment:latest ../podDeployment
docker push $DOCKER_USERNAME/repl-pod-deployment:latest
# Apply Kubernetes manifests in order
echo "Applying Kubernetes manifests..."

# Apply poddeployment-rbac.yaml
echo "Applying poddeployment-rbac.yaml..."
kubectl apply -f poddeployment-rbac.yaml

# First, apply Redis as it's a dependency
echo "Applying Redis..."
kubectl apply -f redis.yml

# Wait for Redis to be ready
echo "Waiting for Redis to be ready..."
kubectl wait --for=condition=ready pod -l app=redis --timeout=120s

# Apply server deployment
echo "Applying server deployment..."
kubectl apply -f server.yaml

# Apply podDeployment
echo "Applying podDeployment..."
kubectl apply -f podDeployment.yml

# Apply frontend deployment
echo "Applying frontend deployment..."
kubectl apply -f frontend.yaml

# Finally, apply ingress
echo "Applying ingress..."
kubectl apply -f testingIngress.yaml

echo "Deployment completed! You can access your application at:"
echo "Frontend: http://frontend.127.0.0.1.nip.io"
echo "API: http://api.127.0.0.1.nip.io"
echo "PodDeployment: http://poddeployment.127.0.0.1.nip.io"

# Show pod status
echo "Pod status:"
kubectl get pods 