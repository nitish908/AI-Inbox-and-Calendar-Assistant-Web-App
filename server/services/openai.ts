import OpenAI from "openai";
import { Email, CalendarEvent } from "@shared/schema";

// Use environment variable for API key with fallback
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.API_KEY_ENV_VAR || "default_key"
});

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const MODEL = "gpt-4o";

// Generate a summary of an email
export async function generateEmailSummary(emailBody: string): Promise<string> {
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
    throw new Error("Failed to generate email summary");
  }
}

// Generate smart reply suggestions for an email
export async function generateSmartReplies(email: Email, tone: string = "professional"): Promise<string[]> {
  try {
    const prompt = `You are an AI assistant generating email reply suggestions.

Original Email From: ${email.from}
Subject: ${email.subject}
Email Body: ${email.body}

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
      return ["Thank you for your email. I'll review this and get back to you shortly."];
    }

    const result = JSON.parse(content);
    return result.replies || [];
  } catch (error) {
    console.error("Error generating smart replies:", error);
    throw new Error("Failed to generate smart replies");
  }
}

// Generate a daily brief based on emails and calendar events
export async function generateDailyBrief(
  emails: Email[], 
  events: CalendarEvent[]
): Promise<{ summary: string; priorities: string[] }> {
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
      return {
        summary: "You have emails to review and calendar events scheduled for today.",
        priorities: ["Check your inbox", "Prepare for scheduled meetings"]
      };
    }

    const result = JSON.parse(content);
    return {
      summary: result.summary,
      priorities: result.priorities
    };
  } catch (error) {
    console.error("Error generating daily brief:", error);
    throw new Error("Failed to generate daily brief");
  }
}
