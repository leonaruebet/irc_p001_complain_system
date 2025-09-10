/**
 * Simple test to check if Gemini API key is working
 */

require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGeminiAPI() {
  try {
    console.log('🔑 Testing Gemini API key...');
    console.log(`API Key (first 10 chars): ${process.env.GEMINI_API_KEY?.substring(0, 10)}...`);
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    // Make a very simple request
    const prompt = "Hello, please respond with just 'Hi' - this is a test.";
    console.log('🌐 Making simple API request...');
    console.log(`📏 Prompt: "${prompt}" (${prompt.length} chars, ~${Math.ceil(prompt.length / 4)} tokens)`);
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ API call successful!');
    console.log(`📝 Response: "${text}"`);
    console.log('📊 Usage metadata:', response.usageMetadata);
    
  } catch (error) {
    console.error('❌ API call failed:', error.message);
    
    if (error.status === 429) {
      console.log('\n🔍 Quota exceeded details:');
      console.log('This could be due to:');
      console.log('1. Daily quota already used (1,500 requests/day)');
      console.log('2. Per-minute quota exceeded (15 requests/minute)');
      console.log('3. Token quota exceeded (1M tokens/minute)');
      console.log('4. API key used in other projects');
      console.log('\n💡 Solutions:');
      console.log('- Wait for quota reset (usually 24 hours)');
      console.log('- Use a different API key');
      console.log('- Upgrade to paid plan');
    }
  }
}

testGeminiAPI();