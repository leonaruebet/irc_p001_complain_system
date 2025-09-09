/**
 * Employee Model
 * MongoDB schema for employee registry by LINE userId
 */

const { Schema, model } = require('mongoose');

const EmployeeSchema = new Schema({
  _id: { 
    type: String, 
    required: true,
    description: 'LINE userId as primary key'
  },
  display_name: { 
    type: String, 
    required: true,
    description: 'Employee display name from LINE profile'
  },
  department: { 
    type: String,
    description: 'Employee department for filtering and analytics'
  },
  active: { 
    type: Boolean, 
    default: true,
    index: true,
    description: 'Whether employee is currently active'
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
  collection: 'employees',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  versionKey: false
});

// Indexes as per schema specification
EmployeeSchema.index({ department: 1 });
EmployeeSchema.index({ active: 1 });

// Instance methods
EmployeeSchema.methods.updateProfile = function(profileData) {
  console.log(`👤 Updating employee profile: ${this._id}`);
  
  if (profileData.display_name) this.display_name = profileData.display_name;
  if (profileData.department) this.department = profileData.department;
  
  this.updated_at = new Date();
  return this.save();
};

EmployeeSchema.methods.deactivate = function() {
  console.log(`🔒 Deactivating employee: ${this._id}`);
  this.active = false;
  this.updated_at = new Date();
  return this.save();
};

// Static methods
EmployeeSchema.statics.findByDepartment = function(department) {
  return this.find({ department, active: true });
};

EmployeeSchema.statics.createOrUpdate = async function(lineUserId, profileData) {
  console.log(`🔄 Creating or updating employee: ${lineUserId}`);
  
  const employee = await this.findById(lineUserId);
  
  if (employee) {
    // Update existing employee
    return employee.updateProfile(profileData);
  } else {
    // Create new employee
    return this.create({
      _id: lineUserId,
      display_name: profileData.display_name || 'Unknown User',
      department: profileData.department || 'Unknown',
      active: true
    });
  }
};

// Pre-save middleware for logging
EmployeeSchema.pre('save', function(next) {
  if (this.isNew) {
    console.log(`➕ Creating new employee: ${this._id} (${this.display_name})`);
  } else {
    console.log(`📝 Updating employee: ${this._id} (${this.display_name})`);
  }
  next();
});

// JSON Schema validation (MongoDB validator)
EmployeeSchema.statics.getValidator = function() {
  return {
    $jsonSchema: {
      bsonType: "object",
      required: ["_id", "display_name", "active"],
      properties: {
        _id: { bsonType: "string" },
        display_name: { bsonType: "string" },
        department: { bsonType: "string" },
        active: { bsonType: "bool" },
        created_at: { bsonType: "date" },
        updated_at: { bsonType: "date" }
      }
    }
  };
};

module.exports = model('Employee', EmployeeSchema);