import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ComplaintSession from '@/lib/models/ComplaintSession';
import Employee from '@/lib/models/Employee';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;
    
    const complaint = await (ComplaintSession as any).findOne({
      $or: [
        { _id: id },
        { complaint_id: id }
      ]
    }).lean();

    if (!complaint) {
      return NextResponse.json(
        { error: 'Complaint not found' },
        { status: 404 }
      );
    }

    // Get employee info
    let employee = null;
    if (complaint.user_id) {
      employee = await (Employee as any).findById(complaint.user_id).lean();
    }

    return NextResponse.json({
      complaint,
      employee
    });
  } catch (error) {
    console.error('Error fetching complaint:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch complaint',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;
    const body = await request.json();
    const { status, notes } = body;

    if (status && !['open', 'submitted'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be "open" or "submitted"' },
        { status: 400 }
      );
    }

    const updateQuery: any = {};
    if (status) updateQuery.status = status;

    const pushQuery: any = {};
    if (notes) {
      pushQuery.$push = {
        chat_logs: {
          timestamp: new Date(),
          direction: 'bot',
          message_type: 'text',
          message: `[HR Note] ${notes}`
        }
      };
    }

    const complaint = await (ComplaintSession as any).findOneAndUpdate(
      {
        $or: [
          { _id: id },
          { complaint_id: id }
        ]
      },
      {
        ...updateQuery,
        ...pushQuery
      },
      { new: true }
    );

    if (!complaint) {
      return NextResponse.json(
        { error: 'Complaint not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      complaint
    });
  } catch (error) {
    console.error('Error updating complaint:', error);
    return NextResponse.json(
      {
        error: 'Failed to update complaint',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}