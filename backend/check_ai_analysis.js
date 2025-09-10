/**
 * Check if AI analysis is saved in database
 */

require('dotenv').config();
const { AIComplaintTag } = require('./src/models');
const DatabaseConnection = require('./src/database/connection');

async function checkAIAnalysis() {
  console.log('🔍 Checking AI analysis in database...');
  
  try {
    // Connect to database
    await DatabaseConnection.connect();
    console.log('✅ Connected to MongoDB');
    
    // Check all AI complaint tags
    const tags = await AIComplaintTag.find().sort({ created_at: -1 }).limit(5);
    console.log(`📊 Found ${tags.length} AI complaint tags in database:`);
    
    tags.forEach((tag, index) => {
      console.log(`\n${index + 1}. Complaint: ${tag.complaint_id}`);
      console.log(`   Session ID: ${tag.complaint_session_id}`);
      console.log(`   Employee: ${tag.employee_display_name}`);
      console.log(`   Department: ${tag.department}`);
      console.log(`   Sentiment: ${tag.sentiment_analysis.overall_sentiment} (${tag.sentiment_analysis.sentiment_score})`);
      console.log(`   Primary Issue: ${tag.issue_classification.primary_category}`);
      console.log(`   Severity: ${tag.issue_classification.severity_level}`);
      console.log(`   Keywords: ${tag.key_phrases.keywords.map(k => k.word).join(', ')}`);
      console.log(`   Created: ${tag.created_at}`);
    });
    
    // Check for the specific complaint we just processed
    const targetComplaint = await AIComplaintTag.findOne({ complaint_id: 'CMP-2025-09-11-3315' });
    if (targetComplaint) {
      console.log('\n✅ Target complaint CMP-2025-09-11-3315 found in AI analysis:');
      console.log(`   Sentiment: ${targetComplaint.sentiment_analysis.overall_sentiment}`);
      console.log(`   Summary: ${targetComplaint.ai_summary}`);
    } else {
      console.log('\n❌ Target complaint CMP-2025-09-11-3315 not found in AI analysis');
    }
    
  } catch (error) {
    console.error('❌ Error checking AI analysis:', error.message);
  } finally {
    process.exit(0);
  }
}

checkAIAnalysis();