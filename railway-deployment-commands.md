# Railway Deployment Commands - IRC Complaint System

## Prerequisites
You'll need to login to Railway first, then run these commands in sequence.

## Step 1: Login to Railway
```bash
railway login
```

## Step 2: Create New Project
```bash
# Create new project
railway new --name "irc-complaint-system"
```

## Step 3: Deploy Backend Service

### 3.1 Create Backend Service
```bash
# Create backend service
railway service create backend

# Switch to backend service
railway service use backend
```

### 3.2 Set Backend Environment Variables
```bash
# Generate secure secrets (run these first to get the values)
export BETTER_AUTH_SECRET=$(openssl rand -base64 32)
export JWT_SECRET=$(openssl rand -base64 32)
export SESSION_SECRET=$(openssl rand -base64 32)
export NEXTAUTH_SECRET=$(openssl rand -base64 32)

# Set backend environment variables
railway variables set NODE_ENV="production"
railway variables set MONGODB_URI="mongodb+srv://leonaruebet_db_user:C0YTmmTgUEBkNqjz@p001.tifm1cc.mongodb.net/p001?retryWrites=true&w=majority&appName=p001"
railway variables set MONGODB_DB_NAME="p001"
railway variables set LINE_CHANNEL_SECRET="379aef5585640dac10c167b7a84332ea"
railway variables set LINE_CHANNEL_ACCESS_TOKEN="0K7/+esWc/U5jXiubE/WtrjcgHBTJxgc4pAv3JjNRz5aAQ3CY2qHuan2qeawW+CxVOi56cV5KokLwV7ZVIODz5I+E9rVkANfwGrbuYh+q8F4w8J1aqDutXI392krJDnktrQE/Xoyj/lEJ689kX2WfwdB04t89/1O/w1cDnyilFU="
railway variables set GOOGLE_API_KEY="AIzaSyC3ZdYWcIznRSLMAHL-tsWfhlD2h7sppnw"
railway variables set GEMINI_API_KEY="AIzaSyC3ZdYWcIznRSLMAHL-tsWfhlD2h7sppnw"
railway variables set BETTER_AUTH_SECRET="$BETTER_AUTH_SECRET"
railway variables set JWT_SECRET="$JWT_SECRET"
railway variables set SESSION_SECRET="$SESSION_SECRET"
railway variables set NEXTAUTH_SECRET="$NEXTAUTH_SECRET"
```

### 3.3 Deploy Backend
```bash
# Change to backend directory
cd backend

# Deploy backend service
railway up --detach

# Get backend URL (save this for step 4)
railway domain

# Go back to root
cd ..
```

## Step 4: Deploy Frontend Service

### 4.1 Create Frontend Service
```bash
# Create frontend service
railway service create frontend

# Switch to frontend service
railway service use frontend
```

### 4.2 Set Frontend Environment Variables
```bash
# Replace BACKEND_URL_HERE with the URL from step 3.3
export BACKEND_URL="BACKEND_URL_HERE"

# Set frontend environment variables
railway variables set NODE_ENV="production"
railway variables set MONGODB_URI="mongodb+srv://leonaruebet_db_user:C0YTmmTgUEBkNqjz@p001.tifm1cc.mongodb.net/p001?retryWrites=true&w=majority&appName=p001"
railway variables set MONGODB_DB_NAME="p001"
railway variables set LINE_CHANNEL_SECRET="379aef5585640dac10c167b7a84332ea"
railway variables set LINE_CHANNEL_ACCESS_TOKEN="0K7/+esWc/U5jXiubE/WtrjcgHBTJxgc4pAv3JjNRz5aAQ3CY2qHuan2qeawW+CxVOi56cV5KokLwV7ZVIODz5I+E9rVkANfwGrbuYh+q8F4w8J1aqDutXI392krJDnktrQE/Xoyj/lEJ689kX2WfwdB04t89/1O/w1cDnyilFU="
railway variables set GOOGLE_API_KEY="AIzaSyC3ZdYWcIznRSLMAHL-tsWfhlD2h7sppnw"
railway variables set GEMINI_API_KEY="AIzaSyC3ZdYWcIznRSLMAHL-tsWfhlD2h7sppnw"
railway variables set BACKEND_URL="$BACKEND_URL"
railway variables set BETTER_AUTH_SECRET="$BETTER_AUTH_SECRET"
railway variables set JWT_SECRET="$JWT_SECRET"
railway variables set SESSION_SECRET="$SESSION_SECRET"
railway variables set NEXTAUTH_SECRET="$NEXTAUTH_SECRET"
```

### 4.3 Deploy Frontend
```bash
# Change to web directory
cd web

# Deploy frontend service
railway up --detach

# Get frontend URL (save this for step 5)
railway domain

# Go back to root
cd ..
```

## Step 5: Update CORS Settings
```bash
# Switch back to backend service
railway service use backend

# Replace FRONTEND_URL_HERE with the URL from step 4.3
export FRONTEND_URL="FRONTEND_URL_HERE"

# Update CORS and URL settings
railway variables set CORS_ORIGIN="$FRONTEND_URL"
railway variables set FRONTEND_URL="$FRONTEND_URL"
railway variables set BETTER_AUTH_URL="$FRONTEND_URL"
railway variables set NEXTAUTH_URL="$FRONTEND_URL"
```

## Step 6: Health Checks
```bash
# Wait for services to start
sleep 30

# Check backend health (replace with your backend URL)
curl YOUR_BACKEND_URL/health

# Check frontend (replace with your frontend URL)
curl YOUR_FRONTEND_URL/
```

## Step 7: Final Configuration

### Update LINE Webhook URL
1. Go to LINE Developers Console
2. Update webhook URL to: `YOUR_BACKEND_URL/api/line/webhook`

### Monitor Services
```bash
# View backend logs
railway service use backend
railway logs

# View frontend logs
railway service use frontend
railway logs

# Check service status
railway status
```

## Important Notes

1. **Replace URLs**: Make sure to replace `BACKEND_URL_HERE` and `FRONTEND_URL_HERE` with actual URLs from Railway
2. **Save Secrets**: Keep the generated secrets secure
3. **LINE Webhook**: Don't forget to update the LINE webhook URL
4. **Monitoring**: Use Railway dashboard for ongoing monitoring

## Quick Reference Commands
```bash
# View all services
railway services

# Switch between services
railway service use <service-name>

# View logs
railway logs

# View environment variables
railway variables

# Check deployment status
railway status
```