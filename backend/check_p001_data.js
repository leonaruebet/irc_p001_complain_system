/**
 * Check what data exists in p001 database
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function checkP001Data() {
  try {
    console.log('🔌 Connecting to p001 database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    console.log('🏢 Database Name:', mongoose.connection.db.databaseName);
    
    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📊 Available collections:');
    collections.forEach(col => {
      console.log(`  - ${col.name}`);
    });
    
    // Count documents in ai_complaint_tags
    const aiTagCount = await mongoose.connection.db.collection('ai_complaint_tags').countDocuments();
    console.log(`\n📊 AI complaint tags count: ${aiTagCount}`);
    
    if (aiTagCount > 0) {
      // Show sample documents
      const sampleDocs = await mongoose.connection.db.collection('ai_complaint_tags')
        .find({})
        .limit(3)
        .project({ complaint_id: 1, sentiment_analysis: 1, complaint_start_time: 1 })
        .toArray();
      
      console.log('📋 Sample AI complaint tags:');
      sampleDocs.forEach((doc, index) => {
        console.log(`  ${index + 1}. ${doc.complaint_id} - ${doc.sentiment_analysis?.overall_sentiment || 'N/A'} - ${doc.complaint_start_time}`);
      });
    }
    
    // Also check complaint_sessions
    const sessionCount = await mongoose.connection.db.collection('complaint_sessions').countDocuments();
    console.log(`\n📊 Complaint sessions count: ${sessionCount}`);
    
    if (sessionCount > 0) {
      const sampleSessions = await mongoose.connection.db.collection('complaint_sessions')
        .find({})
        .limit(3)
        .project({ complaint_id: 1, status: 1, start_time: 1 })
        .toArray();
      
      console.log('📋 Sample complaint sessions:');
      sampleSessions.forEach((doc, index) => {
        console.log(`  ${index + 1}. ${doc.complaint_id} - ${doc.status} - ${doc.start_time}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

checkP001Data();