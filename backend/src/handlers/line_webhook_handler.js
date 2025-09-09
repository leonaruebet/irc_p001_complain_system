/**
 * LINE Webhook Handler
 * Processes incoming LINE webhook events and manages bot interactions
 */

const lineService = require('../services/line_service');
const { Employee, ComplaintSession, LineEventsRaw } = require('../models');

class LineWebhookHandler {
  constructor() {
    this.activeComplaintSessions = new Map(); // userId -> timeout
    console.log('🎯 LineWebhookHandler initialized with database integration');
  }

  /**
   * Processes LINE webhook events
   * @param {Array} events - Array of LINE webhook events
   * @returns {Promise<void>}
   */
  async handle_webhook_events(events) {
    console.log(`📨 Processing ${events.length} LINE webhook event(s)`);
    
    try {
      const promises = events.map(event => this.handle_single_event(event));
      await Promise.all(promises);
      console.log('✅ All LINE webhook events processed successfully');
    } catch (error) {
      console.error('❌ Error processing LINE webhook events:', error);
      throw error;
    }
  }

  /**
   * Handles a single LINE webhook event
   * @param {Object} event - LINE webhook event
   * @returns {Promise<void>}
   */
  async handle_single_event(event) {
    console.log(`🔄 Processing event type: ${event.type}`);
    
    try {
      // Save raw event to database for audit
      await this.save_raw_event(event);
    } catch (rawEventError) {
      console.error(`❌ RAW EVENT SAVE FAILED:`, rawEventError);
    }
    
    try {
      switch (event.type) {
        case 'message':
          await this.handle_message_event(event);
          break;
        
        case 'follow':
          await this.handle_follow_event(event);
          break;
        
        case 'unfollow':
          await this.handle_unfollow_event(event);
          break;
        
        case 'postback':
          await this.handle_postback_event(event);
          break;
        
        default:
          console.log(`⚠️ Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      console.error(`❌ Error handling event ${event.type}:`, error);
      throw error;
    }
  }

  /**
   * Handles incoming message events
   * @param {Object} event - LINE message event
   * @returns {Promise<void>}
   */
  async handle_message_event(event) {
    const { replyToken, source, message, timestamp } = event;
    const userId = source.userId;
    
    console.log(`💬 Message from user ${userId}: ${message.text || 'Non-text message'}`);
    
    try {
      // Ensure user is registered in employee database
      await this.register_user_if_new(userId);
      
      if (message.type === 'text') {
        await this.process_text_message(replyToken, userId, message.text, timestamp);
      } else {
        await this.handle_non_text_message(replyToken, userId, message, timestamp);
      }
    } catch (error) {
      console.error('❌ Error handling message event:', error);
      await this.send_error_message(replyToken);
    }
  }

  /**
   * Processes text messages and determines appropriate response
   * @param {string} replyToken - Reply token for response
   * @param {string} userId - LINE user ID
   * @param {string} text - Message text content
   * @returns {Promise<void>}
   */
  async process_text_message(replyToken, userId, text, timestamp) {
    const normalizedText = text.toLowerCase().trim();
    
    console.log(`🔍 Processing text: "${normalizedText}"`);
    
    // Check if user has active complaint session
    const activeSession = await ComplaintSession.findActiveSession(userId);
    
    // Command routing based on text content
    if (normalizedText.startsWith('/complain')) {
      await this.start_complaint_session(replyToken, userId, timestamp);
    }
    else if (normalizedText.startsWith('/submit')) {
      await this.submit_complaint_session(replyToken, userId, timestamp);
    }
    else if (activeSession) {
      // User has active complaint session - capture all messages
      await this.add_message_to_session(activeSession, 'user', 'text', text, timestamp);
      await this.acknowledge_complaint_message(replyToken);
    }
    else if (normalizedText.includes('สวัสดี') || normalizedText.includes('hello') || normalizedText === 'hi') {
      await this.send_welcome_message(replyToken, userId);
    } 
    else if (normalizedText.includes('ร้องเรียน') || normalizedText.includes('complaint')) {
      await this.start_complaint_session(replyToken, userId, timestamp);
    }
    else if (normalizedText.includes('สถานะ') || normalizedText.includes('status')) {
      await this.check_complaint_status(replyToken, userId);
    }
    else if (normalizedText.includes('ช่วยเหลือ') || normalizedText.includes('help')) {
      await this.send_help_message(replyToken);
    }
    else {
      await this.send_default_response(replyToken, text);
    }
  }

  /**
   * Sends welcome message to new or returning users
   * @param {string} replyToken - Reply token
   * @param {string} userId - LINE user ID
   * @returns {Promise<void>}
   */
  async send_welcome_message(replyToken, userId) {
    console.log(`👋 Sending welcome message to user: ${userId}`);
    
    try {
      // Get user profile for personalization
      const profile = await lineService.get_user_profile(userId);
      const displayName = profile.displayName || 'ผู้ใช้';

      const welcomeMessage = `สวัสดีคะ คุณ${displayName} 👋

ยินดีต้อนรับสู่ระบบร้องเรียน IRC Complaint System

คุณสามารถใช้บริการต่างๆ ได้ดังนี้:
🔸 พิมพ์ "ร้องเรียน" เพื่อส่งข้อร้องเรียน
🔸 พิมพ์ "สถานะ" เพื่อตรวจสอบสถานะร้องเรียน
🔸 พิมพ์ "ช่วยเหลือ" เพื่อดูคำแนะนำ

หากมีข้อสงสัยใดๆ สามารถสอบถามได้เสมอค่ะ 😊`;

      await lineService.reply_message(replyToken, welcomeMessage);
    } catch (error) {
      console.error('❌ Error sending welcome message:', error);
      await this.send_error_message(replyToken);
    }
  }

  /**
   * Saves raw LINE event to database for audit
   * @param {Object} event - LINE webhook event
   * @returns {Promise<void>}
   */
  async save_raw_event(event) {
    try {
      if (!event || !event.type) {
        console.error('❌ Invalid event data for raw event logging:', event);
        return;
      }
      
      const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const userId = event.source ? event.source.userId : null;
      
      await LineEventsRaw.create({
        _id: eventId,
        received_at: new Date(),
        user_id: userId,
        event_type: event.type,
        payload: event
      });
      console.log(`✅ Raw event saved: ${event.type} (${eventId})`);
    } catch (error) {
      console.error('❌ Error saving raw event:', error);
    }
  }

  /**
   * Registers new user to employees collection
   * @param {string} userId - LINE user ID
   * @returns {Promise<void>}
   */
  async register_user_if_new(userId) {
    try {
      const existingEmployee = await Employee.findById(userId);
      
      if (!existingEmployee) {
        console.log(`👤 Registering new user: ${userId}`);
        
        // Get user profile from LINE
        const profile = await lineService.get_user_profile(userId);
        
        await Employee.createOrUpdate(userId, {
          display_name: profile.displayName || 'Unknown User',
          department: null // Will be set later by HR
        });
        
        console.log(`✅ User ${userId} registered as new employee`);
      }
    } catch (error) {
      console.error('❌ Error registering new user:', error);
    }
  }

  /**
   * Starts a new complaint session
   * @param {string} replyToken - Reply token
   * @param {string} userId - LINE user ID
   * @param {number} timestamp - Event timestamp
   * @returns {Promise<void>}
   */
  async start_complaint_session(replyToken, userId, timestamp) {
    console.log(`📝 Starting complaint session for user: ${userId}`);
    
    try {
      // Check if user already has active session
      const existingSession = await ComplaintSession.findActiveSession(userId);
      
      if (existingSession) {
        const message = `คุณมีการร้องเรียนที่ยังไม่เสร็จสิ้น (${existingSession.complaint_id})
        
กรุณาส่งข้อความเพิ่มเติมหรือพิมพ์ "/submit" เพื่อส่งร้องเรียนนี้

หากต้องการเริ่มร้องเรียนใหม่ กรุณาส่งร้องเรียนเก่าก่อน`;
        
        await lineService.reply_message(replyToken, message);
        return;
      }

      // Get employee data for department mapping
      const employee = await Employee.findById(userId);
      const department = employee ? employee.department : null;
      
      // Create new complaint session
      const session = await ComplaintSession.createNewSession(userId, department);
      
      // Add initial command to chat log
      await session.addChatLog('user', 'command', '/complain');
      
      // Set up 10-minute timeout
      this.setup_session_timeout(userId);
      
      const startMessage = `✅ เริ่มการร้องเรียนแล้ว
รหัสการร้องเรียน: ${session.complaint_id}

🗨️ กรุณาส่งรายละเอียดการร้องเรียนของคุณ
📝 คุณสามารถส่งข้อความได้หลายครั้ง
📤 เมื่อเสร็จสิ้นให้พิมพ์ "/submit" เพื่อส่งร้องเรียน

⏰ เซสชันจะหมดอายุใน 10 นาที หากไม่มีการตอบกลับ`;

      await lineService.reply_message(replyToken, startMessage);
      
      // Add bot response to chat log
      await session.addChatLog('bot', 'text', startMessage);
      
      console.log(`✅ Complaint session created: ${session.complaint_id}`);
      
    } catch (error) {
      console.error('❌ Error starting complaint session:', error);
      await this.send_error_message(replyToken);
    }
  }

  /**
   * Submits active complaint session
   * @param {string} replyToken - Reply token
   * @param {string} userId - LINE user ID
   * @param {number} timestamp - Event timestamp
   * @returns {Promise<void>}
   */
  async submit_complaint_session(replyToken, userId, timestamp) {
    console.log(`📤 Submitting complaint session for user: ${userId}`);
    
    try {
      const activeSession = await ComplaintSession.findActiveSession(userId);
      
      if (!activeSession) {
        const message = `ไม่พบการร้องเรียนที่กำลังดำเนินการ

หากต้องการเริ่มร้องเรียนใหม่ กรุณาพิมพ์ "/complain"`;
        
        await lineService.reply_message(replyToken, message);
        return;
      }

      // Add submit command to chat log
      await activeSession.addChatLog('user', 'command', '/submit');
      
      // Submit the session
      await activeSession.submit();
      
      // Clear timeout
      this.clear_session_timeout(userId);
      
      const submitMessage = `✅ ส่งร้องเรียนเรียบร้อยแล้ว
รหัสการร้องเรียน: ${activeSession.complaint_id}

📋 ทีมงานจะตรวจสอบและติดตามผลภายใน 24-48 ชั่วโมง
🔍 ตรวจสอบสถานะได้ด้วยคำสั่ง "สถานะ ${activeSession.complaint_id}"

ขอบคุณที่แจ้งให้เราทราบ 🙏`;

      await lineService.reply_message(replyToken, submitMessage);
      
      // Add bot response to chat log
      await activeSession.addChatLog('bot', 'text', submitMessage);
      
      console.log(`✅ Complaint submitted: ${activeSession.complaint_id}`);
      
    } catch (error) {
      console.error('❌ Error submitting complaint:', error);
      await this.send_error_message(replyToken);
    }
  }

  /**
   * Adds message to active complaint session
   * @param {Object} session - Active complaint session
   * @param {string} direction - 'user' or 'bot'
   * @param {string} messageType - Type of message
   * @param {string} message - Message content
   * @param {number} timestamp - Message timestamp
   * @returns {Promise<void>}
   */
  async add_message_to_session(session, direction, messageType, message, timestamp) {
    try {
      await session.addChatLog(direction, messageType, message);
      
      // Reset timeout on user activity
      if (direction === 'user') {
        this.setup_session_timeout(session.user_id);
      }
      
      console.log(`💬 Message added to session ${session.complaint_id}`);
    } catch (error) {
      console.error('❌ Error adding message to session:', error);
    }
  }

  /**
   * Acknowledges complaint message during active session
   * @param {string} replyToken - Reply token
   * @returns {Promise<void>}
   */
  async acknowledge_complaint_message(replyToken) {
    const acknowledgments = [
      '📝 ได้รับข้อมูลแล้ว กรุณาส่งข้อมูลเพิ่มเติมหรือพิมพ์ "/submit" เมื่อเสร็จสิ้น',
      '✅ รับทราบ คุณสามารถส่งรายละเอียดเพิ่มเติมได้',
      '📋 บันทึกแล้ว ส่งข้อมูลเพิ่มเติมหรือพิมพ์ "/submit" เพื่อส่งร้องเรียน'
    ];
    
    const randomAck = acknowledgments[Math.floor(Math.random() * acknowledgments.length)];
    await lineService.reply_message(replyToken, randomAck);
  }

  /**
   * Sets up 10-minute timeout for complaint session
   * @param {string} userId - LINE user ID
   */
  setup_session_timeout(userId) {
    // Clear existing timeout
    this.clear_session_timeout(userId);
    
    // Set new timeout
    const timeout = setTimeout(async () => {
      await this.handle_session_timeout(userId);
    }, 10 * 60 * 1000); // 10 minutes
    
    this.activeComplaintSessions.set(userId, timeout);
    console.log(`⏰ Session timeout set for user: ${userId}`);
  }

  /**
   * Clears session timeout
   * @param {string} userId - LINE user ID
   */
  clear_session_timeout(userId) {
    const timeout = this.activeComplaintSessions.get(userId);
    if (timeout) {
      clearTimeout(timeout);
      this.activeComplaintSessions.delete(userId);
      console.log(`⏰ Session timeout cleared for user: ${userId}`);
    }
  }

  /**
   * Handles session timeout (auto-submit after 10 minutes)
   * @param {string} userId - LINE user ID
   */
  async handle_session_timeout(userId) {
    console.log(`⏰ Session timeout for user: ${userId}`);
    
    try {
      const activeSession = await ComplaintSession.findActiveSession(userId);
      
      if (activeSession && activeSession.chat_logs.length > 1) {
        // Auto-submit if user provided content
        await activeSession.addChatLog('system', 'timeout', 'Session auto-submitted due to 10-minute timeout');
        await activeSession.submit();
        
        // Notify user via push message
        const timeoutMessage = `⏰ การร้องเรียนของคุณถูกส่งอัตโนมัติเนื่องจากไม่มีการตอบกลับ
รหัสการร้องเรียน: ${activeSession.complaint_id}

ทีมงานจะตรวจสอบและติดตามผลต่อไป 📋`;

        await lineService.push_message(userId, timeoutMessage);
        
        console.log(`✅ Session auto-submitted: ${activeSession.complaint_id}`);
      } else if (activeSession) {
        // Cancel empty session
        await activeSession.cancel();
        console.log(`❌ Empty session cancelled: ${activeSession.complaint_id}`);
      }
      
      this.clear_session_timeout(userId);
      
    } catch (error) {
      console.error('❌ Error handling session timeout:', error);
    }
  }

  /**
   * Checks complaint status for user
   * @param {string} replyToken - Reply token
   * @param {string} userId - LINE user ID
   * @returns {Promise<void>}
   */
  async check_complaint_status(replyToken, userId) {
    console.log(`📊 Checking complaint status for user: ${userId}`);
    
    // TODO: Integrate with complaint database to fetch actual status
    const statusMessage = `สถานะการร้องเรียนของคุณ:

🔍 ยังไม่พบข้อร้องเรียนในระบบ
หากต้องการส่งข้อร้องเรียนใหม่ กรุณาพิมพ์ "ร้องเรียน"

หรือหากมีรหัสการร้องเรียน กรุณาแนบรหัสมาด้วย
เช่น: "สถานะ C001"`;

    await lineService.reply_message(replyToken, statusMessage);
  }

  /**
   * Sends help message with available commands
   * @param {string} replyToken - Reply token
   * @returns {Promise<void>}
   */
  async send_help_message(replyToken) {
    console.log('❓ Sending help message');
    
    const helpMessage = `📚 คำแนะนำการใช้งาน

คำสั่งที่สามารถใช้ได้:

🔸 "สวัสดี" หรือ "hello" - ทักทาย
🔸 "ร้องเรียน" หรือ "complaint" - ส่งข้อร้องเรียน
🔸 "สถานะ" หรือ "status" - ตรวจสอบสถานะ
🔸 "ช่วยเหลือ" หรือ "help" - ดูคำแนะนำ

💡 เคล็ดลับ: คุณสามารถพิมพ์เป็นภาษาไทยหรือภาษาอังกฤษได้

หากต้องการความช่วยเหลือเพิ่มเติม กรุณาติดต่อทีมงาน`;

    await lineService.reply_message(replyToken, helpMessage);
  }

  /**
   * Sends default response for unrecognized messages
   * @param {string} replyToken - Reply token
   * @param {string} originalText - Original message text
   * @returns {Promise<void>}
   */
  async send_default_response(replyToken, originalText) {
    console.log(`🤔 Sending default response for: "${originalText}"`);
    
    const defaultMessage = `ขออภัยค่ะ ไม่เข้าใจคำสั่งที่คุณส่งมา 😅

คุณสามารถพิมพ์:
• "ช่วยเหลือ" เพื่อดูคำแนะนำ
• "ร้องเรียน" เพื่อส่งข้อร้องเรียน
• "สถานะ" เพื่อตรวจสอบสถานะ

หรือลองพิมพ์ข้อความใหม่อีกครั้งค่ะ`;

    await lineService.reply_message(replyToken, defaultMessage);
  }

  /**
   * Handles non-text messages (images, stickers, etc.)
   * @param {string} replyToken - Reply token
   * @param {string} userId - LINE user ID
   * @param {Object} message - LINE message object
   * @returns {Promise<void>}
   */
  async handle_non_text_message(replyToken, userId, message, timestamp) {
    console.log(`📎 Handling non-text message type: ${message.type}`);
    
    // Check if user has active complaint session
    const activeSession = await ComplaintSession.findActiveSession(userId);
    
    if (activeSession) {
      // Add non-text message to active session
      const messageContent = `[${message.type.toUpperCase()}] ${message.id || 'media content'}`;
      await this.add_message_to_session(activeSession, 'user', message.type, messageContent, timestamp);
      
      const responseMessage = `📎 ได้รับ${message.type}ของคุณในการร้องเรียนแล้ว
      
คุณสามารถส่งข้อมูลเพิ่มเติมหรือพิมพ์ "/submit" เพื่อส่งร้องเรียน`;
      
      await lineService.reply_message(replyToken, responseMessage);
      
      // Add bot response to session
      await activeSession.addChatLog('bot', 'text', responseMessage);
      
    } else {
      const responseMessage = `ได้รับ ${message.type} ของคุณแล้วค่ะ 📎

หากต้องการเริ่มร้องเรียน กรุณาพิมพ์ "/complain" 
หรือ "ร้องเรียน" เพื่อเริ่มกระบวนการร้องเรียน`;

      await lineService.reply_message(replyToken, responseMessage);
    }
  }

  /**
   * Handles follow events (user adds bot as friend)
   * @param {Object} event - LINE follow event
   * @returns {Promise<void>}
   */
  async handle_follow_event(event) {
    const { replyToken, source } = event;
    const userId = source.userId;
    
    console.log(`➕ User followed: ${userId}`);
    
    try {
      // Register new user automatically when they follow
      await this.register_user_if_new(userId);
      
      // Send welcome message
      await this.send_welcome_message(replyToken, userId);
      
      console.log(`✅ New follower registered and welcomed: ${userId}`);
    } catch (error) {
      console.error('❌ Error handling follow event:', error);
    }
  }

  /**
   * Handles unfollow events (user removes bot)
   * @param {Object} event - LINE unfollow event
   * @returns {Promise<void>}
   */
  async handle_unfollow_event(event) {
    const { source } = event;
    const userId = source.userId;
    
    console.log(`➖ User unfollowed: ${userId}`);
    // Note: Cannot send messages to users who unfollowed
    // This is mainly for logging and cleanup purposes
  }

  /**
   * Handles postback events (button clicks, quick replies)
   * @param {Object} event - LINE postback event
   * @returns {Promise<void>}
   */
  async handle_postback_event(event) {
    const { replyToken, postback, source } = event;
    const userId = source.userId;
    
    console.log(`🔘 Postback from user ${userId}: ${postback.data}`);
    
    try {
      // Handle postback data
      const data = postback.data;
      
      if (data.startsWith('complaint_')) {
        await this.handle_complaint_postback(replyToken, userId, data);
      } else {
        await this.send_default_response(replyToken, data);
      }
    } catch (error) {
      console.error('❌ Error handling postback event:', error);
      await this.send_error_message(replyToken);
    }
  }

  /**
   * Handles complaint-related postback actions
   * @param {string} replyToken - Reply token
   * @param {string} userId - LINE user ID
   * @param {string} data - Postback data
   * @returns {Promise<void>}
   */
  async handle_complaint_postback(replyToken, userId, data) {
    console.log(`📋 Handling complaint postback: ${data}`);
    
    const message = 'ขอบคุณสำหรับข้อมูลค่ะ กรุณารออัพเดทสถานะจากทีมงาน';
    await lineService.reply_message(replyToken, message);
  }

  /**
   * Sends generic error message
   * @param {string} replyToken - Reply token
   * @returns {Promise<void>}
   */
  async send_error_message(replyToken) {
    const errorMessage = `ขออภัยค่ะ เกิดข้อผิดพลาดชั่วคราว 😔

กรุณาลองใหม่อีกครั้งในอีกสักครู่ 
หากปัญหายังคงเกิดขึ้น กรุณาติดต่อทีมงานค่ะ`;

    try {
      await lineService.reply_message(replyToken, errorMessage);
    } catch (error) {
      console.error('❌ Failed to send error message:', error);
    }
  }
}

module.exports = new LineWebhookHandler();