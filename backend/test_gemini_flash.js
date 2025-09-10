/**
 * Test Gemini API with Flash model instead of Pro
 */

require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGeminiFlash() {
  try {
    console.log('🔑 Testing Gemini API key with Flash model...');
    console.log(`API Key (first 10 chars): ${process.env.GEMINI_API_KEY?.substring(0, 10)}...`);
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Try Flash model instead of Pro
    console.log('🧪 Trying gemini-1.5-flash model...');
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = "Say 'Hello'";
    console.log('🌐 Making API request with Flash model...');
    console.log(`📏 Prompt: "${prompt}" (${prompt.length} chars)`);
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ Flash model API call successful!');
    console.log(`📝 Response: "${text}"`);
    console.log('📊 Usage metadata:', response.usageMetadata);
    
    return true;
    
  } catch (error) {
    console.error('❌ Flash model failed:', error.message);
    
    // Try gemini-pro model (older)
    try {
      console.log('\n🧪 Trying gemini-pro model (older version)...');
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      
      const result = await model.generateContent("Say 'Hello'");
      const response = await result.response;
      const text = response.text();
      
      console.log('✅ Gemini-pro model works!');
      console.log(`📝 Response: "${text}"`);
      return true;
      
    } catch (proError) {
      console.error('❌ Gemini-pro also failed:', proError.message);
      return false;
    }
  }
}

testGeminiFlash();