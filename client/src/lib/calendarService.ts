// This file handles calendar-related operations

import { CalendarEvent } from "@shared/schema";

export interface CalendarEventItem {
  id: number;
  eventId: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  location: string;
  isAllDay: boolean;
  tags: string[];
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  description: string;
  isFree: boolean;
}

// Get today's calendar events
export async function getTodayEvents(): Promise<CalendarEventItem[]> {
  const today = new Date().toISOString().split('T')[0];
  return getCalendarEvents(today);
}

// Get calendar events for a specific date
export async function getCalendarEvents(date: string): Promise<CalendarEventItem[]> {
  const response = await fetch(`/api/calendar/events?date=${date}`);
  if (!response.ok) {
    throw new Error('Failed to get calendar events');
  }
  
  const data = await response.json();
  return data.events.map((event: CalendarEvent) => ({
    id: event.id,
    eventId: event.eventId,
    title: event.title,
    description: event.description || '',
    startTime: new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    endTime: new Date(event.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    location: event.location || '',
    isAllDay: event.isAllDay,
    tags: event.tags as string[] || [],
  }));
}

// Get free time blocks in the calendar
export async function getFreeTimeBlocks(date: string): Promise<TimeSlot[]> {
  const response = await fetch(`/api/calendar/freetime?date=${date}`);
  if (!response.ok) {
    throw new Error('Failed to get free time blocks');
  }
  
  const data = await response.json();
  return data.timeSlots.map((slot: any) => ({
    startTime: new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    endTime: new Date(slot.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    description: slot.description || 'Free Time Block',
    isFree: true,
  }));
}

// Get a specific calendar event by ID
export async function getCalendarEventById(id: number): Promise<CalendarEventItem> {
  const response = await fetch(`/api/calendar/events/${id}`);
  if (!response.ok) {
    throw new Error('Failed to get calendar event');
  }
  
  const event = await response.json();
  return {
    id: event.id,
    eventId: event.eventId,
    title: event.title,
    description: event.description || '',
    startTime: new Date(event.startTime).toISOString().slice(0, 16), // Format as YYYY-MM-DDThh:mm
    endTime: new Date(event.endTime).toISOString().slice(0, 16),
    location: event.location || '',
    isAllDay: event.isAllDay,
    tags: event.tags as string[] || [],
  };
}

// Create a new calendar event
export interface CreateEventParams {
  title: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  tags: string[];
  description?: string;
  location?: string;
}

export async function createCalendarEvent(eventData: CreateEventParams): Promise<void> {
  const response = await fetch('/api/calendar/events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventData),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to create calendar event: ${errorData.message || response.statusText}`);
  }
}

// Update an existing calendar event
export interface UpdateEventParams extends CreateEventParams {
  id: number;
}

export async function updateCalendarEvent(eventData: UpdateEventParams): Promise<void> {
  const { id, ...data } = eventData;
  
  const response = await fetch(`/api/calendar/events/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to update calendar event: ${errorData.message || response.statusText}`);
  }
}

// Delete a calendar event
export async function deleteCalendarEvent(id: number): Promise<void> {
  const response = await fetch(`/api/calendar/events/${id}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to delete calendar event: ${errorData.message || response.statusText}`);
  }
}
