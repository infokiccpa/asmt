# Use Node.js base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the application code
COPY . .

# Cloud Run uses the PORT environment variable.
# Our server.js already uses process.env.PORT || 5000
ENV PORT=8080
EXPOSE 8080

# Start the server
CMD ["node", "server.js"]
