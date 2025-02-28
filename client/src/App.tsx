import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import AgentDetail from "@/pages/AgentDetail";

function Router() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/agent/:username" component={AgentDetail} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
