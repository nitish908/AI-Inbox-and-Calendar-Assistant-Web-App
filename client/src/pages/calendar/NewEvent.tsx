import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { checkAuth } from "@/lib/auth";
import { createCalendarEvent } from "@/lib/calendarService";
import { apiRequest } from "@/lib/queryClient";

import Sidebar from "@/components/layout/Sidebar";
import MobileHeader from "@/components/layout/MobileHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

// Form schema for event creation
const eventSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters" }),
  description: z.string().optional(),
  location: z.string().optional(),
  startTime: z.string().min(5, { message: "Start time is required" }),
  endTime: z.string().min(5, { message: "End time is required" }),
  isAllDay: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
});

type EventFormValues = z.infer<typeof eventSchema>;

export default function NewEvent() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get current date
  const currentDate = format(new Date(), "yyyy-MM-dd");
  
  // Set up form with default values
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      startTime: `${currentDate}T09:00`,
      endTime: `${currentDate}T10:00`,
      isAllDay: false,
      tags: [],
    },
  });

  // Authentication check
  const { data: authData, isLoading: authLoading } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: checkAuth,
  });

  // Connected services query
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

  // Mutation for creating an event
  const createEventMutation = useMutation({
    mutationFn: async (data: EventFormValues) => {
      const eventData = {
        ...data,
        // Format dates as expected by the server
        startTime: data.isAllDay 
          ? `${data.startTime.split('T')[0]}T00:00:00.000Z` 
          : new Date(data.startTime).toISOString(),
        endTime: data.isAllDay 
          ? `${data.endTime.split('T')[0]}T23:59:59.999Z` 
          : new Date(data.endTime).toISOString(),
      };
      return await apiRequest('POST', '/api/calendar/events', eventData);
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/events'] });
      toast({
        title: "Event created",
        description: "Your calendar event has been created successfully.",
      });
      // Navigate back to calendar
      navigate('/calendar');
    },
    onError: (error) => {
      console.error("Failed to create event:", error);
      toast({
        title: "Error",
        description: "Failed to create event. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Handle form submission
  const onSubmit = (data: EventFormValues) => {
    createEventMutation.mutate(data);
  };

  // Redirect if not authenticated
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

  // Handle when all-day is toggled
  const handleAllDayChange = (checked: boolean) => {
    if (checked) {
      // Only keep the date part for all-day events
      const startDate = form.getValues('startTime').split('T')[0];
      const endDate = form.getValues('endTime').split('T')[0];
      form.setValue('startTime', `${startDate}T00:00`);
      form.setValue('endTime', `${endDate}T23:59`);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={user} />
      <MobileHeader user={user} connectedServices={connectedServices} />
      
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        <div className="flex-1 p-4 md:p-8 pt-16 md:pt-8">
          <div className="max-w-3xl mx-auto">
            <Card className="bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-2xl">Create New Event</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Event Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Team Meeting" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
                      <FormField
                        control={form.control}
                        name="startTime"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel>Start Time</FormLabel>
                            <FormControl>
                              <Input 
                                type="datetime-local" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="endTime"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel>End Time</FormLabel>
                            <FormControl>
                              <Input 
                                type="datetime-local" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="isAllDay"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>All Day Event</FormLabel>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={(checked) => {
                                field.onChange(checked);
                                handleAllDayChange(checked);
                              }}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location</FormLabel>
                          <FormControl>
                            <Input placeholder="Conference Room / Zoom Link" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Event details and agenda..." 
                              className="min-h-32" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="tags"
                      render={() => (
                        <FormItem>
                          <FormLabel>Tags</FormLabel>
                          <div className="flex flex-wrap gap-4 mt-2">
                            {["Team", "External", "Personal"].map((tag) => (
                              <div key={tag} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`tag-${tag}`}
                                  checked={form.watch("tags").includes(tag)}
                                  onCheckedChange={(checked) => {
                                    const current = form.getValues("tags");
                                    if (checked) {
                                      form.setValue("tags", [...current, tag]);
                                    } else {
                                      form.setValue(
                                        "tags",
                                        current.filter((t) => t !== tag)
                                      );
                                    }
                                  }}
                                />
                                <label
                                  htmlFor={`tag-${tag}`}
                                  className="text-sm cursor-pointer"
                                >
                                  {tag}
                                </label>
                              </div>
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end space-x-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => navigate('/calendar')}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createEventMutation.isPending}
                      >
                        {createEventMutation.isPending ? "Creating..." : "Create Event"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}