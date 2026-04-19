# Attendance External API Documentation

**Authentication**: API Key via `X-API-Key` header.
**Policy Scoping**: Every API key is tied to an Attendance Policy. Requests only return/affect employees assigned to that specific policy.

---

## 1. Bulk State Sync (Instant UI Feedback)
**Endpoint**: `GET /api/v1/attendance/external/sync`  
**Best For**: Fetching current employee states on device startup or periodic refresh (e.g., every 3h).

**Response (200 OK)**:
```json
{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "company": "AKURU COLOUR GRAPHICS",
    "data": [
      {
        "no": 1,
        "name": "ANUSHANGA",
        "status": "OUT",
        "time": "2026-04-16T19:32:55.000Z"
      },
      {
        "no": 2,
        "name": "S. L. GALAPPATHTHI",
        "status": "IN",
        "time": "2026-04-16T20:13:07.000Z",
        "shift": "Day Shift"
      }
    ]
  },
  "timestamp": "2026-04-19T16:30:49.790Z",
  "path": "/api/v1/attendance/external/sync"
}
```
*   `status`: Current employee state (`IN` or `OUT`).
*   `shift`: Only included if `status` is `IN`.

---

## 2. Create Attendance Event
**Endpoint**: `POST /api/v1/attendance/external/event`  
**Best For**: Sending a punch in/out event from the machine.

**Request Body**:
```json
{
  "employeeNo": 101,
  "eventTime": "2026-04-19T08:00:00Z",
  "eventType": "IN",
  "device": "ESP32-Scanner-1"
}
```

**Response (201 Created)**:
```json
{
  "statusCode": 201,
  "message": "Success",
  "data": {
    "success": true,
    "event": {
      "id": "uuid",
      "employeeId": "uuid",
      "employeeName": "ANUSHANGA",
      "shiftName": "Morning Shift",
      "eventTime": "2026-04-19T08:00:00.000Z",
      "eventType": "IN",
      "updatedStatus": "IN"
    }
  },
  "timestamp": "2026-04-19T16:40:12.123Z",
  "path": "/api/v1/attendance/external/event"
}
```
*   `updatedStatus`: The new status after the punch. Use this to update your local device map immediately.

---

## 3. Verify API Key
**Endpoint**: `GET /api/v1/attendance/external/verify`  
**Best For**: Checking if the device's key is still active.

**Response (200 OK)**:
```json
{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "valid": true,
    "type": "COMPANY",
    "company": { "id": "uuid", "name": "AKURU COLOUR GRAPHICS" },
    "apiKey": { "id": "uuid", "name": "Front Door Key" }
  },
  "timestamp": "2026-04-19T16:45:00.000Z",
  "path": "/api/v1/attendance/external/verify"
}
```

---

## Key Integration Logic for Devices (ESP32)

1.  **Cold Start**: Call `/sync` to populate local `std::map<int, EmployeeInfo>`.
2.  **Instant UI**: When Employee `101` punches, look them up locally, show visual feedback based on the cached state, and queue a `POST /event`.
3.  **Local Update**: After the `POST` succeeds, update the local map using the `updatedStatus` and `shiftName` from the response.
4.  **Keepalive**: Periodically call `/sync` (e.g., every 3 hours) to ensure the local map is aligned with the server's truth and to catch any new employees added to the policy.
