import { useState } from "react";
import { Link } from "wouter";
import { Menu, X } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface MobileHeaderProps {
  user: {
    name: string;
    email: string;
    profileImage?: string;
  };
  connectedServices: string[];
}

export default function MobileHeader({ user, connectedServices }: MobileHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="md:hidden fixed top-0 left-0 right-0 z-10 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-primary" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
            <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
          </svg>
          <h1 className="font-semibold text-lg text-neutral-800">AI Assistant</h1>
        </div>
        <div className="flex items-center space-x-3">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <button className="text-neutral-500">
                <Menu className="h-6 w-6" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="flex flex-col h-full">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-primary" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                        <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                      </svg>
                      <h1 className="font-semibold text-lg text-neutral-800">AI Assistant</h1>
                    </div>
                    <button onClick={() => setIsOpen(false)}>
                      <X className="h-5 w-5 text-gray-500" />
                    </button>
                  </div>
                </div>

                <nav className="flex-1 overflow-y-auto p-4 space-y-3">
                  <Link href="/">
                    <a className="flex items-center px-3 py-2 text-neutral-800 hover:bg-gray-100 rounded-md" onClick={() => setIsOpen(false)}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                      </svg>
                      Dashboard
                    </a>
                  </Link>

                  <Link href="/inbox">
                    <a className="flex items-center px-3 py-2 text-neutral-800 hover:bg-gray-100 rounded-md" onClick={() => setIsOpen(false)}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                      </svg>
                      Inbox
                    </a>
                  </Link>

                  <Link href="/calendar">
                    <a className="flex items-center px-3 py-2 text-neutral-800 hover:bg-gray-100 rounded-md" onClick={() => setIsOpen(false)}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                      Calendar
                    </a>
                  </Link>

                  <Link href="/help">
                    <a className="flex items-center px-3 py-2 text-neutral-800 hover:bg-gray-100 rounded-md" onClick={() => setIsOpen(false)}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                      </svg>
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

                      <Link href="/settings">
                        <a className="flex items-center px-3 py-2 text-sm text-primary" onClick={() => setIsOpen(false)}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                          </svg>
                          Connect More
                        </a>
                      </Link>
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
                      <a className="ml-auto text-gray-400 hover:text-gray-500" onClick={() => setIsOpen(false)}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                        </svg>
                      </a>
                    </Link>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );
}