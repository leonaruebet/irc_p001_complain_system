/**
 * Complaint Session Model
 * MongoDB schema for complaint sessions with embedded chat logs
 */

const { Schema, model } = require('mongoose');
const { nanoid } = require('nanoid');

// Chat Log sub-schema (embedded)
const ChatLogSchema = new Schema({
  timestamp: { 
    type: Date, 
    required: true,
    description: 'When the message was sent/received'
  },
  direction: { 
    type: String, 
    enum: ['user', 'bot', 'system'], 
    required: true,
    description: 'Message direction: user, bot, or system'
  },
  message_type: { 
    type: String, 
    enum: ['text', 'image', 'file', 'command', 'timeout'], 
    required: true,
    description: 'Type of message content'
  },
  message: { 
    type: String, 
    required: true,
    description: 'Message content or command'
  }
}, { 
  _id: false,
  versionKey: false
});

// Main Complaint Session schema
const ComplaintSessionSchema = new Schema({
  _id: { 
    type: String, 
    required: true,
    description: 'Unique session identifier'
  },
  complaint_id: { 
    type: String, 
    required: true, 
    unique: true,
    description: 'Human-friendly complaint ID (CMP-YYYY-MM-DD-####)'
  },
  user_id: { 
    type: String, 
    required: true, 
    index: true,
    description: 'LINE userId of the complainant'
  },
  status: { 
    type: String, 
    enum: ['open', 'submitted', 'cancelled'], 
    default: 'open', 
    index: true,
    description: 'Current status of the complaint session'
  },
  start_time: { 
    type: Date, 
    required: true,
    description: 'When the complaint session started'
  },
  end_time: { 
    type: Date,
    description: 'When the complaint session ended (submitted)'
  },
  department: { 
    type: String,
    description: 'Employee department (denormalized from employee record)'
  },
  chat_logs: { 
    type: [ChatLogSchema], 
    required: true,
    validate: {
      validator: function(logs) {
        return logs.length >= 1 && logs.length <= 500; // Guard against doc growth
      },
      message: 'Chat logs must contain 1-500 entries'
    },
    description: 'Embedded conversation history'
  },
  created_at: { 
    type: Date, 
    default: Date.now,
    description: 'Record creation timestamp'
  },
  updated_at: { 
    type: Date, 
    default: Date.now,
    description: 'Last update timestamp'
  }
}, {
  collection: 'complaint_sessions',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  versionKey: false
});

// Indexes as per schema specification
ComplaintSessionSchema.index({ status: 1, start_time: -1 });
ComplaintSessionSchema.index({ user_id: 1, start_time: -1 });
ComplaintSessionSchema.index({ complaint_id: 1 }, { unique: true });
ComplaintSessionSchema.index({ department: 1, start_time: -1 });

// Instance methods
ComplaintSessionSchema.methods.addChatLog = function(direction, messageType, message) {
  console.log(`💬 Adding chat log to session ${this._id}: ${direction} - ${messageType}`);
  
  // Guard against document size growth
  if (this.chat_logs.length >= 500) {
    throw new Error('Maximum chat logs limit reached (500 entries)');
  }
  
  this.chat_logs.push({
    timestamp: new Date(),
    direction,
    message_type: messageType,
    message
  });
  
  this.updated_at = new Date();
  return this.save();
};

ComplaintSessionSchema.methods.submit = function() {
  console.log(`📋 Submitting complaint session: ${this._id}`);
  
  this.status = 'submitted';
  this.end_time = new Date();
  this.updated_at = new Date();
  
  // Add submission confirmation to chat log
  this.chat_logs.push({
    timestamp: new Date(),
    direction: 'bot',
    message_type: 'text',
    message: `Your complaint has been submitted. ID: ${this.complaint_id}`
  });
  
  return this.save();
};

ComplaintSessionSchema.methods.cancel = function() {
  console.log(`❌ Cancelling complaint session: ${this._id}`);
  
  this.status = 'cancelled';
  this.end_time = new Date();
  this.updated_at = new Date();
  
  // Add cancellation note to chat log
  this.chat_logs.push({
    timestamp: new Date(),
    direction: 'system',
    message_type: 'text',
    message: `Session cancelled due to inactivity. ID: ${this.complaint_id}`
  });
  
  return this.save();
};

ComplaintSessionSchema.methods.getConversationSummary = function() {
  return {
    session_id: this._id,
    complaint_id: this.complaint_id,
    user_id: this.user_id,
    status: this.status,
    duration_minutes: this.end_time ? 
      Math.round((this.end_time - this.start_time) / (1000 * 60)) : null,
    message_count: this.chat_logs.length,
    department: this.department
  };
};

// Static methods
ComplaintSessionSchema.statics.generateComplaintId = function() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const sequence = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0');
  
  return `CMP-${year}-${month}-${day}-${sequence}`;
};

ComplaintSessionSchema.statics.generateSessionId = function() {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
  const randomId = nanoid(8);
  return `sess_${dateStr}_${randomId}`;
};

ComplaintSessionSchema.statics.createNewSession = async function(userId, department = null) {
  console.log(`🆕 Creating new complaint session for user: ${userId}`);
  
  // Check for existing open session
  const existingSession = await this.findOne({ 
    user_id: userId, 
    status: 'open' 
  });
  
  if (existingSession) {
    console.log(`⚠️ User ${userId} already has an open session: ${existingSession._id}`);
    return existingSession;
  }
  
  const sessionId = this.generateSessionId();
  const complaintId = this.generateComplaintId();
  
  // Ensure complaint_id uniqueness
  let attempts = 0;
  let uniqueComplaintId = complaintId;
  
  while (attempts < 5) {
    const existing = await this.findOne({ complaint_id: uniqueComplaintId });
    if (!existing) break;
    
    attempts++;
    uniqueComplaintId = this.generateComplaintId();
  }
  
  const newSession = new this({
    _id: sessionId,
    complaint_id: uniqueComplaintId,
    user_id: userId,
    status: 'open',
    start_time: new Date(),
    department,
    chat_logs: [{
      timestamp: new Date(),
      direction: 'user',
      message_type: 'command',
      message: '/complain'
    }]
  });
  
  return newSession.save();
};

ComplaintSessionSchema.statics.findActiveSession = function(userId) {
  return this.findOne({ user_id: userId, status: 'open' });
};

ComplaintSessionSchema.statics.getSessionsByStatus = function(status, limit = 50, skip = 0) {
  return this.find({ status })
    .select('complaint_id user_id department status start_time end_time')
    .sort({ start_time: -1 })
    .limit(limit)
    .skip(skip);
};

ComplaintSessionSchema.statics.getSessionsByDateRange = function(startDate, endDate) {
  return this.find({
    start_time: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ start_time: -1 });
};

// Pre-save middleware for logging
ComplaintSessionSchema.pre('save', function(next) {
  if (this.isNew) {
    console.log(`➕ Creating new complaint session: ${this._id} (${this.complaint_id})`);
  } else {
    console.log(`📝 Updating complaint session: ${this._id} (${this.complaint_id})`);
  }
  next();
});

// JSON Schema validation (MongoDB validator)
ComplaintSessionSchema.statics.getValidator = function() {
  return {
    $jsonSchema: {
      bsonType: "object",
      required: ["_id", "complaint_id", "user_id", "status", "start_time", "chat_logs"],
      properties: {
        _id: { bsonType: "string" },
        complaint_id: { bsonType: "string" },
        user_id: { bsonType: "string" },
        status: { enum: ["open", "submitted", "cancelled"] },
        start_time: { bsonType: "date" },
        end_time: { bsonType: ["date", "null"] },
        department: { bsonType: "string" },
        chat_logs: {
          bsonType: "array",
          minItems: 1,
          items: {
            bsonType: "object",
            required: ["timestamp", "direction", "message_type", "message"],
            properties: {
              timestamp: { bsonType: "date" },
              direction: { enum: ["user", "bot", "system"] },
              message_type: { enum: ["text", "image", "file", "command", "timeout"] },
              message: { bsonType: "string" }
            }
          }
        },
        created_at: { bsonType: "date" },
        updated_at: { bsonType: "date" }
      }
    }
  };
};

module.exports = model('ComplaintSession', ComplaintSessionSchema);