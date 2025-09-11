'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  Clock, 
  MessageCircle, 
  RefreshCw, 
  Building, 
  AlertCircle,
  BarChart3 
} from 'lucide-react';

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

interface AnalyticsResponse {
  success: boolean;
  data: AnalyticsData;
  metadata: {
    query_period_days: number;
    last_updated: string;
    sessions_analyzed: number;
    messages_analyzed: number;
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [metadata, setMetadata] = useState<AnalyticsResponse['metadata'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = () => {
    setLoading(true);
    fetch('/api/analytics')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data: AnalyticsResponse) => {
        if (data.success) {
          setAnalytics(data.data);
          setMetadata(data.metadata);
          setError(null);
        } else {
          throw new Error('Analytics API returned error');
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Analytics fetch error:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        <span>Loading analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-4">Error loading analytics: {error}</p>
            <Button onClick={fetchAnalytics}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No analytics data available</p>
      </div>
    );
  }

  // Prepare chart data
  const statusData = Object.entries(analytics.status_breakdown).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: count
  }));

  const departmentData = Object.entries(analytics.department_breakdown).map(([department, count]) => ({
    name: department,
    value: count
  }));

  const dailyVolumeData = analytics.daily_volume.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    complaints: item.count
  }));

  // Topic analysis from processed data
  const topicCounts: Record<string, number> = {};
  analytics.user_messages.forEach(msg => {
    const topicName = msg.topic?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'General';
    topicCounts[topicName] = (topicCounts[topicName] || 0) + 1;
  });

  const topicData = Object.entries(topicCounts).map(([topic, count]) => ({
    name: topic,
    value: count
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h2>
          <p className="text-gray-600">
            Data analysis from {metadata?.sessions_analyzed} complaint sessions
          </p>
        </div>
        <Button onClick={fetchAnalytics}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Users className="w-4 h-4 mr-2" />
              Total Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {analytics.total_sessions}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Last {metadata?.query_period_days} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <MessageCircle className="w-4 h-4 mr-2" />
              User Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {analytics.user_messages.length}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Messages analyzed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              Avg Session Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {analytics.session_duration_stats.avg_minutes.toFixed(1)}m
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Average time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Building className="w-4 h-4 mr-2" />
              Departments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {Object.keys(analytics.department_breakdown).length}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Involved departments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Volume Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Daily Complaint Volume
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyVolumeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="complaints" 
                    stroke="#0088FE" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Department Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#00C49F" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Topic Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Topic Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={topicData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {topicData.map((entry, index) => (
                      <Cell key={`topic-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Messages Sample */}
      <Card>
        <CardHeader>
          <CardTitle>Recent User Messages (Sample)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {analytics.user_messages.slice(0, 10).map((msg, index) => (
              <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                <p className="text-sm text-gray-700">"{msg.message}"</p>
                <div className="flex gap-2 mt-1">
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                    Topic: {msg.topic || 'General'}
                  </span>
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                    Sentiment: {msg.sentiment || 'Neutral'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Metadata */}
      {metadata && (
        <Card>
          <CardHeader>
            <CardTitle>Data Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">Query Period:</span>
                <br />
                <span className="text-gray-900">
                  {metadata.query_period_days} days
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-600">Sessions Analyzed:</span>
                <br />
                <span className="text-gray-900">
                  {metadata.sessions_analyzed}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-600">Messages Analyzed:</span>
                <br />
                <span className="text-gray-900">
                  {metadata.messages_analyzed}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-600">Last Updated:</span>
                <br />
                <span className="text-gray-900">
                  {new Date(metadata.last_updated).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}