# Use official Node.js image
FROM node:20

# Set working directory for Node app
WORKDIR /app

# Install system dependencies for C++ and node-pty
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    gcc \
    build-essential \
    bash \
    cmake \
    gdb \
    && rm -rf /var/lib/apt/lists/*

# Copy worker code (including package.json, etc.)
COPY worker-cpp/ ./

# Remove any prebuilt node_modules (if any)
RUN rm -rf node_modules

# Install dependencies and rebuild native modules
RUN npm install --build-from-source

# Create workspace directory for C++ files
RUN mkdir -p /workspace && chmod 755 /workspace

# Set compiler environment variables
ENV CXX=/usr/bin/g++
ENV CC=/usr/bin/gcc

# Expose necessary ports
EXPOSE 3002
EXPOSE 5173

# Default command to run Node app
CMD ["node", "index.js"]
