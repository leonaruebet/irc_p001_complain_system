const path = require('path');

// Load environment variables from web/.env.local (shared config)
require('dotenv').config({ 
  path: path.join(__dirname, '../../../web/.env.local') 
});

// Also load from local .env file as fallback
require('dotenv').config({ 
  path: path.join(__dirname, '../../.env') 
});

const config = {
  // Database (using shared MongoDB configuration)
  mongodb: {
    uri: process.env.MONGODB_URI,
    dbName: process.env.MONGODB_DB_NAME || 'p001'
  },

  // LINE OA
  line: {
    channelSecret: process.env.LINE_CHANNEL_SECRET,
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
  },

  // Authentication (BetterAuth)
  auth: {
    betterAuth: {
      secret: process.env.BETTER_AUTH_SECRET,
      url: process.env.BETTER_AUTH_URL
    },
    session: {
      secret: process.env.SESSION_SECRET || 'fallback-session-secret-change-in-production'
    }
  },

  // Application
  app: {
    port: process.env.PORT || 3001,
    nodeEnv: process.env.NODE_ENV || 'development',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    backendUrl: process.env.BACKEND_URL || 'http://localhost:3001'
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:3000'
  },

  // AI Configuration
  ai: {
    geminiApiKey: process.env.GEMINI_API_KEY,
    googleApiKey: process.env.GOOGLE_API_KEY
  }
};

// Validation
const validateConfig = () => {
  const required = [
    'MONGODB_URI',
    'LINE_CHANNEL_SECRET', 
    'LINE_CHANNEL_ACCESS_TOKEN',
    'BETTER_AUTH_SECRET'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('Please fill in your .env.local file');
    return false;
  }
  
  console.log('✅ All required environment variables are set');
  return true;
};

module.exports = {
  ...config,
  validateConfig
};