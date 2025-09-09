'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDate, formatRelativeTime, getStatusColor, getStatusIcon } from '@/lib/utils';
import { Eye, RefreshCw, BarChart3, List } from 'lucide-react';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';

interface Complaint {
  _id: string;
  complaint_id: string;
  user_id: string;
  status: 'open' | 'submitted';
  start_time: string;
  end_time?: string;
  department?: string;
}

interface ComplaintsResponse {
  complaints: Complaint[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_count: number;
    per_page: number;
  };
}

export default function DashboardPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'open' | 'submitted'>('all');
  const [activeTab, setActiveTab] = useState<'complaints' | 'analytics'>('analytics');

  const fetchComplaints = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter !== 'all') params.append('status', filter);
    
    fetch(`/api/complaints?${params.toString()}`)
      .then(response => {
        if (!response.ok) throw new Error('Failed to fetch complaints');
        return response.json();
      })
      .then((data: ComplaintsResponse) => {
        setComplaints(data.complaints);
        setError(null);
        setLoading(false);
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchComplaints();
  }, [filter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin" />
        <span className="ml-2">Loading complaints...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-red-600 mb-4">Error: {error}</p>
            <Button onClick={fetchComplaints}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Component for Complaints List Tab
  const ComplaintsTab = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Complaints
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{complaints.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Open Complaints
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {complaints.filter(c => c.status === 'open').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Submitted Complaints
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {complaints.filter(c => c.status === 'submitted').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg w-fit">
        {[
          { key: 'all', label: 'All' },
          { key: 'open', label: 'Open' },
          { key: 'submitted', label: 'Submitted' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Complaints List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {filter === 'all' ? 'All Complaints' : `${filter.charAt(0).toUpperCase() + filter.slice(1)} Complaints`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {complaints.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No complaints found.
            </div>
          ) : (
            <div className="space-y-3">
              {complaints.map((complaint) => (
                <div
                  key={complaint._id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">
                        {getStatusIcon(complaint.status)}
                      </span>
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {complaint.complaint_id}
                        </h3>
                        <p className="text-sm text-gray-500">
                          User: {complaint.user_id.slice(0, 8)}... • 
                          {complaint.department && ` ${complaint.department} • `}
                          {formatRelativeTime(complaint.start_time)}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(complaint.status)}`}>
                      {complaint.status}
                    </span>
                    
                    <Link href={`/dashboard/complaints/${complaint.complaint_id}`}>
                      <Button size="sm" variant="outline">
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">HR Dashboard</h1>
          <p className="text-gray-600">Analytics and complaint management</p>
        </div>
        <Button onClick={fetchComplaints}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        {[
          { key: 'analytics', label: 'Analytics', icon: BarChart3 },
          { key: 'complaints', label: 'Complaints List', icon: List }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <tab.icon className="w-4 h-4 mr-2" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'analytics' ? (
        <AnalyticsDashboard />
      ) : (
        <ComplaintsTab />
      )}
    </div>
  );
}