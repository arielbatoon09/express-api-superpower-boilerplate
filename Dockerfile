# Stage 1: Base stage with Node.js Alpine image
FROM node:20-alpine AS base

# Stage 2: Builder stage starts from the base image
FROM base AS builder

# Install libc6-compat for compatibility and globally install specific npm version
RUN apk add --no-cache libc6-compat && \
  npm install -g npm@10.8.2

# Set the working directory for subsequent instructions
WORKDIR /builder

# Copy package.json and npm-lock.yaml to leverage Docker cache
COPY package.json npm-lock.yaml ./

# Install dependencies as per lock file without making updates
RUN npm install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Build the application and prune development dependencies
RUN npm run build
RUN npm prune --prod

# Stage 3: Runner stage starts from the base image again
FROM base AS runner

# Set the working directory in the container
WORKDIR /runner

# Create a non-root group and user for running the application securely
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 admin

# Copy installed node_modules and built artifacts from the builder stage
# Change ownership to the non-root user and group created above
COPY --from=builder --chown=admin:nodejs /builder/node_modules /runner/node_modules
COPY --from=builder --chown=admin:nodejs /builder/dist /runner/dist
COPY --from=builder --chown=admin:nodejs /builder/package.json /runner/package.json

# Switch to non-root user for security
USER admin

# Inform Docker that the container is listening on port 8000 at runtime
EXPOSE 8000

# Define the command to run the app
CMD ["node", "/runner/dist/main.js"]