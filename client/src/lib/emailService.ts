// This file handles email-related operations

import { Email } from "@shared/schema";

export interface EmailSummaryItem {
  id: number;
  messageId: string;
  from: string;
  subject: string;
  snippet: string;
  receivedAt: string;
  isPriority: boolean;
  isRead: boolean;
  senderImage?: string;
  senderInitials?: string;
}

// Function to get email summary list
export async function getEmailSummaries(limit: number = 10): Promise<EmailSummaryItem[]> {
  const response = await fetch(`/api/emails?limit=${limit}`);
  if (!response.ok) {
    throw new Error('Failed to get emails');
  }
  
  const data = await response.json();
  return data.emails.map((email: Email) => {
    const fromParts = email.from.split('<');
    const fromName = fromParts[0].trim();
    return {
      id: email.id,
      messageId: email.messageId,
      from: fromName,
      subject: email.subject || '(No Subject)',
      snippet: email.snippet || '',
      receivedAt: new Date(email.receivedAt).toLocaleString(),
      isPriority: email.isPriority,
      isRead: email.isRead,
      senderInitials: getInitials(fromName),
    };
  });
}

// Function to get a single email details
export async function getEmailDetails(emailId: number): Promise<Email> {
  const response = await fetch(`/api/emails/${emailId}`);
  if (!response.ok) {
    throw new Error('Failed to get email details');
  }
  
  return await response.json();
}

// Function to mark an email as read
export async function markEmailAsRead(emailId: number): Promise<void> {
  const response = await fetch(`/api/emails/${emailId}/read`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to mark email as read');
  }
}

// Function to send an email
export async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  const response = await fetch('/api/emails/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ to, subject, body }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to send email');
  }
}

// Helper function to get initials from a name
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
