/**
 * Test AI processing with the real complaint session
 */

require('dotenv').config();
const AITaggingService = require('./src/services/ai_tagging_service');
const { ComplaintSession } = require('./src/models');
const DatabaseConnection = require('./src/database/connection');

async function testAIProcessing() {
  console.log('🧪 Testing AI processing with real complaint session...');
  
  try {
    // Connect to database
    console.log('🔌 Connecting to MongoDB...');
    await DatabaseConnection.connect();
    console.log('✅ Connected to MongoDB');
    
    // Find the existing complaint session
    const complaintSession = await ComplaintSession.findOne({ 
      complaint_id: 'CMP-2025-09-11-3315' 
    });
    
    if (!complaintSession) {
      console.log('❌ Complaint session CMP-2025-09-11-3315 not found');
      return;
    }
    
    console.log(`✅ Found complaint session: ${complaintSession.complaint_id}`);
    console.log(`📝 Message count: ${complaintSession.chat_logs.length}`);
    console.log(`👤 User messages:`, complaintSession.chat_logs
      .filter(log => log.direction === 'user' && log.message_type === 'text')
      .map(log => log.message)
    );
    
    // Initialize AI service
    console.log('🤖 Initializing AI Tagging Service...');
    const aiService = new AITaggingService();
    
    // Process with AI
    console.log('🔄 Processing with AI analysis...');
    const result = await aiService.processComplaintSession(complaintSession._id.toString());
    
    console.log('✅ AI processing completed!');
    console.log('📊 Result:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

testAIProcessing();