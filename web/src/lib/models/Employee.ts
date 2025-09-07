import mongoose, { Document, Schema } from 'mongoose';

export interface IEmployee extends Document {
  _id: string;
  display_name: string;
  department?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const employeeSchema = new Schema<IEmployee>({
  _id: {
    type: String,
    required: true
  },
  display_name: {
    type: String,
    required: true
  },
  department: {
    type: String,
    default: 'Unknown'
  },
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  _id: false
});

// Indexes
employeeSchema.index({ department: 1 });
employeeSchema.index({ active: 1 });

export default mongoose.models.Employee || mongoose.model<IEmployee>('Employee', employeeSchema);