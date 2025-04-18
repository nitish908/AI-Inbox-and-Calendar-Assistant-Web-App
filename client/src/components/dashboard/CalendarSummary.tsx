import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { getTodayEvents, getFreeTimeBlocks } from "@/lib/calendarService";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function CalendarSummary() {
  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['/api/calendar/events'],
    queryFn: getTodayEvents,
  });

  const { data: freeTimeBlocks, isLoading: freeTimeLoading } = useQuery({
    queryKey: ['/api/calendar/freetime'],
    queryFn: () => getFreeTimeBlocks(new Date().toISOString().split('T')[0]),
  });

  const isLoading = eventsLoading || freeTimeLoading;

  const today = format(new Date(), 'EEEE, MMMM d');

  return (
    <Card className="bg-white rounded-lg shadow-sm overflow-hidden">
      <CardHeader className="border-b border-gray-200 px-6 py-4 bg-gray-50 flex flex-row items-center justify-between">
        <h3 className="text-lg font-medium text-neutral-800">Today's Schedule</h3>
        <Link href="/calendar">
          <a className="text-primary text-sm font-medium">View Calendar</a>
        </Link>
      </CardHeader>
      <CardContent className="p-4">
        <div className="text-center mb-4">
          <h4 className="font-medium text-neutral-800">{today}</h4>
        </div>
        
        {isLoading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="relative pl-6">
                <div className="absolute left-0 top-1 h-full">
                  <div className="h-full w-0.5 bg-gray-200"></div>
                </div>
                <div className="absolute left-0 top-1 -ml-px">
                  <div className="h-3 w-3 rounded-full bg-primary border-2 border-white"></div>
                </div>
                <div className="bg-gray-50 rounded-md p-3">
                  <div className="flex justify-between">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-5 w-28" />
                  </div>
                  <Skeleton className="h-4 w-32 mt-1" />
                  <div className="mt-2">
                    <Skeleton className="h-5 w-16 rounded-md" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            {events?.length === 0 && freeTimeBlocks?.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-neutral-600">No events scheduled for today.</p>
                <Link href="/calendar/new">
                  <a className="text-primary text-sm font-medium mt-2 inline-block">Schedule an event</a>
                </Link>
              </div>
            ) : (
              <div>
                {events?.map((event, index) => (
                  <div key={event.id} className={`relative pl-6 ${index < events.length - 1 ? 'pb-5' : ''}`}>
                    <div className="absolute left-0 top-1 h-full">
                      <div className="h-full w-0.5 bg-gray-200"></div>
                    </div>
                    <div className="absolute left-0 top-1 -ml-px">
                      <div className="h-3 w-3 rounded-full bg-primary border-2 border-white"></div>
                    </div>
                    <div className="bg-gray-50 rounded-md p-3">
                      <div className="flex justify-between">
                        <p className="text-sm font-medium text-neutral-800">{event.title}</p>
                        <p className="text-xs font-medium text-neutral-500">{event.startTime} - {event.endTime}</p>
                      </div>
                      <p className="mt-1 text-sm text-neutral-600">{event.location || 'No location'}</p>
                      <div className="mt-2 flex space-x-2">
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
                  </div>
                ))}
                
                {freeTimeBlocks?.map((freeTime, index) => (
                  <div key={index} className="relative pl-6">
                    <div className="absolute left-0 top-1 h-full">
                      <div className="h-full w-0.5 bg-gray-200"></div>
                    </div>
                    <div className="absolute left-0 top-1 -ml-px">
                      <div className="h-3 w-3 rounded-full bg-gray-300 border-2 border-white"></div>
                    </div>
                    <div className="rounded-md p-3 border border-dashed border-gray-300 bg-white">
                      <div className="flex justify-between">
                        <p className="text-sm font-medium text-neutral-500">{freeTime.description}</p>
                        <p className="text-xs font-medium text-neutral-500">{freeTime.startTime} - {freeTime.endTime}</p>
                      </div>
                      <p className="mt-1 text-sm text-neutral-500 italic">AI suggestion: Use this time for focused work</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
