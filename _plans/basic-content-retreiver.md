# Research Assistant System Implementation Plan

## System Overview
The Research Assistant system processes YouTube content into structured research insights and generates daily reports. The system is designed to be expandable to support additional content sources in the future.

## Agent Overview

### 1. Manager Agent
- **Purpose**: Orchestrate the entire workflow and coordinate between agents
- **Input**: Execution request (scheduled or manual trigger)
- **Process**: Sequentially call each specialized agent in the workflow
- **Output**: Completion status and summary of actions performed
- **Triggers**: Runs on schedule (e.g., daily) or on demand

### 2. Content Monitor Agent
- **Purpose**: Discover new YouTube content
- **Input**: YouTube channels and keywords of interest
- **Process**: Check for new videos not previously processed
- **Output**: Add new content to tracking database with "pending" status
- **Triggers**: Called by Manager Agent

### 3. Transcript Agent
- **Purpose**: Extract and process video transcripts
- **Input**: Videos with "pending" status
- **Process**: Fetch transcripts, clean text, format with timestamps
- **Output**: Store processed transcripts, update status to "transcribed"
- **Triggers**: Called by Manager Agent

### 4. Analysis Agent
- **Purpose**: Extract research insights from transcripts
- **Input**: Videos with "transcribed" status
- **Process**: Analyze content for facts, topics, and key points
- **Output**: Store structured analysis, update status to "analyzed"
- **Triggers**: Called by Manager Agent

### 5. Report Agent
- **Purpose**: Generate research reports
- **Input**: Videos with "analyzed" status from current day
- **Process**: Compile insights into cohesive markdown report
- **Output**: Store daily report, optionally generate weekly summary
- **Triggers**: Called by Manager Agent

## KV Store Structure

### Agent KV Store

**Store Name: content_tracking**
- Key: `youtube/{videoId}`
- Value: 
  ```json
  {
    "contentType": "youtube",
    "status": "pending|transcribed|analyzed|reported",
    "createdAt": "2025-04-25T14:30:00Z",
    "updatedAt": "2025-04-25T14:35:00Z",
    "title": "Video Title",
    "source": "Channel Name",
    "url": "https://youtube.com/watch?v=xyz"
  }
  ```

**Store Name: content_raw**
- Key: `youtube/{videoId}`
- Value: `"Processed transcript text with timestamps..."`

**Store Name: content_analysis**
- Key: `youtube/{videoId}`
- Value:
  ```json
  {
    "topics": ["topic1", "topic2"],
    "facts": [
      {
        "text": "Key fact from video",
        "timestamp": "1:45",
        "importance": "high"
      }
    ],
    "summary": "Brief summary of the content",
    "relevance": 0.85
  }
  ```

**Store Name: run_metadata**
- Key: `{yyyy-mm-dd}T{HH:MM:SS}Z` (ISO datetime of run start)
- Value:
  ```json
  {
    "startTime": "2025-04-25T14:30:00Z",
    "endTime": "2025-04-25T14:45:00Z",
    "status": "completed|in-progress|failed",
    "stats": {
      "videosDiscovered": 12,
      "videosProcessed": 10,
      "videosSkipped": 2,
      "transcriptsGenerated": 10,
      "analysesCompleted": 10
    },
    "sources": {
      "youtube": {
        "channelsChecked": ["channel1", "channel2"],
        "keywordsChecked": ["topic1", "topic2"]
      }
    },
    "errors": [
      {
        "videoId": "abc123",
        "stage": "transcript",
        "error": "Could not access video"
      }
    ]
  }
  ```

### Output KV Store

**Store Name: reports**
- Key: `{yyyy-mm-dd}` (date of report)
- Value: `"# Research Report for April 25, 2025\n\n## Topic 1\n..."`

## Agent Flow with KV Store Operations

### 1. Manager Agent

**Operations:**
- WRITE: Create run metadata entry:
  ```
  run_metadata[{current-datetime}] = {status: "in-progress", ...}
  ```
- EXECUTE: Sequentially call each agent in the workflow:
  1. Content Monitor Agent
  2. Transcript Agent 
  3. Analysis Agent
  4. Report Agent
- UPDATE: After completion, update run metadata:
  ```
  run_metadata[{current-datetime}].endTime = {current-datetime}
  run_metadata[{current-datetime}].status = "completed"
  ```

### 2. Content Monitor Agent

**Operations:**
- READ: Check `content_tracking` store for existing video IDs
- WRITE: For new videos, add to `content_tracking` store:
  ```
  content_tracking[youtube/{videoId}] = {status: "pending", ...}
  ```
- UPDATE: Update run metadata with discovery statistics:
  ```
  run_metadata[{current-datetime}].stats.videosDiscovered = count
  ```

### 3. Transcript Agent

**Operations:**
- READ: Query `content_tracking` store for pending videos:
  ```
  pendingVideos = content_tracking.filter(item => item.value.status === "pending")
  ```
- WRITE: For each processed video, save transcript:
  ```
  content_raw[youtube/{videoId}] = "Processed transcript text..."
  ```
- UPDATE: Update video status:
  ```
  content_tracking[youtube/{videoId}].status = "transcribed"
  content_tracking[youtube/{videoId}].updatedAt = {current-datetime}
  ```
- UPDATE: Update run statistics:
  ```
  run_metadata[{current-datetime}].stats.transcriptsGenerated += 1
  ```

### 4. Analysis Agent

**Operations:**
- READ: Query `content_tracking` store for transcribed videos:
  ```
  transcribedVideos = content_tracking.filter(item => item.value.status === "transcribed")
  ```
- READ: For each video, get its transcript:
  ```
  transcript = content_raw[youtube/{videoId}]
  ```
- WRITE: Store analysis results:
  ```
  content_analysis[youtube/{videoId}] = {topics: [...], facts: [...], ...}
  ```
- UPDATE: Update video status:
  ```
  content_tracking[youtube/{videoId}].status = "analyzed"
  content_tracking[youtube/{videoId}].updatedAt = {current-datetime}
  ```
- UPDATE: Update run statistics:
  ```
  run_metadata[{current-datetime}].stats.analysesCompleted += 1
  ```

### 5. Report Agent

**Operations:**
- READ: Query `content_tracking` store for analyzed videos from today:
  ```
  todaysVideos = content_tracking.filter(item => 
    item.value.status === "analyzed" && 
    item.value.updatedAt.startsWith({today's-date})
  )
  ```
- READ: For each video, get its analysis:
  ```
  videoAnalysis = content_analysis[youtube/{videoId}]
  ```
- WRITE: Store generated report:
  ```
  reports[{today's-date}] = "# Research Report..."
  ```
- UPDATE: Update video status:
  ```
  content_tracking[youtube/{videoId}].status = "reported"
  content_tracking[youtube/{videoId}].updatedAt = {current-datetime}
  ```

## Example Workflow with KV Operations

1. **Manager Agent** (run at 2025-04-25T09:00:00Z)
   - WRITE: `run_metadata[2025-04-25T09:00:00Z] = {startTime: "2025-04-25T09:00:00Z", status: "in-progress", ...}`
   - EXECUTE: Call Content Monitor Agent

2. **Content Monitor Agent**
   - WRITE: `content_tracking[youtube/abc123] = {status: "pending", title: "Latest AI Research", ...}`
   - UPDATE: `run_metadata[2025-04-25T09:00:00Z].stats.videosDiscovered = 1`
   - RETURN: Control to Manager Agent
   - EXECUTE: Manager Agent calls Transcript Agent

3. **Transcript Agent**
   - READ: `pendingVideos = [content_tracking[youtube/abc123]]`
   - WRITE: `content_raw[youtube/abc123] = "00:00 Today we're discussing..."`
   - UPDATE: `content_tracking[youtube/abc123] = {status: "transcribed", ...}`
   - UPDATE: `run_metadata[2025-04-25T09:00:00Z].stats.transcriptsGenerated = 1`
   - RETURN: Control to Manager Agent
   - EXECUTE: Manager Agent calls Analysis Agent

4. **Analysis Agent**
   - READ: `transcribedVideos = [content_tracking[youtube/abc123]]`
   - READ: `transcript = content_raw[youtube/abc123]`
   - WRITE: `content_analysis[youtube/abc123] = {topics: ["AI", "ML"], facts: [...]}`
   - UPDATE: `content_tracking[youtube/abc123] = {status: "analyzed", ...}`
   - UPDATE: `run_metadata[2025-04-25T09:00:00Z].stats.analysesCompleted = 1`
   - RETURN: Control to Manager Agent
   - EXECUTE: Manager Agent calls Report Agent

5. **Report Agent**
   - READ: `todaysVideos = [content_tracking[youtube/abc123]]`
   - READ: `videoAnalysis = content_analysis[youtube/abc123]`
   - WRITE: `reports[2025-04-25] = "# AI Research Report - April 25, 2025\n\n..."`
   - UPDATE: `content_tracking[youtube/abc123] = {status: "reported", ...}`
   - RETURN: Control to Manager Agent

6. **Manager Agent** (completion)
   - UPDATE: `run_metadata[2025-04-25T09:00:00Z].status = "completed", endTime: "2025-04-25T09:15:00Z"`

## Future Extensions

To add additional content sources beyond YouTube:

1. Update the Content Monitor Agent to check new sources
2. Follow the same key pattern: `{sourceType}/{contentId}`
3. Add source-specific processing to the Transcript Agent
4. Keep the Analysis and Report Agents source-agnostic

This implementation plan provides a clear roadmap for building a modular, extensible research assistant system that starts with YouTube content and can grow to accommodate multiple information sources. The Manager agent orchestrates the workflow, allowing each specialized agent to focus on its specific task without needing to call other agents directly.