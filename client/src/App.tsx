import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Suspense, lazy } from "react";

// Lazy load components for better performance
const NotFound = lazy(() => import("@/pages/not-found"));
const Home = lazy(() => import("@/pages/Home"));
const AgentDetail = lazy(() => import("@/pages/AgentDetail"));
const Analytics = lazy(() => import("@/pages/Analytics"));
const AdminLogin = lazy(() => import("@/pages/AdminLogin"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));

// Loading fallback component
const LoadingFallback = () => (
  <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
    <div className="flex flex-col items-center">
      <div className="w-16 h-16 border-4 border-t-green-500 border-r-transparent border-b-green-500 border-l-transparent rounded-full animate-spin"></div>
      <p className="mt-4 text-lg text-gray-400">Loading...</p>
    </div>
  </div>
);

function Router() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Suspense fallback={<LoadingFallback />}>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/agent/:username" component={AgentDetail} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/admin" component={AdminLogin} />
          <Route path="/admin/dashboard" component={AdminDashboard} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
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
