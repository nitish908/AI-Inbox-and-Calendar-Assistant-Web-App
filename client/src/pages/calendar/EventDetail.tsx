import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { checkAuth } from "@/lib/auth";
import { 
  getCalendarEventById,
  updateCalendarEvent,
  deleteCalendarEvent
} from "@/lib/calendarService";

import Sidebar from "@/components/layout/Sidebar";
import MobileHeader from "@/components/layout/MobileHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, MapPin, Edit, Trash2, ArrowLeft } from "lucide-react";
import { format } from "date-fns";

// Form schema for event editing
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

export default function EventDetail() {
  const { id } = useParams();
  const eventId = parseInt(id || '0');
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
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

  // Get event details
  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ['/api/calendar/events', eventId],
    queryFn: () => getCalendarEventById(eventId),
    enabled: !!authData?.isAuthenticated && !!eventId,
  });

  // Set up form with event data
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      startTime: "",
      endTime: "",
      isAllDay: false,
      tags: [],
    },
  });

  // Populate form with event data when it's loaded
  useEffect(() => {
    if (event) {
      form.reset({
        title: event.title,
        description: event.description || "",
        location: event.location || "",
        startTime: event.startTime,
        endTime: event.endTime,
        isAllDay: event.isAllDay,
        tags: event.tags || [],
      });
    }
  }, [event, form]);

  // Update form behavior when "All Day" is toggled
  const handleAllDayChange = (isAllDay: boolean) => {
    const startValue = form.getValues('startTime');
    const endValue = form.getValues('endTime');
    
    if (isAllDay) {
      // If switching to all-day, keep just the date part
      form.setValue('startTime', startValue.split('T')[0] + 'T00:00');
      form.setValue('endTime', endValue.split('T')[0] + 'T23:59');
    }
  };

  // Mutation for updating an event
  const updateEventMutation = useMutation({
    mutationFn: async (data: EventFormValues) => {
      const eventData = {
        ...data,
        id: eventId,
        // Format dates as expected by the server
        startTime: data.isAllDay 
          ? `${data.startTime.split('T')[0]}T00:00:00.000Z` 
          : new Date(data.startTime).toISOString(),
        endTime: data.isAllDay 
          ? `${data.endTime.split('T')[0]}T23:59:59.999Z` 
          : new Date(data.endTime).toISOString(),
      };
      return await updateCalendarEvent(eventData);
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/events', eventId] });
      toast({
        title: "Event updated",
        description: "Your calendar event has been updated successfully.",
      });
      setIsEditing(false);
    },
    onError: (error) => {
      console.error("Failed to update event:", error);
      toast({
        title: "Error",
        description: "Failed to update event. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Mutation for deleting an event
  const deleteEventMutation = useMutation({
    mutationFn: async () => {
      return await deleteCalendarEvent(eventId);
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/events'] });
      toast({
        title: "Event deleted",
        description: "Your calendar event has been deleted successfully.",
      });
      // Navigate back to calendar
      navigate('/calendar');
    },
    onError: (error) => {
      console.error("Failed to delete event:", error);
      toast({
        title: "Error",
        description: "Failed to delete event. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Handle form submission for updates
  const onSubmit = (data: EventFormValues) => {
    updateEventMutation.mutate(data);
  };

  // Handle event deletion
  const handleDelete = () => {
    deleteEventMutation.mutate();
    setDeleteDialogOpen(false);
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !authData?.isAuthenticated) {
      navigate('/login');
    }
  }, [authLoading, authData, navigate]);

  // If authentication is still loading, show nothing
  if (authLoading) {
    return null;
  }

  const user = authData?.user || { name: '', email: '', profileImage: '' };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={user} />
      <MobileHeader user={user} connectedServices={connectedServices || []} />
      
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        <div className="flex-1 p-4 md:p-8 pt-16 md:pt-8">
          <div className="max-w-3xl mx-auto">
            <div className="mb-6 flex items-center">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/calendar')}
                className="mr-2"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Calendar
              </Button>
            </div>
            
            {eventLoading ? (
              <Card className="bg-white shadow-sm animate-pulse">
                <CardHeader>
                  <div className="h-7 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    <div className="h-4 bg-gray-200 rounded w-4/6"></div>
                  </div>
                </CardContent>
              </Card>
            ) : isEditing ? (
              <Card className="bg-white shadow-sm">
                <CardHeader>
                  <CardTitle>Edit Event</CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                              <Input placeholder="Event Title" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="startTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Start Time</FormLabel>
                              <FormControl>
                                <Input type="datetime-local" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="endTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>End Time</FormLabel>
                              <FormControl>
                                <Input type="datetime-local" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Add details about this event"
                                className="resize-none h-32"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

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

                      <div className="flex justify-end space-x-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsEditing(false)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={updateEventMutation.isPending}
                        >
                          {updateEventMutation.isPending ? "Saving..." : "Save Changes"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            ) : event ? (
              <Card className="bg-white shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-2xl">{event.title}</CardTitle>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setIsEditing(true)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="destructive" 
                            size="sm"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Delete Event</DialogTitle>
                            <DialogDescription>
                              Are you sure you want to delete this event? This action cannot be undone.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <Button 
                              variant="outline" 
                              onClick={() => setDeleteDialogOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button 
                              variant="destructive" 
                              onClick={handleDelete}
                              disabled={deleteEventMutation.isPending}
                            >
                              {deleteEventMutation.isPending ? "Deleting..." : "Delete Event"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="h-4 w-4 mr-2" />
                      <span>
                        {event.isAllDay 
                          ? 'All day' 
                          : `${event.startTime} - ${event.endTime}`}
                      </span>
                    </div>
                    
                    {event.location && (
                      <div className="flex items-center text-sm text-gray-500">
                        <MapPin className="h-4 w-4 mr-2" />
                        <span>{event.location}</span>
                      </div>
                    )}
                    
                    {event.tags && event.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {event.tags.map((tag, i) => (
                          <Badge key={i} variant="outline" className={
                            tag.toLowerCase() === 'team' 
                              ? 'bg-blue-100 text-blue-800 border-blue-200'
                              : tag.toLowerCase() === 'external'
                                ? 'bg-green-100 text-green-800 border-green-200'
                                : 'bg-gray-100 text-gray-800 border-gray-200'
                          }>
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    {event.description && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <h3 className="text-sm font-medium mb-2">Description</h3>
                        <p className="text-gray-600 whitespace-pre-line">{event.description}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-white shadow-sm">
                <CardContent className="p-8 text-center">
                  <p className="text-gray-500">Event not found</p>
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/calendar')}
                    className="mt-4"
                  >
                    Back to Calendar
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}