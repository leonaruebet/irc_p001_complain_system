'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDate, getStatusColor, getStatusIcon } from '@/lib/utils';
import { ArrowLeft, RefreshCw, User, Clock, MessageCircle } from 'lucide-react';

interface ChatLog {
  timestamp: string;
  direction: 'user' | 'bot';
  message_type: 'text' | 'image' | 'file' | 'command';
  message: string;
}

interface Employee {
  _id: string;
  display_name: string;
  department?: string;
  active: boolean;
}

interface Complaint {
  _id: string;
  complaint_id: string;
  user_id: string;
  status: 'open' | 'submitted';
  start_time: string;
  end_time?: string;
  department?: string;
  chat_logs: ChatLog[];
}

interface ComplaintDetailResponse {
  complaint: Complaint;
  employee: Employee | null;
}

export default function ComplaintDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<ComplaintDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchComplaintDetail = () => {
    setLoading(true);
    fetch(`/api/complaints/${id}`)
      .then(response => {
        if (!response.ok) {
          if (response.status === 404) {
            setError('Complaint not found');
            setLoading(false);
            return;
          } else {
            throw new Error('Failed to fetch complaint details');
          }
        }
        return response.json();
      })
      .then((result: ComplaintDetailResponse) => {
        setData(result);
        setError(null);
        setLoading(false);
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchComplaintDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin" />
        <span className="ml-2">Loading complaint details...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-red-600 mb-4">Error: {error}</p>
            <div className="space-x-4">
              <Button onClick={fetchComplaintDetail}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Link href="/dashboard">
                <Button variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const { complaint, employee } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <span className="mr-2">{getStatusIcon(complaint.status)}</span>
              {complaint.complaint_id}
            </h1>
            <p className="text-gray-600">Complaint Details</p>
          </div>
        </div>
        <Button onClick={fetchComplaintDetail}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Complaint Info */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                Employee Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Name</p>
                <p className="text-lg">{employee?.display_name || 'Unknown User'}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-600">Department</p>
                <p className="text-lg">{employee?.department || complaint.department || 'Unknown'}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-600">User ID</p>
                <p className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                  {complaint.user_id}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Status</p>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(complaint.status)}`}>
                  {complaint.status}
                </span>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-600">Started</p>
                <p className="text-sm">{formatDate(complaint.start_time)}</p>
              </div>
              
              {complaint.end_time && (
                <div>
                  <p className="text-sm font-medium text-gray-600">Submitted</p>
                  <p className="text-sm">{formatDate(complaint.end_time)}</p>
                </div>
              )}
              
              <div>
                <p className="text-sm font-medium text-gray-600">Messages</p>
                <p className="text-lg font-semibold">{complaint.chat_logs.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chat Logs */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageCircle className="w-5 h-5 mr-2" />
                Conversation History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {complaint.chat_logs.map((log, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      log.direction === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        log.direction === 'user'
                          ? 'bg-blue-500 text-white'
                          : log.message.startsWith('[HR Note]')
                          ? 'bg-orange-100 text-orange-800 border border-orange-200'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium">
                          {log.direction === 'user' ? 'Employee' : 'Bot'}
                        </span>
                        <span className="text-xs opacity-75">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">
                        {log.message}
                      </p>
                      {log.message_type === 'command' && (
                        <span className="text-xs bg-black bg-opacity-20 px-1 rounded mt-1 inline-block">
                          command
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {complaint.chat_logs.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No messages in this conversation.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}