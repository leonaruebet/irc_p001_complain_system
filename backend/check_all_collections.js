/**
 * Check all collections in the database to see which ones have data
 */

const { MongoClient } = require('mongodb');
const path = require('path');

require('dotenv').config({ 
  path: path.join(__dirname, '../web/.env.local') 
});

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME || 'p001';

async function checkAllCollections() {
  let client;
  
  try {
    console.log('🔍 Checking all collections in database...\n');
    
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db(DB_NAME);
    const collections = await db.listCollections().toArray();
    
    console.log(`📊 Found ${collections.length} collections:`);
    console.log('=====================================');
    
    for (const collectionInfo of collections) {
      const collection = db.collection(collectionInfo.name);
      const count = await collection.countDocuments();
      const hasData = count > 0;
      
      console.log(`${hasData ? '✅' : '❌'} ${collectionInfo.name}: ${count} documents`);
      
      if (hasData) {
        // Show a sample document
        const sample = await collection.findOne();
        console.log(`   Sample keys: ${Object.keys(sample).join(', ')}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

if (require.main === module) {
  checkAllCollections()
    .then(() => console.log('\n🏁 Done'))
    .catch(console.error);
}