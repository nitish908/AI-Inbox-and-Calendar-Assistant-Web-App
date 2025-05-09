import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";

import Dashboard from "@/pages/dashboard/Dashboard";
import Inbox from "@/pages/inbox/Inbox";
import Calendar from "@/pages/calendar/Calendar";
import NewEvent from "@/pages/calendar/NewEvent";
import EventDetail from "@/pages/calendar/EventDetail";
import Settings from "@/pages/settings/Settings";
import Login from "@/pages/auth/Login";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/inbox" component={Inbox} />
      <Route path="/calendar" component={Calendar} />
      <Route path="/calendar/new" component={NewEvent} />
      <Route path="/calendar/:id" component={EventDetail} />
      <Route path="/settings" component={Settings} />
      <Route path="/login" component={Login} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
