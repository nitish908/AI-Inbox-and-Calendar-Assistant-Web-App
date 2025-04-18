import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getDailyBrief } from "@/lib/openai";

export default function DailyBrief() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const { data: briefData, isLoading, isError } = useQuery({
    queryKey: ['/api/dailybrief'],
    queryFn: getDailyBrief,
  });

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await queryClient.invalidateQueries({ queryKey: ['/api/dailybrief'] });
      toast({
        title: "Daily brief refreshed",
        description: "Your AI-powered brief has been updated.",
      });
    } catch (error) {
      toast({
        title: "Failed to refresh",
        description: "There was an error refreshing your daily brief.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Card className="bg-white rounded-lg shadow-sm overflow-hidden">
      <CardHeader className="border-b border-gray-200 px-6 py-4 bg-gray-50">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-neutral-800">Your Daily Brief</h3>
          <div className="flex space-x-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              <Info className="h-3 w-3 mr-1" />
              AI Generated
            </span>
            <button 
              className={`text-neutral-500 hover:text-neutral-700 ${isRefreshing ? 'animate-spin' : ''}`}
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              aria-label="Refresh daily brief"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-5 w-3/4" />
            <div className="mt-4 pt-4 space-y-2">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-5 w-3/4" />
            </div>
          </div>
        ) : isError ? (
          <div className="text-center py-4">
            <p className="text-neutral-600">Unable to load your daily brief. Please try refreshing.</p>
            <button 
              className="mt-2 text-primary hover:text-primary-dark"
              onClick={handleRefresh}
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="prose max-w-none">
            <h4 className="font-medium text-neutral-800">Summary</h4>
            <p className="text-neutral-600 leading-relaxed">
              {briefData?.text || "No summary available."}
            </p>
            
            <h4 className="font-medium text-neutral-800 mt-4">Today's Priorities</h4>
            {briefData?.priorities?.length ? (
              <ul className="text-neutral-600 leading-relaxed">
                {briefData.priorities.map((priority, index) => (
                  <li key={index}>{priority}</li>
                ))}
              </ul>
            ) : (
              <p className="text-neutral-600">No priorities for today.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
