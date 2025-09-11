/**
 * Test the size of the prompt being sent to Gemini API
 */

require('dotenv').config();
const mongoose = require('mongoose');
const AITaggingService = require('./src/services/ai_tagging_service');
const { ComplaintSession, Employee } = require('./src/models');

async function testPromptSize() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Get the complaint session that failed
    const complaintSession = await ComplaintSession.findById('sess_20250910_1ADScWdE');
    if (!complaintSession) {
      console.log('❌ Complaint session not found');
      return;
    }
    
    console.log(`✅ Found complaint session: ${complaintSession.complaint_id}`);
    console.log(`📊 Chat logs count: ${complaintSession.chat_logs.length}`);
    
    // Get employee info
    const employee = await Employee.findById(complaintSession.user_id);
    console.log(`👤 Employee: ${employee ? employee.display_name : 'Not found'}`);
    
    // Create the AI service and generate the prompt
    const aiService = new AITaggingService();
    const prompt = aiService.createAnalysisPrompt(complaintSession, employee);
    
    console.log(`📏 Prompt character length: ${prompt.length}`);
    console.log(`📏 Prompt word count: ${prompt.split(' ').length}`);
    console.log(`📏 Estimated tokens (rough): ${Math.ceil(prompt.length / 4)}`);
    
    console.log('\n📋 First 500 characters of prompt:');
    console.log(prompt.substring(0, 500) + '...\n');
    
    console.log('📋 Last 500 characters of prompt:');
    console.log('...' + prompt.substring(prompt.length - 500));
    
    // Check the user messages specifically
    const userMessages = complaintSession.chat_logs
      .filter(log => log.direction === 'user' && log.message_type === 'text')
      .map(log => aiService.cleanUserMessage(log.message))
      .filter(message => message.length > 0);
    
    console.log(`\n💬 User messages count: ${userMessages.length}`);
    console.log('💬 User messages:');
    userMessages.forEach((msg, index) => {
      console.log(`  ${index + 1}. "${msg}"`);
    });
    
    // Check if this might be hitting free tier limits
    console.log('\n🔍 Google Gemini Free Tier Limits:');
    console.log('- Requests per minute: 15');
    console.log('- Requests per day: 1,500');
    console.log('- Tokens per minute: 1M (input) + 8K (output)');
    console.log(`- Current prompt tokens (est.): ${Math.ceil(prompt.length / 4)}`);
    
    if (Math.ceil(prompt.length / 4) > 1000000) {
      console.log('⚠️ Prompt might be too large for free tier token limit!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testPromptSize();