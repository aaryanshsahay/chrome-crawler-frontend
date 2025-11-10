#!/bin/bash

# Chrome Crawler Frontend - Local Development Setup
# Run this script to start the extension dev server with local development settings

set -e

echo "🚀 Starting Chrome Crawler Frontend (Local Development)"
echo "======================================================"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "📝 Please create a .env file based on .env.example"
    echo "   Run: cp .env.example .env"
    echo ""
    echo "Make sure your .env contains:"
    echo "  - VITE_SUPABASE_URL"
    echo "  - VITE_SUPABASE_ANON_KEY"
    echo "  - VITE_BACKEND_URL (default: http://localhost:5000)"
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

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing Node.js dependencies..."
    npm install
fi

echo ""
echo "✅ Setup complete!"
echo "🔨 Building extension and starting dev server..."
echo "👀 Make sure backend is running at: http://localhost:5000"
echo "📍 Watch mode enabled - rebuild on file changes"
echo ""
echo "📌 Instructions:"
echo "   1. Open Chrome and go to chrome://extensions/"
echo "   2. Enable 'Developer mode' (top right)"
echo "   3. Click 'Load unpacked'"
echo "   4. Select the 'dist' folder from this project"
echo ""
echo "Press Ctrl+C to stop the dev server"
echo "======================================================"
echo ""

# Set environment variables
export VITE_ENV=development

# Run Vite dev server with watch mode
npm run dev
