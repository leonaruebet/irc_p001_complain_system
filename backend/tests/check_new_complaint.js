/**
 * Check the newly created complaint from LINE chat
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function checkNewComplaint() {
  try {
    console.log('🔌 Connecting to p001 database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find the latest complaint session
    const latestComplaint = await mongoose.connection.db.collection('complaint_sessions')
      .findOne(
        { complaint_id: 'CMP-2025-09-11-3315' },
        { sort: { start_time: -1 } }
      );
    
    if (latestComplaint) {
      console.log('✅ Found the complaint from LINE chat:');
      console.log(`Complaint ID: ${latestComplaint.complaint_id}`);
      console.log(`Status: ${latestComplaint.status}`);
      console.log(`Start Time: ${latestComplaint.start_time}`);
      console.log(`End Time: ${latestComplaint.end_time}`);
      console.log(`User ID: ${latestComplaint.user_id}`);
      console.log(`Chat Logs Count: ${latestComplaint.chat_logs.length}`);
      
      console.log('\n📋 Chat logs:');
      latestComplaint.chat_logs.forEach((log, index) => {
        console.log(`  ${index + 1}. ${log.direction} (${log.message_type}): ${log.message}`);
      });
      
      // Check if AI analysis exists for this complaint
      const aiAnalysis = await mongoose.connection.db.collection('ai_complaint_tags')
        .findOne({ complaint_session_id: latestComplaint._id });
      
      if (aiAnalysis) {
        console.log('\n✅ AI analysis found for this complaint');
        console.log(`Sentiment: ${aiAnalysis.sentiment_analysis.overall_sentiment}`);
        console.log(`Category: ${aiAnalysis.issue_classification.primary_category}`);
      } else {
        console.log('\n❌ No AI analysis found for this complaint (due to API quota limits)');
      }
      
    } else {
      console.log('❌ Complaint CMP-2025-09-11-3315 not found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

checkNewComplaint();