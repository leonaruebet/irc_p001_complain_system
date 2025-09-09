import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ComplaintSession from '@/lib/models/ComplaintSession';

interface AnalyticsData {
  total_sessions: number;
  status_breakdown: Record<string, number>;
  department_breakdown: Record<string, number>;
  daily_volume: Array<{ date: string; count: number }>;
  user_messages: Array<{ message: string; sentiment?: string; topic?: string }>;
  response_time_stats: {
    avg_hours: number;
    min_hours: number;
    max_hours: number;
  };
  session_duration_stats: {
    avg_minutes: number;
    min_minutes: number;
    max_minutes: number;
  };
}

/**
 * GET /api/analytics
 * Provides comprehensive analytics data from actual complaint sessions
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Starting analytics data collection...');
    await connectDB();

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const start_date = new Date();
    start_date.setDate(start_date.getDate() - days);

    console.log(`📊 Collecting analytics for last ${days} days`);

    // Get actual database connection and query both collections
    const db = (ComplaintSession as any).db;
    
    // Query the main complaint_sessions collection (the one with actual data)
    const mainCollection = db.collection('complaint_sessions');
    const mainSessions = await mainCollection.find({}).toArray();
    
    // Query the complaintsessions collection for additional data
    const altCollection = db.collection('complaintsessions');  
    const altSessions = await altCollection.find({}).toArray();
    
    // Combine all actual sessions
    const allSessions = [...mainSessions, ...altSessions];
    
    console.log(`📊 Found ${mainSessions.length} sessions in complaint_sessions`);
    console.log(`📊 Found ${altSessions.length} sessions in complaintsessions`);
    console.log(`📊 Total actual sessions: ${allSessions.length}`);
    console.log(`📋 Found ${allSessions.length} total sessions`);

    if (allSessions.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          total_sessions: 0,
          status_breakdown: {},
          department_breakdown: {},
          daily_volume: [],
          user_messages: [],
          response_time_stats: { avg_hours: 0, min_hours: 0, max_hours: 0 },
          session_duration_stats: { avg_minutes: 0, min_minutes: 0, max_minutes: 0 }
        }
      });
    }

    // 1. Total Sessions
    const total_sessions = allSessions.length;

    // 2. Status Breakdown
    const status_breakdown: Record<string, number> = {};
    allSessions.forEach(session => {
      status_breakdown[session.status] = (status_breakdown[session.status] || 0) + 1;
    });

    // 3. Department Breakdown
    const department_breakdown: Record<string, number> = {};
    allSessions.forEach(session => {
      const dept = session.department || 'Unknown';
      department_breakdown[dept] = (department_breakdown[dept] || 0) + 1;
    });

    // 4. Daily Volume - Generate series for last 7 days with actual data
    const daily_counts: Record<string, number> = {};
    
    // Initialize last 7 days with 0 counts
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      daily_counts[dateStr] = 0;
    }
    
    // Add actual complaint counts
    allSessions.forEach(session => {
      let sessionDate;
      // Handle different date formats in the data
      if (session.start_time) {
        sessionDate = new Date(session.start_time);
      } else if (session.created_at) {
        sessionDate = new Date(session.created_at);
      } else {
        sessionDate = new Date(); // fallback
      }
      
      const dateStr = sessionDate.toISOString().split('T')[0];
      if (daily_counts.hasOwnProperty(dateStr)) {
        daily_counts[dateStr] += 1;
      }
    });

    const daily_volume = Object.entries(daily_counts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 5. Extract User Messages for AI Analysis
    const user_messages: Array<{ message: string; timestamp: Date; user_id: string }> = [];
    allSessions.forEach(session => {
      if (session.chat_logs) {
        const userTexts = session.chat_logs
          .filter((log: any) => log.direction === 'user' && log.message_type === 'text')
          .map((log: any) => ({
            message: log.message,
            timestamp: log.timestamp,
            user_id: session.user_id
          }));
        user_messages.push(...userTexts);
      }
    });

    console.log(`💬 Found ${user_messages.length} user messages for analysis`);

    // 6. Response Time Analysis (time from start to end)
    const response_times: number[] = [];
    allSessions.forEach(session => {
      if (session.end_time && session.start_time) {
        const hours = (new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) / (1000 * 60 * 60);
        response_times.push(hours);
      }
    });

    const response_time_stats = response_times.length > 0 ? {
      avg_hours: response_times.reduce((a, b) => a + b, 0) / response_times.length,
      min_hours: Math.min(...response_times),
      max_hours: Math.max(...response_times)
    } : { avg_hours: 0, min_hours: 0, max_hours: 0 };

    // 7. Session Duration Analysis (time between first and last message)
    const session_durations: number[] = [];
    allSessions.forEach(session => {
      if (session.chat_logs && session.chat_logs.length > 1) {
        const first_msg = new Date(session.chat_logs[0].timestamp);
        const last_msg = new Date(session.chat_logs[session.chat_logs.length - 1].timestamp);
        const minutes = (last_msg.getTime() - first_msg.getTime()) / (1000 * 60);
        session_durations.push(minutes);
      }
    });

    const session_duration_stats = session_durations.length > 0 ? {
      avg_minutes: session_durations.reduce((a, b) => a + b, 0) / session_durations.length,
      min_minutes: Math.min(...session_durations),
      max_minutes: Math.max(...session_durations)
    } : { avg_minutes: 0, min_minutes: 0, max_minutes: 0 };

    // Process actual user messages for topic classification  
    const processedMessages = user_messages.map(msg => {
      const message = msg.message.toLowerCase();
      let topic = 'general';
      let sentiment = 'neutral';
      
      // Real topic classification based on actual message content
      if (message.includes('salary') || message.includes('pay') || message.includes('wage') || message.includes('เงิน')) {
        topic = 'salary_issues';
      } else if (message.includes('harassment') || message.includes('discrimination') || message.includes('ล่วงละเมิด')) {
        topic = 'harassment';
      } else if (message.includes('safety') || message.includes('อันตราย') || message.includes('ปลอดภัย')) {
        topic = 'safety_concerns';
      } else if (message.includes('hr') || message.includes('management') || message.includes('ช้า') || message.includes('ทำงาน')) {
        topic = 'hr_management';
      } else if (message.includes('เหนื่อย') || message.includes('เหงา') || message.includes('stress') || message.includes('tired')) {
        topic = 'workplace_wellness';
      }
      
      // Simple sentiment analysis based on keywords
      if (message.includes('ยาก') || message.includes('ช้า') || message.includes('เหนื่อย') || message.includes('เหงา') || message.includes('problem') || message.includes('issue')) {
        sentiment = 'negative';
      } else if (message.includes('good') || message.includes('great') || message.includes('ดี') || message.includes('excellent')) {
        sentiment = 'positive';
      }
      
      return {
        message: msg.message,
        topic,
        sentiment,
        timestamp: msg.timestamp,
        user_id: msg.user_id
      };
    });

    const analytics_data: AnalyticsData = {
      total_sessions,
      status_breakdown,
      department_breakdown,
      daily_volume,
      user_messages: processedMessages,
      response_time_stats,
      session_duration_stats
    };

    console.log('✅ Analytics data collection completed');

    return NextResponse.json({
      success: true,
      data: analytics_data,
      metadata: {
        query_period_days: days,
        last_updated: new Date().toISOString(),
        sessions_analyzed: total_sessions,
        messages_analyzed: user_messages.length
      }
    });

  } catch (error) {
    console.error('❌ Analytics API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate analytics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}