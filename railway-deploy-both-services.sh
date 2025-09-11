#!/bin/bash

# Railway Deployment Script - Both Services
# Deploys backend and frontend as separate services with correct source directories

set -e

echo "🚀 Deploying IRC Complaint System - Both Services"
echo "================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Generate secure production secrets
log_info "Generating production secrets..."
BETTER_AUTH_SECRET=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)
NEXTAUTH_SECRET=$(openssl rand -base64 32)

echo ""
log_info "Step 1: Configure Backend Service"
echo "=================================="

# Add backend service (if not exists)
log_info "Creating backend service..."
railway add --service backend || log_warning "Backend service may already exist"

# Configure backend service with source directory
log_info "Configuring backend service settings..."
railway service backend

# Set backend environment variables
log_info "Setting backend environment variables..."
railway variables \
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

echo ""
log_info "Step 2: Configure Frontend Service"
echo "==================================="

# Add frontend service (if not exists)
log_info "Creating frontend service..."
railway add --service frontend || log_warning "Frontend service may already exist"

# Configure frontend service
log_info "Configuring frontend service settings..."
railway service frontend

# Set frontend environment variables
log_info "Setting frontend environment variables..."
railway variables \
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

log_success "Frontend environment variables set"

echo ""
log_info "Step 3: Deploy Backend Service"
echo "==============================="

# Deploy backend from backend directory
log_info "Deploying backend service..."
cd backend
railway service backend
railway up --detach
BACKEND_URL=$(railway domain 2>/dev/null || echo "Backend deployment in progress...")
cd ..

log_success "Backend deployment initiated"
if [ "$BACKEND_URL" != "Backend deployment in progress..." ]; then
    log_info "Backend URL: $BACKEND_URL"
fi

echo ""
log_info "Step 4: Deploy Frontend Service"
echo "================================"

# Deploy frontend from web directory
log_info "Deploying frontend service..."
cd web
railway service frontend
railway up --detach
FRONTEND_URL=$(railway domain 2>/dev/null || echo "Frontend deployment in progress...")
cd ..

log_success "Frontend deployment initiated"
if [ "$FRONTEND_URL" != "Frontend deployment in progress..." ]; then
    log_info "Frontend URL: $FRONTEND_URL"
fi

echo ""
log_info "Step 5: Update Cross-Service URLs"
echo "=================================="

# Update backend with frontend URL
if [ "$FRONTEND_URL" != "Frontend deployment in progress..." ]; then
    log_info "Updating backend CORS settings..."
    railway service backend
    railway variables \
      --set "FRONTEND_URL=$FRONTEND_URL" \
      --set "CORS_ORIGIN=$FRONTEND_URL" \
      --set "BETTER_AUTH_URL=$FRONTEND_URL" \
      --set "NEXTAUTH_URL=$FRONTEND_URL"
    
    log_success "Backend CORS settings updated"
fi

# Update frontend with backend URL
if [ "$BACKEND_URL" != "Backend deployment in progress..." ]; then
    log_info "Updating frontend backend URL..."
    railway service frontend
    railway variables --set "BACKEND_URL=$BACKEND_URL"
    
    log_success "Frontend backend URL updated"
fi

echo ""
log_info "Step 6: Deployment Summary"
echo "=========================="

log_success "Both services deployment initiated!"

echo ""
log_info "Service URLs (when ready):"
echo "Backend: $BACKEND_URL"
echo "Frontend: $FRONTEND_URL"

echo ""
log_info "Next Steps:"
echo "1. Monitor deployments in Railway dashboard"
echo "2. Update LINE webhook URL to: $BACKEND_URL/api/line/webhook"
echo "3. Test both services when deployment completes"

echo ""
log_info "Manual Commands to Set Source Directories:"
echo "# Backend service:"
echo "railway service backend"
echo "railway service --source backend"
echo ""
echo "# Frontend service:"
echo "railway service frontend" 
echo "railway service --source web"

echo ""
log_success "Deployment script completed! 🚀"