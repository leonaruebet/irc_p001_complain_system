/**
 * MongoDB Connection Setup
 * Establishes and manages database connection with error handling
 */

const mongoose = require('mongoose');
const config = require('../config');

class DatabaseConnection {
  constructor() {
    this.isConnected = false;
    this.retryCount = 0;
    this.maxRetries = 5;
    
    console.log('🗄️  DatabaseConnection initialized');
  }

  /**
   * Establishes connection to MongoDB
   * @returns {Promise<boolean>} - Connection success status
   */
  async connect() {
    try {
      console.log('🔌 Connecting to MongoDB...');
      console.log(`📍 Database: ${config.mongodb.dbName}`);
      
      const options = {
        dbName: config.mongodb.dbName,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      };

      await mongoose.connect(config.mongodb.uri, options);
      
      this.isConnected = true;
      this.retryCount = 0;
      
      console.log('✅ MongoDB connected successfully');
      console.log(`🏢 Database Name: ${mongoose.connection.db.databaseName}`);
      
      this.setupEventListeners();
      return true;
      
    } catch (error) {
      console.error('❌ MongoDB connection error:', error);
      
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.log(`🔄 Retrying connection (${this.retryCount}/${this.maxRetries}) in 5 seconds...`);
        
        setTimeout(() => {
          this.connect();
        }, 5000);
      } else {
        console.error('💀 Maximum connection retries exceeded. Exiting...');
        process.exit(1);
      }
      
      return false;
    }
  }

  /**
   * Sets up MongoDB event listeners
   */
  setupEventListeners() {
    mongoose.connection.on('connected', () => {
      console.log('📡 MongoDB connection established');
    });

    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error);
      this.isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
      this.isConnected = false;
    });

    // Handle application termination
    process.on('SIGINT', async () => {
      await this.disconnect();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await this.disconnect();
      process.exit(0);
    });
  }

  /**
   * Closes MongoDB connection
   * @returns {Promise<void>}
   */
  async disconnect() {
    try {
      console.log('🔌 Closing MongoDB connection...');
      await mongoose.connection.close();
      this.isConnected = false;
      console.log('✅ MongoDB connection closed');
    } catch (error) {
      console.error('❌ Error closing MongoDB connection:', error);
    }
  }

  /**
   * Gets connection status
   * @returns {boolean} - Connection status
   */
  getStatus() {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  /**
   * Gets database connection info
   * @returns {Object} - Connection information
   */
  getConnectionInfo() {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      database: mongoose.connection.db?.databaseName
    };
  }

  /**
   * Creates database indexes as specified in schema
   * @returns {Promise<void>}
   */
  async createIndexes() {
    try {
      console.log('📊 Creating database indexes...');
      
      const db = mongoose.connection.db;
      
      // Complaint Sessions indexes
      await db.collection('complaint_sessions').createIndex({ status: 1, start_time: -1 });
      await db.collection('complaint_sessions').createIndex({ user_id: 1, start_time: -1 });
      await db.collection('complaint_sessions').createIndex({ complaint_id: 1 }, { unique: true });
      await db.collection('complaint_sessions').createIndex({ department: 1, start_time: -1 });
      
      // Employees indexes
      await db.collection('employees').createIndex({ department: 1 });
      await db.collection('employees').createIndex({ active: 1 });
      
      // LINE Events Raw indexes (TTL - 60 days)
      await db.collection('line_events_raw').createIndex(
        { received_at: 1 }, 
        { expireAfterSeconds: 60 * 60 * 24 * 60 }
      );
      
      // HR Allowlist indexes
      await db.collection('hr_allowlist').createIndex({ email: 1 });
      await db.collection('hr_allowlist').createIndex({ roles: 1 });
      
      // Audit Reads indexes (optional)
      await db.collection('audit_reads').createIndex({ when: -1 });
      await db.collection('audit_reads').createIndex({ hr_subject: 1, when: -1 });
      
      console.log('✅ Database indexes created successfully');
      
    } catch (error) {
      console.error('❌ Error creating database indexes:', error);
    }
  }
}

// Export singleton instance
const dbConnection = new DatabaseConnection();
module.exports = dbConnection;