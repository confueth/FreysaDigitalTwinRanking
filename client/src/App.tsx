import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Suspense, lazy, useState } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearApiCache } from "@/hooks/use-api-with-retry";
import Footer from "@/components/Footer";

// Lazy load components for better performance
const NotFound = lazy(() => import("@/pages/not-found"));
const Home = lazy(() => import("@/pages/Home"));
const AgentDetail = lazy(() => import("@/pages/AgentDetail"));
const Analytics = lazy(() => import("@/pages/Analytics"));
const MyAgents = lazy(() => import("@/pages/MyAgents"));
const Cities = lazy(() => import("@/pages/Cities"));

// Loading fallback component
const LoadingFallback = () => (
  <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
    <div className="flex flex-col items-center">
      <div className="w-16 h-16 border-4 border-t-green-500 border-r-transparent border-b-green-500 border-l-transparent rounded-full animate-spin"></div>
      <p className="mt-4 text-lg text-gray-400">Loading...</p>
    </div>
  </div>
);

// Error fallback component for app-level errors
const AppErrorFallback = ({ resetErrorBoundary }: { resetErrorBoundary: () => void }) => {
  const handleReset = () => {
    // Clear all API caches when resetting the entire app
    clearApiCache();
    // Reset the error boundary
    resetErrorBoundary();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
      <div className="bg-red-900/20 rounded-lg border border-red-800/40 p-6 max-w-lg w-full text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-red-400 mb-2">Application Error</h2>
        <p className="text-gray-300 mb-6">
          We encountered an unexpected error. This could be due to network issues or temporary service disruption.
        </p>
        <Button onClick={handleReset} variant="destructive" className="mx-auto">
          Refresh Application
        </Button>
      </div>
    </div>
  );
};

// Page-level error handler
const PageErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  const [key, setKey] = useState(0);
  
  const handleReset = () => {
    // Regenerate key to force component remounting
    setKey(prevKey => prevKey + 1);
  };
  
  return (
    <ErrorBoundary
      key={key}
      onReset={handleReset}
    >
      {children}
    </ErrorBoundary>
  );
};

function Router() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <div className="flex-1">
        <Suspense fallback={<LoadingFallback />}>
          <Switch>
            <Route path="/">
              <PageErrorBoundary>
                <Home />
              </PageErrorBoundary>
            </Route>
            <Route path="/agent/:username">
              <PageErrorBoundary>
                <AgentDetail />
              </PageErrorBoundary>
            </Route>
            <Route path="/analytics">
              <PageErrorBoundary>
                <Analytics />
              </PageErrorBoundary>
            </Route>
            <Route path="/my-agents">
              <PageErrorBoundary>
                <MyAgents />
              </PageErrorBoundary>
            </Route>
            <Route path="/cities">
              <PageErrorBoundary>
                <Cities />
              </PageErrorBoundary>
            </Route>
            <Route>
              <PageErrorBoundary>
                <NotFound />
              </PageErrorBoundary>
            </Route>
          </Switch>
        </Suspense>
      </div>
      <Footer />
    </div>
  );
}

function App() {
  const [key, setKey] = useState(0);
  
  const handleAppReset = () => {
    // Clear cache and reset query client
    queryClient.clear();
    clearApiCache();
    // Force remount of the entire app
    setKey(prev => prev + 1);
  };
  
  return (
    <ErrorBoundary
      key={key}
      fallback={<AppErrorFallback resetErrorBoundary={handleAppReset} />}
    >
      <QueryClientProvider client={queryClient}>
        <Router />
        <Toaster />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
