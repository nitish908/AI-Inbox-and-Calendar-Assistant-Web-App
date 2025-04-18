import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { z } from "zod";
import { insertUserSchema } from "@shared/schema";
import { generateDailyBrief, generateEmailSummary, generateSmartReplies } from "./services/openai";
import { getEmails, markEmailAsRead, sendEmail } from "./services/emailService";
import { getCalendarEvents, getFreeTimeBlocks } from "./services/calendarService";
import { setupOAuthRoutes } from "./services/oauthService";
import memorystore from "memorystore";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup session middleware
  const MemoryStore = memorystore(session);
  app.use(session({
    cookie: { maxAge: 86400000 },
    store: new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    resave: false,
    saveUninitialized: false,
    secret: process.env.SESSION_SECRET || 'ai-assistant-secret'
  }));

  // Setup authentication with passport
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(new LocalStrategy(async (username, password, done) => {
    try {
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return done(null, false, { message: 'Invalid username or password' });
      }
      if (user.password !== password) { // In production, use proper password hashing
        return done(null, false, { message: 'Invalid username or password' });
      }
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }));

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Authentication routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(409).json({ message: 'Username already exists' });
      }
      
      const user = await storage.createUser(validatedData);
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: 'Login failed after registration' });
        }
        return res.status(201).json(user);
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid input', errors: error.errors });
      }
      return res.status(500).json({ message: 'Registration failed' });
    }
  });

  app.post('/api/auth/login', passport.authenticate('local'), (req, res) => {
    res.json(req.user);
  });

  app.post('/api/auth/logout', (req, res) => {
    req.logout(() => {
      res.status(200).json({ message: 'Logged out successfully' });
    });
  });

  app.get('/api/auth/me', (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    res.json(req.user);
  });

  // Setup OAuth routes for email and calendar services
  setupOAuthRoutes(app);

  // User preferences routes
  app.get('/api/user/preferences', (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const user = req.user as any;
    res.json(user.preferences || {
      replyTone: 'professional',
      autoSuggestReplies: true,
      dailyBriefing: true,
      emailNotifications: true,
      pushNotifications: true
    });
  });

  app.post('/api/user/preferences', (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const user = req.user as any;
    const newPreferences = { 
      ...user.preferences,
      ...req.body
    };
    
    storage.updateUserPreferences(user.id, newPreferences)
      .then(() => res.json(newPreferences))
      .catch(error => res.status(500).json({ message: 'Failed to update preferences', error }));
  });

  // Email routes
  app.get('/api/emails', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const userId = (req.user as any).id;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    
    try {
      const emails = await getEmails(userId, limit);
      res.json({ emails });
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch emails', error: (error as Error).message });
    }
  });

  app.get('/api/emails/:id', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const userId = (req.user as any).id;
    const emailId = parseInt(req.params.id);
    
    try {
      const email = await storage.getEmail(emailId, userId);
      if (!email) {
        return res.status(404).json({ message: 'Email not found' });
      }
      res.json(email);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch email', error: (error as Error).message });
    }
  });

  app.post('/api/emails/:id/read', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const userId = (req.user as any).id;
    const emailId = parseInt(req.params.id);
    
    try {
      await markEmailAsRead(userId, emailId);
      res.json({ message: 'Email marked as read' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to mark email as read', error: (error as Error).message });
    }
  });

  app.post('/api/emails/send', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const userId = (req.user as any).id;
    const { to, subject, body } = req.body;
    
    if (!to || !subject || !body) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    try {
      await sendEmail(userId, to, subject, body);
      res.json({ message: 'Email sent successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to send email', error: (error as Error).message });
    }
  });

  // AI-powered email features
  app.get('/api/emails/:id/summary', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const userId = (req.user as any).id;
    const emailId = parseInt(req.params.id);
    
    try {
      const email = await storage.getEmail(emailId, userId);
      if (!email) {
        return res.status(404).json({ message: 'Email not found' });
      }
      
      const summary = await generateEmailSummary(email.body);
      
      // Store the summary
      await storage.updateEmailSummary(emailId, summary);
      
      res.json({ summary });
    } catch (error) {
      res.status(500).json({ message: 'Failed to generate summary', error: (error as Error).message });
    }
  });

  app.get('/api/emails/:id/replies', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const userId = (req.user as any).id;
    const emailId = parseInt(req.params.id);
    
    try {
      const email = await storage.getEmail(emailId, userId);
      if (!email) {
        return res.status(404).json({ message: 'Email not found' });
      }
      
      const user = await storage.getUser(userId);
      const replyTone = user?.preferences?.replyTone || 'professional';
      
      const replies = await generateSmartReplies(email, replyTone);
      
      // Store the replies
      const storedReplies = await Promise.all(
        replies.map(reply => storage.createSmartReply({
          userId,
          emailId,
          replyText: reply,
          replyTone
        }))
      );
      
      res.json({ replies: storedReplies });
    } catch (error) {
      res.status(500).json({ message: 'Failed to generate replies', error: (error as Error).message });
    }
  });

  // Smart replies routes
  app.get('/api/smartreplies', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const userId = (req.user as any).id;
    
    try {
      const replies = await storage.getSmartRepliesByUserId(userId);
      res.json(replies);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch smart replies', error: (error as Error).message });
    }
  });

  app.post('/api/smartreplies/:id/send', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const userId = (req.user as any).id;
    const replyId = parseInt(req.params.id);
    
    try {
      const reply = await storage.getSmartReply(replyId);
      if (!reply || reply.userId !== userId) {
        return res.status(404).json({ message: 'Reply not found' });
      }
      
      const email = await storage.getEmail(reply.emailId, userId);
      if (!email) {
        return res.status(404).json({ message: 'Original email not found' });
      }
      
      // Send the email using the email service
      await sendEmail(userId, email.from, `Re: ${email.subject}`, reply.replyText);
      
      // Update the reply status
      await storage.updateSmartReplyStatus(replyId, 'sent');
      
      res.json({ message: 'Reply sent successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to send reply', error: (error as Error).message });
    }
  });

  // Calendar routes
  app.get('/api/calendar/events', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const userId = (req.user as any).id;
    const date = req.query.date as string || new Date().toISOString().split('T')[0];
    
    try {
      const events = await getCalendarEvents(userId, date);
      res.json({ events });
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch calendar events', error: (error as Error).message });
    }
  });

  // Get a specific calendar event by ID
  app.get('/api/calendar/events/:id', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const userId = (req.user as any).id;
    const eventId = parseInt(req.params.id, 10);
    
    if (isNaN(eventId)) {
      return res.status(400).json({ message: 'Invalid event ID' });
    }
    
    try {
      const event = await storage.getCalendarEvent(eventId, userId);
      
      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }
      
      res.json(event);
    } catch (error) {
      console.error('Failed to fetch calendar event:', error);
      res.status(500).json({ 
        message: 'Failed to fetch event', 
        error: (error as Error).message 
      });
    }
  });

  app.get('/api/calendar/freetime', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const userId = (req.user as any).id;
    const date = req.query.date as string || new Date().toISOString().split('T')[0];
    
    try {
      const timeSlots = await getFreeTimeBlocks(userId, date);
      res.json({ timeSlots });
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch free time blocks', error: (error as Error).message });
    }
  });

  // Create a new calendar event
  app.post('/api/calendar/events', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const userId = (req.user as any).id;
    const { title, startTime, endTime, description, location, isAllDay } = req.body;
    
    if (!title || !startTime || !endTime) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    try {
      // Add detailed logging for debugging
      console.log('Creating calendar event with data:', {
        title,
        startTime,
        endTime,
        description,
        location,
        isAllDay,
        body: req.body
      });
      
      // Ensure we have valid date objects for startTime and endTime
      let parsedStartTime, parsedEndTime;
      
      try {
        parsedStartTime = new Date(startTime);
        parsedEndTime = new Date(endTime);
        
        // Check if dates are valid
        if (isNaN(parsedStartTime.getTime()) || isNaN(parsedEndTime.getTime())) {
          throw new Error('Invalid date format');
        }
      } catch (dateError) {
        console.error('Error parsing dates:', dateError);
        return res.status(400).json({ 
          message: 'Invalid date format',
          details: { startTime, endTime }
        });
      }
      
      // Extract tags from request body if present
      const tags = Array.isArray(req.body.tags) ? req.body.tags : [];
      
      const event = await storage.createCalendarEvent({
        userId,
        eventId: `local-${Date.now()}`,
        title,
        description: description || null,
        startTime: parsedStartTime,
        endTime: parsedEndTime,
        location: location || null,
        isAllDay: isAllDay || false,
        attendees: [],
        tags
      });
      
      res.status(201).json(event);
    } catch (error) {
      console.error('Failed to create calendar event:', error);
      res.status(500).json({ 
        message: 'Failed to create event', 
        error: (error as Error).message 
      });
    }
  });
  
  // Update an existing calendar event
  app.put('/api/calendar/events/:id', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const userId = (req.user as any).id;
    const eventId = parseInt(req.params.id, 10);
    
    if (isNaN(eventId)) {
      return res.status(400).json({ message: 'Invalid event ID' });
    }
    
    const { title, startTime, endTime, description, location, isAllDay, tags } = req.body;
    
    if (!title || !startTime || !endTime) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    try {
      // Check if the event exists and belongs to the user
      const existingEvent = await storage.getCalendarEvent(eventId, userId);
      
      if (!existingEvent) {
        return res.status(404).json({ message: 'Event not found or not authorized' });
      }
      
      // Ensure we have valid date objects for startTime and endTime
      let parsedStartTime, parsedEndTime;
      
      try {
        parsedStartTime = new Date(startTime);
        parsedEndTime = new Date(endTime);
        
        // Check if dates are valid
        if (isNaN(parsedStartTime.getTime()) || isNaN(parsedEndTime.getTime())) {
          throw new Error('Invalid date format');
        }
      } catch (dateError) {
        console.error('Error parsing dates:', dateError);
        return res.status(400).json({ 
          message: 'Invalid date format',
          details: { startTime, endTime }
        });
      }
      
      // Prepare updated event data
      const updatedEventData = {
        title,
        description: description || null,
        startTime: parsedStartTime,
        endTime: parsedEndTime,
        location: location || null,
        isAllDay: isAllDay || false,
        tags: Array.isArray(tags) ? tags : []
      };
      
      console.log('Updating calendar event:', {
        eventId,
        userId,
        updates: updatedEventData
      });
      
      // Update the event
      const updatedEvent = await storage.updateCalendarEvent(eventId, userId, updatedEventData);
      
      res.json(updatedEvent);
    } catch (error) {
      console.error('Failed to update calendar event:', error);
      res.status(500).json({ 
        message: 'Failed to update event', 
        error: (error as Error).message 
      });
    }
  });
  
  // Delete a calendar event
  app.delete('/api/calendar/events/:id', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const userId = (req.user as any).id;
    const eventId = parseInt(req.params.id, 10);
    
    if (isNaN(eventId)) {
      return res.status(400).json({ message: 'Invalid event ID' });
    }
    
    try {
      // Check if the event exists and belongs to the user
      const existingEvent = await storage.getCalendarEvent(eventId, userId);
      
      if (!existingEvent) {
        return res.status(404).json({ message: 'Event not found or not authorized' });
      }
      
      // Delete the event
      await storage.deleteCalendarEvent(eventId, userId);
      
      res.json({ message: 'Event deleted successfully' });
    } catch (error) {
      console.error('Failed to delete calendar event:', error);
      res.status(500).json({ 
        message: 'Failed to delete event', 
        error: (error as Error).message 
      });
    }
  });

  // Daily brief
  app.get('/api/dailybrief', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const userId = (req.user as any).id;
    
    try {
      // Get user's emails and calendar events for today
      const emails = await getEmails(userId, 10);
      const today = new Date().toISOString().split('T')[0];
      const events = await getCalendarEvents(userId, today);
      
      // Generate the daily brief
      const brief = await generateDailyBrief(emails, events);
      
      // Store the brief
      const storedBrief = await storage.createDailyBrief({
        userId,
        date: new Date().toISOString(),
        summary: brief.summary,
        priorities: brief.priorities,
        emailCount: emails.length,
        eventCount: events.length
      });
      
      res.json({ 
        summary: brief.summary,
        priorities: brief.priorities
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to generate daily brief', error: (error as Error).message });
    }
  });

  // Connected services routes
  app.get('/api/connections', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const userId = (req.user as any).id;
    
    try {
      const connections = await storage.getConnectionsByUserId(userId);
      res.json({ connections });
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch connections', error: (error as Error).message });
    }
  });

  app.delete('/api/connections/:service', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const userId = (req.user as any).id;
    const service = req.params.service;
    
    try {
      await storage.removeConnection(userId, service);
      res.json({ message: `${service} disconnected successfully` });
    } catch (error) {
      res.status(500).json({ message: 'Failed to disconnect service', error: (error as Error).message });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
