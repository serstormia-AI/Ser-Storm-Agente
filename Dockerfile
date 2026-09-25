FROM node:20-alpine

WORKDIR /app

# Copy root workspace manifests
COPY package.json package-lock.json* ./
COPY packages/shared ./packages/shared
COPY apps/worker ./apps/worker

# Install dependencies and compile shared package
RUN npm install
RUN npm run build --workspace=packages/shared

WORKDIR /app/apps/worker

CMD ["npm", "start"]
