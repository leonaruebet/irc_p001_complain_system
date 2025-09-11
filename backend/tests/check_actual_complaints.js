/**
 * Check actual complaint data with chat_logs for analytics
 */

const { MongoClient } = require('mongodb');
const path = require('path');

require('dotenv').config({ 
  path: path.join(__dirname, '../web/.env.local') 
});

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME || 'p001';

async function checkActualComplaints() {
  let client;
  
  try {
    console.log('🔍 Checking actual complaint data for analytics...\n');
    
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db(DB_NAME);
    
    // Check both collections
    const collections = ['complaint_sessions', 'complaintsessions'];
    
    for (const collName of collections) {
      const collection = db.collection(collName);
      const count = await collection.countDocuments();
      
      console.log(`📊 ${collName}: ${count} documents`);
      
      if (count > 0) {
        const complaints = await collection.find({}).toArray();
        
        console.log('\n📋 Sample Data Structure:');
        console.log('================================');
        
        complaints.forEach((complaint, index) => {
          console.log(`\n${index + 1}. Complaint ID: ${complaint.complaint_id}`);
          console.log(`   User: ${complaint.user_id}`);
          console.log(`   Status: ${complaint.status}`);
          console.log(`   Department: ${complaint.department || 'Unknown'}`);
          console.log(`   Start: ${complaint.start_time}`);
          console.log(`   Chat Logs: ${complaint.chat_logs ? complaint.chat_logs.length : 0} messages`);
          
          if (complaint.chat_logs && complaint.chat_logs.length > 0) {
            console.log('   User Messages:');
            complaint.chat_logs
              .filter(log => log.direction === 'user' && log.message_type === 'text')
              .forEach(log => {
                console.log(`     - "${log.message}"`);
              });
          }
        });
      }
      
      console.log('\n' + '='.repeat(50) + '\n');
    }
    
    // Summary for analytics
    console.log('📈 ANALYTICS SUMMARY:');
    console.log('====================');
    
    const sessionsCollection = db.collection('complaint_sessions');
    const allComplaints = await sessionsCollection.find({}).toArray();
    
    if (allComplaints.length > 0) {
      // Total sessions
      console.log(`Total Sessions: ${allComplaints.length}`);
      
      // Status breakdown
      const statusBreakdown = allComplaints.reduce((acc, complaint) => {
        acc[complaint.status] = (acc[complaint.status] || 0) + 1;
        return acc;
      }, {});
      console.log(`Status Breakdown:`, statusBreakdown);
      
      // Department breakdown
      const deptBreakdown = allComplaints.reduce((acc, complaint) => {
        const dept = complaint.department || 'Unknown';
        acc[dept] = (acc[dept] || 0) + 1;
        return acc;
      }, {});
      console.log(`Department Breakdown:`, deptBreakdown);
      
      // Date distribution
      const dateBreakdown = allComplaints.reduce((acc, complaint) => {
        const date = new Date(complaint.start_time).toDateString();
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});
      console.log(`Date Distribution:`, dateBreakdown);
      
      // User message analysis
      let totalUserMessages = 0;
      let userMessages = [];
      
      allComplaints.forEach(complaint => {
        if (complaint.chat_logs) {
          const userTexts = complaint.chat_logs
            .filter(log => log.direction === 'user' && log.message_type === 'text')
            .map(log => log.message);
          
          totalUserMessages += userTexts.length;
          userMessages = userMessages.concat(userTexts);
        }
      });
      
      console.log(`Total User Messages: ${totalUserMessages}`);
      console.log(`Sample User Messages for AI Analysis:`);
      userMessages.slice(0, 10).forEach((msg, index) => {
        console.log(`  ${index + 1}. "${msg}"`);
      });
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
  checkActualComplaints()
    .then(() => console.log('\n🏁 Done'))
    .catch(console.error);
}

module.exports = { checkActualComplaints };