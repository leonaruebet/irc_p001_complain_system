import ComplaintSession from './models/ComplaintSession';
import Employee from './models/Employee';
import { IChatLog } from './models/ComplaintSession';

interface SessionData {
  sessionId: string;
  complaintId: string;
  status: 'open' | 'submitted';
  startTime: Date;
}

class SessionManager {
  // Get active session for user
  async getActiveSession(userId: string): Promise<SessionData | null> {
    try {
      const session = await (ComplaintSession as any).findOne({
        user_id: userId,
        status: 'open'
      }).sort({ start_time: -1 });

      if (!session) return null;

      return {
        sessionId: session._id,
        complaintId: session.complaint_id,
        status: session.status,
        startTime: session.start_time
      };
    } catch (error) {
      console.error('Error getting active session:', error);
      throw error;
    }
  }

  // Create new complaint session
  async createSession(userId: string, initialMessage: string): Promise<SessionData> {
    try {
      // Get or create employee record
      const userProfile = await this.getOrCreateEmployee(userId);
      
      // Generate IDs
      const sessionId = (ComplaintSession as any).generateSessionId();
      const complaintId = (ComplaintSession as any).generateComplaintId();

      const session = new ComplaintSession({
        _id: sessionId,
        complaint_id: complaintId,
        user_id: userId,
        status: 'open',
        start_time: new Date(),
        department: userProfile?.department,
        chat_logs: [
          {
            timestamp: new Date(),
            direction: 'user',
            message_type: 'command',
            message: '/complain'
          }
        ]
      });

      await session.save();

      return {
        sessionId,
        complaintId,
        status: 'open',
        startTime: session.start_time
      };
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  }

  // Add message to session
  async addMessage(userId: string, message: string, messageType: 'text' | 'command' = 'text'): Promise<void> {
    try {
      const chatLog: IChatLog = {
        timestamp: new Date(),
        direction: 'user',
        message_type: messageType,
        message
      };

      await (ComplaintSession as any).findOneAndUpdate(
        {
          user_id: userId,
          status: 'open'
        },
        {
          $push: { chat_logs: chatLog }
        },
        { sort: { start_time: -1 } }
      );
    } catch (error) {
      console.error('Error adding message:', error);
      throw error;
    }
  }

  // Add bot response to session
  async addBotResponse(userId: string, message: string): Promise<void> {
    try {
      const chatLog: IChatLog = {
        timestamp: new Date(),
        direction: 'bot',
        message_type: 'text',
        message
      };

      await (ComplaintSession as any).findOneAndUpdate(
        {
          user_id: userId,
          status: 'open'
        },
        {
          $push: { chat_logs: chatLog }
        },
        { sort: { start_time: -1 } }
      );
    } catch (error) {
      console.error('Error adding bot response:', error);
      throw error;
    }
  }

  // Submit complaint (close session)
  async submitComplaint(userId: string): Promise<string | null> {
    try {
      const session = await (ComplaintSession as any).findOneAndUpdate(
        {
          user_id: userId,
          status: 'open'
        },
        {
          status: 'submitted',
          end_time: new Date()
        },
        { 
          sort: { start_time: -1 },
          new: true
        }
      );

      return session ? session.complaint_id : null;
    } catch (error) {
      console.error('Error submitting complaint:', error);
      throw error;
    }
  }

  // Cancel active session
  async cancelSession(userId: string): Promise<boolean> {
    try {
      const result = await (ComplaintSession as any).deleteOne({
        user_id: userId,
        status: 'open'
      });

      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error canceling session:', error);
      throw error;
    }
  }

  // Get or create employee record
  private async getOrCreateEmployee(userId: string, displayName?: string): Promise<any> {
    try {
      let employee = await (Employee as any).findById(userId);
      
      if (!employee && displayName) {
        employee = new Employee({
          _id: userId,
          display_name: displayName,
          department: 'Unknown',
          active: true
        });
        await employee.save();
      }

      return employee;
    } catch (error) {
      console.error('Error managing employee record:', error);
      return null;
    }
  }
}

export default new SessionManager();