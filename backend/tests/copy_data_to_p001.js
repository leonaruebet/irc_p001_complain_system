/**
 * Copy AI complaint tags from test database to p001 database
 */

const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://leonaruebet_db_user:C0YTmmTgUEBkNqjz@p001.tifm1cc.mongodb.net';

async function copyData() {
  let testConnection, p001Connection;
  
  try {
    console.log('🔌 Connecting to test database...');
    testConnection = mongoose.createConnection(`${MONGODB_URI}/test`);
    await testConnection.asPromise();
    
    console.log('🔌 Connecting to p001 database...');
    p001Connection = mongoose.createConnection(`${MONGODB_URI}/p001`);
    await p001Connection.asPromise();
    
    console.log('✅ Connected to both databases');
    
    // Get data from test database
    console.log('📊 Getting data from test database...');
    const testData = await testConnection.db.collection('ai_complaint_tags').find({}).toArray();
    console.log(`Found ${testData.length} AI complaint tags in test database`);
    
    if (testData.length === 0) {
      console.log('⚠️ No data to copy');
      return;
    }
    
    // Clear existing data in p001 database
    console.log('🗑️ Clearing existing data in p001 database...');
    await p001Connection.db.collection('ai_complaint_tags').deleteMany({});
    
    // Insert data into p001 database
    console.log('📥 Inserting data into p001 database...');
    await p001Connection.db.collection('ai_complaint_tags').insertMany(testData);
    
    console.log('✅ Successfully copied all AI complaint tags to p001 database!');
    
    // Verify the copy
    const p001Count = await p001Connection.db.collection('ai_complaint_tags').countDocuments();
    console.log(`📊 Verified: ${p001Count} documents in p001 database`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (testConnection) await testConnection.close();
    if (p001Connection) await p001Connection.close();
    console.log('🔌 Disconnected from databases');
  }
}

copyData();