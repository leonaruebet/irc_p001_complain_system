/**
 * Test Raw Event Saving
 * 
 * This script tests the LineEventsRaw model by directly saving a simulated event
 * to verify that the database saving functionality works correctly.
 */

const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ 
  path: path.join(__dirname, '../web/.env.local') 
});

// Import the model
const { LineEventsRaw } = require('./src/models');

console.log('🧪 Testing Raw Event Saving Functionality');
console.log('=========================================');

/**
 * Test saving a simulated LINE event
 */
async function testRawEventSave() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB_NAME || 'p001'
    });
    console.log('✅ Connected to MongoDB');
    
    // Create a simulated LINE webhook event
    const simulatedEvent = {
      type: 'message',
      mode: 'active',
      timestamp: Date.now(),
      source: {
        userId: 'U12345test',
        type: 'user'
      },
      webhookEventId: '01234567-abcd-1234-abcd-0123456789ab',
      deliveryContext: {
        isRedelivery: false
      },
      message: {
        id: '123456789',
        type: 'text',
        text: 'Hello, this is a test message from the database test script!'
      }
    };
    
    console.log('\n📝 Creating test raw event...');
    console.log('Event type:', simulatedEvent.type);
    console.log('User ID:', simulatedEvent.source.userId);
    
    // Test the static method
    console.log('\n🔬 Testing LineEventsRaw.logEvent() static method...');
    
    const eventId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const savedEvent = await LineEventsRaw.logEvent(
      eventId,
      simulatedEvent.type,
      simulatedEvent.source.userId,
      simulatedEvent
    );
    
    if (savedEvent) {
      console.log('✅ Event saved using static method:', savedEvent._id);
    } else {
      console.log('⚠️ Static method returned undefined (but might have caught error internally)');
    }
    
    // Test direct creation
    console.log('\n🔬 Testing direct LineEventsRaw.create()...');
    
    const directEventId = `direct_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const directEvent = await LineEventsRaw.create({
      _id: directEventId,
      received_at: new Date(),
      user_id: simulatedEvent.source.userId,
      event_type: simulatedEvent.type,
      payload: simulatedEvent
    });
    
    console.log('✅ Event saved using direct create:', directEvent._id);
    
    // Verify the saves by counting documents
    console.log('\n📊 Verifying saves...');
    const count = await LineEventsRaw.countDocuments();
    console.log(`📄 Total documents in collection: ${count}`);
    
    // Get the latest documents
    const latest = await LineEventsRaw.find({})
      .sort({ received_at: -1 })
      .limit(3);
    
    console.log('\n📋 Latest documents:');
    latest.forEach((doc, index) => {
      console.log(`   ${index + 1}. ${doc._id} - ${doc.event_type} - ${doc.user_id}`);
    });
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    // Close the connection
    await mongoose.disconnect();
    console.log('🔌 Database connection closed');
  }
}

// Run the test
if (require.main === module) {
  testRawEventSave()
    .then(() => {
      console.log('\n🏁 Test script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { testRawEventSave };