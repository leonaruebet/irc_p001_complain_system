#!/usr/bin/env node

/**
 * Script to create sample AI complaint tags for dashboard testing
 * Run with: node src/scripts/create_sample_ai_tags.js
 */

const mongoose = require('mongoose');
const config = require('../config');
const ComplaintSession = require('../models/complaint_session');
const AIComplaintTag = require('../models/ai_complaint_tag');

async function createSampleAITags() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(config.mongodb.uri);
    console.log('✅ Connected to MongoDB');

    // First, get existing complaint sessions
    const existingSessions = await ComplaintSession.find({}).limit(5);
    console.log(`📊 Found ${existingSessions.length} existing complaint sessions`);

    // If no existing sessions, create sample sessions with specific IDs we saw in logs
    if (existingSessions.length === 0) {
      console.log('📝 Creating sample complaint sessions for testing...');
      const sampleSessions = [
        {
          _id: 'sess_20250910_Gno8vATr',
          user_id: 'sample_user_1',
          complaint_id: 'CMP-2025-09-11-3246',
          status: 'submitted',
          start_time: new Date('2025-09-10T10:30:00Z'),
          end_time: new Date('2025-09-10T10:45:00Z'),
          department: 'IT',
          created_at: new Date('2025-09-10T10:30:00Z'),
          updated_at: new Date('2025-09-10T10:45:00Z'),
          chat_logs: [
            {
              timestamp: new Date('2025-09-10T10:30:00Z'),
              direction: 'user',
              message_type: 'command',
              message: '/complain'
            },
            {
              timestamp: new Date('2025-09-10T10:31:00Z'),
              direction: 'user',
              message_type: 'text',
              message: 'เหนื่อย hr ตอบช้า'
            },
            {
              timestamp: new Date('2025-09-10T10:32:00Z'),
              direction: 'user',
              message_type: 'command',
              message: '/submit'
            },
            {
              timestamp: new Date('2025-09-10T10:32:30Z'),
              direction: 'bot',
              message_type: 'text',
              message: 'Your complaint has been submitted. ID: CMP-2025-09-11-3246'
            }
          ]
        },
        {
          _id: 'sess_20250911_Test01',
          user_id: 'sample_user_2',
          complaint_id: 'CMP-2025-09-11-3247',
          status: 'submitted',
          start_time: new Date('2025-09-11T09:15:00Z'),
          end_time: new Date('2025-09-11T09:30:00Z'),
          department: 'Finance',
          created_at: new Date('2025-09-11T09:15:00Z'),
          updated_at: new Date('2025-09-11T09:30:00Z'),
          chat_logs: [
            {
              timestamp: new Date('2025-09-11T09:15:00Z'),
              direction: 'user',
              message_type: 'command',
              message: '/complain'
            },
            {
              timestamp: new Date('2025-09-11T09:16:00Z'),
              direction: 'user',
              message_type: 'text',
              message: 'เงินเดือนไม่พอใช้'
            },
            {
              timestamp: new Date('2025-09-11T09:17:00Z'),
              direction: 'user',
              message_type: 'command',
              message: '/submit'
            }
          ]
        },
        {
          _id: 'sess_20250911_Test02',
          user_id: 'sample_user_3',
          complaint_id: 'CMP-2025-09-11-3248',
          status: 'submitted',
          start_time: new Date('2025-09-11T08:45:00Z'),
          end_time: new Date('2025-09-11T09:00:00Z'),
          department: 'Operations',
          created_at: new Date('2025-09-11T08:45:00Z'),
          updated_at: new Date('2025-09-11T09:00:00Z'),
          chat_logs: [
            {
              timestamp: new Date('2025-09-11T08:45:00Z'),
              direction: 'user',
              message_type: 'command',
              message: '/complain'
            },
            {
              timestamp: new Date('2025-09-11T08:46:00Z'),
              direction: 'user',
              message_type: 'text',
              message: 'ทำงานล่วงเวลาบ่อยมาก เครียด'
            },
            {
              timestamp: new Date('2025-09-11T08:47:00Z'),
              direction: 'user',
              message_type: 'command',
              message: '/submit'
            }
          ]
        }
      ];

      for (const sessionData of sampleSessions) {
        const existingSession = await ComplaintSession.findOne({
          _id: sessionData._id
        });
        
        if (!existingSession) {
          const newSession = new ComplaintSession(sessionData);
          await newSession.save();
          console.log(`✅ Created sample session: ${sessionData._id}`);
        }
      }
      
      // Now get the sessions we just created
      const createdSessions = await ComplaintSession.find({}).limit(5);
      console.log(`📊 Using ${createdSessions.length} complaint sessions for AI tag creation`);
      existingSessions.length = 0;
      existingSessions.push(...createdSessions);
    }

    // Sample AI analysis data based on Thai complaints
    const sampleAnalyses = [
      {
        sentiment: {
          overall_sentiment: 'negative',
          confidence_score: 0.85,
          emotional_indicators: ['frustration', 'disappointment']
        },
        issue_classification: {
          primary_category: 'management_issues',
          secondary_categories: ['communication_problems'],
          severity_level: 'high',
          confidence_score: 0.92
        },
        keyword_extraction: {
          main_topics: ['hr', 'response_time', 'communication'],
          emotional_words: ['tired', 'slow', 'frustrated'],
          frequency_analysis: {
            'hr': 3,
            'slow': 2,
            'tired': 2,
            'response': 2
          }
        }
      },
      {
        sentiment: {
          overall_sentiment: 'negative',
          confidence_score: 0.78,
          emotional_indicators: ['financial_stress', 'dissatisfaction']
        },
        issue_classification: {
          primary_category: 'compensation_benefits',
          secondary_categories: ['financial_concerns'],
          severity_level: 'medium',
          confidence_score: 0.88
        },
        keyword_extraction: {
          main_topics: ['salary', 'cost_of_living', 'expenses'],
          emotional_words: ['not_enough', 'struggle', 'worried'],
          frequency_analysis: {
            'salary': 4,
            'money': 3,
            'expenses': 2,
            'enough': 2
          }
        }
      },
      {
        sentiment: {
          overall_sentiment: 'negative',
          confidence_score: 0.82,
          emotional_indicators: ['stress', 'overwhelmed']
        },
        issue_classification: {
          primary_category: 'workload_stress',
          secondary_categories: ['time_management', 'work_life_balance'],
          severity_level: 'high',
          confidence_score: 0.89
        },
        keyword_extraction: {
          main_topics: ['overtime', 'workload', 'stress', 'balance'],
          emotional_words: ['overwhelmed', 'exhausted', 'pressure'],
          frequency_analysis: {
            'work': 5,
            'overtime': 3,
            'stress': 3,
            'tired': 2
          }
        }
      },
      {
        sentiment: {
          overall_sentiment: 'negative',
          confidence_score: 0.75,
          emotional_indicators: ['unfairness', 'discrimination']
        },
        issue_classification: {
          primary_category: 'discrimination',
          secondary_categories: ['workplace_fairness'],
          severity_level: 'high',
          confidence_score: 0.91
        },
        keyword_extraction: {
          main_topics: ['promotion', 'fairness', 'gender', 'opportunity'],
          emotional_words: ['unfair', 'biased', 'discriminated'],
          frequency_analysis: {
            'promotion': 4,
            'unfair': 3,
            'opportunity': 2,
            'gender': 2
          }
        }
      },
      {
        sentiment: {
          overall_sentiment: 'neutral',
          confidence_score: 0.65,
          emotional_indicators: ['concern', 'suggestion']
        },
        issue_classification: {
          primary_category: 'workplace_environment',
          secondary_categories: ['safety_concerns'],
          severity_level: 'medium',
          confidence_score: 0.73
        },
        keyword_extraction: {
          main_topics: ['office', 'environment', 'temperature', 'comfort'],
          emotional_words: ['uncomfortable', 'cold', 'stuffy'],
          frequency_analysis: {
            'office': 3,
            'temperature': 3,
            'cold': 2,
            'air': 2
          }
        }
      }
    ];

    console.log('🤖 Creating sample AI complaint tags...');
    let createdCount = 0;

    for (let i = 0; i < Math.min(existingSessions.length, sampleAnalyses.length); i++) {
      const session = existingSessions[i];
      const analysisData = sampleAnalyses[i];

      // Check if AI tag already exists for this session
      const existingTag = await AIComplaintTag.findOne({
        complaint_session_id: session._id
      });

      if (existingTag) {
        console.log(`⚠️  AI tag already exists for session: ${session._id}`);
        continue;
      }

      // Create AI complaint tag
      const aiTag = new AIComplaintTag({
        complaint_session_id: session._id,
        analysis_timestamp: new Date(),
        ai_model_version: 'gemini-1.5-pro-sample',
        processing_status: 'completed',
        sentiment_analysis: analysisData.sentiment,
        issue_classification: analysisData.issue_classification,
        keyword_extraction: analysisData.keyword_extraction,
        confidence_metrics: {
          overall_confidence: (analysisData.sentiment.confidence_score + analysisData.issue_classification.confidence_score) / 2,
          sentiment_confidence: analysisData.sentiment.confidence_score,
          classification_confidence: analysisData.issue_classification.confidence_score,
          keyword_confidence: 0.80
        },
        metadata: {
          complaint_text_length: session.chat_logs ? 
            session.chat_logs
              .filter(log => log.direction === 'user')
              .map(log => log.message_content || '')
              .join(' ').length : 100,
          processing_time_ms: Math.floor(Math.random() * 3000) + 1000,
          language_detected: 'th',
          data_quality_score: 0.85
        }
      });

      await aiTag.save();
      createdCount++;
      console.log(`✅ Created AI tag for session: ${session._id}`);
    }

    console.log(`🎉 Successfully created ${createdCount} sample AI complaint tags!`);
    console.log('📊 You can now view the dashboard at: http://localhost:3000/dashboard');

  } catch (error) {
    console.error('❌ Error creating sample AI tags:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the script
if (require.main === module) {
  createSampleAITags();
}

module.exports = { createSampleAITags };