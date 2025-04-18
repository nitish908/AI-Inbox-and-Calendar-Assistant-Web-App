import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { checkAuth } from "@/lib/auth";
import { getCalendarEvents } from "@/lib/calendarService";

import Sidebar from "@/components/layout/Sidebar";
import MobileHeader from "@/components/layout/MobileHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isToday, isSameDay, parseISO } from "date-fns";

export default function Calendar() {
  const [, navigate] = useLocation();
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const { data: authData, isLoading: authLoading } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: checkAuth,
  });

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['/api/calendar/events', format(selectedDate, 'yyyy-MM-dd')],
    queryFn: () => getCalendarEvents(format(selectedDate, 'yyyy-MM-dd')),
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

  // Calculate week days
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const previousWeek = () => {
    setSelectedDate(addDays(selectedDate, -7));
  };

  const nextWeek = () => {
    setSelectedDate(addDays(selectedDate, 7));
  };

  const goToToday = () => {
    setSelectedDate(new Date());
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
                  <div className="flex items-center">
                    <CalendarIcon className="h-6 w-6 text-primary mr-2" />
                    <h1 className="text-xl font-semibold text-neutral-800">Calendar</h1>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={previousWeek}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={goToToday}>
                      Today
                    </Button>
                    <Button variant="outline" size="sm" onClick={nextWeek}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button size="sm" onClick={() => navigate('/calendar/new')}>
                      <Plus className="h-4 w-4 mr-2" />
                      New Event
                    </Button>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-7 gap-2 text-center">
                  {weekDays.map((day, i) => (
                    <div 
                      key={i} 
                      className={`py-2 cursor-pointer rounded ${
                        isToday(day) ? 'bg-primary text-white' : 'hover:bg-gray-100'
                      }`}
                      onClick={() => setSelectedDate(day)}
                    >
                      <div className="text-xs font-medium">{format(day, 'EEE')}</div>
                      <div className={`text-lg ${isToday(day) ? 'font-bold' : 'font-medium'}`}>
                        {format(day, 'd')}
                      </div>
                    </div>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <h2 className="text-lg font-medium mb-4">
                  {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </h2>
                
                {eventsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="border rounded-md p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <Skeleton className="h-5 w-48" />
                            <div className="flex items-center mt-2">
                              <Skeleton className="h-4 w-24" />
                            </div>
                          </div>
                          <Skeleton className="h-6 w-20" />
                        </div>
                        <Skeleton className="h-4 w-3/4 mt-2" />
                      </div>
                    ))}
                  </div>
                ) : events?.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-md">
                    <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">No events for this day</h3>
                    <p className="text-gray-500 mt-1">Create a new event or select another date.</p>
                    <Button className="mt-4" onClick={() => navigate('/calendar/new')}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Event
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {events?.map((event) => (
                      <div 
                        key={event.id} 
                        className="border rounded-md p-4 hover:bg-gray-50 cursor-pointer"
                        onClick={() => navigate(`/calendar/${event.id}`)}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium text-lg">{event.title}</h3>
                            <div className="flex items-center mt-1 text-sm text-gray-500">
                              <span>{event.startTime} - {event.endTime}</span>
                              {event.location && (
                                <span className="ml-3 flex items-center">
                                  • {event.location}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            {event.tags?.map((tag, i) => (
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
                        </div>
                        {event.description && (
                          <p className="mt-2 text-sm text-gray-600 line-clamp-2">{event.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
