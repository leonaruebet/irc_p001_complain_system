import mongoose, { Document, Schema } from 'mongoose';

export interface IHrAllowlist extends Document {
  _id: string;
  email: string;
  name: string;
  roles: ('hr_viewer' | 'hr_admin')[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const hrAllowlistSchema = new Schema<IHrAllowlist>({
  _id: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    index: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true
  },
  roles: {
    type: [String],
    enum: ['hr_viewer', 'hr_admin'],
    default: ['hr_viewer'],
    index: true
  },
  active: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true,
  _id: false
});

// Indexes
hrAllowlistSchema.index({ email: 1 });
hrAllowlistSchema.index({ roles: 1 });
hrAllowlistSchema.index({ active: 1 });

export default mongoose.models.HrAllowlist || mongoose.model<IHrAllowlist>('HrAllowlist', hrAllowlistSchema);