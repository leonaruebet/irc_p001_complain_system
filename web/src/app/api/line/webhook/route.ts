import { NextRequest, NextResponse } from 'next/server';
import { WebhookEvent, MessageEvent, TextMessage } from '@line/bot-sdk';
import connectDB from '@/lib/mongodb';
import lineClient from '@/lib/line-client';
import sessionManager from '@/lib/session-manager';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.text();
    const signature = request.headers.get('x-line-signature');

    if (!signature) {
      console.error('Missing LINE signature');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // Validate signature
    if (!lineClient.validateSignature(body, signature)) {
      console.error('Invalid LINE signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const events: WebhookEvent[] = JSON.parse(body).events;
    
    // Process each event
    for (const event of events) {
      await handleEvent(event);
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('LINE webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleEvent(event: WebhookEvent): Promise<void> {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return;
  }

  const messageEvent = event as MessageEvent;
  const userId = messageEvent.source.userId;
  const messageText = (messageEvent.message as any).text.trim();
  const replyToken = messageEvent.replyToken;

  if (!userId) {
    console.error('No userId in event');
    return;
  }

  console.log(`Received message from ${userId}: ${messageText}`);

  try {
    // Handle commands
    if (messageText.startsWith('/')) {
      await handleCommand(userId, messageText, replyToken);
    } else {
      await handleRegularMessage(userId, messageText, replyToken);
    }
  } catch (error) {
    console.error('Error handling message:', error);
    
    // Send error response
    const errorMessage: TextMessage = {
      type: 'text',
      text: 'Sorry, something went wrong. Please try again later.'
    };
    
    await lineClient.replyMessage(replyToken, [errorMessage]);
  }
}

async function handleCommand(userId: string, command: string, replyToken: string): Promise<void> {
  const cmd = command.toLowerCase();
  
  switch (cmd) {
    case '/complain':
      await handleComplainCommand(userId, replyToken);
      break;
    case '/submit':
      await handleSubmitCommand(userId, replyToken);
      break;
    case '/cancel':
      await handleCancelCommand(userId, replyToken);
      break;
    case '/help':
      await handleHelpCommand(userId, replyToken);
      break;
    default:
      const unknownMessage: TextMessage = {
        type: 'text',
        text: 'Unknown command. Type /help to see available commands.'
      };
      await lineClient.replyMessage(replyToken, [unknownMessage]);
  }
}

async function handleComplainCommand(userId: string, replyToken: string): Promise<void> {
  // Check if user already has an active session
  const activeSession = await sessionManager.getActiveSession(userId);
  
  if (activeSession) {
    const message: TextMessage = {
      type: 'text',
      text: `You already have an active complaint session (ID: ${activeSession.complaintId}). Please continue with your complaint or type /submit to finalize it.`
    };
    await lineClient.replyMessage(replyToken, [message]);
    return;
  }

  // Get user profile for display name
  let displayName = 'Unknown User';
  try {
    const profile = await lineClient.getUserProfile(userId);
    displayName = profile.displayName;
  } catch (error) {
    console.log('Could not get user profile');
  }

  // Create new session
  const session = await sessionManager.createSession(userId, '/complain');
  
  const messages: TextMessage[] = [
    {
      type: 'text',
      text: `Hello ${displayName}! 👋\n\nI'm here to help you submit a complaint. Please describe your issue in detail.\n\nWhen you're done, type /submit to finalize your complaint.\nType /cancel if you want to cancel.\n\n📝 Complaint ID: ${session.complaintId}`
    }
  ];

  await lineClient.replyMessage(replyToken, messages);
  await sessionManager.addBotResponse(userId, messages[0].text);
}

async function handleSubmitCommand(userId: string, replyToken: string): Promise<void> {
  const activeSession = await sessionManager.getActiveSession(userId);
  
  if (!activeSession) {
    const message: TextMessage = {
      type: 'text',
      text: 'You don\'t have an active complaint session. Type /complain to start a new complaint.'
    };
    await lineClient.replyMessage(replyToken, [message]);
    return;
  }

  // Submit the complaint
  const complaintId = await sessionManager.submitComplaint(userId);
  
  if (complaintId) {
    const message: TextMessage = {
      type: 'text',
      text: `✅ Your complaint has been submitted successfully!\n\n📋 Complaint ID: ${complaintId}\n📅 Submitted: ${new Date().toLocaleString()}\n\nYour complaint will be reviewed by our HR team. Thank you for bringing this to our attention.`
    };
    await lineClient.replyMessage(replyToken, [message]);
  } else {
    const message: TextMessage = {
      type: 'text',
      text: 'Failed to submit complaint. Please try again.'
    };
    await lineClient.replyMessage(replyToken, [message]);
  }
}

async function handleCancelCommand(userId: string, replyToken: string): Promise<void> {
  const canceled = await sessionManager.cancelSession(userId);
  
  const message: TextMessage = {
    type: 'text',
    text: canceled 
      ? '❌ Your complaint session has been canceled.'
      : 'You don\'t have an active complaint session to cancel.'
  };
  
  await lineClient.replyMessage(replyToken, [message]);
}

async function handleHelpCommand(userId: string, replyToken: string): Promise<void> {
  const message: TextMessage = {
    type: 'text',
    text: `🤖 Complaint Bot Help\n\nAvailable commands:\n• /complain - Start a new complaint\n• /submit - Submit your current complaint\n• /cancel - Cancel current complaint session\n• /help - Show this help message\n\nHow to use:\n1. Type /complain to start\n2. Describe your issue in detail\n3. Type /submit when done\n\nNeed assistance? Contact HR directly.`
  };
  
  await lineClient.replyMessage(replyToken, [message]);
}

async function handleRegularMessage(userId: string, messageText: string, replyToken: string): Promise<void> {
  const activeSession = await sessionManager.getActiveSession(userId);
  
  if (!activeSession) {
    const message: TextMessage = {
      type: 'text',
      text: 'To submit a complaint, please start by typing /complain.\n\nType /help to see all available commands.'
    };
    await lineClient.replyMessage(replyToken, [message]);
    return;
  }

  // Add message to active session
  await sessionManager.addMessage(userId, messageText);
  
  // Acknowledge receipt
  const responses = [
    'Thank you for the additional information. Please continue if you have more details to add.',
    'Got it! Please continue with your complaint details.',
    'I\'ve recorded that information. Feel free to add more details.',
    'Understood. Please provide any additional information if needed.'
  ];
  
  const randomResponse = responses[Math.floor(Math.random() * responses.length)];
  
  const message: TextMessage = {
    type: 'text',
    text: `${randomResponse}\n\nType /submit when you're ready to finalize your complaint.\nComplaint ID: ${activeSession.complaintId}`
  };
  
  await lineClient.replyMessage(replyToken, [message]);
  await sessionManager.addBotResponse(userId, message.text);
}