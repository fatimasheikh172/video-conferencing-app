# Stage 1: Build React app (using pre-installed node_modules)
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first
COPY package*.json ./

# Copy pre-installed node_modules from local machine
# This avoids network issues during Docker build
COPY node_modules ./node_modules

# Copy source code
COPY . .

# Build the React app
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built React files from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Create health check endpoint
RUN echo '<!DOCTYPE html><html><body>OK</body></html>' > /usr/share/nginx/html/health

# Create non-root user
RUN addgroup -g 1001 -S nginx-user && \
    adduser -S nginx-user -u 1001

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

