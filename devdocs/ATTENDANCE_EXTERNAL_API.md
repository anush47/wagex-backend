# Attendance External API Documentation

## Overview

The Attendance External API allows third-party systems (e.g., biometric devices, time clocks, mobile apps) to submit attendance events to the WageX platform using API key authentication.

**Base URL**: `/attendance/external`

**Authentication**: API Key via `X-API-Key` header

---

## Table of Contents

1. [Authentication](#authentication)
2. [Endpoints](#endpoints)
3. [Request Structures](#request-structures)
4. [Response Structures](#response-structures)
5. [Error Handling](#error-handling)
6. [Integration Examples](#integration-examples)

---

## Authentication

All external API requests require an API key to be passed in the `X-API-Key` header.

### Obtaining an API Key

API keys are managed through the WageX employer portal:
1. Navigate to Company Settings → API Keys
2. Create a new API key with a descriptive name
3. Copy the generated key (it will only be shown once)
4. Store the key securely

### Using the API Key

Include the API key in every request:

```http
X-API-Key: your-api-key-here
```

---

## Endpoints

### 1. Verify API Key

**Endpoint**: `GET /attendance/external/verify`

**Description**: Verify that your API key is valid and active.

**Headers**:
```http
X-API-Key: your-api-key-here
```

**Response** (200 OK):
```json
{
  "valid": true,
  "company": {
    "id": "uuid",
    "name": "Company Name"
  },
  "apiKey": {
    "id": "uuid",
    "name": "API Key Name",
    "lastUsed": "2026-02-08T02:00:00Z"
  }
}
```

**Error Response** (401 Unauthorized):
```json
{
  "statusCode": 401,
  "message": "Invalid API key",
  "error": "Unauthorized"
}
```

---

### 2. Create Single Event

**Endpoint**: `POST /attendance/external/event`

**Description**: Submit a single attendance event (check-in or check-out).

**Headers**:
```http
X-API-Key: your-api-key-here
Content-Type: application/json
```

**Request Body**:
```json
{
  "employeeNo": 1001,
  "eventTime": "2026-02-08T08:30:00Z",
  "eventType": "IN",
  "device": "Biometric Device #1",
  "location": "Main Entrance",
  "latitude": 6.9271,
  "longitude": 79.8612,
  "remark": "Optional remark"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "event": {
    "id": "event-uuid",
    "employeeId": "employee-uuid",
    "eventTime": "2026-02-08T08:30:00.000Z",
    "eventType": "IN",
    "status": "ACTIVE"
  }
}
```

**Error Response** (400 Bad Request):
```json
{
  "statusCode": 400,
  "message": [
    "employeeNo must be a number",
    "eventTime must be a valid ISO 8601 date string"
  ],
  "error": "Bad Request"
}
```

---

### 3. Bulk Create Events

**Endpoint**: `POST /attendance/external/events/bulk`

**Description**: Submit multiple attendance events in a single request (recommended for batch processing).

**Headers**:
```http
X-API-Key: your-api-key-here
Content-Type: application/json
```

**Request Body**:
```json
{
  "events": [
    {
      "employeeNo": 1001,
      "eventTime": "2026-02-08T08:30:00Z",
      "eventType": "IN",
      "device": "Biometric Device #1"
    },
    {
      "employeeNo": 1002,
      "eventTime": "2026-02-08T08:35:00Z",
      "eventType": "IN",
      "device": "Biometric Device #1"
    },
    {
      "employeeNo": 1001,
      "eventTime": "2026-02-08T17:00:00Z",
      "eventType": "OUT",
      "device": "Biometric Device #1"
    }
  ]
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "inserted": 3,
  "failed": 0,
  "results": [
    {
      "employeeNo": 1001,
      "status": "success",
      "eventId": "event-uuid-1"
    },
    {
      "employeeNo": 1002,
      "status": "success",
      "eventId": "event-uuid-2"
    },
    {
      "employeeNo": 1001,
      "status": "success",
      "eventId": "event-uuid-3"
    }
  ]
}
```

**Partial Success Response**:
```json
{
  "success": true,
  "inserted": 2,
  "failed": 1,
  "results": [
    {
      "employeeNo": 1001,
      "status": "success",
      "eventId": "event-uuid-1"
    },
    {
      "employeeNo": 9999,
      "status": "failed",
      "error": "Employee not found"
    },
    {
      "employeeNo": 1002,
      "status": "success",
      "eventId": "event-uuid-2"
    }
  ]
}
```

---

## Request Structures

### CreateEventDto

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `employeeNo` | number | Yes* | Employee number (for API key entries) | `1001` |
| `employeeId` | string (UUID) | Yes* | Employee ID (for manual/web entries) | `"uuid"` |
| `eventTime` | string (ISO 8601) | Yes | Event timestamp in ISO format | `"2026-02-08T08:30:00Z"` |
| `eventType` | enum | Yes | Event type: `"IN"` or `"OUT"` | `"IN"` |
| `device` | string | No | Device name/identifier | `"Biometric Device #1"` |
| `location` | string | No | Location description | `"Main Entrance"` |
| `latitude` | number | No | Latitude coordinate | `6.9271` |
| `longitude` | number | No | Longitude coordinate | `79.8612` |
| `remark` | string | No | Additional remarks | `"Late arrival"` |

**Note**: Either `employeeNo` OR `employeeId` must be provided. For external API calls, use `employeeNo`.

### BulkCreateEventsDto

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `events` | array | Yes | Array of `CreateEventDto` objects |

---

## Response Structures

### EventResponseDto

```typescript
{
  id: string;              // Event UUID
  employeeId: string;      // Employee UUID
  eventTime: string;       // ISO 8601 timestamp
  eventType: "IN" | "OUT"; // Event type
  status: string;          // Event status (ACTIVE, REJECTED, IGNORED)
}
```

### BulkEventResponseDto

```typescript
{
  success: boolean;        // Overall operation success
  inserted: number;        // Number of successfully inserted events
  failed: number;          // Number of failed events
  results: [               // Individual results for each event
    {
      employeeNo: number;
      status: "success" | "failed";
      eventId?: string;    // Present if status is "success"
      error?: string;      // Present if status is "failed"
    }
  ]
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Event(s) created successfully |
| 400 | Bad Request | Invalid request payload or parameters |
| 401 | Unauthorized | Invalid or missing API key |
| 404 | Not Found | Employee not found |
| 500 | Internal Server Error | Server error occurred |

### Common Error Responses

#### Invalid API Key
```json
{
  "statusCode": 401,
  "message": "Invalid API key",
  "error": "Unauthorized"
}
```

#### Missing API Key
```json
{
  "statusCode": 401,
  "message": "API key required",
  "error": "Unauthorized"
}
```

#### Validation Error
```json
{
  "statusCode": 400,
  "message": [
    "employeeNo must be a number",
    "eventType must be one of the following values: IN, OUT"
  ],
  "error": "Bad Request"
}
```

#### Employee Not Found
```json
{
  "statusCode": 404,
  "message": "Employee with number 9999 not found",
  "error": "Not Found"
}
```

---

## Integration Examples

### Example 1: Python Integration

```python
import requests
from datetime import datetime

API_KEY = "your-api-key-here"
BASE_URL = "https://api.wagex.com/attendance/external"

headers = {
    "X-API-Key": API_KEY,
    "Content-Type": "application/json"
}

# Verify API key
response = requests.get(f"{BASE_URL}/verify", headers=headers)
print(f"API Key Valid: {response.json()['valid']}")

# Submit single event
event_data = {
    "employeeNo": 1001,
    "eventTime": datetime.utcnow().isoformat() + "Z",
    "eventType": "IN",
    "device": "Python Script",
    "location": "Office"
}

response = requests.post(
    f"{BASE_URL}/event",
    headers=headers,
    json=event_data
)

if response.status_code == 201:
    print(f"Event created: {response.json()['event']['id']}")
else:
    print(f"Error: {response.json()}")
```

### Example 2: Node.js Integration

```javascript
const axios = require('axios');

const API_KEY = 'your-api-key-here';
const BASE_URL = 'https://api.wagex.com/attendance/external';

const headers = {
  'X-API-Key': API_KEY,
  'Content-Type': 'application/json'
};

// Submit bulk events
async function submitBulkEvents(events) {
  try {
    const response = await axios.post(
      `${BASE_URL}/events/bulk`,
      { events },
      { headers }
    );
    
    console.log(`Inserted: ${response.data.inserted}`);
    console.log(`Failed: ${response.data.failed}`);
    
    return response.data;
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    throw error;
  }
}

// Example usage
const events = [
  {
    employeeNo: 1001,
    eventTime: new Date().toISOString(),
    eventType: 'IN',
    device: 'Node.js Script'
  },
  {
    employeeNo: 1002,
    eventTime: new Date().toISOString(),
    eventType: 'IN',
    device: 'Node.js Script'
  }
];

submitBulkEvents(events);
```

### Example 3: cURL

```bash
# Verify API key
curl -X GET \
  https://api.wagex.com/attendance/external/verify \
  -H 'X-API-Key: your-api-key-here'

# Submit single event
curl -X POST \
  https://api.wagex.com/attendance/external/event \
  -H 'X-API-Key: your-api-key-here' \
  -H 'Content-Type: application/json' \
  -d '{
    "employeeNo": 1001,
    "eventTime": "2026-02-08T08:30:00Z",
    "eventType": "IN",
    "device": "Terminal",
    "location": "Main Office"
  }'

# Submit bulk events
curl -X POST \
  https://api.wagex.com/attendance/external/events/bulk \
  -H 'X-API-Key: your-api-key-here' \
  -H 'Content-Type: application/json' \
  -d '{
    "events": [
      {
        "employeeNo": 1001,
        "eventTime": "2026-02-08T08:30:00Z",
        "eventType": "IN"
      },
      {
        "employeeNo": 1002,
        "eventTime": "2026-02-08T08:35:00Z",
        "eventType": "IN"
      }
    ]
  }'
```

---

## Best Practices

### 1. Use Bulk Endpoints for Multiple Events
When submitting multiple events, always use the bulk endpoint (`/events/bulk`) instead of making multiple single-event requests. This reduces network overhead and improves performance.

### 2. Handle Partial Failures
The bulk endpoint may return partial success. Always check the `results` array to identify which events failed and why.

### 3. Use ISO 8601 Timestamps
Always submit timestamps in ISO 8601 format with UTC timezone (e.g., `2026-02-08T08:30:00Z`).

### 4. Implement Retry Logic
Implement exponential backoff retry logic for failed requests due to network issues or temporary server errors.

### 5. Validate Before Sending
Validate your data locally before sending to reduce API errors and improve efficiency.

### 6. Monitor API Key Usage
Regularly check your API key's last used timestamp in the employer portal to detect unauthorized usage.

### 7. Secure Your API Key
- Never commit API keys to version control
- Store keys in environment variables or secure vaults
- Rotate keys periodically
- Use different keys for different environments (dev, staging, production)

---

## Rate Limits

Currently, there are no enforced rate limits, but we recommend:
- Maximum 100 events per bulk request
- Maximum 1000 requests per hour per API key

Excessive usage may result in temporary throttling.

---

## Support

For API support or questions:
- Email: support@wagex.com
- Documentation: https://docs.wagex.com
- Status Page: https://status.wagex.com

---

## Changelog

### Version 1.0.0 (2026-02-08)
- Initial release
- Single event submission
- Bulk event submission
- API key verification
