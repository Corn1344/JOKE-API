# Use an existing base image
FROM node:20

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json to the container
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code to the container
COPY . .

# Expose the port your app runs on
EXPOSE 8080

# Command to run your application
CMD ["node", "index.js"]
