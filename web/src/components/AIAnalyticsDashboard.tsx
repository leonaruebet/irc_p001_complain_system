'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  ResponsiveContainer,
  AreaChart,
  Area,
  Treemap
} from 'recharts';
import { 
  TrendingUp, 
  Brain, 
  Clock, 
  MessageCircle, 
  RefreshCw, 
  Building, 
  AlertCircle,
  BarChart3,
  Heart,
  Frown,
  Meh,
  Smile,
  AlertTriangle,
  Target,
  Cloud,
  Filter,
  Grid3X3,
  List,
  Eye
} from 'lucide-react';
import { Wordcloud } from '@visx/wordcloud';
import { scaleLog } from '@visx/scale';
import { Text } from '@visx/text';

interface SentimentStats {
  _id: 'positive' | 'neutral' | 'negative';
  count: number;
  avg_score: number;
  avg_urgency: number;
}

interface IssueStats {
  _id: string;
  count: number;
  avg_severity_score: number;
  avg_urgency: number;
}

interface WordCloudKeyword {
  _id: string;
  total_frequency: number;
  avg_relevance: number;
  complaint_count: number;
}

interface AIAnalyticsData {
  sentiment_distribution: SentimentStats[];
  issue_categories: IssueStats[];
  word_cloud_data: WordCloudKeyword[];
  date_range: {
    startDate: string;
    endDate: string;
  };
  department: string;
  total_analyzed: number;
  processing_stats: {
    avg_processing_time_ms: number;
    success_rate: number;
    total_processed: number;
  };
}

interface AIAnalyticsResponse {
  success: boolean;
  data: AIAnalyticsData;
  message: string;
}

const SENTIMENT_COLORS = {
  positive: '#10B981', // Green
  neutral: '#6B7280',  // Gray
  negative: '#EF4444'  // Red
};

const SEVERITY_COLORS = ['#10B981', '#F59E0B', '#EF4444', '#DC2626']; // Green, Yellow, Red, Dark Red

const CATEGORY_COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8',
  '#82CA9D', '#FFC658', '#FF7C7C', '#8DD1E1', '#D084D0'
];

export default function AIAnalyticsDashboard() {
  const [aiAnalytics, setAiAnalytics] = useState<AIAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
    endDate: new Date().toISOString()
  });
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  
  // New state for category breakdown
  const [categoryViewMode, setCategoryViewMode] = useState<'bar' | 'treemap'>('bar');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Enhanced Category Breakdown Data - moved before early returns to fix hooks order
  const filteredCategoryData = useMemo(() => {
    if (!aiAnalytics?.issue_categories) return [];
    
    let filteredData = aiAnalytics.issue_categories;
    
    // Apply severity filter
    if (severityFilter !== 'all') {
      const severityMap = { low: [1, 1.5], medium: [2, 2.5], high: [3, 3.5], critical: [4, 4] };
      const [min, max] = severityMap[severityFilter as keyof typeof severityMap] || [1, 4];
      filteredData = filteredData.filter(item => 
        item.avg_severity_score >= min && item.avg_severity_score <= max
      );
    }
    
    return filteredData.sort((a, b) => b.count - a.count);
  }, [aiAnalytics?.issue_categories, severityFilter]);

  // Treemap data for visual hierarchy
  const treemapData = useMemo(() => {
    if (filteredCategoryData.length === 0) return { name: 'Complaints', children: [] };
    
    const totalComplaints = filteredCategoryData.reduce((sum, item) => sum + item.count, 0);
    
    return {
      name: 'Complaints',
      children: filteredCategoryData.map(item => {
        const categoryName = item._id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const percentage = ((item.count / totalComplaints) * 100).toFixed(1);
        
        return {
          name: categoryName,
          value: item.count,
          percentage,
          severity: item.avg_severity_score,
          urgency: item.avg_urgency,
          severityLabel: ['Low', 'Medium', 'High', 'Critical'][Math.round(item.avg_severity_score) - 1] || 'Medium',
          color: item.avg_severity_score >= 3.5 ? '#DC2626' :
                 item.avg_severity_score >= 2.5 ? '#F59E0B' : '#10B981'
        };
      })
    };
  }, [filteredCategoryData]);

  // Category insights and statistics
  const categoryInsights = useMemo(() => {
    if (filteredCategoryData.length === 0) return null;
    
    const totalComplaints = filteredCategoryData.reduce((sum, item) => sum + item.count, 0);
    const avgSeverity = filteredCategoryData.reduce((sum, item) => sum + item.avg_severity_score, 0) / filteredCategoryData.length;
    const avgUrgency = filteredCategoryData.reduce((sum, item) => sum + item.avg_urgency, 0) / filteredCategoryData.length;
    const highPriorityCount = filteredCategoryData.filter(item => item.avg_severity_score >= 3).length;
    
    return {
      totalCategories: filteredCategoryData.length,
      totalComplaints,
      avgSeverity,
      avgUrgency,
      highPriorityCount,
      topCategory: filteredCategoryData[0]
    };
  }, [filteredCategoryData]);

  const fetchAIAnalytics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      params.append('startDate', dateRange.startDate);
      params.append('endDate', dateRange.endDate);
      if (selectedDepartment) {
        params.append('department', selectedDepartment);
      }

      const response = await fetch(`/api/ai-analytics?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: AIAnalyticsResponse = await response.json();
      
      if (result.success) {
        setAiAnalytics(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch AI analytics');
      }
    } catch (err) {
      console.error('AI Analytics fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch AI analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAIAnalytics();
  }, [dateRange, selectedDepartment]);

  // Generate severity trend data from actual issue categories (if available)
  const severityTrendData = useMemo(() => {
    if (!aiAnalytics?.issue_categories?.length) return [];
    
    // Group by severity level and create a single data point for current period
    const severityBreakdown = aiAnalytics.issue_categories.reduce((acc, item) => {
      const severity = item.severity || 'medium'; // fallback if no severity
      acc[severity] = (acc[severity] || 0) + item.count;
      return acc;
    }, {} as Record<string, number>);

    return [{
      date: 'Current Period',
      low: severityBreakdown.low || 0,
      medium: severityBreakdown.medium || 0,
      high: severityBreakdown.high || 0,
      critical: severityBreakdown.critical || 0
    }];
  }, [aiAnalytics?.issue_categories]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Brain className="w-6 h-6 animate-pulse mr-2" />
        <span>Loading AI analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-4">Error loading AI analytics: {error}</p>
            <Button onClick={fetchAIAnalytics}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!aiAnalytics) {
    return (
      <div className="text-center py-8">
        <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">No AI analytics data available</p>
      </div>
    );
  }

  // Prepare chart data
  const sentimentData = aiAnalytics.sentiment_distribution.map(item => ({
    name: item._id.charAt(0).toUpperCase() + item._id.slice(1),
    value: item.count,
    percentage: ((item.count / aiAnalytics.total_analyzed) * 100).toFixed(1)
  }));

  const issueData = aiAnalytics.issue_categories
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .map(item => ({
      name: item._id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      count: item.count,
      urgency: item.avg_urgency.toFixed(1),
      severity: item.avg_severity_score.toFixed(1)
    }));

  // Word cloud data
  const wordCloudWords = aiAnalytics.word_cloud_data
    .sort((a, b) => b.total_frequency - a.total_frequency)
    .slice(0, 50)
    .map(item => ({
      text: item._id,
      value: item.total_frequency,
      complaints: item.complaint_count
    }));

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case 'positive': return <Smile className="w-5 h-5 text-green-500" />;
      case 'negative': return <Frown className="w-5 h-5 text-red-500" />;
      default: return <Meh className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 flex items-center">
            <Brain className="w-8 h-8 mr-3 text-purple-600" />
            AI Analytics Dashboard
          </h2>
          <p className="text-gray-600">
            AI-powered insights from {aiAnalytics.total_analyzed} analyzed complaints
          </p>
        </div>
        <div className="flex gap-3">
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="">All Departments</option>
            <option value="Operations">Operations</option>
            <option value="Sales">Sales</option>
            <option value="HR">HR</option>
            <option value="IT">IT</option>
          </select>
          <Button onClick={fetchAIAnalytics}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* AI Processing Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Target className="w-4 h-4 mr-2" />
              Analyzed Complaints
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {aiAnalytics.total_analyzed}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Total processed by AI
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              Avg Processing Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {(aiAnalytics.processing_stats?.avg_processing_time_ms / 1000).toFixed(1)}s
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Average AI analysis time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Heart className="w-4 h-4 mr-2" />
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {(aiAnalytics.processing_stats?.success_rate * 100).toFixed(1)}%
            </div>
            <p className="text-sm text-gray-500 mt-1">
              AI processing success
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2" />
              High Priority
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {aiAnalytics.issue_categories
                .filter(item => item.avg_urgency > 7)
                .reduce((sum, item) => sum + item.count, 0)}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Urgent complaints (7+ score)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sentiment Analysis Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sentiment Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Heart className="w-5 h-5 mr-2 text-purple-500" />
              Sentiment Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sentimentData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name} ${percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {sentimentData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={SENTIMENT_COLORS[entry.name.toLowerCase() as keyof typeof SENTIMENT_COLORS]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Sentiment Details */}
            <div className="mt-4 space-y-2">
              {aiAnalytics.sentiment_distribution.map((sentiment, index) => (
                <div key={sentiment._id} className="flex items-center justify-between">
                  <div className="flex items-center">
                    {getSentimentIcon(sentiment._id)}
                    <span className="ml-2 text-sm font-medium">
                      {sentiment._id.charAt(0).toUpperCase() + sentiment._id.slice(1)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {sentiment.count} complaints • Avg urgency: {sentiment.avg_urgency.toFixed(1)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Severity Levels Area Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-orange-500" />
              Severity Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={severityTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="low" 
                    stackId="1" 
                    stroke="#10B981" 
                    fill="#10B981" 
                    fillOpacity={0.6}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="medium" 
                    stackId="1" 
                    stroke="#F59E0B" 
                    fill="#F59E0B" 
                    fillOpacity={0.6}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="high" 
                    stackId="1" 
                    stroke="#EF4444" 
                    fill="#EF4444" 
                    fillOpacity={0.6}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="critical" 
                    stackId="1" 
                    stroke="#DC2626" 
                    fill="#DC2626" 
                    fillOpacity={0.8}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Issue Categories and Word Cloud */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enhanced Complaint Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-blue-500" />
                Complaint Category Breakdown
              </div>
              <div className="flex items-center gap-2">
                {/* View Mode Toggle */}
                <div className="flex items-center gap-1">
                  <Button
                    variant={categoryViewMode === 'bar' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCategoryViewMode('bar')}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={categoryViewMode === 'treemap' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCategoryViewMode('treemap')}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                </div>
                
                {/* Severity Filter */}
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="text-sm border border-gray-300 rounded px-2 py-1"
                >
                  <option value="all">All Severity</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </CardTitle>
            
            {/* Category Insights Summary */}
            {categoryInsights && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="font-semibold text-blue-800">{categoryInsights.totalCategories}</div>
                  <div className="text-blue-600">Categories</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="font-semibold text-green-800">{categoryInsights.totalComplaints}</div>
                  <div className="text-green-600">Total Complaints</div>
                </div>
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <div className="font-semibold text-yellow-800">{categoryInsights.avgSeverity.toFixed(1)}</div>
                  <div className="text-yellow-600">Avg Severity</div>
                </div>
                <div className="bg-red-50 p-3 rounded-lg">
                  <div className="font-semibold text-red-800">{categoryInsights.highPriorityCount}</div>
                  <div className="text-red-600">High Priority</div>
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {categoryViewMode === 'bar' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredCategoryData.slice(0, 8).map(item => ({
                    name: item._id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                    count: item.count,
                    urgency: item.avg_urgency.toFixed(1),
                    severity: item.avg_severity_score.toFixed(1)
                  }))} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={120} fontSize={12} />
                    <Tooltip 
                      formatter={(value, name) => [
                        name === 'count' ? `${value} complaints` : value,
                        name === 'count' ? 'Count' : name === 'urgency' ? 'Avg Urgency' : 'Avg Severity'
                      ]}
                    />
                    <Bar dataKey="count" fill="#0088FE" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                // Custom Treemap using div-based layout
                <div className="w-full h-full flex flex-wrap">
                  {treemapData.children.map((item, index) => {
                    const width = Math.sqrt(item.value / treemapData.children.reduce((sum, i) => sum + i.value, 0)) * 100;
                    return (
                      <div
                        key={item.name}
                        className="relative border border-white cursor-pointer transition-all duration-200 hover:opacity-80"
                        style={{
                          backgroundColor: item.color,
                          flex: `${item.value} ${item.value} auto`,
                          minHeight: '60px',
                          minWidth: '80px'
                        }}
                        onClick={() => setSelectedCategory(selectedCategory === item.name ? null : item.name)}
                      >
                        <div className="p-2 text-white text-xs h-full flex flex-col justify-center">
                          <div className="font-semibold truncate">{item.name}</div>
                          <div className="text-white/80">{item.value} complaints</div>
                          <div className="text-white/60">{item.percentage}%</div>
                          <div className="text-white/60">{item.severityLabel}</div>
                        </div>
                        {selectedCategory === item.name && (
                          <div className="absolute top-full left-0 bg-white shadow-lg border rounded p-2 text-black text-xs z-10 min-w-48">
                            <div><strong>Category:</strong> {item.name}</div>
                            <div><strong>Complaints:</strong> {item.value}</div>
                            <div><strong>Percentage:</strong> {item.percentage}%</div>
                            <div><strong>Severity:</strong> {item.severityLabel} ({item.severity.toFixed(1)})</div>
                            <div><strong>Urgency:</strong> {item.urgency.toFixed(1)}/10</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Word Cloud */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Cloud className="w-5 h-5 mr-2 text-indigo-500" />
              Complaint Keywords
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {wordCloudWords.length > 0 ? (
                <svg width="100%" height="100%" viewBox="0 0 500 250">
                  <Wordcloud
                    words={wordCloudWords}
                    width={500}
                    height={250}
                    fontSize={(datum) => {
                      const fontScale = scaleLog({
                        domain: [
                          Math.min(...wordCloudWords.map(w => w.value)),
                          Math.max(...wordCloudWords.map(w => w.value))
                        ],
                        range: [12, 36]
                      });
                      return fontScale(datum.value);
                    }}
                    rotate={() => (Math.random() - 0.5) * 60}
                    padding={2}
                  >
                    {(cloudWords) =>
                      cloudWords.map((w, i) => (
                        <Text
                          key={w.text}
                          fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
                          textAnchor="middle"
                          transform={`translate(${w.x}, ${w.y}) rotate(${w.rotate})`}
                          fontSize={w.size}
                          fontFamily="Inter"
                          className="cursor-pointer hover:opacity-80"
                          onClick={() => console.log('Word clicked:', w.text)}
                        >
                          {w.text}
                        </Text>
                      ))
                    }
                  </Wordcloud>
                </svg>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No keywords available
                </div>
              )}
            </div>
            <div className="mt-4 text-xs text-gray-500">
              Word size represents frequency across complaints
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Issue Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Issue Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Category</th>
                  <th className="text-center py-2">Count</th>
                  <th className="text-center py-2">Avg Severity</th>
                  <th className="text-center py-2">Avg Urgency</th>
                  <th className="text-center py-2">Percentage</th>
                </tr>
              </thead>
              <tbody>
                {aiAnalytics.issue_categories
                  .sort((a, b) => b.count - a.count)
                  .map((category, index) => {
                    const percentage = ((category.count / aiAnalytics.total_analyzed) * 100).toFixed(1);
                    const severityLabel = ['Low', 'Medium', 'High', 'Critical'][Math.round(category.avg_severity_score) - 1] || 'Medium';
                    
                    return (
                      <tr key={category._id} className="border-b hover:bg-gray-50">
                        <td className="py-2">
                          <div className="font-medium">
                            {category._id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </div>
                        </td>
                        <td className="text-center py-2">
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                            {category.count}
                          </span>
                        </td>
                        <td className="text-center py-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            category.avg_severity_score >= 3.5 ? 'bg-red-100 text-red-800' :
                            category.avg_severity_score >= 2.5 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {severityLabel}
                          </span>
                        </td>
                        <td className="text-center py-2">
                          <span className="text-gray-700">
                            {category.avg_urgency.toFixed(1)}/10
                          </span>
                        </td>
                        <td className="text-center py-2">
                          <span className="text-gray-600">
                            {percentage}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Top Keywords Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Complaint Keywords</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {wordCloudWords.slice(0, 12).map((word, index) => (
              <div key={word.text} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="font-medium text-gray-900">{word.text}</span>
                  <div className="text-xs text-gray-500">
                    {word.complaints} complaint{word.complaints > 1 ? 's' : ''}
                  </div>
                </div>
                <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-sm font-medium">
                  {word.value}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Data Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Analysis Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div>
              <span className="font-medium text-gray-600">Analysis Period:</span>
              <br />
              {new Date(aiAnalytics.date_range.startDate).toLocaleDateString()} - {new Date(aiAnalytics.date_range.endDate).toLocaleDateString()}
            </div>
            <div>
              <span className="font-medium text-gray-600">Department Filter:</span>
              <br />
              {aiAnalytics.department || 'All Departments'}
            </div>
            <div>
              <span className="font-medium text-gray-600">AI Model:</span>
              <br />
              Google Gemini 1.5 Pro
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}