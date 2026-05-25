#!/bin/bash
# Sample deployment script
# Demonstrates common bash patterns and operations

set -e  # Exit on error

# Configuration
DEPLOY_DIR="/var/www/app"
BACKUP_DIR="/var/backups"
LOG_FILE="/var/log/deploy.log"
TIMESTAMP=$(date '+%Y-%m-%d_%H-%M-%S')

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    print_error "This script must be run as root"
    exit 1
fi

# Create directories if they don't exist
mkdir -p "$DEPLOY_DIR" "$BACKUP_DIR"

# Backup current deployment
if [ -d "$DEPLOY_DIR/app" ]; then
    print_status "Creating backup of current deployment..."
    cp -r "$DEPLOY_DIR/app" "$BACKUP_DIR/app_$TIMESTAMP"
fi

# Pull latest code from git
print_status "Pulling latest code from repository..."
cd "$DEPLOY_DIR"
git pull origin main >> "$LOG_FILE" 2>&1 || print_warning "Git pull had warnings"

# Install dependencies
print_status "Installing dependencies..."
npm install --production >> "$LOG_FILE" 2>&1

# Build project
print_status "Building project..."
npm run build >> "$LOG_FILE" 2>&1

# Run tests
print_status "Running tests..."
npm test >> "$LOG_FILE" 2>&1 || {
    print_error "Tests failed!"
    exit 1
}

# Restart service
print_status "Restarting application service..."
systemctl restart app-service

# Verify deployment
print_status "Verifying deployment..."
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    print_status "Deployment successful!"
    echo "Deployment completed at $TIMESTAMP" >> "$LOG_FILE"
else
    print_error "Deployment verification failed"
    exit 1
fi

print_status "All done!"
