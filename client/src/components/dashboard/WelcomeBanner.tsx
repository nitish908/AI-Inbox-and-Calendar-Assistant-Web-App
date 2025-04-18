import { useState } from "react";
import { X } from "lucide-react";
import { Card } from "@/components/ui/card";

interface WelcomeBannerProps {
  userName: string;
  greeting?: string;
}

export default function WelcomeBanner({ userName, greeting }: WelcomeBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return null;
  }

  // Generate appropriate greeting based on time of day
  const getGreeting = () => {
    if (greeting) return greeting;
    
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <Card className="bg-white rounded-lg shadow-sm p-6 mb-8">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-semibold text-neutral-800">{`${getGreeting()}, ${userName}!`}</h2>
          <p className="mt-1 text-neutral-500">Here's your AI-powered overview for today.</p>
        </div>
        <div className="flex space-x-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            New
          </span>
          <button 
            className="text-gray-400 hover:text-gray-500" 
            onClick={() => setDismissed(true)}
            aria-label="Dismiss welcome banner"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </Card>
  );
}
