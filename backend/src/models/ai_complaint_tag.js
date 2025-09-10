/**
 * AI Complaint Tag Model
 * MongoDB schema for AI-generated analysis of complaint sessions
 * Maps 1:1 with complaint_sessions for AI sentiment analysis and issue classification
 */

const { Schema, model } = require('mongoose');

// Sentiment Analysis sub-schema
const SentimentAnalysisSchema = new Schema({
  overall_sentiment: {
    type: String,
    enum: ['positive', 'neutral', 'negative'],
    required: true,
    description: 'Overall sentiment classification of the complaint'
  },
  sentiment_score: {
    type: Number,
    min: -1,
    max: 1,
    required: true,
    description: 'Numerical sentiment score (-1 negative to +1 positive)'
  },
  confidence_level: {
    type: Number,
    min: 0,
    max: 1,
    required: true,
    description: 'AI confidence level in sentiment analysis (0-1)'
  }
}, { _id: false, versionKey: false });

// Issue Classification sub-schema
const IssueClassificationSchema = new Schema({
  primary_category: {
    type: String,
    enum: [
      'workplace_harassment', 'discrimination', 'unfair_treatment', 
      'work_conditions', 'management_issues', 'compensation_benefits',
      'workload_stress', 'safety_concerns', 'policy_violations',
      'communication_issues', 'other'
    ],
    required: true,
    description: 'Primary issue category identified by AI'
  },
  secondary_categories: [{
    type: String,
    enum: [
      'workplace_harassment', 'discrimination', 'unfair_treatment', 
      'work_conditions', 'management_issues', 'compensation_benefits',
      'workload_stress', 'safety_concerns', 'policy_violations',
      'communication_issues', 'other'
    ],
    description: 'Additional related issue categories'
  }],
  severity_level: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true,
    description: 'Assessed severity level of the complaint'
  },
  urgency_score: {
    type: Number,
    min: 1,
    max: 10,
    required: true,
    description: 'Urgency score from 1 (low) to 10 (critical)'
  }
}, { _id: false, versionKey: false });

// Key Phrases and Words for Word Cloud
const KeyPhrasesSchema = new Schema({
  keywords: [{
    word: {
      type: String,
      required: true,
      description: 'Individual keyword or phrase'
    },
    frequency: {
      type: Number,
      required: true,
      min: 1,
      description: 'How often this word/phrase appears'
    },
    relevance_score: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
      description: 'Relevance score for word cloud weighting'
    }
  }],
  key_phrases: [{
    type: String,
    maxlength: 100,
    description: 'Important phrases extracted from the complaint'
  }],
  emotional_indicators: [{
    type: String,
    description: 'Words/phrases indicating emotional state'
  }]
}, { _id: false, versionKey: false });

// AI Processing Metadata
const AIProcessingMetadataSchema = new Schema({
  model_version: {
    type: String,
    required: true,
    description: 'Gemini model version used for analysis'
  },
  processing_time_ms: {
    type: Number,
    required: true,
    description: 'Time taken to process the analysis in milliseconds'
  },
  tokens_used: {
    type: Number,
    description: 'Number of tokens used in the API call'
  },
  api_response_id: {
    type: String,
    description: 'Gemini API response ID for tracking'
  },
  processing_errors: [{
    type: String,
    description: 'Any errors encountered during processing'
  }]
}, { _id: false, versionKey: false });

// Main AI Complaint Tags schema
const AIComplaintTagSchema = new Schema({
  _id: {
    type: String,
    required: true,
    description: 'Unique AI tag identifier (aitag_sessionId format)'
  },
  complaint_session_id: {
    type: String,
    required: true,
    unique: true,
    index: true,
    description: 'Reference to complaint_sessions._id (1:1 mapping)'
  },
  complaint_id: {
    type: String,
    required: true,
    index: true,
    description: 'Human-friendly complaint ID for reference'
  },
  user_id: {
    type: String,
    required: true,
    index: true,
    description: 'LINE userId of the complainant (denormalized for queries)'
  },
  employee_display_name: {
    type: String,
    description: 'Employee display name (denormalized from employees collection)'
  },
  department: {
    type: String,
    index: true,
    description: 'Employee department (denormalized for filtering)'
  },
  
  // AI Analysis Results
  sentiment_analysis: {
    type: SentimentAnalysisSchema,
    required: true,
    description: 'Sentiment analysis results from AI'
  },
  issue_classification: {
    type: IssueClassificationSchema,
    required: true,
    description: 'Issue categorization and severity assessment'
  },
  key_phrases: {
    type: KeyPhrasesSchema,
    required: true,
    description: 'Keywords and phrases for word cloud generation'
  },
  
  // Complaint Context (for sorting and analysis)
  complaint_start_time: {
    type: Date,
    required: true,
    index: true,
    description: 'When the original complaint session started (for time-based sorting)'
  },
  complaint_end_time: {
    type: Date,
    index: true,
    description: 'When the original complaint session ended'
  },
  message_count: {
    type: Number,
    required: true,
    min: 1,
    description: 'Total number of messages in the complaint session'
  },
  complaint_text_length: {
    type: Number,
    required: true,
    description: 'Total character count of user messages'
  },
  
  // Processing Metadata
  ai_processing: {
    type: AIProcessingMetadataSchema,
    required: true,
    description: 'AI processing metadata and tracking information'
  },
  
  // Analysis Summary
  ai_summary: {
    type: String,
    maxlength: 1000,
    description: 'AI-generated summary of the complaint in 2-3 sentences'
  },
  recommended_actions: [{
    type: String,
    maxlength: 200,
    description: 'AI-suggested actions for HR to consider'
  }],
  
  // Timestamps
  created_at: {
    type: Date,
    default: Date.now,
    index: true,
    description: 'When this AI analysis was created'
  },
  updated_at: {
    type: Date,
    default: Date.now,
    description: 'When this AI analysis was last updated'
  }
}, {
  collection: 'ai_complaint_tags',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  versionKey: false
});

// Indexes for efficient queries
AIComplaintTagSchema.index({ complaint_session_id: 1 }, { unique: true });
AIComplaintTagSchema.index({ complaint_id: 1 });
AIComplaintTagSchema.index({ user_id: 1, complaint_start_time: -1 });
AIComplaintTagSchema.index({ department: 1, complaint_start_time: -1 });
AIComplaintTagSchema.index({ 'sentiment_analysis.overall_sentiment': 1, complaint_start_time: -1 });
AIComplaintTagSchema.index({ 'issue_classification.primary_category': 1, complaint_start_time: -1 });
AIComplaintTagSchema.index({ 'issue_classification.severity_level': 1, complaint_start_time: -1 });
AIComplaintTagSchema.index({ created_at: -1 });

// Instance methods
AIComplaintTagSchema.methods.getSummaryForDashboard = function() {
  return {
    complaint_id: this.complaint_id,
    employee_name: this.employee_display_name,
    department: this.department,
    sentiment: this.sentiment_analysis.overall_sentiment,
    sentiment_score: this.sentiment_analysis.sentiment_score,
    primary_issue: this.issue_classification.primary_category,
    severity: this.issue_classification.severity_level,
    urgency_score: this.issue_classification.urgency_score,
    complaint_date: this.complaint_start_time,
    ai_summary: this.ai_summary,
    message_count: this.message_count
  };
};

AIComplaintTagSchema.methods.getWordCloudData = function() {
  return {
    keywords: this.key_phrases.keywords.map(k => ({
      text: k.word,
      value: k.frequency,
      weight: k.relevance_score
    })),
    key_phrases: this.key_phrases.key_phrases,
    emotional_indicators: this.key_phrases.emotional_indicators
  };
};

// Static methods for analytics queries
AIComplaintTagSchema.statics.getSentimentStatsByDateRange = function(startDate, endDate, department = null) {
  const matchConditions = {
    complaint_start_time: { $gte: startDate, $lte: endDate }
  };
  
  if (department) {
    matchConditions.department = department;
  }
  
  return this.aggregate([
    { $match: matchConditions },
    {
      $group: {
        _id: '$sentiment_analysis.overall_sentiment',
        count: { $sum: 1 },
        avg_score: { $avg: '$sentiment_analysis.sentiment_score' },
        avg_urgency: { $avg: '$issue_classification.urgency_score' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

AIComplaintTagSchema.statics.getIssueStatsByCategory = function(startDate, endDate, department = null) {
  const matchConditions = {
    complaint_start_time: { $gte: startDate, $lte: endDate }
  };
  
  if (department) {
    matchConditions.department = department;
  }
  
  return this.aggregate([
    { $match: matchConditions },
    {
      $group: {
        _id: '$issue_classification.primary_category',
        count: { $sum: 1 },
        avg_severity_score: {
          $avg: {
            $switch: {
              branches: [
                { case: { $eq: ['$issue_classification.severity_level', 'low'] }, then: 1 },
                { case: { $eq: ['$issue_classification.severity_level', 'medium'] }, then: 2 },
                { case: { $eq: ['$issue_classification.severity_level', 'high'] }, then: 3 },
                { case: { $eq: ['$issue_classification.severity_level', 'critical'] }, then: 4 }
              ],
              default: 1
            }
          }
        },
        avg_urgency: { $avg: '$issue_classification.urgency_score' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

AIComplaintTagSchema.statics.getAllKeywordsForWordCloud = function(startDate, endDate, department = null, limit = 100) {
  const matchConditions = {
    complaint_start_time: { $gte: startDate, $lte: endDate }
  };
  
  if (department) {
    matchConditions.department = department;
  }
  
  return this.aggregate([
    { $match: matchConditions },
    { $unwind: '$key_phrases.keywords' },
    {
      $group: {
        _id: '$key_phrases.keywords.word',
        total_frequency: { $sum: '$key_phrases.keywords.frequency' },
        avg_relevance: { $avg: '$key_phrases.keywords.relevance_score' },
        complaint_count: { $sum: 1 }
      }
    },
    { $sort: { total_frequency: -1, avg_relevance: -1 } },
    { $limit: limit }
  ]);
};

AIComplaintTagSchema.statics.generateAITagId = function(complaintSessionId) {
  return `aitag_${complaintSessionId}`;
};

// Pre-save middleware for logging
AIComplaintTagSchema.pre('save', function(next) {
  if (this.isNew) {
    console.log(`🤖 Creating AI analysis for complaint: ${this.complaint_id}`);
  } else {
    console.log(`🔄 Updating AI analysis for complaint: ${this.complaint_id}`);
  }
  next();
});

// JSON Schema validation (MongoDB validator)
AIComplaintTagSchema.statics.getValidator = function() {
  return {
    $jsonSchema: {
      bsonType: "object",
      required: ["_id", "complaint_session_id", "complaint_id", "user_id", "sentiment_analysis", "issue_classification", "key_phrases", "complaint_start_time", "message_count", "complaint_text_length", "ai_processing"],
      properties: {
        _id: { bsonType: "string" },
        complaint_session_id: { bsonType: "string" },
        complaint_id: { bsonType: "string" },
        user_id: { bsonType: "string" },
        employee_display_name: { bsonType: "string" },
        department: { bsonType: "string" },
        sentiment_analysis: {
          bsonType: "object",
          required: ["overall_sentiment", "sentiment_score", "confidence_level"],
          properties: {
            overall_sentiment: { enum: ["positive", "neutral", "negative"] },
            sentiment_score: { bsonType: "number", minimum: -1, maximum: 1 },
            confidence_level: { bsonType: "number", minimum: 0, maximum: 1 }
          }
        },
        issue_classification: {
          bsonType: "object",
          required: ["primary_category", "severity_level", "urgency_score"],
          properties: {
            primary_category: { 
              enum: ["workplace_harassment", "discrimination", "unfair_treatment", 
                     "work_conditions", "management_issues", "compensation_benefits",
                     "workload_stress", "safety_concerns", "policy_violations",
                     "communication_issues", "other"]
            },
            severity_level: { enum: ["low", "medium", "high", "critical"] },
            urgency_score: { bsonType: "number", minimum: 1, maximum: 10 }
          }
        },
        key_phrases: {
          bsonType: "object",
          required: ["keywords"],
          properties: {
            keywords: {
              bsonType: "array",
              items: {
                bsonType: "object",
                required: ["word", "frequency", "relevance_score"],
                properties: {
                  word: { bsonType: "string" },
                  frequency: { bsonType: "number", minimum: 1 },
                  relevance_score: { bsonType: "number", minimum: 0, maximum: 1 }
                }
              }
            }
          }
        },
        complaint_start_time: { bsonType: "date" },
        complaint_end_time: { bsonType: ["date", "null"] },
        message_count: { bsonType: "number", minimum: 1 },
        complaint_text_length: { bsonType: "number" },
        ai_processing: {
          bsonType: "object",
          required: ["model_version", "processing_time_ms"],
          properties: {
            model_version: { bsonType: "string" },
            processing_time_ms: { bsonType: "number" },
            tokens_used: { bsonType: "number" },
            api_response_id: { bsonType: "string" }
          }
        },
        ai_summary: { bsonType: "string", maxLength: 1000 },
        created_at: { bsonType: "date" },
        updated_at: { bsonType: "date" }
      }
    }
  };
};

module.exports = model('AIComplaintTag', AIComplaintTagSchema);