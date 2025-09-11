/**
 * MongoDB Database Checker for LINE Events Raw Collection
 * 
 * This script connects to the MongoDB database and checks:
 * 1. If line_events_raw collection exists and has documents
 * 2. Shows sample documents if they exist
 * 3. Verifies the document structure matches our schema
 */

const { MongoClient } = require('mongodb');
const mongoose = require('mongoose');
const path = require('path');

// Load environment variables from web/.env.local (shared config)
require('dotenv').config({ 
  path: path.join(__dirname, '../web/.env.local') 
});

// Database configuration
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME || 'p001';
const COLLECTION_NAME = 'line_events_raw';

console.log('🔍 LINE Events Raw Collection Checker');
console.log('=====================================');
console.log(`📍 Database: ${DB_NAME}`);
console.log(`📋 Collection: ${COLLECTION_NAME}`);
console.log(`🔗 URI: ${MONGODB_URI ? MONGODB_URI.substring(0, 50) + '...' : 'NOT SET'}`);
console.log('');

/**
 * Main function to check the database
 */
async function checkDatabase() {
  let client;
  
  try {
    console.log('🔌 Connecting to MongoDB...');
    
    // Connect using MongoDB native driver for direct queries
    client = new MongoClient(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    await client.connect();
    console.log('✅ Connected to MongoDB successfully');
    
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);
    
    // Check if collection exists and get stats
    console.log('\n📊 Collection Analysis:');
    console.log('=====================');
    
    // Get collection stats
    try {
      const stats = await db.stats();
      console.log(`📁 Database size: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`📦 Collections count: ${stats.collections}`);
    } catch (error) {
      console.log('⚠️  Could not get database stats:', error.message);
    }
    
    // Check if collection exists
    const collections = await db.listCollections().toArray();
    const collectionExists = collections.some(col => col.name === COLLECTION_NAME);
    
    if (!collectionExists) {
      console.log(`❌ Collection '${COLLECTION_NAME}' does not exist`);
      console.log('📋 Available collections:');
      collections.forEach(col => console.log(`   - ${col.name}`));
      return;
    }
    
    console.log('📋 Available collections in database:');
    collections.forEach(col => console.log(`   - ${col.name}`));
    
    console.log(`✅ Collection '${COLLECTION_NAME}' exists`);
    
    // Get document count
    const count = await collection.countDocuments();
    console.log(`📄 Document count: ${count}`);
    
    if (count === 0) {
      console.log('❌ No documents found in the collection');
      console.log('💡 This suggests that raw event logging may not be working for real events');
      return;
    }
    
    console.log('\n📋 Sample Documents:');
    console.log('===================');
    
    // Get latest 5 documents
    const samples = await collection
      .find({})
      .sort({ received_at: -1 })
      .limit(5)
      .toArray();
    
    samples.forEach((doc, index) => {
      console.log(`\n📄 Document ${index + 1}:`);
      console.log(`   ID: ${doc._id}`);
      console.log(`   Event Type: ${doc.event_type}`);
      console.log(`   User ID: ${doc.user_id || 'N/A'}`);
      console.log(`   Received At: ${doc.received_at ? new Date(doc.received_at).toISOString() : 'N/A'}`);
      console.log(`   Payload Keys: ${doc.payload ? Object.keys(doc.payload).join(', ') : 'N/A'}`);
    });
    
    console.log('\n🔍 Document Structure Verification:');
    console.log('===================================');
    
    // Verify schema structure
    const firstDoc = samples[0];
    if (firstDoc) {
      const requiredFields = ['_id', 'event_type', 'received_at', 'payload'];
      const optionalFields = ['user_id'];
      
      console.log('✅ Required fields:');
      requiredFields.forEach(field => {
        const exists = firstDoc.hasOwnProperty(field);
        console.log(`   ${exists ? '✅' : '❌'} ${field}: ${exists ? 'Present' : 'Missing'}`);
      });
      
      console.log('📋 Optional fields:');
      optionalFields.forEach(field => {
        const exists = firstDoc.hasOwnProperty(field);
        console.log(`   ${exists ? '✅' : '➖'} ${field}: ${exists ? firstDoc[field] : 'Not set'}`);
      });
    }
    
    console.log('\n📈 Event Type Statistics:');
    console.log('=========================');
    
    // Get event type distribution
    const eventTypes = await collection.aggregate([
      { $group: { _id: '$event_type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();
    
    eventTypes.forEach(type => {
      console.log(`   ${type._id}: ${type.count} events`);
    });
    
    console.log('\n⏰ Recent Activity:');
    console.log('==================');
    
    // Get recent activity (last 24 hours)
    const since24h = new Date(Date.now() - (24 * 60 * 60 * 1000));
    const recent24h = await collection.countDocuments({ 
      received_at: { $gte: since24h } 
    });
    
    const since1h = new Date(Date.now() - (1 * 60 * 60 * 1000));
    const recent1h = await collection.countDocuments({ 
      received_at: { $gte: since1h } 
    });
    
    console.log(`   Last 24 hours: ${recent24h} events`);
    console.log(`   Last 1 hour: ${recent1h} events`);
    
    if (recent24h > 0) {
      console.log('\n✅ CONCLUSION: Raw event logging is working correctly!');
      console.log('   Real LINE webhook events are being saved to the database.');
    } else {
      console.log('\n⚠️  CONCLUSION: No recent activity detected.');
      console.log('   Either no real events have occurred, or logging may have issues.');
    }
    
  } catch (error) {
    console.error('❌ Error connecting to database:', error.message);
    console.error('   Stack trace:', error.stack);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run the checker
if (require.main === module) {
  checkDatabase()
    .then(() => {
      console.log('\n🏁 Database check completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { checkDatabase };