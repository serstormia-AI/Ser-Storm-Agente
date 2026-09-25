FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
COPY packages/shared ./packages/shared
COPY apps/panel ./apps/panel

RUN npm install
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=apps/panel

WORKDIR /app/apps/panel

EXPOSE 3000

CMD ["npm", "start"]
