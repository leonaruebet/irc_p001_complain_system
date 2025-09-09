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

    console.log('🔍 Fetching actual complaints from database...');

    // Get database connection
    const db = (ComplaintSession as any).db;
    
    // Query both collections for actual data
    const mainCollection = db.collection('complaint_sessions');
    const altCollection = db.collection('complaintsessions');
    
    // Build query
    const query: any = {};
    if (status) query.status = status;
    if (department) query.department = department;

    // Get data from both collections
    const mainComplaints = await mainCollection.find(query)
      .project({ chat_logs: 0 }) // Exclude chat logs for performance
      .sort({ start_time: -1 })
      .toArray();

    const altComplaints = await altCollection.find(query)
      .project({ chat_logs: 0 }) // Exclude chat logs for performance  
      .sort({ start_time: -1 })
      .toArray();

    // Combine and sort all complaints
    const allComplaints = [...mainComplaints, ...altComplaints];
    allComplaints.sort((a, b) => {
      const dateA = new Date(a.start_time || a.createdAt);
      const dateB = new Date(b.start_time || b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });

    console.log(`📊 Found ${mainComplaints.length} complaints in complaint_sessions`);
    console.log(`📊 Found ${altComplaints.length} complaints in complaintsessions`);
    console.log(`📊 Total actual complaints: ${allComplaints.length}`);

    // Apply pagination
    const skip = (page - 1) * limit;
    const paginatedComplaints = allComplaints.slice(skip, skip + limit);
    const total = allComplaints.length;

    return NextResponse.json({
      complaints: paginatedComplaints,
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