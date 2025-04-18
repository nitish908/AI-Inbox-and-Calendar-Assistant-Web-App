import { storage } from "../storage";
import { CalendarEvent } from "@shared/schema";

/**
 * Get calendar events for a user on a specific date
 * In a real implementation, this would connect to Google Calendar/Outlook Calendar API
 */
export async function getCalendarEvents(userId: number, date: string): Promise<CalendarEvent[]> {
  try {
    // Check if user is connected to a calendar service
    const connections = await storage.getConnectionsByUserId(userId);
    const calendarConnection = connections.find(conn => 
      conn.service === 'google_calendar' || conn.service === 'outlook_calendar');
    
    if (!calendarConnection) {
      // Return the events stored in our database
      return storage.getCalendarEvents(userId, date);
    }
    
    // In a real implementation, we would:
    // 1. Check if the token is valid or refresh if needed
    // 2. Make API call to the calendar service
    // 3. Process the results and store in our database
    // 4. Return the results

    // For this demo, we'll just return the events from storage
    return storage.getCalendarEvents(userId, date);
  } catch (error) {
    console.error("Error fetching calendar events:", error);
    throw new Error("Failed to fetch calendar events");
  }
}

/**
 * Get free time blocks for a user on a specific date
 */
export async function getFreeTimeBlocks(userId: number, date: string): Promise<{
  startTime: string;
  endTime: string;
  description: string;
  isFree: boolean;
}[]> {
  try {
    // Get all events for the day
    const events = await getCalendarEvents(userId, date);
    
    if (events.length === 0) {
      // If no events, return full workday as free
      const dateObj = new Date(date);
      return [{
        startTime: new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 9, 0).toISOString(),
        endTime: new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 17, 0).toISOString(),
        description: "Free Time Block",
        isFree: true
      }];
    }
    
    // Define the working day boundaries (9 AM to 5 PM)
    const workDayStart = new Date(date);
    workDayStart.setHours(9, 0, 0, 0);
    
    const workDayEnd = new Date(date);
    workDayEnd.setHours(17, 0, 0, 0);
    
    // Sort events by start time
    events.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    
    // Find gaps between events
    const freeBlocks = [];
    let currentTime = new Date(workDayStart);
    
    for (const event of events) {
      const eventStart = new Date(event.startTime);
      
      // If there's a gap between current time and event start, add a free block
      if (eventStart > currentTime && eventStart <= workDayEnd) {
        freeBlocks.push({
          startTime: currentTime.toISOString(),
          endTime: eventStart.toISOString(),
          description: "Free Time Block",
          isFree: true
        });
      }
      
      // Move current time to end of this event
      const eventEnd = new Date(event.endTime);
      if (eventEnd > currentTime) {
        currentTime = eventEnd;
      }
    }
    
    // Add a free block after the last event if within work day
    if (currentTime < workDayEnd) {
      freeBlocks.push({
        startTime: currentTime.toISOString(),
        endTime: workDayEnd.toISOString(),
        description: "Free Time Block",
        isFree: true
      });
    }
    
    // Filter out very short blocks (less than 30 minutes)
    return freeBlocks.filter(block => {
      const startTime = new Date(block.startTime).getTime();
      const endTime = new Date(block.endTime).getTime();
      const durationMinutes = (endTime - startTime) / (60 * 1000);
      return durationMinutes >= 30;
    });
  } catch (error) {
    console.error("Error finding free time blocks:", error);
    throw new Error("Failed to find free time blocks");
  }
}

/**
 * Create a new calendar event
 * In a real implementation, this would create the event in Google/Outlook Calendar
 */
export async function createCalendarEvent(
  userId: number,
  title: string,
  startTime: string,
  endTime: string,
  description?: string,
  location?: string,
  attendees?: { email: string, name?: string }[]
): Promise<CalendarEvent> {
  try {
    // Check if user is connected to a calendar service
    const connections = await storage.getConnectionsByUserId(userId);
    const calendarConnection = connections.find(conn => 
      conn.service === 'google_calendar' || conn.service === 'outlook_calendar');
    
    // In a real implementation, we would:
    // 1. Check if token is valid or refresh if needed
    // 2. Make API call to create event in the calendar service
    // 3. Get the event ID from the response
    // 4. Store the event in our database
    
    // Convert string times to Date objects for proper storage
    const startTimeDate = new Date(startTime);
    const endTimeDate = new Date(endTime);
    
    // For this demo, we'll just create the event in our database
    const event = await storage.createCalendarEvent({
      userId,
      eventId: `local-${Date.now()}`,
      title,
      description: description || '',
      startTime: startTimeDate,
      endTime: endTimeDate,
      location: location || '',
      attendees: attendees || [],
      isAllDay: false,
      tags: []
    });
    
    return event;
  } catch (error) {
    console.error("Error creating calendar event:", error);
    throw new Error("Failed to create calendar event");
  }
}

/**
 * Sync calendar events from calendar service
 * This would be called periodically or via webhook in a real implementation
 */
export async function syncCalendarEvents(userId: number): Promise<void> {
  try {
    // Check if user is connected to a calendar service
    const connections = await storage.getConnectionsByUserId(userId);
    const calendarConnection = connections.find(conn => 
      conn.service === 'google_calendar' || conn.service === 'outlook_calendar');
    
    if (!calendarConnection) {
      return; // No calendar service connected
    }
    
    // In a real implementation:
    // 1. Check if token is valid or refresh if needed
    // 2. Make API call to fetch events from the calendar service
    // 3. Process the results and store in our database
    
    // For this demo, we do nothing as we're using static data
  } catch (error) {
    console.error("Error syncing calendar events:", error);
    throw new Error("Failed to sync calendar events");
  }
}
