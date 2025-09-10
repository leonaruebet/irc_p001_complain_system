#!/usr/bin/env node

/**
 * Script to create sample AI complaint tags for dashboard testing
 * Run with: node src/scripts/create_sample_ai_tags_fixed.js
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

    // Sample AI analysis data based on Thai complaints - with complete schema structure
    const sampleAnalyses = [
      {
        _id: 'aitag_sess_20250910_Gno8vATr',
        sentiment_analysis: {
          overall_sentiment: 'negative',
          sentiment_score: -0.7,
          confidence_level: 0.85
        },
        issue_classification: {
          primary_category: 'management_issues',
          secondary_categories: ['communication_issues'],
          severity_level: 'high',
          urgency_score: 7
        },
        key_phrases: {
          keywords: [
            { word: 'hr', frequency: 3, relevance_score: 0.9 },
            { word: 'slow', frequency: 2, relevance_score: 0.8 },
            { word: 'tired', frequency: 2, relevance_score: 0.7 },
            { word: 'response', frequency: 2, relevance_score: 0.8 }
          ],
          key_phrases: ['hr responds slowly', 'tired of waiting', 'communication issues'],
          emotional_indicators: ['tired', 'frustrated', 'disappointed']
        },
        ai_processing: {
          model_version: 'gemini-1.5-pro-sample',
          processing_time_ms: 2500,
          tokens_used: 150,
          api_response_id: 'resp_sample_001'
        },
        ai_summary: 'Employee expressing frustration with HR department\'s slow response times. Shows signs of workplace communication issues that need immediate attention.',
        recommended_actions: ['Improve HR response times', 'Review communication protocols', 'Follow up with employee']
      },
      {
        _id: 'aitag_sess_20250911_Test01',
        sentiment_analysis: {
          overall_sentiment: 'negative',
          sentiment_score: -0.6,
          confidence_level: 0.78
        },
        issue_classification: {
          primary_category: 'compensation_benefits',
          secondary_categories: ['work_conditions'],
          severity_level: 'medium',
          urgency_score: 5
        },
        key_phrases: {
          keywords: [
            { word: 'salary', frequency: 4, relevance_score: 0.95 },
            { word: 'money', frequency: 3, relevance_score: 0.9 },
            { word: 'enough', frequency: 2, relevance_score: 0.8 },
            { word: 'expenses', frequency: 2, relevance_score: 0.75 }
          ],
          key_phrases: ['salary not enough', 'financial concerns', 'living expenses'],
          emotional_indicators: ['worried', 'stressed', 'concerned']
        },
        ai_processing: {
          model_version: 'gemini-1.5-pro-sample',
          processing_time_ms: 1800,
          tokens_used: 120,
          api_response_id: 'resp_sample_002'
        },
        ai_summary: 'Employee reporting financial difficulties with current compensation. May need salary review or financial counseling support.',
        recommended_actions: ['Review salary structure', 'Consider cost of living adjustments', 'Provide financial counseling resources']
      },
      {
        _id: 'aitag_sess_20250911_Test02',
        sentiment_analysis: {
          overall_sentiment: 'negative',
          sentiment_score: -0.8,
          confidence_level: 0.92
        },
        issue_classification: {
          primary_category: 'workload_stress',
          secondary_categories: ['work_conditions'],
          severity_level: 'high',
          urgency_score: 8
        },
        key_phrases: {
          keywords: [
            { word: 'overtime', frequency: 5, relevance_score: 0.95 },
            { word: 'work', frequency: 4, relevance_score: 0.9 },
            { word: 'stress', frequency: 3, relevance_score: 0.9 },
            { word: 'often', frequency: 2, relevance_score: 0.8 }
          ],
          key_phrases: ['frequent overtime', 'work stress', 'too much work'],
          emotional_indicators: ['stressed', 'overwhelmed', 'exhausted']
        },
        ai_processing: {
          model_version: 'gemini-1.5-pro-sample',
          processing_time_ms: 2100,
          tokens_used: 140,
          api_response_id: 'resp_sample_003'
        },
        ai_summary: 'Employee experiencing high stress due to frequent overtime work. Shows signs of burnout and needs immediate workload assessment.',
        recommended_actions: ['Review workload distribution', 'Assess overtime policies', 'Consider additional staffing', 'Provide stress management support']
      }
    ];

    console.log('🤖 Creating sample AI complaint tags...');
    let createdCount = 0;

    for (let i = 0; i < Math.min(existingSessions.length, sampleAnalyses.length); i++) {
      const session = existingSessions[i];
      const analysisTemplate = sampleAnalyses[i];

      // Check if AI tag already exists for this session
      const existingTag = await AIComplaintTag.findOne({
        complaint_session_id: session._id
      });

      if (existingTag) {
        console.log(`⚠️  AI tag already exists for session: ${session._id}`);
        continue;
      }

      // Calculate message count and text length from actual session data
      const userMessages = session.chat_logs.filter(log => log.direction === 'user');
      const messageCount = session.chat_logs.length;
      const complaintTextLength = userMessages
        .map(log => log.message || '')
        .join(' ')
        .length;

      // Create AI complaint tag with complete schema
      const aiTagData = {
        _id: analysisTemplate._id,
        complaint_session_id: session._id,
        complaint_id: session.complaint_id,
        user_id: session.user_id,
        employee_display_name: `Employee ${i + 1}`,
        department: session.department,
        sentiment_analysis: analysisTemplate.sentiment_analysis,
        issue_classification: analysisTemplate.issue_classification,
        key_phrases: analysisTemplate.key_phrases,
        complaint_start_time: session.start_time,
        complaint_end_time: session.end_time,
        message_count: messageCount,
        complaint_text_length: complaintTextLength,
        ai_processing: analysisTemplate.ai_processing,
        ai_summary: analysisTemplate.ai_summary,
        recommended_actions: analysisTemplate.recommended_actions,
        created_at: new Date(),
        updated_at: new Date()
      };

      const aiTag = new AIComplaintTag(aiTagData);
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