#!/bin/bash

# ==============================================================================
#   Rami Deployment Script
# ==============================================================================
#
#  This script automates the deployment process on the production server.
#  It ensures the environment is set up correctly, pulls the latest code,
#  installs dependencies, builds the frontend, and restarts the application
#  using a process manager (pm2).
#
#  Usage: ./deploy.sh
#

set -e # Exit immediately if a command exits with a non-zero status.

echo "🚀 Starting deployment..."

# 1. Set up the correct Node.js environment path
export PATH="/opt/alt/alt-nodejs18/root/usr/bin:$PATH"
echo "   - Node.js environment set for v18."

# 2. Navigate to the project directory and pull latest changes
cd ~/domains/lightsteelblue-cobra-503372.hostingersite.com/nodejs
echo "   - Pulling latest changes from git..."
git pull

# 3. Install dependencies and build the frontend
echo "   - Installing dependencies and building project..."
npm install
npm run build

# 4. Restart the application with PM2
#    (Assumes you have pm2 installed and the app is named 'rami-app')
echo "   - Restarting application with pm2..."
pm2 restart rami-app

echo "✅ Deployment complete!"