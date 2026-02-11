import { describe, it, expect, beforeEach } from 'vitest';
import { SessionGroupingService } from './session-grouping.service';
import { AttendanceEvent } from '@prisma/client';

describe('SessionGroupingService', () => {
  let sessionGroupingService: SessionGroupingService;

  beforeEach(() => {
    // Mock PrismaService - we don't need database functionality for unit tests
    const mockPrismaService = {};
    sessionGroupingService = new SessionGroupingService(mockPrismaService as any);
  });

  it('should group events within 24 hours into the same session', async () => {
    const events: AttendanceEvent[] = [
      {
        id: '1',
        employeeId: 'emp1',
        companyId: 'comp1',
        eventTime: new Date('2023-01-01T08:00:00Z'),
        eventType: 'IN',
        source: 'API_KEY',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
        device: 'device1',
        location: 'location1',
        latitude: 1.0,
        longitude: 1.0,
        apiKeyName: 'test',
        manualOverride: false,
        remark: '',
        metadata: {}
      },
      {
        id: '2',
        employeeId: 'emp1',
        companyId: 'comp1',
        eventTime: new Date('2023-01-01T12:00:00Z'),
        eventType: 'OUT',
        source: 'API_KEY',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
        device: 'device1',
        location: 'location1',
        latitude: 1.0,
        longitude: 1.0,
        apiKeyName: 'test',
        manualOverride: false,
        remark: '',
        metadata: {}
      },
      {
        id: '3',
        employeeId: 'emp1',
        companyId: 'comp1',
        eventTime: new Date('2023-01-01T13:00:00Z'),
        eventType: 'IN',
        source: 'API_KEY',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
        device: 'device1',
        location: 'location1',
        latitude: 1.0,
        longitude: 1.0,
        apiKeyName: 'test',
        manualOverride: false,
        remark: '',
        metadata: {}
      },
      {
        id: '4',
        employeeId: 'emp1',
        companyId: 'comp1',
        eventTime: new Date('2023-01-01T17:00:00Z'),
        eventType: 'OUT',
        source: 'API_KEY',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
        device: 'device1',
        location: 'location1',
        latitude: 1.0,
        longitude: 1.0,
        apiKeyName: 'test',
        manualOverride: false,
        remark: '',
        metadata: {}
      }
    ];

    const result = await sessionGroupingService.groupEventsIntoSessions('emp1', events, new Date('2023-01-01'));

    expect(result.length).toBe(1); // All events should be in one session
    expect(result[0].events.length).toBe(4);
    expect(result[0].firstIn).toEqual(new Date('2023-01-01T08:00:00Z'));
    expect(result[0].lastOut).toEqual(new Date('2023-01-01T17:00:00Z'));
    expect(result[0].additionalInOutPairs.length).toBe(1); // Lunch break from 12:00 to 13:00
  });

  it('should create separate sessions for events more than 24 hours apart', async () => {
    const events: AttendanceEvent[] = [
      {
        id: '1',
        employeeId: 'emp1',
        companyId: 'comp1',
        eventTime: new Date('2023-01-01T08:00:00Z'),
        eventType: 'IN',
        source: 'API_KEY',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
        device: 'device1',
        location: 'location1',
        latitude: 1.0,
        longitude: 1.0,
        apiKeyName: 'test',
        manualOverride: false,
        remark: '',
        metadata: {}
      },
      {
        id: '2',
        employeeId: 'emp1',
        companyId: 'comp1',
        eventTime: new Date('2023-01-01T17:00:00Z'),
        eventType: 'OUT',
        source: 'API_KEY',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
        device: 'device1',
        location: 'location1',
        latitude: 1.0,
        longitude: 1.0,
        apiKeyName: 'test',
        manualOverride: false,
        remark: '',
        metadata: {}
      },
      {
        id: '3',
        employeeId: 'emp1',
        companyId: 'comp1',
        eventTime: new Date('2023-01-03T08:00:00Z'), // More than 24 hours later
        eventType: 'IN',
        source: 'API_KEY',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
        device: 'device1',
        location: 'location1',
        latitude: 1.0,
        longitude: 1.0,
        apiKeyName: 'test',
        manualOverride: false,
        remark: '',
        metadata: {}
      },
      {
        id: '4',
        employeeId: 'emp1',
        companyId: 'comp1',
        eventTime: new Date('2023-01-03T17:00:00Z'),
        eventType: 'OUT',
        source: 'API_KEY',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
        device: 'device1',
        location: 'location1',
        latitude: 1.0,
        longitude: 1.0,
        apiKeyName: 'test',
        manualOverride: false,
        remark: '',
        metadata: {}
      }
    ];

    const result = await sessionGroupingService.groupEventsIntoSessions('emp1', events, new Date('2023-01-02'));

    expect(result.length).toBe(2); // Two separate sessions
    expect(result[0].events.length).toBe(2); // First session with 2 events
    expect(result[1].events.length).toBe(2); // Second session with 2 events
  });

  it('should handle overnight shifts correctly', async () => {
    const events: AttendanceEvent[] = [
      {
        id: '1',
        employeeId: 'emp1',
        companyId: 'comp1',
        eventTime: new Date('2023-01-01T22:00:00Z'), // 10 PM
        eventType: 'IN',
        source: 'API_KEY',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
        device: 'device1',
        location: 'location1',
        latitude: 1.0,
        longitude: 1.0,
        apiKeyName: 'test',
        manualOverride: false,
        remark: '',
        metadata: {}
      },
      {
        id: '2',
        employeeId: 'emp1',
        companyId: 'comp1',
        eventTime: new Date('2023-01-02T06:00:00Z'), // 6 AM next day
        eventType: 'OUT',
        source: 'API_KEY',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
        device: 'device1',
        location: 'location1',
        latitude: 1.0,
        longitude: 1.0,
        apiKeyName: 'test',
        manualOverride: false,
        remark: '',
        metadata: {}
      }
    ];

    const result = await sessionGroupingService.groupEventsIntoSessions('emp1', events, new Date('2023-01-01'));

    expect(result.length).toBe(1); // Should be one session despite crossing midnight
    expect(result[0].events.length).toBe(2);
    expect(result[0].firstIn).toEqual(new Date('2023-01-01T22:00:00Z'));
    expect(result[0].lastOut).toEqual(new Date('2023-01-02T06:00:00Z'));
  });
});