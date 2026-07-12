#!/bin/bash

# ==============================================================================
#   Rami Deployment Script for Hostinger
# ==============================================================================
#
#  This script automates the deployment process on the production server.
#  It ensures the environment is set up correctly, pulls the latest code,
#  installs dependencies, builds the frontend, and restarts the application
#  using PM2 for zero-downtime reloads.
#
#  Usage:
#  1. Make sure PM2 is installed on the server: npm install -g pm2
#  2. Start the app for the first time: pm2 start server.js --name "rami-app"
#  3. For subsequent deployments, simply run: ./deploy.sh
#

set -e # Exit immediately if a command exits with a non-zero status.

echo " Starting deployment..."

# --- Environment Setup ---
echo "   - Setting up Node.js environment..."
export PATH="/opt/alt/alt-nodejs18/root/usr/bin:$PATH"
echo "   - Node version: $(node -v)"
echo "   - NPM version: $(npm -v)"

# --- Code Update ---
echo "   - Navigating to project directory..."
cd ~/domains/lightsteelblue-cobra-503372.hostingersite.com/nodejs

echo "   - Pulling latest changes from Git..."
git pull

# --- Dependencies & Build ---
echo "   - Installing dependencies..."
npm install

echo "   - Fixing executable permissions (Hostinger workaround)..."
chmod +x node_modules/.bin/* node_modules/@esbuild/linux-x64/bin/esbuild

echo "   - Building frontend assets..."
npm run build

# --- Application Restart ---
echo "   - Reloading application with PM2 for zero-downtime..."
pm2 reload rami-app || pm2 start server.js --name "rami-app"

echo " Deployment complete!"