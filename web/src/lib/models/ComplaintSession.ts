import mongoose, { Document, Schema } from 'mongoose';

export interface IChatLog {
  timestamp: Date;
  direction: 'user' | 'bot';
  message_type: 'text' | 'image' | 'file' | 'command';
  message: string;
}

export interface IComplaintSession extends Document {
  _id: string;
  complaint_id: string;
  user_id: string;
  status: 'open' | 'submitted';
  start_time: Date;
  end_time?: Date;
  department?: string;
  chat_logs: IChatLog[];
  createdAt: Date;
  updatedAt: Date;
}

const chatLogSchema = new Schema<IChatLog>({
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  direction: {
    type: String,
    enum: ['user', 'bot'],
    required: true
  },
  message_type: {
    type: String,
    enum: ['text', 'image', 'file', 'command'],
    default: 'text'
  },
  message: {
    type: String,
    required: true
  }
}, { _id: false });

const complaintSessionSchema = new Schema<IComplaintSession>({
  _id: {
    type: String,
    required: true
  },
  complaint_id: {
    type: String,
    required: true,
    unique: true
  },
  user_id: {
    type: String,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['open', 'submitted'],
    default: 'open',
    index: true
  },
  start_time: {
    type: Date,
    required: true,
    default: Date.now
  },
  end_time: {
    type: Date
  },
  department: {
    type: String,
    index: true
  },
  chat_logs: {
    type: [chatLogSchema],
    required: true,
    default: []
  }
}, {
  timestamps: true,
  _id: false
});

// Compound indexes for efficient queries
complaintSessionSchema.index({ status: 1, start_time: -1 });
complaintSessionSchema.index({ user_id: 1, start_time: -1 });
complaintSessionSchema.index({ complaint_id: 1 }, { unique: true });

// Static methods
complaintSessionSchema.statics.generateComplaintId = function() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const timestamp = now.getTime().toString().slice(-4);
  
  return `CMP-${year}-${month}-${day}-${timestamp}`;
};

complaintSessionSchema.statics.generateSessionId = function() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  return `sess_${dateStr}_${randomStr}`;
};

export default mongoose.models.ComplaintSession || mongoose.model<IComplaintSession>('ComplaintSession', complaintSessionSchema);