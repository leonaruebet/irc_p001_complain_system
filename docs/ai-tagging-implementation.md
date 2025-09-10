# AI Tagging System Implementation

**Status:** ✅ **FULLY IMPLEMENTED**

This document outlines the AI-powered complaint analysis system that has been implemented to analyze employee complaints using Google Gemini API.

---

## 1. Database Schema Design

### New Collection: `ai_complaint_tags`

The system creates a new MongoDB collection that maps 1:1 with `complaint_sessions`:

**Key Features:**
- **1:1 mapping** with complaint sessions via `complaint_session_id`
- **Denormalized data** for efficient queries (user info, department, timestamps)
- **Comprehensive AI analysis** results stored in structured format
- **Time-based sorting** using original complaint timestamps
- **Word cloud data** generation for dashboard visualization

**Schema Structure:**
```javascript
{
  _id: "aitag_sessionId",
  complaint_session_id: "sess_20250908_XYZ123", // References complaint_sessions._id
  complaint_id: "CMP-2025-09-08-0001",
  user_id: "Ucb71e2...1234",
  employee_display_name: "N. Aungsirikul",
  department: "Operations",
  
  // AI Analysis Results
  sentiment_analysis: {
    overall_sentiment: "negative|neutral|positive",
    sentiment_score: -0.7,
    confidence_level: 0.85
  },
  issue_classification: {
    primary_category: "management_issues",
    secondary_categories: ["workload_stress"],
    severity_level: "high",
    urgency_score: 8
  },
  key_phrases: {
    keywords: [
      { word: "overtime", frequency: 3, relevance_score: 0.9 },
      { word: "unpaid", frequency: 2, relevance_score: 0.8 }
    ],
    key_phrases: ["repeatedly assigns unpaid OT", "work-life balance"],
    emotional_indicators: ["frustrated", "overwhelmed"]
  },
  
  // Context & Summary
  complaint_start_time: "2025-09-08T10:02:34Z",
  message_count: 5,
  ai_summary: "Employee reports repeated unpaid overtime assignments...",
  recommended_actions: ["Review overtime policies", "Schedule manager meeting"]
}
```

---

## 2. Issue Categories

The AI system classifies complaints into these predefined categories:

- `workplace_harassment` - Bullying, inappropriate behavior, hostile work environment
- `discrimination` - Based on protected characteristics (race, gender, age, etc.)
- `unfair_treatment` - Favoritism, unequal treatment, bias
- `work_conditions` - Physical environment, safety, equipment, workspace issues
- `management_issues` - Poor supervision, leadership problems, communication gaps
- `compensation_benefits` - Pay disputes, benefits issues, overtime problems
- `workload_stress` - Excessive work, unrealistic deadlines, work-life balance
- `safety_concerns` - Physical safety, health hazards, security issues
- `policy_violations` - Company policy breaches, procedural issues
- `communication_issues` - Information gaps, unclear expectations, miscommunication
- `other` - Issues that don't fit other categories

---

## 3. API Integration (Google Gemini)

### Service Architecture
- **File:** `backend/src/services/ai_tagging_service.js`
- **Model:** Gemini 1.5 Pro
- **Environment:** `GEMINI_API_KEY` in `.env.local`

### Fixed JSON Response Schema
The system enforces a strict JSON schema for consistent AI responses:

```javascript
{
  sentiment_analysis: {
    overall_sentiment: "positive|neutral|negative",
    sentiment_score: "number between -1 and 1",
    confidence_level: "number between 0 and 1"
  },
  issue_classification: {
    primary_category: "enum value",
    secondary_categories: ["array of categories"],
    severity_level: "low|medium|high|critical",
    urgency_score: "number between 1 and 10"
  },
  key_phrases: {
    keywords: [{ word: "string", frequency: number, relevance_score: number }],
    key_phrases: ["array of important phrases"],
    emotional_indicators: ["array of emotional words/phrases"]
  },
  ai_summary: "string (max 1000 characters)",
  recommended_actions: ["array of recommended actions"]
}
```

---

## 4. Automatic Processing Workflow

### On Complaint Submission
When a user submits a complaint via `/submit`, the system:

1. **Submits the complaint** to the database
2. **Triggers background AI analysis** (non-blocking)
3. **Returns success response** immediately to user
4. **Processes AI analysis** in the background using `setImmediate()`

### Background Processing
- **Non-blocking:** User gets immediate response
- **Error handling:** Failures are logged but don't affect user experience
- **Automatic:** No manual intervention required
- **Configurable:** Only runs if `GEMINI_API_KEY` is configured

---

## 5. tRPC API Endpoints

### New Router: `aiTagging`

**Available Procedures:**

#### For HR Dashboard:
- `aiTagging.processComplaint` - Manually trigger AI analysis
- `aiTagging.batchProcessComplaints` - Process multiple complaints
- `aiTagging.getAnalysis` - Get AI analysis summary
- `aiTagging.getDetailedAnalysis` - Get full analysis with word cloud data
- `aiTagging.getAnalytics` - Get aggregated analytics data
- `aiTagging.getUnprocessedComplaints` - Find complaints without AI analysis
- `aiTagging.autoProcessUnprocessed` - Auto-process pending complaints

#### Example Usage:
```javascript
// Get AI analysis for a complaint
const analysis = await trpc.aiTagging.getAnalysis.query({
  complaintSessionId: "sess_20250908_XYZ123"
});

// Get analytics data for dashboard
const analytics = await trpc.aiTagging.getAnalytics.query({
  startDate: "2025-01-01T00:00:00Z",
  endDate: "2025-12-31T23:59:59Z",
  department: "Operations"
});
```

---

## 6. Database Indexes for Performance

**Optimized for common queries:**
```javascript
// Primary lookups
{ complaint_session_id: 1 }, { unique: true }
{ complaint_id: 1 }
{ user_id: 1, complaint_start_time: -1 }

// Dashboard filtering
{ department: 1, complaint_start_time: -1 }
{ 'sentiment_analysis.overall_sentiment': 1, complaint_start_time: -1 }
{ 'issue_classification.primary_category': 1, complaint_start_time: -1 }
{ 'issue_classification.severity_level': 1, complaint_start_time: -1 }

// Time-based queries
{ created_at: -1 }
```

---

## 7. Analytics & Reporting Capabilities

### Sentiment Analysis
- **Distribution:** Positive, neutral, negative breakdown
- **Trends:** Sentiment over time
- **Department comparison:** Sentiment by department

### Issue Classification
- **Category breakdown:** Most common issue types
- **Severity analysis:** Distribution of severity levels
- **Urgency tracking:** Average urgency scores

### Word Cloud Generation
- **Keywords extraction:** Most frequent complaint terms
- **Relevance scoring:** Weighted by importance
- **Emotional indicators:** Detect emotional language
- **Time-based filtering:** Generate word clouds for date ranges

### Department Analytics
- **Filter by department:** All analytics can be filtered by department
- **Comparative analysis:** Compare departments side-by-side
- **Trend analysis:** Track improvement or deterioration over time

---

## 8. Implementation Files Created/Modified

### New Files:
- `backend/src/models/ai_complaint_tag.js` - Mongoose model
- `backend/src/services/ai_tagging_service.js` - AI service logic
- `backend/src/trpc/routers/ai_tagging.js` - tRPC API endpoints

### Modified Files:
- `backend/src/models/index.js` - Added AIComplaintTag export
- `backend/src/trpc/context.js` - Added AIComplaintTag to context
- `backend/src/trpc/app.js` - Added aiTagging router
- `backend/src/trpc/routers/complaint.js` - Added background AI processing
- `backend/package.json` - Added @google/generative-ai dependency
- `.env.local` - Added GEMINI_API_KEY configuration

---

## 9. Usage Examples

### For HR Dashboard Integration:

```javascript
// Get comprehensive complaint view with AI analysis
const complaintData = await Promise.all([
  trpc.complaint.getById.query({ complaintId: "CMP-2025-09-08-0001" }),
  trpc.aiTagging.getDetailedAnalysis.query({ complaintSessionId: "sess_20250908_XYZ123" })
]);

// Generate dashboard analytics
const dashboardData = await trpc.aiTagging.getAnalytics.query({
  startDate: "2025-01-01T00:00:00Z",
  endDate: "2025-12-31T23:59:59Z"
});

// Process unanalyzed complaints
const processingResult = await trpc.aiTagging.autoProcessUnprocessed.mutate({
  limit: 10,
  department: "Operations"
});
```

### For Word Cloud Generation:
```javascript
const analysis = await trpc.aiTagging.getDetailedAnalysis.query({
  complaintSessionId: "sess_20250908_XYZ123"
});

const wordCloudData = analysis.data.word_cloud_data.keywords.map(keyword => ({
  text: keyword.word,
  value: keyword.frequency,
  weight: keyword.relevance_score
}));
```

---

## 10. Performance & Scalability

### Processing Performance:
- **Background processing:** Non-blocking complaint submission
- **Batch processing:** Process multiple complaints efficiently
- **Concurrency control:** Configurable concurrent API calls (default: 3)
- **Rate limiting protection:** Built-in delays to avoid API limits

### Database Performance:
- **Optimized indexes:** Fast queries for all common use cases
- **Denormalized data:** Reduce JOIN operations
- **Aggregation pipelines:** Efficient analytics queries

### Error Handling:
- **Graceful failures:** AI processing failures don't break core functionality
- **Retry logic:** Built-in error recovery
- **Comprehensive logging:** Track processing status and errors

---

## 11. Next Steps

The AI tagging system is now fully operational. To extend functionality:

1. **Frontend Dashboard:** Implement React components to display AI analysis results
2. **Real-time Updates:** Add WebSocket notifications for completed AI analysis
3. **Custom Categories:** Allow HR to define custom issue categories
4. **ML Model Training:** Train custom models based on historical data
5. **Report Generation:** Create automated reports with AI insights
6. **Alert System:** Notify HR of high-severity complaints automatically

---

**The system is ready for production use and will automatically analyze all submitted complaints using Google Gemini API.**