import { SessionGroupingService } from './session-grouping.service';
import { AttendanceEvent, EventSource, EventStatus, EventType } from '@prisma/client';

describe('SessionGroupingService', () => {
  let sessionGroupingService: SessionGroupingService;

  let mockTimeService: any;
  let mockShiftSelectionService: any;

  beforeEach(() => {
    const mockPrismaService = {};
    mockTimeService = {
      getLogicalDate: (d: Date) => {
        const copy = new Date(d);
        copy.setUTCHours(0, 0, 0, 0);
        return copy;
      },
    };
    mockShiftSelectionService = {
      getEffectiveShift: async () => ({ dateOffset: 0 }),
    };

    sessionGroupingService = new SessionGroupingService(
      mockPrismaService as any,
      mockTimeService as any,
      mockShiftSelectionService as any,
    );
  });

  it('should group events within 24 hours into the same session', async () => {
    const events: AttendanceEvent[] = [
      {
        id: '1',
        employeeId: 'emp1',
        companyId: 'comp1',
        eventTime: new Date('2023-01-01T08:00:00Z'),
        eventType: EventType.IN,
        source: EventSource.API_KEY,
        status: EventStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        device: 'device1',
        location: 'location1',
        latitude: 1.0,
        longitude: 1.0,
        apiKeyName: 'test',
        sessionId: null,
        manualOverride: false,
        remark: '',
        metadata: {},
      },
      {
        id: '2',
        employeeId: 'emp1',
        companyId: 'comp1',
        eventTime: new Date('2023-01-01T12:00:00Z'),
        eventType: EventType.OUT,
        source: EventSource.API_KEY,
        status: EventStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        device: 'device1',
        location: 'location1',
        latitude: 1.0,
        longitude: 1.0,
        apiKeyName: 'test',
        sessionId: null,
        manualOverride: false,
        remark: '',
        metadata: {},
      },
      {
        id: '3',
        employeeId: 'emp1',
        companyId: 'comp1',
        eventTime: new Date('2023-01-01T13:00:00Z'),
        eventType: EventType.IN,
        source: EventSource.API_KEY,
        status: EventStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        device: 'device1',
        location: 'location1',
        latitude: 1.0,
        longitude: 1.0,
        apiKeyName: 'test',
        sessionId: null,
        manualOverride: false,
        remark: '',
        metadata: {},
      },
      {
        id: '4',
        employeeId: 'emp1',
        companyId: 'comp1',
        eventTime: new Date('2023-01-01T17:00:00Z'),
        eventType: EventType.OUT,
        source: EventSource.API_KEY,
        status: EventStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        device: 'device1',
        location: 'location1',
        latitude: 1.0,
        longitude: 1.0,
        apiKeyName: 'test',
        sessionId: null,
        manualOverride: false,
        remark: '',
        metadata: {},
      },
    ];

    const result = await sessionGroupingService.groupEventsIntoSessions('emp1', events, new Date('2023-01-01'), 'UTC');

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
        eventType: EventType.IN,
        source: EventSource.API_KEY,
        status: EventStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        device: 'device1',
        location: 'location1',
        latitude: 1.0,
        longitude: 1.0,
        apiKeyName: 'test',
        sessionId: null,
        manualOverride: false,
        remark: '',
        metadata: {},
      },
      {
        id: '2',
        employeeId: 'emp1',
        companyId: 'comp1',
        eventTime: new Date('2023-01-01T17:00:00Z'),
        eventType: EventType.OUT,
        source: EventSource.API_KEY,
        status: EventStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        device: 'device1',
        location: 'location1',
        latitude: 1.0,
        longitude: 1.0,
        apiKeyName: 'test',
        sessionId: null,
        manualOverride: false,
        remark: '',
        metadata: {},
      },
      {
        id: '3',
        employeeId: 'emp1',
        companyId: 'comp1',
        eventTime: new Date('2023-01-03T08:00:00Z'), // More than 24 hours later
        eventType: EventType.IN,
        source: EventSource.API_KEY,
        status: EventStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        device: 'device1',
        location: 'location1',
        latitude: 1.0,
        longitude: 1.0,
        apiKeyName: 'test',
        sessionId: null,
        manualOverride: false,
        remark: '',
        metadata: {},
      },
      {
        id: '4',
        employeeId: 'emp1',
        companyId: 'comp1',
        eventTime: new Date('2023-01-03T17:00:00Z'),
        eventType: EventType.OUT,
        source: EventSource.API_KEY,
        status: EventStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        device: 'device1',
        location: 'location1',
        latitude: 1.0,
        longitude: 1.0,
        apiKeyName: 'test',
        sessionId: null,
        manualOverride: false,
        remark: '',
        metadata: {},
      },
    ];

    const result = await sessionGroupingService.groupEventsIntoSessions('emp1', events, new Date('2023-01-02'), 'UTC');

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
        eventType: EventType.IN,
        source: EventSource.API_KEY,
        status: EventStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        device: 'device1',
        location: 'location1',
        latitude: 1.0,
        longitude: 1.0,
        apiKeyName: 'test',
        sessionId: null,
        manualOverride: false,
        remark: '',
        metadata: {},
      },
      {
        id: '2',
        employeeId: 'emp1',
        companyId: 'comp1',
        eventTime: new Date('2023-01-02T06:00:00Z'), // 6 AM next day
        eventType: EventType.OUT,
        source: EventSource.API_KEY,
        status: EventStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        device: 'device1',
        location: 'location1',
        latitude: 1.0,
        longitude: 1.0,
        apiKeyName: 'test',
        sessionId: null,
        manualOverride: false,
        remark: '',
        metadata: {},
      },
    ];

    const result = await sessionGroupingService.groupEventsIntoSessions('emp1', events, new Date('2023-01-01'), 'UTC');

    expect(result.length).toBe(1); // Should be one session despite crossing midnight
    expect(result[0].events.length).toBe(2);
    expect(result[0].firstIn).toEqual(new Date('2023-01-01T22:00:00Z'));
    expect(result[0].lastOut).toEqual(new Date('2023-01-02T06:00:00Z'));
  });
});
