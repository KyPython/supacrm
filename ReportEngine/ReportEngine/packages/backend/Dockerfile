# Backend Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
COPY src ./src
COPY migrations ./migrations
COPY scripts ./scripts
COPY schema.sql ./schema.sql
# Use npm ci for reproducible installs (requires package-lock.json)
RUN npm ci --omit=dev
ENV PORT=4000
EXPOSE 4000
CMD ["node", "src/index.js"]
