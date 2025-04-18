import { storage } from "../storage";
import { Email, InsertEmail, emails } from "@shared/schema";
import { getAuthorizedOAuth2Client } from "./oauthService";
import { google } from 'googleapis';
import { generateEmailSummary, generateSmartReplies } from "./openai";
import { db } from "../db";
import { eq } from "drizzle-orm";

/**
 * Get emails for a user with optional limit
 * This connects to Gmail API if user has connected their account
 */
export async function getEmails(userId: number, limit?: number): Promise<Email[]> {
  try {
    // Check if user is connected to an email service
    const connections = await storage.getConnectionsByUserId(userId);
    const gmailConnection = connections.find(conn => conn.service === 'gmail');
    const outlookConnection = connections.find(conn => conn.service === 'outlook');
    
    // If no email connection, return emails from database
    if (!gmailConnection && !outlookConnection) {
      return storage.getEmails(userId, limit);
    }
    
    // If Gmail is connected, try to fetch emails from Gmail API
    if (gmailConnection) {
      try {
        await syncEmails(userId); // Sync emails before returning them
        return storage.getEmails(userId, limit);
      } catch (error) {
        console.error("Error syncing with Gmail API:", error);
        // Fall back to database if API fails
        return storage.getEmails(userId, limit);
      }
    }
    
    // For now, Outlook integration is not implemented
    // Just return emails from database
    return storage.getEmails(userId, limit);
  } catch (error) {
    console.error("Error fetching emails:", error);
    throw new Error("Failed to fetch emails");
  }
}

/**
 * Mark an email as read in Gmail and in local database
 */
export async function markEmailAsRead(userId: number, emailId: number): Promise<void> {
  try {
    const email = await storage.getEmail(emailId, userId);
    if (!email) {
      throw new Error("Email not found");
    }
    
    // Only try Gmail API if the email has a Gmail messageId (not a local one)
    if (email.messageId && !email.messageId.startsWith('local-') && !email.messageId.startsWith('sent-')) {
      // Check if Gmail is connected
      const oauth2Client = await getAuthorizedOAuth2Client(userId, 'gmail');
      if (oauth2Client) {
        try {
          // Create Gmail service
          const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
          
          // Mark message as read in Gmail by removing UNREAD label
          await gmail.users.messages.modify({
            userId: 'me',
            id: email.messageId,
            requestBody: {
              removeLabelIds: ['UNREAD']
            }
          });
          
          console.log(`Marked email ${email.messageId} as read in Gmail`);
        } catch (error) {
          console.error("Error marking email as read in Gmail:", error);
          // Continue to mark as read in local database even if Gmail API fails
        }
      }
    }
    
    // Update our local storage
    await storage.markEmailAsRead(emailId);
  } catch (error) {
    console.error("Error marking email as read:", error);
    throw new Error("Failed to mark email as read");
  }
}

/**
 * Send an email via Gmail API if connected, otherwise store locally
 */
export async function sendEmail(userId: number, to: string, subject: string, body: string): Promise<void> {
  try {
    // Get user info
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    // Check if Gmail is connected
    const oauth2Client = await getAuthorizedOAuth2Client(userId, 'gmail');
    
    if (oauth2Client) {
      try {
        // Create Gmail service
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        
        // Create email content in RFC 2822 format
        const emailContent = [
          `From: ${user.email}`,
          `To: ${to}`,
          `Subject: ${subject}`,
          '',
          body
        ].join('\r\n');
        
        // Encode the email content in base64
        const encodedEmail = Buffer.from(emailContent).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        
        // Send the email via Gmail API
        const response = await gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw: encodedEmail
          }
        });
        
        // Save the sent email to our database with the Gmail message ID
        const emailToSend: InsertEmail = {
          userId,
          messageId: response.data.id || `sent-${Date.now()}`,
          from: user.email,
          to,
          subject,
          body,
          snippet: body.substring(0, 100),
          receivedAt: new Date(),
          isRead: true,
          isPriority: false,
          labels: ["sent"],
        };
        
        await storage.createEmail(emailToSend);
        console.log(`Email sent via Gmail API with ID: ${response.data.id}`);
      } catch (error) {
        console.error("Error sending email via Gmail API:", error);
        
        // Fall back to storing locally if Gmail API fails
        const emailToSend: InsertEmail = {
          userId,
          messageId: `sent-${Date.now()}`,
          from: user.email,
          to,
          subject,
          body,
          snippet: body.substring(0, 100),
          receivedAt: new Date(),
          isRead: true,
          isPriority: false,
          labels: ["sent"],
        };
        
        await storage.createEmail(emailToSend);
      }
    } else {
      // No Gmail connection, just store locally
      const emailToSend: InsertEmail = {
        userId,
        messageId: `sent-${Date.now()}`,
        from: user.email,
        to,
        subject,
        body,
        snippet: body.substring(0, 100),
        receivedAt: new Date(),
        isRead: true,
        isPriority: false,
        labels: ["sent"],
      };
      
      await storage.createEmail(emailToSend);
    }
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send email");
  }
}

/**
 * Sync emails from Gmail API
 * This fetches recent emails and stores them in the database
 */
export async function syncEmails(userId: number): Promise<void> {
  try {
    // Get OAuth client for Gmail
    const oauth2Client = await getAuthorizedOAuth2Client(userId, 'gmail');
    
    if (!oauth2Client) {
      return; // No Gmail connection
    }
    
    // Get user email
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    try {
      // Create Gmail service
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      
      // Get list of recent messages (last 20)
      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 20,
        q: 'in:inbox' // Only get inbox messages
      });
      
      const messages = response.data.messages || [];
      
      // Get existing message IDs to avoid duplicates
      const existingEmails = await storage.getEmails(userId, 100);
      const existingMessageIds = new Set(existingEmails.map(e => e.messageId));
      
      // Process each message
      for (const message of messages) {
        if (!message.id || existingMessageIds.has(message.id)) {
          continue; // Skip if no ID or already in database
        }
        
        // Get full message details
        const fullMessage = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'full'
        });
        
        if (!fullMessage.data || !fullMessage.data.payload) {
          continue; // Skip if no payload
        }
        
        // Extract email data from headers
        const headers = fullMessage.data.payload.headers || [];
        const subject = headers.find(h => h.name?.toLowerCase() === 'subject')?.value || 'No Subject';
        const from = headers.find(h => h.name?.toLowerCase() === 'from')?.value || 'Unknown Sender';
        const to = headers.find(h => h.name?.toLowerCase() === 'to')?.value || user.email;
        const date = headers.find(h => h.name?.toLowerCase() === 'date')?.value;
        
        // Extract email body (prefer text/plain parts)
        let body = '';
        if (fullMessage.data.payload.body?.data) {
          // Body is in the main payload
          body = Buffer.from(fullMessage.data.payload.body.data, 'base64').toString('utf8');
        } else if (fullMessage.data.payload.parts) {
          // Look for text/plain part first
          const textPart = fullMessage.data.payload.parts.find(p => p.mimeType === 'text/plain');
          if (textPart && textPart.body?.data) {
            body = Buffer.from(textPart.body.data, 'base64').toString('utf8');
          } else {
            // Try to find any part with data
            for (const part of fullMessage.data.payload.parts) {
              if (part.body?.data) {
                body = Buffer.from(part.body.data, 'base64').toString('utf8');
                break;
              }
            }
          }
        }
        
        // Get labels for the message
        const labelIds = fullMessage.data.labelIds || [];
        
        // Create email object
        const email: InsertEmail = {
          userId,
          messageId: message.id,
          from,
          to,
          subject,
          body,
          snippet: fullMessage.data.snippet || '',
          receivedAt: date ? new Date(date) : new Date(),
          isRead: !labelIds.includes('UNREAD'),
          isPriority: labelIds.includes('IMPORTANT'),
          labels: labelIds.map(l => l.toLowerCase()),
        };
        
        // Save email to database
        await processNewEmail(email);
      }
      
      console.log(`Synced ${messages.length} emails from Gmail for user ${userId}`);
    } catch (error) {
      console.error("Error syncing emails from Gmail API:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error in syncEmails:", error);
    throw new Error("Failed to sync emails");
  }
}

/**
 * Process a new incoming email - analyze, categorize, and generate AI responses
 */
export async function processNewEmail(email: InsertEmail): Promise<void> {
  try {
    // Save the email to database
    const savedEmail = await storage.createEmail(email);
    
    // Don't process emails that are already read
    if (email.isRead) {
      return;
    }
    
    try {
      // Generate email summary using OpenAI if OPENAI_API_KEY is available
      if (process.env.OPENAI_API_KEY) {
        // Only generate summary if body exists
        if (email.body) {
          const summary = await generateEmailSummary(email.body);
          if (summary) {
            await storage.updateEmailSummary(savedEmail.id, summary);
          }
        }
        
        // Generate smart replies
        const smartReplies = await generateSmartReplies(savedEmail);
        if (smartReplies && smartReplies.length > 0) {
          for (const replyText of smartReplies) {
            await storage.createSmartReply({
              userId: email.userId,
              emailId: savedEmail.id,
              replyText,
              replyTone: 'professional',
              status: 'pending'
            });
          }
        }
      }
    } catch (error) {
      console.error("Error generating AI content for email:", error);
      // Continue processing even if AI generation fails
    }
    
    // Analyze for priority if not already set
    if (!email.isPriority) {
      const isPriority = email.subject?.toLowerCase().includes('urgent') || 
                        email.subject?.toLowerCase().includes('important') ||
                        email.from.toLowerCase().includes('boss') ||
                        email.from.toLowerCase().includes('ceo');
      
      if (isPriority) {
        // Update email priority flag in database
        try {
          await db.update(emails)
            .set({ isPriority: true })
            .where(eq(emails.id, savedEmail.id));
        } catch (error) {
          console.error("Error updating email priority:", error);
          // Continue even if update fails
        }
      }
    }
  } catch (error) {
    console.error("Error processing new email:", error);
    throw new Error("Failed to process new email");
  }
}
