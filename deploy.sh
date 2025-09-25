#!/bin/bash

# =======================================================
# 🚀 LOTTO API DEPLOYMENT SCRIPT
# =======================================================

echo "🚀 Starting Lotto API Deployment Process..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the lotto-api directory."
    exit 1
fi

print_status "Validating system requirements..."

# Validate system
if [ -f "validate-system.js" ]; then
    node validate-system.js
    if [ $? -ne 0 ]; then
        print_error "System validation failed. Please fix the issues before deploying."
        exit 1
    fi
    print_success "System validation passed!"
else
    print_warning "validate-system.js not found. Skipping validation."
fi

# Check git status
print_status "Checking git status..."
if [ -d ".git" ]; then
    if [ -n "$(git status --porcelain)" ]; then
        print_warning "You have uncommitted changes. Do you want to continue? (y/n)"
        read -r response
        if [ "$response" != "y" ]; then
            print_error "Deployment cancelled."
            exit 1
        fi
    fi
    
    # Add and commit changes
    print_status "Adding and committing changes..."
    git add .
    git commit -m "Deploy: $(date '+%Y-%m-%d %H:%M:%S')"
    
    # Push to remote
    print_status "Pushing to remote repository..."
    git push origin main
    
    if [ $? -eq 0 ]; then
        print_success "Code pushed to repository successfully!"
    else
        print_error "Failed to push code to repository."
        exit 1
    fi
else
    print_warning "Not a git repository. Skipping git operations."
fi

print_success "🎉 Deployment process completed!"
print_status "Next steps:"
echo "1. Go to your Render dashboard"
echo "2. Check the deployment status"
echo "3. Test the API endpoints"
echo "4. Update your frontend configuration if needed"

print_status "API will be available at: https://your-app-name.onrender.com"
print_status "Health check: https://your-app-name.onrender.com/health"