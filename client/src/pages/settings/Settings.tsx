import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { checkAuth, initiateOAuth } from "@/lib/auth";

import Sidebar from "@/components/layout/Sidebar";
import MobileHeader from "@/components/layout/MobileHeader";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { FaGoogle, FaMicrosoft } from "react-icons/fa";
import { Cog, Lock, BellRing, User as UserIcon, Trash2 } from "lucide-react";

export default function Settings() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const { data: authData, isLoading: authLoading } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: checkAuth,
  });

  const { data: userPreferences, isLoading: preferencesLoading } = useQuery({
    queryKey: ['/api/user/preferences'],
    queryFn: async () => {
      const response = await fetch('/api/user/preferences');
      if (!response.ok) throw new Error('Failed to fetch user preferences');
      return response.json();
    },
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

  const updatePreferencesMutation = useMutation({
    mutationFn: async (newPreferences: any) => {
      const response = await fetch('/api/user/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPreferences),
      });
      if (!response.ok) throw new Error('Failed to update preferences');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings updated",
        description: "Your preferences have been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to update settings.",
        variant: "destructive",
      });
    },
  });

  const [formValues, setFormValues] = useState({
    replyTone: 'professional',
    autoSuggestReplies: true,
    dailyBriefing: true,
    emailNotifications: true,
    pushNotifications: true,
  });

  useEffect(() => {
    if (userPreferences) {
      setFormValues({
        ...formValues,
        ...userPreferences,
      });
    }
  }, [userPreferences]);

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

  const handleInputChange = (name: string, value: any) => {
    setFormValues({
      ...formValues,
      [name]: value,
    });
  };

  const handleSavePreferences = () => {
    updatePreferencesMutation.mutate(formValues);
  };

  const handleConnectService = (service: string) => {
    initiateOAuth(service);
  };

  const handleDisconnectService = async (service: string) => {
    try {
      const response = await fetch(`/api/connections/${service}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to disconnect service');
      }
      
      toast({
        title: "Service disconnected",
        description: `${service} has been disconnected.`,
      });
      
      // Refresh the connections list
      window.location.reload();
    } catch (error) {
      toast({
        title: "Disconnection failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={user} />
      <MobileHeader user={user} connectedServices={connectedServices} />
      
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        <div className="flex-1 p-4 md:p-8 pt-16 md:pt-8">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-bold">Settings</h1>
              <p className="text-gray-600">Manage your account and preferences</p>
            </div>
            
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="mb-6 border-b pb-px w-full justify-start">
                <TabsTrigger value="general" className="flex items-center">
                  <Cog className="h-4 w-4 mr-2" />
                  General
                </TabsTrigger>
                <TabsTrigger value="profile" className="flex items-center">
                  <UserIcon className="h-4 w-4 mr-2" />
                  Profile
                </TabsTrigger>
                <TabsTrigger value="connections" className="flex items-center">
                  <Lock className="h-4 w-4 mr-2" />
                  Connections
                </TabsTrigger>
                <TabsTrigger value="notifications" className="flex items-center">
                  <BellRing className="h-4 w-4 mr-2" />
                  Notifications
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="general">
                <Card>
                  <CardHeader>
                    <h2 className="text-xl font-semibold">AI Assistant Settings</h2>
                    <CardDescription>
                      Control how the AI assistant behaves and communicates
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {preferencesLoading ? (
                      <div className="space-y-6">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-5 w-full" />
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="reply-tone">Reply Tone</Label>
                          <Select 
                            value={formValues.replyTone} 
                            onValueChange={(value) => handleInputChange('replyTone', value)}
                          >
                            <SelectTrigger id="reply-tone">
                              <SelectValue placeholder="Select a tone" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="professional">Professional</SelectItem>
                              <SelectItem value="friendly">Friendly</SelectItem>
                              <SelectItem value="concise">Concise</SelectItem>
                              <SelectItem value="formal">Formal</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-sm text-gray-500">
                            This sets the tone for all AI-generated replies.
                          </p>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="auto-suggest">Auto-suggest replies</Label>
                            <p className="text-sm text-gray-500">
                              Let AI suggest replies to your emails
                            </p>
                          </div>
                          <Switch 
                            id="auto-suggest" 
                            checked={formValues.autoSuggestReplies}
                            onCheckedChange={(checked) => handleInputChange('autoSuggestReplies', checked)}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="daily-briefing">Daily briefing</Label>
                            <p className="text-sm text-gray-500">
                              Receive an AI-generated summary of your day
                            </p>
                          </div>
                          <Switch 
                            id="daily-briefing" 
                            checked={formValues.dailyBriefing}
                            onCheckedChange={(checked) => handleInputChange('dailyBriefing', checked)}
                          />
                        </div>

                        <Button 
                          onClick={handleSavePreferences} 
                          disabled={updatePreferencesMutation.isPending}
                        >
                          {updatePreferencesMutation.isPending ? "Saving..." : "Save Changes"}
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="profile">
                <Card>
                  <CardHeader>
                    <h2 className="text-xl font-semibold">Profile Information</h2>
                    <CardDescription>
                      Update your personal information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="display-name">Display Name</Label>
                      <Input 
                        id="display-name" 
                        defaultValue={user.name} 
                        placeholder="Your display name"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input 
                        id="email" 
                        defaultValue={user.email} 
                        placeholder="Your email address"
                        disabled
                      />
                      <p className="text-sm text-gray-500">
                        Your email address cannot be changed.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input 
                        id="password" 
                        type="password" 
                        placeholder="••••••••"
                      />
                    </div>
                    
                    <Button>Save Profile</Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="connections">
                <Card>
                  <CardHeader>
                    <h2 className="text-xl font-semibold">Connected Services</h2>
                    <CardDescription>
                      Manage email and calendar integrations
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {servicesLoading ? (
                      <div className="space-y-4">
                        <Skeleton className="h-16 w-full rounded-md" />
                        <Skeleton className="h-16 w-full rounded-md" />
                      </div>
                    ) : (
                      <>
                        <div className="space-y-4">
                          <div className="border rounded-md p-4">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center space-x-4">
                                <FaGoogle className="h-6 w-6 text-red-500" />
                                <div>
                                  <h3 className="font-medium">Google</h3>
                                  <p className="text-sm text-gray-500">Gmail and Google Calendar</p>
                                </div>
                              </div>
                              
                              {connectedServices.includes('gmail') || connectedServices.includes('google_calendar') ? (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleDisconnectService('google')}
                                >
                                  <Trash2 className="h-4 w-4 mr-2 text-red-500" />
                                  Disconnect
                                </Button>
                              ) : (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleConnectService('google')}
                                >
                                  Connect
                                </Button>
                              )}
                            </div>
                          </div>
                          
                          <div className="border rounded-md p-4">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center space-x-4">
                                <FaMicrosoft className="h-6 w-6 text-blue-500" />
                                <div>
                                  <h3 className="font-medium">Microsoft</h3>
                                  <p className="text-sm text-gray-500">Outlook and Microsoft Calendar</p>
                                </div>
                              </div>
                              
                              {connectedServices.includes('outlook') ? (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleDisconnectService('microsoft')}
                                >
                                  <Trash2 className="h-4 w-4 mr-2 text-red-500" />
                                  Disconnect
                                </Button>
                              ) : (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleConnectService('microsoft')}
                                >
                                  Connect
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-gray-50 rounded-md p-4">
                          <p className="text-sm text-gray-600">
                            Connect your email and calendar services to enable the AI assistant to provide personalized recommendations and manage your schedule.
                          </p>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notifications">
                <Card>
                  <CardHeader>
                    <h2 className="text-xl font-semibold">Notification Settings</h2>
                    <CardDescription>
                      Control how and when you receive notifications
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="email-notifications">Email notifications</Label>
                        <p className="text-sm text-gray-500">
                          Receive notifications via email
                        </p>
                      </div>
                      <Switch 
                        id="email-notifications" 
                        checked={formValues.emailNotifications}
                        onCheckedChange={(checked) => handleInputChange('emailNotifications', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="push-notifications">Push notifications</Label>
                        <p className="text-sm text-gray-500">
                          Receive browser push notifications
                        </p>
                      </div>
                      <Switch 
                        id="push-notifications" 
                        checked={formValues.pushNotifications}
                        onCheckedChange={(checked) => handleInputChange('pushNotifications', checked)}
                      />
                    </div>
                    
                    <Button 
                      onClick={handleSavePreferences}
                      disabled={updatePreferencesMutation.isPending}
                    >
                      {updatePreferencesMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}
