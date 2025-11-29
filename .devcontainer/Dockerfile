FROM mcr.microsoft.com/devcontainers/javascript-node:1-22-bullseye

# Install additional tools for React development
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
  && apt-get -y install --no-install-recommends \
  git \
  curl \
  && apt-get clean -y && rm -rf /var/lib/apt/lists/*

# Install pnpm globally (version from package.json packageManager field)
RUN npm install -g pnpm@10.11.0

# Install global development tools
RUN npm install -g \
  serve \
  prettier \
  eslint

# Set working directory
WORKDIR /workspace

# Keep container running
CMD ["sleep", "infinity"]
