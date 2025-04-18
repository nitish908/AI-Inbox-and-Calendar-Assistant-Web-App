import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Info } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSmartReplySuggestions, sendSmartReply } from "@/lib/openai";
import { useToast } from "@/hooks/use-toast";

interface SmartRepliesProps {
  emailId?: number;
}

export default function SmartReplies({ emailId }: SmartRepliesProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pendingReplies, setPendingReplies] = useState<number[]>([]);
  
  // Use a static key if no emailId is provided (for dashboard view)
  const queryKey = emailId ? ['/api/emails', emailId, 'replies'] : ['/api/smartreplies'];
  
  const { data: replies, isLoading, isError } = useQuery({
    queryKey,
    queryFn: () => emailId 
      ? getSmartReplySuggestions(emailId)
      : fetch('/api/smartreplies').then(res => res.json()),
  });

  const sendReplyMutation = useMutation({
    mutationFn: sendSmartReply,
    onSuccess: () => {
      toast({
        title: "Reply sent",
        description: "Your email has been sent successfully.",
      });
      
      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/emails'] });
      queryClient.invalidateQueries({ queryKey: ['/api/smartreplies'] });
    },
    onError: () => {
      toast({
        title: "Failed to send",
        description: "There was an error sending your reply.",
        variant: "destructive",
      });
    },
  });

  const handleSendReply = (replyId: number) => {
    setPendingReplies(prev => [...prev, replyId]);
    sendReplyMutation.mutate(replyId);
  };

  return (
    <Card className="bg-white rounded-lg shadow-sm overflow-hidden">
      <CardHeader className="border-b border-gray-200 px-6 py-4 bg-gray-50 flex flex-row items-center justify-between">
        <h3 className="text-lg font-medium text-neutral-800">Smart Replies</h3>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <Info className="h-3 w-3 mr-1" />
          AI Generated
        </span>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="border border-gray-200 rounded-md overflow-hidden">
                <div className="bg-gray-50 px-4 py-2">
                  <div className="flex items-center">
                    <Skeleton className="h-8 w-8 rounded-full mr-2" />
                    <div>
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-24 mt-1" />
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full mt-1" />
                  <Skeleton className="h-4 w-3/4 mt-1" />
                  <div className="mt-3 flex space-x-2">
                    <Skeleton className="h-8 w-16 rounded-md" />
                    <Skeleton className="h-8 w-16 rounded-md" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="text-center py-6">
            <p className="text-neutral-600">Failed to load smart replies.</p>
          </div>
        ) : !replies || replies.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-neutral-600">No smart replies available.</p>
          </div>
        ) : (
          replies.map((reply) => (
            <div key={reply.id} className="border border-gray-200 rounded-md overflow-hidden">
              <div className="bg-gray-50 px-4 py-2">
                <div className="flex items-center">
                  <div className="flex-shrink-0 mr-2">
                    <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-indigo-100">
                      <span className="text-sm font-medium leading-none text-indigo-800">
                        {reply.from?.split(' ').map(part => part.charAt(0)).join('').toUpperCase().slice(0, 2) || 'UN'}
                      </span>
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-800">{reply.from || 'Unknown Sender'}</p>
                    <p className="text-xs text-neutral-500">{reply.subject || 'No Subject'}</p>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <p className="text-sm text-neutral-600">
                  {reply.replyText}
                </p>
                <div className="mt-3 flex space-x-2">
                  <Button
                    size="sm"
                    onClick={() => handleSendReply(reply.id)}
                    disabled={sendReplyMutation.isPending && pendingReplies.includes(reply.id)}
                  >
                    {sendReplyMutation.isPending && pendingReplies.includes(reply.id) ? 'Sending...' : 'Send'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.location.href = `/inbox/${reply.emailId}/edit`}
                  >
                    Edit
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
