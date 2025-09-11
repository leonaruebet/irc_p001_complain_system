#!/bin/bash

# IRC Complaint System - Railway Deployment Script
# Author: Leo Naruebet
# Description: Automated deployment to Railway with proper environment setup

set -e

echo "🚀 IRC Complaint System - Railway Deployment"
echo "============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    log_error "Railway CLI not found. Installing..."
    npm install -g @railway/cli
    log_success "Railway CLI installed successfully"
fi

# Check Railway CLI version
RAILWAY_VERSION=$(railway --version)
log_info "Railway CLI version: $RAILWAY_VERSION"

# Step 1: Login to Railway
echo ""
log_info "Step 1: Railway Login"
echo "Please login to Railway when prompted..."
railway login

# Step 2: Create new Railway project
echo ""
log_info "Step 2: Creating Railway Project"
echo "Creating new project: irc-complaint-system"

# Check if already in a Railway project
if railway status &> /dev/null; then
    log_warning "Already linked to a Railway project"
    railway status
else
    log_info "Creating new Railway project..."
    railway new --name "irc-complaint-system"
fi

# Step 3: Deploy Backend Service
echo ""
log_info "Step 3: Deploying Backend Service"
echo "=================================="

# Create backend service
log_info "Creating backend service..."
railway add --service backend

# Set backend environment variables
log_info "Setting backend environment variables..."

# Generate secure production secrets
BETTER_AUTH_SECRET=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)
NEXTAUTH_SECRET=$(openssl rand -base64 32)

# Set environment variables for backend
railway variables --service backend \
  --set "NODE_ENV=production" \
  --set "MONGODB_URI=mongodb+srv://leonaruebet_db_user:C0YTmmTgUEBkNqjz@p001.tifm1cc.mongodb.net/p001?retryWrites=true&w=majority&appName=p001" \
  --set "MONGODB_DB_NAME=p001" \
  --set "LINE_CHANNEL_SECRET=379aef5585640dac10c167b7a84332ea" \
  --set "LINE_CHANNEL_ACCESS_TOKEN=0K7/+esWc/U5jXiubE/WtrjcgHBTJxgc4pAv3JjNRz5aAQ3CY2qHuan2qeawW+CxVOi56cV5KokLwV7ZVIODz5I+E9rVkANfwGrbuYh+q8F4w8J1aqDutXI392krJDnktrQE/Xoyj/lEJ689kX2WfwdB04t89/1O/w1cDnyilFU=" \
  --set "GOOGLE_API_KEY=AIzaSyC3ZdYWcIznRSLMAHL-tsWfhlD2h7sppnw" \
  --set "GEMINI_API_KEY=AIzaSyC3ZdYWcIznRSLMAHL-tsWfhlD2h7sppnw" \
  --set "BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET" \
  --set "JWT_SECRET=$JWT_SECRET" \
  --set "SESSION_SECRET=$SESSION_SECRET" \
  --set "NEXTAUTH_SECRET=$NEXTAUTH_SECRET"

log_success "Backend environment variables set"

# Link to backend service and deploy
log_info "Deploying backend service..."
cd backend
railway service backend
railway up --detach
BACKEND_URL=$(railway domain)
cd ..

log_success "Backend deployed successfully"
log_info "Backend URL: $BACKEND_URL"

# Step 4: Deploy Frontend Service
echo ""
log_info "Step 4: Deploying Frontend Service"
echo "==================================="

# Create frontend service
log_info "Creating frontend service..."
railway add --service frontend

# Set frontend environment variables
log_info "Setting frontend environment variables..."

railway variables --service frontend \
  --set "NODE_ENV=production" \
  --set "MONGODB_URI=mongodb+srv://leonaruebet_db_user:C0YTmmTgUEBkNqjz@p001.tifm1cc.mongodb.net/p001?retryWrites=true&w=majority&appName=p001" \
  --set "MONGODB_DB_NAME=p001" \
  --set "LINE_CHANNEL_SECRET=379aef5585640dac10c167b7a84332ea" \
  --set "LINE_CHANNEL_ACCESS_TOKEN=0K7/+esWc/U5jXiubE/WtrjcgHBTJxgc4pAv3JjNRz5aAQ3CY2qHuan2qeawW+CxVOi56cV5KokLwV7ZVIODz5I+E9rVkANfwGrbuYh+q8F4w8J1aqDutXI392krJDnktrQE/Xoyj/lEJ689kX2WfwdB04t89/1O/w1cDnyilFU=" \
  --set "GOOGLE_API_KEY=AIzaSyC3ZdYWcIznRSLMAHL-tsWfhlD2h7sppnw" \
  --set "GEMINI_API_KEY=AIzaSyC3ZdYWcIznRSLMAHL-tsWfhlD2h7sppnw" \
  --set "BACKEND_URL=$BACKEND_URL" \
  --set "BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET" \
  --set "JWT_SECRET=$JWT_SECRET" \
  --set "SESSION_SECRET=$SESSION_SECRET" \
  --set "NEXTAUTH_SECRET=$NEXTAUTH_SECRET"

log_success "Frontend environment variables set"

# Link to frontend service and deploy
log_info "Deploying frontend service..."
cd web
railway service frontend
railway up --detach
FRONTEND_URL=$(railway domain)
cd ..

log_success "Frontend deployed successfully"
log_info "Frontend URL: $FRONTEND_URL"

# Step 5: Update CORS settings
echo ""
log_info "Step 5: Updating CORS Settings"
echo "==============================="

# Switch back to backend service and update CORS
railway variables --service backend \
  --set "CORS_ORIGIN=$FRONTEND_URL" \
  --set "FRONTEND_URL=$FRONTEND_URL" \
  --set "BETTER_AUTH_URL=$FRONTEND_URL" \
  --set "NEXTAUTH_URL=$FRONTEND_URL"

log_success "CORS settings updated"

# Step 6: Health Checks
echo ""
log_info "Step 6: Health Checks"
echo "====================="

log_info "Waiting for services to start (30 seconds)..."
sleep 30

# Check backend health
log_info "Checking backend health..."
if curl -f "$BACKEND_URL/health" > /dev/null 2>&1; then
    log_success "Backend health check passed"
else
    log_warning "Backend health check failed - service may still be starting"
fi

# Check frontend
log_info "Checking frontend..."
if curl -f "$FRONTEND_URL/" > /dev/null 2>&1; then
    log_success "Frontend health check passed"
else
    log_warning "Frontend health check failed - service may still be starting"
fi

# Final Summary
echo ""
echo "🎉 Deployment Summary"
echo "===================="
log_success "Backend URL: $BACKEND_URL"
log_success "Frontend URL: $FRONTEND_URL"
echo ""
log_info "Next Steps:"
echo "1. Update LINE Developer Console webhook URL to: $BACKEND_URL/api/line/webhook"
echo "2. Test the application functionality"
echo "3. Monitor logs using: railway logs <service-name>"
echo "4. View Railway dashboard for monitoring and scaling options"
echo ""
log_success "IRC Complaint System deployed successfully to Railway! 🚀"

# Save deployment info
cat > deployment-info.txt << EOF
IRC Complaint System - Railway Deployment Info
===============================================

Deployment Date: $(date)
Backend URL: $BACKEND_URL
Frontend URL: $FRONTEND_URL
LINE Webhook URL: $BACKEND_URL/api/line/webhook

Environment Variables Set:
- NODE_ENV=production
- Database: MongoDB Atlas (existing)
- LINE Bot: Configured
- Authentication: Better Auth + NextAuth
- AI APIs: Google Gemini

Next Steps:
1. Update LINE webhook URL in LINE Developer Console
2. Test all application features
3. Monitor via Railway dashboard

EOF

log_success "Deployment info saved to deployment-info.txt"