import { users, type User, type InsertUser, emails, type Email, type InsertEmail, calendarEvents, type CalendarEvent, type InsertCalendarEvent, smartReplies, type SmartReply, type InsertSmartReply, dailyBriefs, type DailyBrief, type InsertDailyBrief, connections, type Connection, type InsertConnection } from "@shared/schema";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPreferences(userId: number, preferences: any): Promise<void>;

  // Email operations
  getEmails(userId: number, limit?: number): Promise<Email[]>;
  getEmail(id: number, userId: number): Promise<Email | undefined>;
  createEmail(email: InsertEmail): Promise<Email>;
  updateEmailSummary(emailId: number, summary: string): Promise<void>;
  markEmailAsRead(emailId: number): Promise<void>;

  // Calendar operations
  getCalendarEvents(userId: number, date: string): Promise<CalendarEvent[]>;
  getCalendarEvent(id: number, userId: number): Promise<CalendarEvent | undefined>;
  createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent>;

  // Smart reply operations
  getSmartReplies(emailId: number): Promise<SmartReply[]>;
  getSmartRepliesByUserId(userId: number): Promise<SmartReply[]>;
  getSmartReply(id: number): Promise<SmartReply | undefined>;
  createSmartReply(reply: InsertSmartReply): Promise<SmartReply>;
  updateSmartReplyStatus(replyId: number, status: string): Promise<void>;

  // Daily brief operations
  getDailyBrief(userId: number, date: string): Promise<DailyBrief | undefined>;
  createDailyBrief(brief: InsertDailyBrief): Promise<DailyBrief>;

  // Connection operations
  getConnectionsByUserId(userId: number): Promise<Connection[]>;
  getConnection(userId: number, service: string): Promise<Connection | undefined>;
  createConnection(connection: InsertConnection): Promise<Connection>;
  removeConnection(userId: number, service: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private emails: Map<number, Email>;
  private calendarEvents: Map<number, CalendarEvent>;
  private smartReplies: Map<number, SmartReply>;
  private dailyBriefs: Map<number, DailyBrief>;
  private connections: Map<number, Connection>;
  
  private userIdCounter: number;
  private emailIdCounter: number;
  private eventIdCounter: number;
  private replyIdCounter: number;
  private briefIdCounter: number;
  private connectionIdCounter: number;

  constructor() {
    this.users = new Map();
    this.emails = new Map();
    this.calendarEvents = new Map();
    this.smartReplies = new Map();
    this.dailyBriefs = new Map();
    this.connections = new Map();
    
    this.userIdCounter = 1;
    this.emailIdCounter = 1;
    this.eventIdCounter = 1;
    this.replyIdCounter = 1;
    this.briefIdCounter = 1;
    this.connectionIdCounter = 1;

    // Add demo user
    this.createUser({
      username: "demo",
      password: "password",
      email: "emily@example.com",
      displayName: "Emily Johnson",
      preferences: {
        replyTone: 'professional',
        autoSuggestReplies: true,
        dailyBriefing: true,
      }
    });

    // Add some sample data
    this.initializeSampleData();
  }

  // Initialize with sample data for demo purposes
  private initializeSampleData() {
    // Add sample emails for the demo user
    const sampleEmails = [
      {
        userId: 1,
        messageId: "msg-001",
        from: "Marketing Team <marketing@example.com>",
        to: "emily@example.com",
        subject: "Client Proposal Draft",
        snippet: "I've attached the latest version of our client proposal for review. Could you provide feedback by tomorrow?",
        body: "Hi Emily,\n\nI've attached the latest version of our client proposal for review. Could you provide feedback by tomorrow? We need to finalize it before the meeting on Friday.\n\nThanks,\nMarketing Team",
        receivedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        isRead: false,
        isPriority: true,
        labels: ["work", "important"],
      },
      {
        userId: 1,
        messageId: "msg-002",
        from: "Alex Davidson <alex@example.com>",
        to: "emily@example.com",
        subject: "Project Review Meeting",
        snippet: "Just a reminder about our project review meeting scheduled for 11 AM today. Please bring your quarterly metrics.",
        body: "Hi Emily,\n\nJust a reminder about our project review meeting scheduled for 11 AM today. Please bring your quarterly metrics so we can discuss the progress.\n\nBest,\nAlex",
        receivedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        isRead: false,
        isPriority: false,
        labels: ["work"],
      },
      {
        userId: 1,
        messageId: "msg-003",
        from: "Sarah Chen <sarah@example.com>",
        to: "emily@example.com",
        subject: "Quarterly Report Status",
        snippet: "Just checking in on the status of the quarterly report. We'll need the draft by tomorrow for review before submission.",
        body: "Hi Emily,\n\nJust checking in on the status of the quarterly report. We'll need the draft by tomorrow for review before submission to the management team.\n\nLet me know if you need any help compiling the data.\n\nRegards,\nSarah",
        receivedAt: new Date(Date.now() - 28 * 60 * 60 * 1000).toISOString(), // 28 hours ago
        isRead: false,
        isPriority: false,
        labels: ["work", "report"],
      }
    ];

    sampleEmails.forEach(email => {
      this.createEmail(email as InsertEmail);
    });

    // Add sample calendar events
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const sampleEvents = [
      {
        userId: 1,
        eventId: "evt-001",
        title: "Project Review Meeting",
        description: "Quarterly review of project progress and metrics",
        startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 0).toISOString(),
        endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0).toISOString(),
        location: "Conference Room A",
        attendees: [{ name: "Alex Davidson", email: "alex@example.com" }],
        isAllDay: false,
        tags: ["Team"],
      },
      {
        userId: 1,
        eventId: "evt-002",
        title: "Client Call - XYZ Corp",
        description: "Follow-up call to discuss proposal details",
        startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 16, 0).toISOString(),
        endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 16, 30).toISOString(),
        location: "Zoom Meeting",
        attendees: [{ name: "John Smith", email: "john@xyzcorp.com" }],
        isAllDay: false,
        tags: ["External"],
      }
    ];

    sampleEvents.forEach(event => {
      this.createCalendarEvent(event as InsertCalendarEvent);
    });

    // Add sample smart replies
    const sampleReplies = [
      {
        userId: 1,
        emailId: 1,
        replyText: "Thanks for sharing the client proposal. I'll review it today and provide my feedback by tomorrow morning. Is there anything specific you'd like me to focus on?",
        replyTone: "professional",
        status: "pending",
      },
      {
        userId: 1,
        emailId: 2,
        replyText: "Thanks for the reminder. I have the meeting on my calendar and will bring the quarterly metrics as requested. Looking forward to our discussion.",
        replyTone: "professional",
        status: "pending",
      }
    ];

    sampleReplies.forEach(reply => {
      this.createSmartReply(reply as InsertSmartReply);
    });

    // Add sample connections
    const sampleConnections = [
      {
        userId: 1,
        service: "gmail",
        accessToken: "sample-token",
        refreshToken: "sample-refresh",
        tokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        email: "emily@example.com",
      },
      {
        userId: 1,
        service: "google_calendar",
        accessToken: "sample-token",
        refreshToken: "sample-refresh",
        tokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        email: "emily@example.com",
      }
    ];

    sampleConnections.forEach(connection => {
      this.createConnection(connection as InsertConnection);
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const now = new Date().toISOString();
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt: now
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserPreferences(userId: number, preferences: any): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    user.preferences = {
      ...user.preferences,
      ...preferences
    };
    
    this.users.set(userId, user);
  }

  // Email operations
  async getEmails(userId: number, limit?: number): Promise<Email[]> {
    const userEmails = Array.from(this.emails.values())
      .filter(email => email.userId === userId)
      .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
    
    return limit ? userEmails.slice(0, limit) : userEmails;
  }

  async getEmail(id: number, userId: number): Promise<Email | undefined> {
    const email = this.emails.get(id);
    if (email && email.userId === userId) {
      return email;
    }
    return undefined;
  }

  async createEmail(insertEmail: InsertEmail): Promise<Email> {
    const id = this.emailIdCounter++;
    const now = new Date().toISOString();
    const email: Email = { 
      ...insertEmail, 
      id, 
      createdAt: now
    };
    this.emails.set(id, email);
    return email;
  }

  async updateEmailSummary(emailId: number, summary: string): Promise<void> {
    const email = this.emails.get(emailId);
    if (!email) {
      throw new Error('Email not found');
    }
    
    email.aiSummary = summary;
    this.emails.set(emailId, email);
  }

  async markEmailAsRead(emailId: number): Promise<void> {
    const email = this.emails.get(emailId);
    if (!email) {
      throw new Error('Email not found');
    }
    
    email.isRead = true;
    this.emails.set(emailId, email);
  }

  // Calendar operations
  async getCalendarEvents(userId: number, date: string): Promise<CalendarEvent[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return Array.from(this.calendarEvents.values())
      .filter(event => 
        event.userId === userId && 
        new Date(event.startTime) >= startOfDay && 
        new Date(event.startTime) <= endOfDay
      )
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }

  async getCalendarEvent(id: number, userId: number): Promise<CalendarEvent | undefined> {
    const event = this.calendarEvents.get(id);
    if (event && event.userId === userId) {
      return event;
    }
    return undefined;
  }

  async createCalendarEvent(insertEvent: InsertCalendarEvent): Promise<CalendarEvent> {
    const id = this.eventIdCounter++;
    const now = new Date().toISOString();
    const event: CalendarEvent = { 
      ...insertEvent, 
      id, 
      createdAt: now
    };
    this.calendarEvents.set(id, event);
    return event;
  }

  // Smart reply operations
  async getSmartReplies(emailId: number): Promise<SmartReply[]> {
    return Array.from(this.smartReplies.values())
      .filter(reply => reply.emailId === emailId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getSmartRepliesByUserId(userId: number): Promise<SmartReply[]> {
    return Array.from(this.smartReplies.values())
      .filter(reply => reply.userId === userId && reply.status === 'pending')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getSmartReply(id: number): Promise<SmartReply | undefined> {
    return this.smartReplies.get(id);
  }

  async createSmartReply(insertReply: InsertSmartReply): Promise<SmartReply> {
    const id = this.replyIdCounter++;
    const now = new Date().toISOString();
    const reply: SmartReply = { 
      ...insertReply, 
      id, 
      createdAt: now
    };
    this.smartReplies.set(id, reply);
    return reply;
  }

  async updateSmartReplyStatus(replyId: number, status: string): Promise<void> {
    const reply = this.smartReplies.get(replyId);
    if (!reply) {
      throw new Error('Reply not found');
    }
    
    reply.status = status;
    this.smartReplies.set(replyId, reply);
  }

  // Daily brief operations
  async getDailyBrief(userId: number, date: string): Promise<DailyBrief | undefined> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return Array.from(this.dailyBriefs.values())
      .find(brief => 
        brief.userId === userId && 
        new Date(brief.date) >= startOfDay && 
        new Date(brief.date) <= endOfDay
      );
  }

  async createDailyBrief(insertBrief: InsertDailyBrief): Promise<DailyBrief> {
    const id = this.briefIdCounter++;
    const now = new Date().toISOString();
    const brief: DailyBrief = { 
      ...insertBrief, 
      id, 
      createdAt: now
    };
    this.dailyBriefs.set(id, brief);
    return brief;
  }

  // Connection operations
  async getConnectionsByUserId(userId: number): Promise<Connection[]> {
    return Array.from(this.connections.values())
      .filter(connection => connection.userId === userId);
  }

  async getConnection(userId: number, service: string): Promise<Connection | undefined> {
    return Array.from(this.connections.values())
      .find(connection => connection.userId === userId && connection.service === service);
  }

  async createConnection(insertConnection: InsertConnection): Promise<Connection> {
    const id = this.connectionIdCounter++;
    const now = new Date().toISOString();
    const connection: Connection = { 
      ...insertConnection, 
      id, 
      createdAt: now
    };
    this.connections.set(id, connection);
    return connection;
  }

  async removeConnection(userId: number, service: string): Promise<void> {
    const connection = await this.getConnection(userId, service);
    if (!connection) {
      throw new Error('Connection not found');
    }
    
    this.connections.delete(connection.id);
  }
}

export const storage = new MemStorage();
