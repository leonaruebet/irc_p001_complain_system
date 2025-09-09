import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ComplaintSession from '@/lib/models/ComplaintSession';
import Employee from '@/lib/models/Employee';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const department = searchParams.get('department');

    const query: any = {};
    if (status) query.status = status;
    if (department) query.department = department;

    const skip = (page - 1) * limit;
    
    const complaints = await (ComplaintSession as any).find(query)
      .select('-chat_logs') // Exclude chat logs from list view for performance
      .sort({ start_time: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await (ComplaintSession as any).countDocuments(query);

    return NextResponse.json({
      complaints,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(total / limit),
        total_count: total,
        per_page: limit
      }
    });
  } catch (error) {
    console.error('Error fetching complaints:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch complaints',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { user_id, message, department } = body;

    if (!user_id || !message) {
      return NextResponse.json(
        { error: 'user_id and message are required' },
        { status: 400 }
      );
    }

    // Generate IDs
    const sessionId = (ComplaintSession as any).generateSessionId();
    const complaintId = (ComplaintSession as any).generateComplaintId();

    // Create complaint session
    const complaint = new ComplaintSession({
      _id: sessionId,
      complaint_id: complaintId,
      user_id,
      status: 'open',
      start_time: new Date(),
      department,
      chat_logs: [
        {
          timestamp: new Date(),
          direction: 'user',
          message_type: 'command',
          message: '/complain'
        },
        {
          timestamp: new Date(),
          direction: 'user',
          message_type: 'text',
          message
        }
      ]
    });

    await complaint.save();

    return NextResponse.json({
      success: true,
      complaint_id: complaintId,
      session_id: sessionId
    });
  } catch (error) {
    console.error('Error creating complaint:', error);
    return NextResponse.json(
      {
        error: 'Failed to create complaint',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}