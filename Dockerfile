# Build stage
FROM node:18-alpine as build

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm install --production

# Copy built files from build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/server.js ./server.js

# Expose the port the app runs on
EXPOSE 8080

# Command to run the application
CMD ["node", "server.js"]