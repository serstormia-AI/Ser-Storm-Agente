FROM node:22-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json* ./
COPY packages/shared ./packages/shared
COPY apps/worker ./apps/worker

# Install dependencies and build shared package
RUN npm install
RUN npm run build --workspace=packages/shared

WORKDIR /app/apps/worker

CMD ["npm", "start"]
