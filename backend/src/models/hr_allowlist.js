/**
 * HR Allowlist Model
 * MongoDB schema for HR authorization (read-only viewers)
 */

const { Schema, model } = require('mongoose');

const HrAllowlistSchema = new Schema({
  _id: { 
    type: String, 
    required: true,
    description: 'IdP subject or OIDC sub (unique identifier from SSO)'
  },
  email: { 
    type: String, 
    required: true, 
    index: true,
    validate: {
      validator: function(email) {
        return /^.+@.+\..+$/.test(email);
      },
      message: 'Invalid email format'
    },
    description: 'HR staff email address'
  },
  name: { 
    type: String,
    description: 'Full name of HR staff member'
  },
  roles: { 
    type: [String], 
    enum: ['hr_viewer'], 
    default: ['hr_viewer'], 
    index: true,
    validate: {
      validator: function(roles) {
        return roles.length >= 1;
      },
      message: 'At least one role must be assigned'
    },
    description: 'Assigned roles (currently only hr_viewer supported)'
  },
  created_at: { 
    type: Date, 
    default: Date.now,
    description: 'When HR user was added to allowlist'
  }
}, {
  collection: 'hr_allowlist',
  versionKey: false
});

// Indexes as per schema specification
HrAllowlistSchema.index({ email: 1 });
HrAllowlistSchema.index({ roles: 1 });

// Instance methods
HrAllowlistSchema.methods.hasRole = function(role) {
  return this.roles.includes(role);
};

HrAllowlistSchema.methods.isViewer = function() {
  return this.hasRole('hr_viewer');
};

HrAllowlistSchema.methods.updateInfo = function(name, email) {
  console.log(`👤 Updating HR user info: ${this._id}`);
  
  if (name) this.name = name;
  if (email && /^.+@.+\..+$/.test(email)) this.email = email;
  
  return this.save();
};

// Static methods
HrAllowlistSchema.statics.isAuthorized = async function(subjectId, requiredRole = 'hr_viewer') {
  const user = await this.findById(subjectId);
  return user && user.hasRole(requiredRole);
};

HrAllowlistSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

HrAllowlistSchema.statics.addHrUser = async function(subjectId, email, name = null) {
  console.log(`➕ Adding HR user to allowlist: ${email}`);
  
  const hrUser = new this({
    _id: subjectId,
    email: email.toLowerCase(),
    name: name,
    roles: ['hr_viewer']
  });
  
  return hrUser.save();
};

HrAllowlistSchema.statics.removeHrUser = async function(subjectId) {
  console.log(`➖ Removing HR user from allowlist: ${subjectId}`);
  return this.findByIdAndDelete(subjectId);
};

HrAllowlistSchema.statics.getAllViewers = function() {
  return this.find({ roles: 'hr_viewer' })
    .select('email name created_at')
    .sort({ created_at: -1 });
};

// Pre-save middleware for logging
HrAllowlistSchema.pre('save', function(next) {
  if (this.isNew) {
    console.log(`➕ Adding new HR user to allowlist: ${this.email} (${this._id})`);
  } else {
    console.log(`📝 Updating HR user: ${this.email} (${this._id})`);
  }
  next();
});

// JSON Schema validation (MongoDB validator)
HrAllowlistSchema.statics.getValidator = function() {
  return {
    $jsonSchema: {
      bsonType: "object",
      required: ["_id", "email", "roles"],
      properties: {
        _id: { bsonType: "string" },
        email: { 
          bsonType: "string", 
          pattern: "^.+@.+\\..+$" 
        },
        name: { bsonType: "string" },
        roles: { 
          bsonType: "array", 
          items: { enum: ["hr_viewer"] }, 
          minItems: 1 
        },
        created_at: { bsonType: "date" }
      }
    }
  };
};

module.exports = model('HrAllowlist', HrAllowlistSchema);