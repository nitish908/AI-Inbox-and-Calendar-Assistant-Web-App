import OpenAI from "openai";
import { Email, CalendarEvent } from "@shared/schema";

// Check for API key
const hasValidApiKey = Boolean(
  process.env.OPENAI_API_KEY && 
  process.env.OPENAI_API_KEY !== "default_key" && 
  process.env.OPENAI_API_KEY.length > 10
);

// Use environment variable for API key with fallback
const openai = hasValidApiKey ? new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
}) : null;

// The newest OpenAI model is "gpt-4o" which was released May 13, 2024
const MODEL = "gpt-4o";

/**
 * Check if OpenAI API is available and properly configured
 */
function isOpenAIAvailable(): boolean {
  return !!openai && hasValidApiKey;
}

/**
 * Generate a summary of an email body
 * Falls back to a simple extraction if OpenAI isn't available
 */
export async function generateEmailSummary(emailBody: string): Promise<string> {
  // Check if OpenAI is available
  if (!isOpenAIAvailable() || !openai) {
    console.log("OpenAI API not available, using fallback summary");
    return generateFallbackSummary(emailBody);
  }

  try {
    const prompt = `Please summarize the following email concisely while maintaining key points:

${emailBody}

Please provide a concise summary in 1-2 sentences.`;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 150,
    });

    return response.choices[0].message.content || "Unable to generate summary.";
  } catch (error) {
    console.error("Error generating email summary:", error);
    // Return a fallback summary instead of throwing an error
    return generateFallbackSummary(emailBody);
  }
}

/**
 * Generate smart reply suggestions for an email
 * Falls back to generic replies if OpenAI isn't available
 */
export async function generateSmartReplies(email: Email, tone: string = "professional"): Promise<string[]> {
  // Check if OpenAI is available
  if (!isOpenAIAvailable() || !openai) {
    console.log("OpenAI API not available, using fallback replies");
    return generateFallbackReplies(email.subject || "");
  }

  try {
    const prompt = `You are an AI assistant generating email reply suggestions.

Original Email From: ${email.from}
Subject: ${email.subject || "No Subject"}
Email Body: ${email.body || "No content"}

Generate 2 different reply suggestions in a ${tone} tone. Each reply should be concise (3-5 sentences), relevant to the content, and appropriate for a professional context.

Return the results in JSON format as follows:
{
  "replies": [
    "First reply text here",
    "Second reply text here"
  ]
}`;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 600,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      return generateFallbackReplies(email.subject || "");
    }

    const result = JSON.parse(content);
    return result.replies || generateFallbackReplies(email.subject || "");
  } catch (error) {
    console.error("Error generating smart replies:", error);
    return generateFallbackReplies(email.subject || "");
  }
}

/**
 * Generate a daily brief based on emails and calendar events
 * Falls back to a simple summary if OpenAI isn't available
 */
export async function generateDailyBrief(
  emails: Email[], 
  events: CalendarEvent[]
): Promise<{ summary: string; priorities: string[] }> {
  // Check if OpenAI is available
  if (!isOpenAIAvailable() || !openai) {
    console.log("OpenAI API not available, using fallback daily brief");
    return generateFallbackBrief(emails, events);
  }

  try {
    // Create a structured representation of the user's data
    const emailSummaries = emails.map(email => ({
      from: email.from,
      subject: email.subject,
      isPriority: email.isPriority,
      snippet: email.snippet,
      receivedAt: email.receivedAt
    }));

    const eventSummaries = events.map(event => ({
      title: event.title,
      startTime: new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      endTime: new Date(event.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      location: event.location,
    }));

    // Find free time blocks (simplistic approach for demo)
    const busyTimes = events.map(event => ({
      start: new Date(event.startTime).getHours() + (new Date(event.startTime).getMinutes() / 60),
      end: new Date(event.endTime).getHours() + (new Date(event.endTime).getMinutes() / 60),
    }));

    let freeBlocks = [];
    const businessHours = { start: 9, end: 17 }; // 9 AM to 5 PM
    
    if (busyTimes.length === 0) {
      freeBlocks.push({ start: businessHours.start, end: businessHours.end });
    } else {
      // Sort busy times by start time
      busyTimes.sort((a, b) => a.start - b.start);
      
      // Find gaps between meetings
      let currentTime = businessHours.start;
      for (const busy of busyTimes) {
        if (busy.start > currentTime) {
          freeBlocks.push({ start: currentTime, end: busy.start });
        }
        currentTime = Math.max(currentTime, busy.end);
      }
      
      // Add time after last meeting if within business hours
      if (currentTime < businessHours.end) {
        freeBlocks.push({ start: currentTime, end: businessHours.end });
      }
    }

    // Convert free blocks to readable format
    const freeTimeSummaries = freeBlocks.filter(block => block.end - block.start >= 1) // Only blocks of 1+ hours
      .map(block => ({
        start: `${Math.floor(block.start)}:${(block.start % 1) * 60 || '00'}`,
        end: `${Math.floor(block.end)}:${(block.end % 1) * 60 || '00'}`,
        duration: Math.round((block.end - block.start) * 10) / 10, // Round to 1 decimal
      }));

    const prompt = `You are an AI assistant generating a daily brief for a professional. Based on the following information, create a concise summary of their day and list 3-5 key priorities they should focus on.

Emails (${emailSummaries.length} total):
${JSON.stringify(emailSummaries, null, 2)}

Calendar Events:
${JSON.stringify(eventSummaries, null, 2)}

Free Time Blocks:
${JSON.stringify(freeTimeSummaries, null, 2)}

Generate a daily brief with:
1. A concise summary paragraph that mentions the number of important emails, meetings, and suggests how to use free time blocks effectively.
2. A list of specific priorities based on the data provided.

Return this in JSON format:
{
  "summary": "Summary text here...",
  "priorities": ["Priority 1", "Priority 2", "Priority 3"]
}`;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 600,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      return generateFallbackBrief(emails, events);
    }

    const result = JSON.parse(content);
    return {
      summary: result.summary,
      priorities: result.priorities
    };
  } catch (error) {
    console.error("Error generating daily brief:", error);
    return generateFallbackBrief(emails, events);
  }
}

/**
 * Generate a fallback summary without using OpenAI
 */
function generateFallbackSummary(emailBody: string): string {
  // Extract first 100 characters if available
  if (!emailBody || emailBody.trim().length === 0) {
    return "No email content available.";
  }
  
  // Remove extra whitespace and take the first sentence or 150 chars
  const cleanText = emailBody.replace(/\s+/g, ' ').trim();
  const firstSentence = cleanText.split(/[.!?](\s|$)/)[0];
  
  if (firstSentence && firstSentence.length > 10) {
    return firstSentence.length > 150 
      ? firstSentence.substring(0, 147) + '...' 
      : firstSentence;
  }
  
  // Default fallback
  return cleanText.substring(0, 150) + (cleanText.length > 150 ? '...' : '');
}

/**
 * Generate fallback replies without using OpenAI
 */
function generateFallbackReplies(subject: string = ""): string[] {
  const genericReplies = [
    `Thank you for your email${subject ? ' regarding ' + subject : ''}. I'll review this and get back to you shortly with more details.`,
    `I appreciate you reaching out${subject ? ' about ' + subject : ''}. I'll look into this matter and respond with my thoughts soon.`,
    `Thanks for your message. I'll consider the information you've shared and follow up with you as soon as possible.`
  ];
  
  // Return two random replies from the list
  return genericReplies.sort(() => 0.5 - Math.random()).slice(0, 2);
}

/**
 * Generate a fallback daily brief without using OpenAI
 */
function generateFallbackBrief(emails: Email[], events: CalendarEvent[]): { summary: string; priorities: string[] } {
  // Count unread and priority emails
  const unreadCount = emails.filter(e => !e.isRead).length;
  const priorityCount = emails.filter(e => e.isPriority).length;
  
  // Count today's events
  const eventCount = events.length;
  
  // Generate basic summary
  const summary = `You have ${unreadCount} unread emails${priorityCount > 0 ? ` (${priorityCount} marked as priority)` : ''} and ${eventCount} events scheduled for today.`;
  
  // Generate priorities
  const priorities = [];
  
  if (unreadCount > 0) {
    priorities.push(`Check your inbox - ${unreadCount} unread emails waiting`);
  }
  
  if (priorityCount > 0) {
    priorities.push(`Respond to ${priorityCount} priority emails`);
  }
  
  if (eventCount > 0) {
    priorities.push(`Prepare for today's ${eventCount} meetings`);
    
    // Add first meeting if available
    if (events[0]) {
      const firstEvent = events[0];
      const time = new Date(firstEvent.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      priorities.push(`Get ready for ${firstEvent.title} at ${time}`);
    }
  }
  
  // Add a generic priority if list is too short
  if (priorities.length < 3) {
    priorities.push("Plan your schedule for the rest of the week");
  }
  
  return { summary, priorities };
}
