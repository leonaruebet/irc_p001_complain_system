/**
 * Complaint tRPC Router
 * Handles complaint session operations
 */

const { z } = require('zod');
const { router, loggedProcedure, hrProcedure } = require('../index');

const complaintRouter = router({
  // Create a new complaint session
  create: loggedProcedure
    .input(z.object({
      userId: z.string().min(1, 'User ID is required'),
      department: z.string().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      console.log(`🆕 Creating complaint session for user: ${input.userId}`);
      
      try {
        const session = await ctx.models.ComplaintSession.createNewSession(
          input.userId,
          input.department
        );
        
        ctx.utils.logActivity('complaint_session_created', {
          sessionId: session._id,
          complaintId: session.complaint_id,
          userId: input.userId
        });
        
        return {
          success: true,
          session: session.getConversationSummary(),
          message: 'Complaint session created successfully'
        };
        
      } catch (error) {
        console.error('❌ Error creating complaint session:', error);
        
        return {
          success: false,
          error: error.message,
          message: 'Failed to create complaint session'
        };
      }
    }),

  // Add a chat log entry to existing session
  addChatLog: loggedProcedure
    .input(z.object({
      userId: z.string().min(1),
      direction: z.enum(['user', 'bot']),
      messageType: z.enum(['text', 'image', 'file', 'command']),
      message: z.string().min(1)
    }))
    .mutation(async ({ input, ctx }) => {
      console.log(`💬 Adding chat log: ${input.direction} - ${input.messageType}`);
      
      try {
        // Find active session for user
        const session = await ctx.models.ComplaintSession.findActiveSession(input.userId);
        
        if (!session) {
          return {
            success: false,
            error: 'No active complaint session found',
            message: 'Please start a new complaint session first'
          };
        }
        
        // Add chat log entry
        await session.addChatLog(input.direction, input.messageType, input.message);
        
        ctx.utils.logActivity('chat_log_added', {
          sessionId: session._id,
          direction: input.direction,
          messageType: input.messageType
        });
        
        return {
          success: true,
          session: session.getConversationSummary(),
          message: 'Chat log added successfully'
        };
        
      } catch (error) {
        console.error('❌ Error adding chat log:', error);
        
        return {
          success: false,
          error: error.message,
          message: 'Failed to add chat log'
        };
      }
    }),

  // Submit a complaint session
  submit: loggedProcedure
    .input(z.object({
      userId: z.string().min(1)
    }))
    .mutation(async ({ input, ctx }) => {
      console.log(`📋 Submitting complaint for user: ${input.userId}`);
      
      try {
        // Find active session
        const session = await ctx.models.ComplaintSession.findActiveSession(input.userId);
        
        if (!session) {
          return {
            success: false,
            error: 'No active complaint session found',
            message: 'No complaint session to submit'
          };
        }
        
        if (session.chat_logs.length <= 1) {
          return {
            success: false,
            error: 'Insufficient complaint details',
            message: 'Please provide more details before submitting'
          };
        }
        
        // Submit the session
        await session.submit();
        
        ctx.utils.logActivity('complaint_submitted', {
          sessionId: session._id,
          complaintId: session.complaint_id,
          userId: input.userId
        });
        
        return {
          success: true,
          session: session.getConversationSummary(),
          complaintId: session.complaint_id,
          message: 'Complaint submitted successfully'
        };
        
      } catch (error) {
        console.error('❌ Error submitting complaint:', error);
        
        return {
          success: false,
          error: error.message,
          message: 'Failed to submit complaint'
        };
      }
    }),

  // Get active session for user
  getActiveSession: loggedProcedure
    .input(z.object({
      userId: z.string().min(1)
    }))
    .query(async ({ input, ctx }) => {
      console.log(`🔍 Getting active session for user: ${input.userId}`);
      
      try {
        const session = await ctx.models.ComplaintSession.findActiveSession(input.userId);
        
        if (!session) {
          return {
            success: true,
            session: null,
            message: 'No active complaint session'
          };
        }
        
        return {
          success: true,
          session: {
            ...session.getConversationSummary(),
            chatLogs: session.chat_logs
          },
          message: 'Active session retrieved'
        };
        
      } catch (error) {
        console.error('❌ Error getting active session:', error);
        
        return {
          success: false,
          error: error.message,
          message: 'Failed to retrieve session'
        };
      }
    }),

  // Get complaint by ID (for HR dashboard)
  getById: hrProcedure
    .input(z.object({
      complaintId: z.string().min(1)
    }))
    .query(async ({ input, ctx }) => {
      console.log(`📄 Getting complaint: ${input.complaintId}`);
      
      try {
        const session = await ctx.models.ComplaintSession.findOne({ 
          complaint_id: input.complaintId 
        });
        
        if (!session) {
          return {
            success: false,
            error: 'Complaint not found',
            message: 'No complaint found with the specified ID'
          };
        }
        
        ctx.utils.logActivity('complaint_viewed', {
          complaintId: input.complaintId,
          sessionId: session._id
        });
        
        return {
          success: true,
          complaint: {
            ...session.getConversationSummary(),
            chatLogs: session.chat_logs,
            fullSession: session.toObject()
          },
          message: 'Complaint retrieved successfully'
        };
        
      } catch (error) {
        console.error('❌ Error getting complaint:', error);
        
        return {
          success: false,
          error: error.message,
          message: 'Failed to retrieve complaint'
        };
      }
    }),

  // List complaints (for HR dashboard)
  list: hrProcedure
    .input(z.object({
      status: z.enum(['open', 'submitted']).optional(),
      limit: z.number().min(1).max(100).default(50),
      skip: z.number().min(0).default(0),
      department: z.string().optional()
    }))
    .query(async ({ input, ctx }) => {
      console.log(`📋 Listing complaints with filters:`, input);
      
      try {
        const filter = {};
        if (input.status) filter.status = input.status;
        if (input.department) filter.department = input.department;
        
        const complaints = await ctx.models.ComplaintSession
          .find(filter)
          .select('complaint_id user_id department status start_time end_time')
          .sort({ start_time: -1 })
          .limit(input.limit)
          .skip(input.skip)
          .lean();
        
        const total = await ctx.models.ComplaintSession.countDocuments(filter);
        
        ctx.utils.logActivity('complaints_listed', {
          count: complaints.length,
          total: total,
          filters: input
        });
        
        return {
          success: true,
          complaints,
          pagination: {
            total,
            limit: input.limit,
            skip: input.skip,
            hasMore: (input.skip + input.limit) < total
          },
          message: 'Complaints retrieved successfully'
        };
        
      } catch (error) {
        console.error('❌ Error listing complaints:', error);
        
        return {
          success: false,
          error: error.message,
          message: 'Failed to retrieve complaints'
        };
      }
    }),

  // Get statistics (for HR dashboard)
  getStats: hrProcedure
    .input(z.object({
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional()
    }))
    .query(async ({ input, ctx }) => {
      console.log('📊 Getting complaint statistics');
      
      try {
        const dateFilter = {};
        if (input.startDate || input.endDate) {
          dateFilter.start_time = {};
          if (input.startDate) dateFilter.start_time.$gte = new Date(input.startDate);
          if (input.endDate) dateFilter.start_time.$lte = new Date(input.endDate);
        }
        
        // Basic counts
        const totalComplaints = await ctx.models.ComplaintSession.countDocuments(dateFilter);
        const openComplaints = await ctx.models.ComplaintSession.countDocuments({
          ...dateFilter,
          status: 'open'
        });
        const submittedComplaints = await ctx.models.ComplaintSession.countDocuments({
          ...dateFilter,
          status: 'submitted'
        });
        
        // Department breakdown
        const departmentStats = await ctx.models.ComplaintSession.aggregate([
          { $match: dateFilter },
          { $group: { _id: '$department', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]);
        
        // Monthly breakdown
        const monthlyStats = await ctx.models.ComplaintSession.aggregate([
          { $match: dateFilter },
          {
            $group: {
              _id: {
                year: { $year: '$start_time' },
                month: { $month: '$start_time' }
              },
              count: { $sum: 1 }
            }
          },
          { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);
        
        ctx.utils.logActivity('stats_retrieved', {
          totalComplaints,
          dateRange: { startDate: input.startDate, endDate: input.endDate }
        });
        
        return {
          success: true,
          stats: {
            totalComplaints,
            openComplaints,
            submittedComplaints,
            departmentBreakdown: departmentStats,
            monthlyBreakdown: monthlyStats
          },
          message: 'Statistics retrieved successfully'
        };
        
      } catch (error) {
        console.error('❌ Error getting statistics:', error);
        
        return {
          success: false,
          error: error.message,
          message: 'Failed to retrieve statistics'
        };
      }
    })
});

module.exports = complaintRouter;