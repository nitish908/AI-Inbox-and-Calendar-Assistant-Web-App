// This file handles OpenAI API calls on the client side

export interface AIGeneratedReply {
  id: string;
  emailId: number;
  replyText: string;
  replyTone: string;
}

export interface AIGeneratedSummary {
  text: string;
  priorities: string[];
}

// Function to fetch AI-generated email summary
export async function getEmailSummary(emailId: number): Promise<string> {
  const response = await fetch(`/api/emails/${emailId}/summary`);
  if (!response.ok) {
    throw new Error('Failed to get email summary');
  }
  
  const data = await response.json();
  return data.summary;
}

// Function to fetch AI-generated smart reply suggestions
export async function getSmartReplySuggestions(emailId: number): Promise<AIGeneratedReply[]> {
  const response = await fetch(`/api/emails/${emailId}/replies`);
  if (!response.ok) {
    throw new Error('Failed to get smart reply suggestions');
  }
  
  const data = await response.json();
  return data.replies;
}

// Function to send a smart reply
export async function sendSmartReply(replyId: number): Promise<void> {
  const response = await fetch(`/api/smartreplies/${replyId}/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to send smart reply');
  }
}

// Function to generate a daily brief
export async function getDailyBrief(): Promise<AIGeneratedSummary> {
  const response = await fetch('/api/dailybrief');
  if (!response.ok) {
    throw new Error('Failed to get daily brief');
  }
  
  const data = await response.json();
  return {
    text: data.summary,
    priorities: data.priorities,
  };
}
