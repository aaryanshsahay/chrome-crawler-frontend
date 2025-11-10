#!/bin/bash

# Chrome Crawler Frontend - Production Build
# Run this script to build the extension for production with your prod backend URL

set -e

echo "🚀 Building Chrome Crawler Frontend (Production)"
echo "================================================"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "📝 Please create a .env file based on .env.example"
    echo "   Run: cp .env.example .env"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed"
    echo "📥 Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed"
    exit 1
fi

# Extract backend URL from .env
BACKEND_URL=$(grep VITE_BACKEND_URL .env | cut -d '=' -f2)

if [ -z "$BACKEND_URL" ]; then
    echo "❌ Error: VITE_BACKEND_URL not found in .env!"
    echo "📝 Please add your production backend URL to .env"
    echo "   Example: VITE_BACKEND_URL=https://your-backend.onrender.com"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing Node.js dependencies..."
    npm install
fi

echo ""
echo "✅ Configuration:"
echo "   Backend URL: $BACKEND_URL"
echo "   Environment: Production"
echo ""
echo "🔨 Building extension for production..."
echo ""

# Set environment variables
export VITE_ENV=production
export NODE_ENV=production

# Run production build
npm run build

echo ""
echo "✅ Build complete!"
echo "📦 Production extension ready in: ./dist/"
echo ""
echo "📌 Next steps:"
echo "   1. Zip the 'dist' folder"
echo "   2. Submit to Chrome Web Store or distribute as needed"
echo "   3. Users can load unpacked from dist/ folder for testing"
echo ""
echo "================================================"
