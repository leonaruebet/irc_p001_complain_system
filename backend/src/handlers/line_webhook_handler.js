/**
 * LINE Webhook Handler
 * Processes incoming LINE webhook events and manages bot interactions
 */

const lineService = require('../services/line_service');

class LineWebhookHandler {
  constructor() {
    console.log('🎯 LineWebhookHandler initialized');
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
    const { replyToken, source, message } = event;
    const userId = source.userId;
    
    console.log(`💬 Message from user ${userId}: ${message.text || 'Non-text message'}`);
    
    try {
      if (message.type === 'text') {
        await this.process_text_message(replyToken, userId, message.text);
      } else {
        await this.handle_non_text_message(replyToken, userId, message);
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
  async process_text_message(replyToken, userId, text) {
    const normalizedText = text.toLowerCase().trim();
    
    console.log(`🔍 Processing text: "${normalizedText}"`);
    
    // Command routing based on text content
    if (normalizedText.includes('สวัสดี') || normalizedText.includes('hello') || normalizedText === 'hi') {
      await this.send_welcome_message(replyToken, userId);
    } 
    else if (normalizedText.includes('ร้องเรียน') || normalizedText.includes('complaint') || normalizedText.startsWith('/complain')) {
      await this.start_complaint_process(replyToken, userId);
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
   * Starts the complaint submission process
   * @param {string} replyToken - Reply token
   * @param {string} userId - LINE user ID
   * @returns {Promise<void>}
   */
  async start_complaint_process(replyToken, userId) {
    console.log(`📝 Starting complaint process for user: ${userId}`);
    
    // Test message to verify bot is working
    const testMessage = "ควยไรสัส";
    
    try {
      await lineService.reply_message(replyToken, testMessage);
      console.log('✅ Test complaint message sent successfully');
    } catch (error) {
      console.error('❌ Error sending test complaint message:', error);
      
      // Fallback: send quick reply as usual
      const quickReplyActions = [
        {
          type: 'message',
          label: 'บริการไม่ดี',
          text: 'ร้องเรียน: บริการไม่ดี'
        },
        {
          type: 'message', 
          label: 'สินค้าเสียหาย',
          text: 'ร้องเรียน: สินค้าเสียหาย'
        },
        {
          type: 'message',
          label: 'ปัญหาอื่นๆ',
          text: 'ร้องเรียน: อื่นๆ'
        }
      ];

      const message = lineService.create_quick_reply(
        'กรุณาเลือกประเภทการร้องเรียน หรือพิมพ์รายละเอียดที่ต้องการร้องเรียน',
        quickReplyActions
      );

      await lineService.reply_message(replyToken, message);
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
  async handle_non_text_message(replyToken, userId, message) {
    console.log(`📎 Handling non-text message type: ${message.type}`);
    
    const responseMessage = `ได้รับ ${message.type} ของคุณแล้วค่ะ 📎

หากต้องการส่งข้อร้องเรียน กรุณาพิมพ์ "ร้องเรียน" 
หรือพิมพ์รายละเอียดเป็นข้อความค่ะ`;

    await lineService.reply_message(replyToken, responseMessage);
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
      await this.send_welcome_message(replyToken, userId);
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