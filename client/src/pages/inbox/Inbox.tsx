import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { checkAuth } from "@/lib/auth";
import { getEmailSummaries } from "@/lib/emailService";

import Sidebar from "@/components/layout/Sidebar";
import MobileHeader from "@/components/layout/MobileHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Search, Star, Inbox as InboxIcon, Mail, FileText, AlertCircle } from "lucide-react";

export default function Inbox() {
  const [, navigate] = useLocation();
  
  const { data: authData, isLoading: authLoading } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: checkAuth,
  });

  const { data: emails, isLoading: emailsLoading } = useQuery({
    queryKey: ['/api/emails', 'all'],
    queryFn: () => getEmailSummaries(20),
    enabled: !!authData?.isAuthenticated,
  });

  const { data: connectedServices = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['/api/connections'],
    queryFn: async () => {
      const response = await fetch('/api/connections');
      if (!response.ok) throw new Error('Failed to fetch connected services');
      const data = await response.json();
      return data.connections.map((conn: any) => conn.service);
    },
    enabled: !!authData?.isAuthenticated,
  });

  useEffect(() => {
    if (!authLoading && !authData?.isAuthenticated) {
      navigate('/login');
    }
  }, [authLoading, authData, navigate]);

  if (authLoading || !authData?.isAuthenticated) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  const user = {
    name: authData.user?.displayName || authData.user?.username || 'User',
    email: authData.user?.email || '',
    profileImage: authData.user?.profileImage,
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={user} />
      <MobileHeader user={user} connectedServices={connectedServices} />
      
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        <div className="flex-1 p-4 md:p-8 pt-16 md:pt-8">
          <div className="max-w-7xl mx-auto">
            <Card className="bg-white shadow-sm">
              <CardHeader className="border-b border-gray-200 p-4 bg-gray-50">
                <div className="flex justify-between items-center">
                  <h1 className="text-xl font-semibold text-neutral-800">Inbox</h1>
                  <div className="flex space-x-2">
                    <div className="relative w-64">
                      <Input 
                        placeholder="Search emails..." 
                        className="pl-10"
                      />
                      <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                    </div>
                    <Button size="sm">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Compose
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Tabs defaultValue="inbox" className="w-full">
                  <div className="border-b">
                    <TabsList className="mx-4 mt-2">
                      <TabsTrigger value="inbox" className="flex items-center">
                        <InboxIcon className="h-4 w-4 mr-2" />
                        Inbox
                        <Badge className="ml-2 bg-primary text-white">12</Badge>
                      </TabsTrigger>
                      <TabsTrigger value="important" className="flex items-center">
                        <Star className="h-4 w-4 mr-2" />
                        Important
                      </TabsTrigger>
                      <TabsTrigger value="sent" className="flex items-center">
                        <Mail className="h-4 w-4 mr-2" />
                        Sent
                      </TabsTrigger>
                      <TabsTrigger value="drafts" className="flex items-center">
                        <FileText className="h-4 w-4 mr-2" />
                        Drafts
                      </TabsTrigger>
                    </TabsList>
                  </div>
                  
                  <TabsContent value="inbox" className="p-0 mt-0">
                    {emailsLoading ? (
                      <div className="divide-y divide-gray-100">
                        {[1, 2, 3, 4, 5].map((i) => (
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
                    ) : emails?.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16">
                        <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-lg font-medium text-gray-900">Your inbox is empty</p>
                        <p className="text-gray-500 mt-1">No emails to display.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {emails?.map((email) => (
                          <div 
                            key={email.id} 
                            className="p-4 hover:bg-gray-50 cursor-pointer"
                            onClick={() => navigate(`/inbox/${email.id}`)}
                          >
                            <div className="flex items-start">
                              <div className="flex-shrink-0 mr-4">
                                <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-800 font-medium">
                                  {email.senderInitials}
                                </div>
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex justify-between">
                                  <p className={`text-sm font-medium ${email.isRead ? 'text-neutral-500' : 'text-neutral-800'}`}>
                                    {email.from}
                                  </p>
                                  <p className="text-sm text-neutral-500">{email.receivedAt}</p>
                                </div>
                                <p className={`text-sm font-medium ${email.isRead ? 'text-neutral-500' : 'text-neutral-800'}`}>
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
                              <div className="ml-4 flex-shrink-0 flex items-center">
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/inbox/${email.id}/reply`);
                                }}>
                                  <MessageSquare className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="important" className="p-0 mt-0">
                    <div className="flex flex-col items-center justify-center py-16">
                      <Star className="h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-lg font-medium text-gray-900">No important emails</p>
                      <p className="text-gray-500 mt-1">Priority emails will appear here.</p>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="sent" className="p-0 mt-0">
                    <div className="flex flex-col items-center justify-center py-16">
                      <Mail className="h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-lg font-medium text-gray-900">No sent emails</p>
                      <p className="text-gray-500 mt-1">Emails you send will appear here.</p>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="drafts" className="p-0 mt-0">
                    <div className="flex flex-col items-center justify-center py-16">
                      <FileText className="h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-lg font-medium text-gray-900">No drafts</p>
                      <p className="text-gray-500 mt-1">Saved drafts will appear here.</p>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
