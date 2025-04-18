import { Link, useLocation } from "wouter";
import { Heading6, RectangleEllipsis, HomeIcon, CalendarIcon, CircleHelp, PlusIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getConnectedServices } from "@/lib/auth";

interface SidebarProps {
  user: {
    name: string;
    email: string;
    profileImage?: string;
  };
}

export default function Sidebar({ user }: SidebarProps) {
  const [location] = useLocation();

  const { data: connectedServices = [] } = useQuery({
    queryKey: ['/api/connections'],
    queryFn: () => getConnectedServices(),
  });

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 h-screen">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
            <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
          </svg>
          <h1 className="font-semibold text-xl text-neutral-800">AI Assistant</h1>
        </div>
      </div>

      {/* Fix nested anchor issue by using div instead of nav wrapper */}
<div className="flex-1 overflow-y-auto p-4 space-y-1">
        <nav>
          <Link href="/">
            <a className={`flex items-center px-3 py-2 rounded-md ${location === '/' ? 'bg-primary bg-opacity-10 text-primary' : 'text-neutral-500 hover:bg-gray-100'}`}>
              <HomeIcon className="h-5 w-5 mr-3" />
              Dashboard
            </a>
          </Link>

        <Link href="/inbox">
          <a className={`flex items-center px-3 py-2 rounded-md ${location === '/inbox' ? 'bg-primary bg-opacity-10 text-primary' : 'text-neutral-500 hover:bg-gray-100'}`}>
            <RectangleEllipsis className="h-5 w-5 mr-3" />
            Inbox
          </a>
        </Link>

        <Link href="/calendar">
          <a className={`flex items-center px-3 py-2 rounded-md ${location === '/calendar' ? 'bg-primary bg-opacity-10 text-primary' : 'text-neutral-500 hover:bg-gray-100'}`}>
            <CalendarIcon className="h-5 w-5 mr-3" />
            Calendar
          </a>
        </Link>

        <Link href="/help">
          <a className={`flex items-center px-3 py-2 rounded-md ${location === '/help' ? 'bg-primary bg-opacity-10 text-primary' : 'text-neutral-500 hover:bg-gray-100'}`}>
            <CircleHelp className="h-5 w-5 mr-3" />
            Help & Support
          </a>
        </Link>

        <div className="pt-4 mt-4 border-t border-gray-200">
          <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Connected Services
          </h3>
          <div className="mt-2 space-y-1">
            {connectedServices.includes('gmail') && (
              <div className="flex items-center px-3 py-2">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                <span className="text-sm text-neutral-500">Gmail</span>
              </div>
            )}

            {connectedServices.includes('google_calendar') && (
              <div className="flex items-center px-3 py-2">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                <span className="text-sm text-neutral-500">Google Calendar</span>
              </div>
            )}

            {connectedServices.includes('outlook') && (
              <div className="flex items-center px-3 py-2">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                <span className="text-sm text-neutral-500">Outlook</span>
              </div>
            )}

            <button 
              onClick={() => window.location.href = '/settings'}
              className="flex items-center px-3 py-2 text-sm text-primary"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Connect More
            </button>
          </div>
        </div>
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center">
          {user.profileImage ? (
            <img src={user.profileImage} alt="User profile" className="h-8 w-8 rounded-full" />
          ) : (
            <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center">
              {user?.name?.charAt(0) || '?'}
            </div>
          )}
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-700">{user.name}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
          <Link href="/settings">
            <a className="ml-auto text-gray-400 hover:text-gray-500">
              <Heading6 className="h-5 w-5" />
            </a>
          </Link>
        </div>
      </div>
    </aside>
  );
}