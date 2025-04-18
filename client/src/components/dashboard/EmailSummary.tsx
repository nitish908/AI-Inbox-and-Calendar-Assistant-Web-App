import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getEmailSummaries } from "@/lib/emailService";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default function EmailSummary() {
  const { data: emails, isLoading, isError } = useQuery({
    queryKey: ['/api/emails'],
    queryFn: () => getEmailSummaries(3), // Limit to 3 emails for dashboard
  });

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return 'Yesterday';
    }
  };

  return (
    <Card className="bg-white rounded-lg shadow-sm overflow-hidden">
      <CardHeader className="border-b border-gray-200 px-6 py-4 bg-gray-50 flex flex-row items-center justify-between">
        <h3 className="text-lg font-medium text-neutral-800">Inbox Overview</h3>
        <Link href="/inbox">
          <a className="text-primary text-sm font-medium">View All</a>
        </Link>
      </CardHeader>
      
      <div>
        {isLoading ? (
          <div className="divide-y divide-gray-100">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4">
                <div className="flex items-start">
                  <Skeleton className="h-10 w-10 rounded-full mr-4" />
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                    <Skeleton className="h-5 w-48 mt-1" />
                    <Skeleton className="h-4 w-full mt-2" />
                    <Skeleton className="h-4 w-2/3 mt-1" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="p-6 text-center">
            <p className="text-neutral-600">Failed to load emails.</p>
          </div>
        ) : emails?.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-neutral-600">Your inbox is empty.</p>
          </div>
        ) : (
          emails?.map((email) => (
            <div key={email.id} className="border-b border-gray-100 hover:bg-gray-50">
              <div className="flex items-start p-4">
                <div className="flex-shrink-0 mr-4">
                  <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-800 font-medium">
                    {email.senderInitials}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between">
                    <p className={cn("text-sm font-medium", email.isRead ? "text-neutral-500" : "text-neutral-800")}>
                      {email.from}
                    </p>
                    <p className="text-sm text-neutral-500">{formatTime(email.receivedAt)}</p>
                  </div>
                  <p className={cn("text-sm font-medium", email.isRead ? "text-neutral-500" : "text-neutral-800")}>
                    {email.subject}
                  </p>
                  <p className="mt-1 text-sm text-neutral-600 line-clamp-2">
                    {email.snippet}
                  </p>
                  {email.isPriority && (
                    <div className="mt-2">
                      <Badge variant="outline" className="bg-indigo-100 text-indigo-800 border-indigo-200">
                        Priority
                      </Badge>
                    </div>
                  )}
                </div>
                <div className="ml-4 flex-shrink-0 flex">
                  <Link href={`/inbox/${email.id}/reply`}>
                    <a className="p-1 text-gray-400 hover:text-gray-600" title="AI Reply">
                      <MessageSquare className="h-5 w-5" />
                    </a>
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      <CardFooter className="px-6 py-4 bg-gray-50 text-center">
        <p className="text-sm text-neutral-500 w-full">
          {!isLoading && !isError && emails?.length 
            ? `You have ${Math.max(0, 12 - (emails?.length || 0))} more unread emails` 
            : "Check your inbox for more emails"}
        </p>
      </CardFooter>
    </Card>
  );
}
