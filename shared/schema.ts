import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  profileImage: text("profile_image"),
  createdAt: timestamp("created_at").defaultNow(),
  preferences: jsonb("preferences").default({
    replyTone: 'professional',
    autoSuggestReplies: true,
    dailyBriefing: true,
  }),
});

export const connections = pgTable("connections", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  service: text("service").notNull(), // 'gmail', 'outlook', 'google_calendar'
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  tokenExpiry: timestamp("token_expiry"),
  email: text("email"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const emails = pgTable("emails", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  messageId: text("message_id").notNull(),
  from: text("from").notNull(),
  to: text("to").notNull(),
  subject: text("subject"),
  snippet: text("snippet"),
  body: text("body"),
  receivedAt: timestamp("received_at").notNull(),
  isRead: boolean("is_read").default(false),
  isPriority: boolean("is_priority").default(false),
  labels: jsonb("labels").default([]),
  aiSummary: text("ai_summary"),
  conversationId: text("conversation_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const calendarEvents = pgTable("calendar_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  eventId: text("event_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  location: text("location"),
  attendees: jsonb("attendees").default([]),
  isAllDay: boolean("is_all_day").default(false),
  tags: jsonb("tags").default([]),
  createdAt: timestamp("created_at").defaultNow(),
});

export const smartReplies = pgTable("smart_replies", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  emailId: integer("email_id").notNull().references(() => emails.id),
  replyText: text("reply_text").notNull(),
  replyTone: text("reply_tone").default('professional'),
  status: text("status").default('pending'), // 'pending', 'sent', 'rejected'
  createdAt: timestamp("created_at").defaultNow(),
});

export const dailyBriefs = pgTable("daily_briefs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  date: timestamp("date").defaultNow(),
  summary: text("summary").notNull(),
  priorities: jsonb("priorities").default([]),
  emailCount: integer("email_count").default(0),
  eventCount: integer("event_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertConnectionSchema = createInsertSchema(connections).omit({
  id: true,
  createdAt: true,
});

export const insertEmailSchema = createInsertSchema(emails).omit({
  id: true,
  createdAt: true,
});

export const insertCalendarEventSchema = createInsertSchema(calendarEvents).omit({
  id: true,
  createdAt: true,
});

export const insertSmartReplySchema = createInsertSchema(smartReplies).omit({
  id: true,
  createdAt: true,
});

export const insertDailyBriefSchema = createInsertSchema(dailyBriefs).omit({
  id: true,
  createdAt: true,
});

// Types for insert and select
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertConnection = z.infer<typeof insertConnectionSchema>;
export type Connection = typeof connections.$inferSelect;

export type InsertEmail = z.infer<typeof insertEmailSchema>;
export type Email = typeof emails.$inferSelect;

export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;
export type CalendarEvent = typeof calendarEvents.$inferSelect;

export type InsertSmartReply = z.infer<typeof insertSmartReplySchema>;
export type SmartReply = typeof smartReplies.$inferSelect;

export type InsertDailyBrief = z.infer<typeof insertDailyBriefSchema>;
export type DailyBrief = typeof dailyBriefs.$inferSelect;
