/**
 * AI Tagging Service
 * Integrates with Google Gemini API for complaint sentiment analysis and issue classification
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { AIComplaintTag, Employee } = require('../models');

class AITaggingService {
  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Fixed JSON schema for AI responses
    this.responseSchema = {
      sentiment_analysis: {
        overall_sentiment: "positive|neutral|negative",
        sentiment_score: "number between -1 and 1",
        confidence_level: "number between 0 and 1"
      },
      issue_classification: {
        primary_category: "workplace_harassment|discrimination|unfair_treatment|work_conditions|management_issues|compensation_benefits|workload_stress|safety_concerns|policy_violations|communication_issues|other",
        secondary_categories: ["array of categories from same enum"],
        severity_level: "low|medium|high|critical",
        urgency_score: "number between 1 and 10"
      },
      key_phrases: {
        keywords: [
          {
            word: "string",
            frequency: "number (min 1)",
            relevance_score: "number between 0 and 1"
          }
        ],
        key_phrases: ["array of important phrases"],
        emotional_indicators: ["array of emotional words/phrases"]
      },
      ai_summary: "string (max 1000 characters)",
      recommended_actions: ["array of recommended actions (max 200 chars each)"]
    };
  }

  /**
   * Clean user message by removing bot commands and trimming whitespace
   * @param {string} message - Raw user message
   * @returns {string} Cleaned message content
   */
  cleanUserMessage(message) {
    if (!message) return '';
    
    // Remove bot commands (case insensitive) from start of message
    // Commands to remove: /complain, /submit
    const cleaned = message
      .replace(/^\/complain\s*/i, '')
      .replace(/^\/submit\s*/i, '')
      .trim();
    
    // Return empty string if message was only commands
    return cleaned || '';
  }

  /**
   * Create the AI analysis prompt for Gemini
   * @param {Object} complaintSession - The complaint session object
   * @param {Object} employee - The employee object
   * @returns {string} The formatted prompt for AI analysis
   */
  createAnalysisPrompt(complaintSession, employee) {
    // Get only user messages (direction = 'user'), clean them, and filter out empty ones
    const userMessages = complaintSession.chat_logs
      .filter(log => log.direction === 'user' && log.message_type === 'text')
      .map(log => this.cleanUserMessage(log.message))
      .filter(message => message.length > 0) // Remove empty messages after cleaning
      .join('\n');

    // Get bot responses for context (optional)
    const botMessages = complaintSession.chat_logs
      .filter(log => log.direction === 'bot' && log.message_type === 'text')
      .map(log => log.message)
      .join('\n');

    return `
You are an AI assistant specialized in analyzing employee workplace complaints for HR departments. 

Please analyze the following complaint conversation and provide a structured JSON response.

COMPLAINT DETAILS:
- Complaint ID: ${complaintSession.complaint_id}
- Employee: ${employee ? employee.display_name : 'Unknown'} (Department: ${employee ? employee.department : 'Unknown'})
- Session Duration: ${complaintSession.end_time ? Math.round((complaintSession.end_time - complaintSession.start_time) / (1000 * 60)) : 'Ongoing'} minutes
- Total Messages: ${complaintSession.chat_logs.length}

USER MESSAGES (Employee complaints):
${userMessages}

BOT RESPONSES:
${botMessages}

ANALYSIS REQUIREMENTS:
1. Sentiment Analysis: Determine overall sentiment (positive/neutral/negative), sentiment score (-1 to 1), and confidence level (0 to 1)
2. Issue Classification: Identify primary category, any secondary categories, severity level (low/medium/high/critical), and urgency score (1-10)
3. Key Phrases: Extract important keywords with frequency and relevance, key phrases, and emotional indicators
4. Summary: Provide a concise 2-3 sentence summary of the complaint
5. Recommended Actions: Suggest 2-4 specific actions HR should consider

CATEGORY DEFINITIONS:
- workplace_harassment: Bullying, inappropriate behavior, hostile work environment
- discrimination: Based on protected characteristics (race, gender, age, etc.)
- unfair_treatment: Favoritism, unequal treatment, bias
- work_conditions: Physical environment, safety, equipment, workspace issues  
- management_issues: Poor supervision, leadership problems, communication gaps
- compensation_benefits: Pay disputes, benefits issues, overtime problems
- workload_stress: Excessive work, unrealistic deadlines, work-life balance
- safety_concerns: Physical safety, health hazards, security issues
- policy_violations: Company policy breaches, procedural issues
- communication_issues: Information gaps, unclear expectations, miscommunication
- other: Issues that don't fit other categories

RESPONSE FORMAT (must be valid JSON):
${JSON.stringify(this.responseSchema, null, 2)}

Please respond with ONLY the JSON object, no additional text or explanations.
`;
  }

  /**
   * Validate the AI response against the expected schema
   * @param {Object} response - The AI response object
   * @returns {Object} Validated and sanitized response
   */
  validateAIResponse(response) {
    console.log('🔍 Validating AI response structure...');
    
    const validated = {
      sentiment_analysis: {
        overall_sentiment: response.sentiment_analysis?.overall_sentiment || 'neutral',
        sentiment_score: Math.max(-1, Math.min(1, response.sentiment_analysis?.sentiment_score || 0)),
        confidence_level: Math.max(0, Math.min(1, response.sentiment_analysis?.confidence_level || 0.5))
      },
      issue_classification: {
        primary_category: response.issue_classification?.primary_category || 'other',
        secondary_categories: Array.isArray(response.issue_classification?.secondary_categories) 
          ? response.issue_classification.secondary_categories.slice(0, 3) : [],
        severity_level: response.issue_classification?.severity_level || 'medium',
        urgency_score: Math.max(1, Math.min(10, response.issue_classification?.urgency_score || 5))
      },
      key_phrases: {
        keywords: Array.isArray(response.key_phrases?.keywords) 
          ? response.key_phrases.keywords.slice(0, 50).map(k => ({
              word: String(k.word || '').substring(0, 100),
              frequency: Math.max(1, parseInt(k.frequency) || 1),
              relevance_score: Math.max(0, Math.min(1, parseFloat(k.relevance_score) || 0.5))
            })) : [],
        key_phrases: Array.isArray(response.key_phrases?.key_phrases)
          ? response.key_phrases.key_phrases.slice(0, 20).map(p => String(p).substring(0, 100))
          : [],
        emotional_indicators: Array.isArray(response.key_phrases?.emotional_indicators)
          ? response.key_phrases.emotional_indicators.slice(0, 20).map(e => String(e).substring(0, 50))
          : []
      },
      ai_summary: String(response.ai_summary || 'No summary provided').substring(0, 1000),
      recommended_actions: Array.isArray(response.recommended_actions)
        ? response.recommended_actions.slice(0, 5).map(a => String(a).substring(0, 200))
        : []
    };

    // Validate enums
    const validSentiments = ['positive', 'neutral', 'negative'];
    if (!validSentiments.includes(validated.sentiment_analysis.overall_sentiment)) {
      validated.sentiment_analysis.overall_sentiment = 'neutral';
    }

    const validCategories = [
      'workplace_harassment', 'discrimination', 'unfair_treatment', 
      'work_conditions', 'management_issues', 'compensation_benefits',
      'workload_stress', 'safety_concerns', 'policy_violations',
      'communication_issues', 'other'
    ];
    if (!validCategories.includes(validated.issue_classification.primary_category)) {
      validated.issue_classification.primary_category = 'other';
    }

    validated.issue_classification.secondary_categories = validated.issue_classification.secondary_categories
      .filter(cat => validCategories.includes(cat));

    const validSeverities = ['low', 'medium', 'high', 'critical'];
    if (!validSeverities.includes(validated.issue_classification.severity_level)) {
      validated.issue_classification.severity_level = 'medium';
    }

    return validated;
  }

  /**
   * Process complaint session with AI analysis
   * @param {string} complaintSessionId - The complaint session ID
   * @returns {Promise<Object>} AI analysis results
   */
  async processComplaintSession(complaintSessionId) {
    console.log(`🤖 Starting AI analysis for complaint session: ${complaintSessionId}`);
    const startTime = Date.now();

    try {
      // Fetch complaint session with full chat logs
      const complaintSession = await require('../models').ComplaintSession.findById(complaintSessionId);
      if (!complaintSession) {
        throw new Error(`Complaint session not found: ${complaintSessionId}`);
      }

      // Fetch employee information
      const employee = await Employee.findById(complaintSession.user_id);
      
      // Check if AI analysis already exists
      const existingAnalysis = await AIComplaintTag.findOne({ 
        complaint_session_id: complaintSessionId 
      });
      
      if (existingAnalysis) {
        console.log(`⚠️ AI analysis already exists for complaint: ${complaintSession.complaint_id}`);
        return existingAnalysis.getSummaryForDashboard();
      }

      // Create analysis prompt
      const prompt = this.createAnalysisPrompt(complaintSession, employee);
      
      // Call Gemini API
      console.log('🌐 Calling Gemini API for analysis...');
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Parse JSON response - handle markdown wrapped JSON
      let aiAnalysis;
      try {
        // Clean response text by removing markdown code blocks if present
        let cleanedText = text.trim();
        
        // Remove ```json at start and ``` at end if present
        if (cleanedText.startsWith('```json')) {
          cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanedText.startsWith('```')) {
          cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        aiAnalysis = JSON.parse(cleanedText);
        console.log('✅ AI response parsed successfully');
      } catch (parseError) {
        console.error('❌ Failed to parse AI response as JSON:', parseError);
        console.log('Raw AI response:', text);
        throw new Error('Invalid JSON response from AI');
      }

      // Validate and sanitize AI response
      const validatedAnalysis = this.validateAIResponse(aiAnalysis);
      
      // Calculate processing metrics
      const processingTime = Date.now() - startTime;
      
      // Prepare complaint text metrics from cleaned user messages
      const cleanedUserMessages = complaintSession.chat_logs
        .filter(log => log.direction === 'user' && log.message_type === 'text')
        .map(log => this.cleanUserMessage(log.message))
        .filter(message => message.length > 0); // Remove empty messages after cleaning
      
      const complaintTextLength = cleanedUserMessages.join(' ').length;

      // Create AI tag document
      const aiTagId = AIComplaintTag.generateAITagId(complaintSessionId);
      
      const aiTagData = {
        _id: aiTagId,
        complaint_session_id: complaintSessionId,
        complaint_id: complaintSession.complaint_id,
        user_id: complaintSession.user_id,
        employee_display_name: employee ? employee.display_name : 'Unknown',
        department: employee ? employee.department : complaintSession.department,
        
        sentiment_analysis: validatedAnalysis.sentiment_analysis,
        issue_classification: validatedAnalysis.issue_classification,
        key_phrases: validatedAnalysis.key_phrases,
        
        complaint_start_time: complaintSession.start_time,
        complaint_end_time: complaintSession.end_time,
        message_count: cleanedUserMessages.length, // Count of cleaned user messages only
        complaint_text_length: complaintTextLength,
        
        ai_processing: {
          model_version: 'gemini-1.5-flash',
          processing_time_ms: processingTime,
          tokens_used: response.usageMetadata ? response.usageMetadata.totalTokenCount : null,
          api_response_id: response.usageMetadata ? response.usageMetadata.candidateTokenCount : null
        },
        
        ai_summary: validatedAnalysis.ai_summary,
        recommended_actions: validatedAnalysis.recommended_actions
      };

      // Save AI analysis to database
      const savedAnalysis = await AIComplaintTag.create(aiTagData);
      
      console.log(`✅ AI analysis completed for complaint: ${complaintSession.complaint_id} (${processingTime}ms)`);
      
      return savedAnalysis.getSummaryForDashboard();
      
    } catch (error) {
      console.error(`❌ AI analysis failed for complaint session ${complaintSessionId}:`, error);
      throw error;
    }
  }

  /**
   * Batch process multiple complaint sessions
   * @param {Array<string>} complaintSessionIds - Array of complaint session IDs
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Batch processing results
   */
  async batchProcessComplaints(complaintSessionIds, options = {}) {
    console.log(`🔄 Starting batch AI analysis for ${complaintSessionIds.length} complaints`);
    
    const results = {
      processed: [],
      errors: [],
      skipped: [],
      total: complaintSessionIds.length
    };

    const concurrencyLimit = options.concurrency || 3; // Process 3 at a time to avoid rate limits
    
    for (let i = 0; i < complaintSessionIds.length; i += concurrencyLimit) {
      const batch = complaintSessionIds.slice(i, i + concurrencyLimit);
      
      const batchPromises = batch.map(async (sessionId) => {
        try {
          const result = await this.processComplaintSession(sessionId);
          results.processed.push({ sessionId, result });
          
          // Add small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          if (error.message.includes('already exists')) {
            results.skipped.push({ sessionId, reason: 'Already processed' });
          } else {
            results.errors.push({ sessionId, error: error.message });
          }
        }
      });

      await Promise.all(batchPromises);
      
      console.log(`📊 Batch progress: ${Math.min(i + concurrencyLimit, complaintSessionIds.length)}/${complaintSessionIds.length} processed`);
    }

    console.log(`✅ Batch processing completed: ${results.processed.length} processed, ${results.errors.length} errors, ${results.skipped.length} skipped`);
    
    return results;
  }

  /**
   * Get AI analysis for a complaint session
   * @param {string} complaintSessionId - The complaint session ID
   * @returns {Promise<Object|null>} AI analysis or null if not found
   */
  async getAnalysisForComplaint(complaintSessionId) {
    const analysis = await AIComplaintTag.findOne({ 
      complaint_session_id: complaintSessionId 
    });
    
    return analysis ? analysis.getSummaryForDashboard() : null;
  }

  /**
   * Get analytics data for dashboard
   * @param {Object} filters - Date range and department filters
   * @returns {Promise<Object>} Analytics data
   */
  async getAnalyticsData(filters = {}) {
    // Use very wide default range to ensure we capture all data
    const startDate = filters.startDate || new Date('2020-01-01T00:00:00.000Z'); // Far past
    const endDate = filters.endDate || new Date('2030-12-31T23:59:59.999Z'); // Far future
    const department = filters.department;

    console.log(`📊 Analytics date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);

    console.log('🔍 Calling AIComplaintTag.getSentimentStatsByDateRange...');
    const sentimentStats = await AIComplaintTag.getSentimentStatsByDateRange(startDate, endDate, department);
    console.log('📈 Sentiment stats result:', JSON.stringify(sentimentStats, null, 2));

    console.log('🔍 Calling AIComplaintTag.getIssueStatsByCategory...');
    const issueStats = await AIComplaintTag.getIssueStatsByCategory(startDate, endDate, department);
    console.log('📊 Issue stats result:', JSON.stringify(issueStats, null, 2));

    console.log('🔍 Calling AIComplaintTag.getAllKeywordsForWordCloud...');
    const wordCloudData = await AIComplaintTag.getAllKeywordsForWordCloud(startDate, endDate, department, 100);
    console.log('☁️  Word cloud result:', JSON.stringify(wordCloudData, null, 2));

    return {
      sentiment_distribution: sentimentStats,
      issue_categories: issueStats,
      word_cloud_data: wordCloudData,
      date_range: { startDate, endDate },
      department: department || 'All Departments'
    };
  }
}

module.exports = AITaggingService;