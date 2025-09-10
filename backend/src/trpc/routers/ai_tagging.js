/**
 * AI Tagging tRPC Router
 * Handles AI-powered complaint analysis and tagging operations
 */

const { z } = require('zod');
const { router, hrProcedure, loggedProcedure } = require('../index');
const AITaggingService = require('../../services/ai_tagging_service');

const aiTaggingRouter = router({
  // Process a single complaint session with AI analysis
  processComplaint: hrProcedure
    .input(z.object({
      complaintSessionId: z.string().min(1, 'Complaint session ID is required')
    }))
    .mutation(async ({ input, ctx }) => {
      console.log(`🤖 Processing AI analysis for session: ${input.complaintSessionId}`);
      
      try {
        const aiService = new AITaggingService();
        const result = await aiService.processComplaintSession(input.complaintSessionId);
        
        ctx.utils.logActivity('ai_analysis_processed', {
          sessionId: input.complaintSessionId,
          complaintId: result.complaint_id
        });
        
        return {
          success: true,
          data: result,
          message: 'AI analysis completed successfully'
        };
        
      } catch (error) {
        console.error('❌ Error processing AI analysis:', error);
        
        return {
          success: false,
          error: error.message,
          message: 'Failed to process AI analysis'
        };
      }
    }),

  // Batch process multiple complaints
  batchProcessComplaints: hrProcedure
    .input(z.object({
      complaintSessionIds: z.array(z.string()).min(1, 'At least one complaint session ID is required'),
      concurrency: z.number().min(1).max(5).default(3).optional()
    }))
    .mutation(async ({ input, ctx }) => {
      console.log(`🔄 Starting batch AI processing for ${input.complaintSessionIds.length} complaints`);
      
      try {
        const aiService = new AITaggingService();
        const results = await aiService.batchProcessComplaints(
          input.complaintSessionIds, 
          { concurrency: input.concurrency }
        );
        
        ctx.utils.logActivity('ai_batch_processed', {
          total: results.total,
          processed: results.processed.length,
          errors: results.errors.length,
          skipped: results.skipped.length
        });
        
        return {
          success: true,
          data: results,
          message: `Batch processing completed: ${results.processed.length} processed, ${results.errors.length} errors`
        };
        
      } catch (error) {
        console.error('❌ Error in batch AI processing:', error);
        
        return {
          success: false,
          error: error.message,
          message: 'Failed to process batch AI analysis'
        };
      }
    }),

  // Get AI analysis for a specific complaint
  getAnalysis: hrProcedure
    .input(z.object({
      complaintSessionId: z.string().min(1)
    }))
    .query(async ({ input, ctx }) => {
      console.log(`📊 Getting AI analysis for session: ${input.complaintSessionId}`);
      
      try {
        const aiService = new AITaggingService();
        const analysis = await aiService.getAnalysisForComplaint(input.complaintSessionId);
        
        if (!analysis) {
          return {
            success: true,
            data: null,
            message: 'No AI analysis found for this complaint'
          };
        }
        
        ctx.utils.logActivity('ai_analysis_viewed', {
          sessionId: input.complaintSessionId,
          complaintId: analysis.complaint_id
        });
        
        return {
          success: true,
          data: analysis,
          message: 'AI analysis retrieved successfully'
        };
        
      } catch (error) {
        console.error('❌ Error getting AI analysis:', error);
        
        return {
          success: false,
          error: error.message,
          message: 'Failed to retrieve AI analysis'
        };
      }
    }),

  // Get detailed AI tag data including word cloud information
  getDetailedAnalysis: hrProcedure
    .input(z.object({
      complaintSessionId: z.string().min(1)
    }))
    .query(async ({ input, ctx }) => {
      console.log(`🔍 Getting detailed AI analysis for session: ${input.complaintSessionId}`);
      
      try {
        const aiTag = await ctx.models.AIComplaintTag.findOne({
          complaint_session_id: input.complaintSessionId
        });
        
        if (!aiTag) {
          return {
            success: true,
            data: null,
            message: 'No detailed AI analysis found for this complaint'
          };
        }
        
        const detailedData = {
          ...aiTag.getSummaryForDashboard(),
          word_cloud_data: aiTag.getWordCloudData(),
          full_analysis: {
            sentiment_analysis: aiTag.sentiment_analysis,
            issue_classification: aiTag.issue_classification,
            key_phrases: aiTag.key_phrases,
            ai_summary: aiTag.ai_summary,
            recommended_actions: aiTag.recommended_actions,
            processing_metadata: aiTag.ai_processing
          }
        };
        
        ctx.utils.logActivity('detailed_ai_analysis_viewed', {
          sessionId: input.complaintSessionId,
          complaintId: aiTag.complaint_id
        });
        
        return {
          success: true,
          data: detailedData,
          message: 'Detailed AI analysis retrieved successfully'
        };
        
      } catch (error) {
        console.error('❌ Error getting detailed AI analysis:', error);
        
        return {
          success: false,
          error: error.message,
          message: 'Failed to retrieve detailed AI analysis'
        };
      }
    }),

  // Get AI analytics and statistics
  getAnalytics: hrProcedure
    .input(z.object({
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      department: z.string().optional()
    }))
    .query(async ({ input, ctx }) => {
      console.log('📈 Getting AI analytics data');
      
      try {
        const aiService = new AITaggingService();
        const filters = {
          startDate: input.startDate ? new Date(input.startDate) : undefined,
          endDate: input.endDate ? new Date(input.endDate) : undefined,
          department: input.department
        };
        
        const analytics = await aiService.getAnalyticsData(filters);
        
        ctx.utils.logActivity('ai_analytics_viewed', {
          dateRange: analytics.date_range,
          department: analytics.department
        });
        
        return {
          success: true,
          data: analytics,
          message: 'AI analytics retrieved successfully'
        };
        
      } catch (error) {
        console.error('❌ Error getting AI analytics:', error);
        
        return {
          success: false,
          error: error.message,
          message: 'Failed to retrieve AI analytics'
        };
      }
    }),

  // Get complaints that need AI processing (submitted but not analyzed)
  getUnprocessedComplaints: hrProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      skip: z.number().min(0).default(0),
      department: z.string().optional()
    }))
    .query(async ({ input, ctx }) => {
      console.log('🔍 Finding unprocessed complaints for AI analysis');
      
      try {
        // Get submitted complaint sessions
        const filter = { status: 'submitted' };
        if (input.department) filter.department = input.department;
        
        const submittedComplaints = await ctx.models.ComplaintSession
          .find(filter)
          .select('_id complaint_id user_id department start_time end_time')
          .sort({ start_time: -1 })
          .limit(input.limit)
          .skip(input.skip)
          .lean();
        
        // Check which ones already have AI analysis
        const sessionIds = submittedComplaints.map(c => c._id);
        const existingAnalyses = await ctx.models.AIComplaintTag
          .find({ complaint_session_id: { $in: sessionIds } })
          .select('complaint_session_id')
          .lean();
        
        const analyzedSessionIds = new Set(existingAnalyses.map(a => a.complaint_session_id));
        
        // Filter to unprocessed complaints only
        const unprocessedComplaints = submittedComplaints.filter(
          complaint => !analyzedSessionIds.has(complaint._id)
        );
        
        const totalUnprocessed = await ctx.models.ComplaintSession.countDocuments({
          ...filter,
          _id: { $nin: Array.from(analyzedSessionIds) }
        });
        
        return {
          success: true,
          data: {
            complaints: unprocessedComplaints,
            pagination: {
              total: totalUnprocessed,
              limit: input.limit,
              skip: input.skip,
              hasMore: (input.skip + input.limit) < totalUnprocessed
            }
          },
          message: `Found ${unprocessedComplaints.length} unprocessed complaints`
        };
        
      } catch (error) {
        console.error('❌ Error finding unprocessed complaints:', error);
        
        return {
          success: false,
          error: error.message,
          message: 'Failed to find unprocessed complaints'
        };
      }
    }),

  // Trigger automatic AI processing for unprocessed complaints
  autoProcessUnprocessed: hrProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(20),
      department: z.string().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      console.log('🚀 Starting automatic AI processing for unprocessed complaints');
      
      try {
        // Get unprocessed complaints
        const unprocessedResponse = await aiTaggingRouter.createCaller(ctx).getUnprocessedComplaints({
          limit: input.limit,
          skip: 0,
          department: input.department
        });
        
        if (!unprocessedResponse.success || unprocessedResponse.data.complaints.length === 0) {
          return {
            success: true,
            data: { processed: 0, message: 'No unprocessed complaints found' },
            message: 'No complaints to process'
          };
        }
        
        const complaintSessionIds = unprocessedResponse.data.complaints.map(c => c._id);
        
        // Batch process them
        const batchResponse = await aiTaggingRouter.createCaller(ctx).batchProcessComplaints({
          complaintSessionIds,
          concurrency: 2 // Lower concurrency for auto-processing
        });
        
        return {
          success: true,
          data: {
            processed: batchResponse.data.processed.length,
            errors: batchResponse.data.errors.length,
            details: batchResponse.data
          },
          message: `Auto-processed ${batchResponse.data.processed.length} complaints`
        };
        
      } catch (error) {
        console.error('❌ Error in automatic AI processing:', error);
        
        return {
          success: false,
          error: error.message,
          message: 'Failed to auto-process complaints'
        };
      }
    })
});

module.exports = aiTaggingRouter;