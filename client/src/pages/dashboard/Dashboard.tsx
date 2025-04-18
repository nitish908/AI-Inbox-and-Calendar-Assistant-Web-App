import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { checkAuth } from "@/lib/auth";

import Sidebar from "@/components/layout/Sidebar";
import MobileHeader from "@/components/layout/MobileHeader";
import WelcomeBanner from "@/components/dashboard/WelcomeBanner";
import DailyBrief from "@/components/dashboard/DailyBrief";
import EmailSummary from "@/components/dashboard/EmailSummary";
import CalendarSummary from "@/components/dashboard/CalendarSummary";
import SmartReplies from "@/components/dashboard/SmartReplies";
import AISettings from "@/components/dashboard/AISettings";

export default function Dashboard() {
  const [, navigate] = useLocation();
  
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

  const preferences = userPreferences || {
    replyTone: 'professional',
    autoSuggestReplies: true,
    dailyBriefing: true,
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={user} />
      <MobileHeader user={user} connectedServices={connectedServices} />
      
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        <div className="flex-1 p-4 md:p-8 pt-16 md:pt-8">
          <div className="max-w-7xl mx-auto">
            <WelcomeBanner userName={user.name} />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <DailyBrief />
                <EmailSummary />
              </div>
              
              <div className="space-y-6">
                <CalendarSummary />
                <SmartReplies />
                <AISettings preferences={preferences} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
