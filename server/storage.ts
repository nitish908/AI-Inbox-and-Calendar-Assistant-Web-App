import { users, type User, type InsertUser, emails, type Email, type InsertEmail, calendarEvents, type CalendarEvent, type InsertCalendarEvent, smartReplies, type SmartReply, type InsertSmartReply, dailyBriefs, type DailyBrief, type InsertDailyBrief, connections, type Connection, type InsertConnection } from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";

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

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUserPreferences(userId: number, preferences: any): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    await db
      .update(users)
      .set({ preferences })
      .where(eq(users.id, userId));
  }

  // Email operations
  async getEmails(userId: number, limit?: number): Promise<Email[]> {
    let query = db
      .select()
      .from(emails)
      .where(eq(emails.userId, userId))
      .orderBy(desc(emails.receivedAt));
    
    if (limit) {
      return await query.limit(limit);
    }
    
    return await query;
  }

  async getEmail(id: number, userId: number): Promise<Email | undefined> {
    const [email] = await db
      .select()
      .from(emails)
      .where(and(eq(emails.id, id), eq(emails.userId, userId)));
    return email;
  }

  async createEmail(insertEmail: InsertEmail): Promise<Email> {
    const [email] = await db
      .insert(emails)
      .values(insertEmail)
      .returning();
    return email;
  }

  async updateEmailSummary(emailId: number, summary: string): Promise<void> {
    await db
      .update(emails)
      .set({ aiSummary: summary })
      .where(eq(emails.id, emailId));
  }

  async markEmailAsRead(emailId: number): Promise<void> {
    await db
      .update(emails)
      .set({ isRead: true })
      .where(eq(emails.id, emailId));
  }

  // Calendar operations
  async getCalendarEvents(userId: number, date: string): Promise<CalendarEvent[]> {
    try {
      // Use SQL directly to avoid date conversion issues
      const result = await db.execute(sql`
        SELECT * FROM calendar_events 
        WHERE user_id = ${userId}
        ORDER BY start_time ASC
      `);
      
      // Convert the raw data to CalendarEvent objects
      return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        eventId: row.event_id,
        title: row.title,
        description: row.description,
        startTime: new Date(row.start_time),
        endTime: new Date(row.end_time),
        location: row.location,
        attendees: row.attendees || [],
        isAllDay: row.is_all_day || false,
        tags: row.tags || [],
        createdAt: new Date(row.created_at)
      }));
    } catch (error) {
      console.error("Error fetching calendar events:", error);
      return [];
    }
  }

  async getCalendarEvent(id: number, userId: number): Promise<CalendarEvent | undefined> {
    const [event] = await db
      .select()
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.id, id),
          eq(calendarEvents.userId, userId)
        )
      );
    return event;
  }

  async createCalendarEvent(insertEvent: InsertCalendarEvent): Promise<CalendarEvent> {
    const [event] = await db
      .insert(calendarEvents)
      .values(insertEvent)
      .returning();
    return event;
  }

  // Smart reply operations
  async getSmartReplies(emailId: number): Promise<SmartReply[]> {
    return await db
      .select()
      .from(smartReplies)
      .where(eq(smartReplies.emailId, emailId))
      .orderBy(desc(smartReplies.createdAt));
  }

  async getSmartRepliesByUserId(userId: number): Promise<SmartReply[]> {
    return await db
      .select()
      .from(smartReplies)
      .where(
        and(
          eq(smartReplies.userId, userId),
          eq(smartReplies.status, 'pending')
        )
      )
      .orderBy(desc(smartReplies.createdAt));
  }

  async getSmartReply(id: number): Promise<SmartReply | undefined> {
    const [reply] = await db
      .select()
      .from(smartReplies)
      .where(eq(smartReplies.id, id));
    return reply;
  }

  async createSmartReply(insertReply: InsertSmartReply): Promise<SmartReply> {
    const [reply] = await db
      .insert(smartReplies)
      .values(insertReply)
      .returning();
    return reply;
  }

  async updateSmartReplyStatus(replyId: number, status: string): Promise<void> {
    await db
      .update(smartReplies)
      .set({ status })
      .where(eq(smartReplies.id, replyId));
  }

  // Daily brief operations
  async getDailyBrief(userId: number, date: string): Promise<DailyBrief | undefined> {
    try {
      // Use SQL directly to avoid date conversion issues
      const result = await db.execute(sql`
        SELECT * FROM daily_briefs 
        WHERE user_id = ${userId} 
        ORDER BY date DESC
        LIMIT 1
      `);
      
      if (result.rows.length === 0) {
        return undefined;
      }
      
      const row = result.rows[0];
      
      // Convert the raw data to DailyBrief object
      return {
        id: row.id,
        userId: row.user_id,
        date: new Date(row.date),
        summary: row.summary,
        priorities: row.priorities || [],
        emailCount: row.email_count || 0,
        eventCount: row.event_count || 0,
        createdAt: new Date(row.created_at)
      };
    } catch (error) {
      console.error("Error fetching daily brief:", error);
      return undefined;
    }
  }

  async createDailyBrief(insertBrief: InsertDailyBrief): Promise<DailyBrief> {
    const [brief] = await db
      .insert(dailyBriefs)
      .values(insertBrief)
      .returning();
    return brief;
  }

  // Connection operations
  async getConnectionsByUserId(userId: number): Promise<Connection[]> {
    return await db
      .select()
      .from(connections)
      .where(eq(connections.userId, userId));
  }

  async getConnection(userId: number, service: string): Promise<Connection | undefined> {
    const [connection] = await db
      .select()
      .from(connections)
      .where(
        and(
          eq(connections.userId, userId),
          eq(connections.service, service)
        )
      );
    return connection;
  }

  async createConnection(insertConnection: InsertConnection): Promise<Connection> {
    const [connection] = await db
      .insert(connections)
      .values(insertConnection)
      .returning();
    return connection;
  }

  async removeConnection(userId: number, service: string): Promise<void> {
    const connection = await this.getConnection(userId, service);
    if (!connection) {
      throw new Error('Connection not found');
    }
    
    await db
      .delete(connections)
      .where(eq(connections.id, connection.id));
  }
  
  // Initialize demo data
  async initializeDemo(): Promise<void> {
    try {
      // Check if demo user exists
      const existingUser = await this.getUserByUsername("demo");
      if (existingUser) {
        return; // Demo data already exists
      }
      
      // Add demo user
      const user = await this.createUser({
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
      
      const userId = user.id;
      
      // Add sample emails
      const today = new Date();
      
      const sampleEmails = [
        {
          userId,
          messageId: "msg-001",
          from: "Marketing Team <marketing@example.com>",
          to: "emily@example.com",
          subject: "Client Proposal Draft",
          snippet: "I've attached the latest version of our client proposal for review. Could you provide feedback by tomorrow?",
          body: "Hi Emily,\n\nI've attached the latest version of our client proposal for review. Could you provide feedback by tomorrow? We need to finalize it before the meeting on Friday.\n\nThanks,\nMarketing Team",
          receivedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          isRead: false,
          isPriority: true,
          labels: ["work", "important"],
        },
        {
          userId,
          messageId: "msg-002",
          from: "Alex Davidson <alex@example.com>",
          to: "emily@example.com",
          subject: "Project Review Meeting",
          snippet: "Just a reminder about our project review meeting scheduled for 11 AM today. Please bring your quarterly metrics.",
          body: "Hi Emily,\n\nJust a reminder about our project review meeting scheduled for 11 AM today. Please bring your quarterly metrics so we can discuss the progress.\n\nBest,\nAlex",
          receivedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
          isRead: false,
          isPriority: false,
          labels: ["work"],
        },
        {
          userId,
          messageId: "msg-003",
          from: "Sarah Chen <sarah@example.com>",
          to: "emily@example.com",
          subject: "Quarterly Report Status",
          snippet: "Just checking in on the status of the quarterly report. We'll need the draft by tomorrow for review before submission.",
          body: "Hi Emily,\n\nJust checking in on the status of the quarterly report. We'll need the draft by tomorrow for review before submission to the management team.\n\nLet me know if you need any help compiling the data.\n\nRegards,\nSarah",
          receivedAt: new Date(Date.now() - 28 * 60 * 60 * 1000), // 28 hours ago
          isRead: false,
          isPriority: false,
          labels: ["work", "report"],
        }
      ];
      
      for (const emailData of sampleEmails) {
        await this.createEmail(emailData as InsertEmail);
      }
      
      // Add sample calendar events
      const sampleEvents = [
        {
          userId,
          eventId: "evt-001",
          title: "Project Review Meeting",
          description: "Quarterly review of project progress and metrics",
          startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 0),
          endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0),
          location: "Conference Room A",
          attendees: [{ name: "Alex Davidson", email: "alex@example.com" }],
          isAllDay: false,
          tags: ["Team"],
        },
        {
          userId,
          eventId: "evt-002",
          title: "Client Call - XYZ Corp",
          description: "Follow-up call to discuss proposal details",
          startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 16, 0),
          endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 16, 30),
          location: "Zoom Meeting",
          attendees: [{ name: "John Smith", email: "john@xyzcorp.com" }],
          isAllDay: false,
          tags: ["External"],
        }
      ];
      
      for (const eventData of sampleEvents) {
        await this.createCalendarEvent(eventData as InsertCalendarEvent);
      }
      
      // Add sample connections
      const sampleConnections = [
        {
          userId,
          service: "gmail",
          accessToken: "sample-token",
          refreshToken: "sample-refresh",
          tokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          email: "emily@example.com",
        },
        {
          userId,
          service: "google_calendar",
          accessToken: "sample-token",
          refreshToken: "sample-refresh",
          tokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          email: "emily@example.com",
        }
      ];
      
      for (const connectionData of sampleConnections) {
        await this.createConnection(connectionData as InsertConnection);
      }
      
      // Create smart replies for sample emails
      const email1 = (await this.getEmails(userId, 10))[0];
      const email2 = (await this.getEmails(userId, 10))[1];
      
      if (email1) {
        await this.createSmartReply({
          userId,
          emailId: email1.id,
          replyText: "Thanks for sharing the client proposal. I'll review it today and provide my feedback by tomorrow morning. Is there anything specific you'd like me to focus on?",
          replyTone: "professional",
          status: "pending",
        });
      }
      
      if (email2) {
        await this.createSmartReply({
          userId,
          emailId: email2.id,
          replyText: "Thanks for the reminder. I have the meeting on my calendar and will bring the quarterly metrics as requested. Looking forward to our discussion.",
          replyTone: "professional",
          status: "pending",
        });
      }
      
      console.log("Demo data initialized successfully");
    } catch (error) {
      console.error("Error initializing demo data:", error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();
