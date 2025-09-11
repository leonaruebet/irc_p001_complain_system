/**
 * Debug script to test AI complaint tag aggregations directly
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { AIComplaintTag } = require('./src/models');

async function debugAITags() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    console.log('🏢 Database Name:', mongoose.connection.db.databaseName);
    
    // Count total documents
    const totalCount = await AIComplaintTag.countDocuments();
    console.log(`📊 Total AI complaint tags: ${totalCount}`);
    
    // List all documents
    const allTags = await AIComplaintTag.find().select('complaint_id complaint_start_time sentiment_analysis.overall_sentiment').lean();
    console.log('📋 All AI tags:');
    allTags.forEach((tag, index) => {
      console.log(`  ${index + 1}. ${tag.complaint_id} - ${tag.sentiment_analysis?.overall_sentiment || 'N/A'} - ${tag.complaint_start_time}`);
    });
    
    // Test date range
    const startDate = new Date('2020-01-01T00:00:00.000Z');
    const endDate = new Date('2030-12-31T23:59:59.999Z');
    console.log(`📅 Testing date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    // Test the aggregation queries
    console.log('\n🔍 Testing getSentimentStatsByDateRange...');
    const sentimentStats = await AIComplaintTag.getSentimentStatsByDateRange(startDate, endDate);
    console.log('Result:', JSON.stringify(sentimentStats, null, 2));
    
    console.log('\n🔍 Testing getIssueStatsByCategory...');
    const issueStats = await AIComplaintTag.getIssueStatsByCategory(startDate, endDate);
    console.log('Result:', JSON.stringify(issueStats, null, 2));
    
    console.log('\n🔍 Testing getAllKeywordsForWordCloud...');
    const wordCloud = await AIComplaintTag.getAllKeywordsForWordCloud(startDate, endDate, null, 10);
    console.log('Result:', JSON.stringify(wordCloud, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

debugAITags();