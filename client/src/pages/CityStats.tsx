import { useApiWithRetry } from "@/hooks/use-api-with-retry";
import { Agent } from "@/types/agent";
import CityStatistics from "@/components/CityStatistics";
import TopPerformersByCity from "@/components/TopPerformersByCity";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Helmet } from "react-helmet-async";
import { Link, useLocation } from "wouter";
import { Home } from "lucide-react";
import AgentDetailModal from "@/components/AgentDetailModal";
import { useState } from "react";

/**
 * CityStats page component
 * 
 * This page displays statistics about agents grouped by city
 */
export default function CityStats() {
  const [, setLocation] = useLocation();
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  
  // Load ALL agent data with retry capabilities and high limit to get accurate city counts
  const { data: agents, loading, error } = useApiWithRetry<Agent[]>({
    url: "/api/agents?limit=10000", // Set very high limit to get all agents
    dependencies: [],
    initialData: [],
    maxRetries: 3,
    retryDelay: 1000,
    cacheKey: "agents-city-stats-full",
  });

  // Handle agent selection
  const handleAgentSelect = (username: string) => {
    setSelectedAgent(username);
  };

  // Close agent detail modal
  const handleCloseModal = () => {
    setSelectedAgent(null);
  };

  // If data loading fails, show error message
  if (error) {
    return (
      <div className="app-container px-4 py-4">
        <Card className="bg-gray-800 border-gray-700 text-white mb-6">
          <CardHeader>
            <CardTitle className="text-center text-red-400">Error Loading City Statistics</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-300 mb-4">
              We encountered an error while loading the city statistics data. Please try again later.
            </p>
            <p className="text-gray-400 text-sm">
              Error details: {(error as Error).message}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="app-container px-4 py-4">
      <Helmet>
        <title>City Statistics | Freysa Leaderboard</title>
        <meta name="description" content="Explore statistics about Freysa Digital Twin agents by city" />
      </Helmet>

      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">City Statistics</h1>
            <p className="text-gray-400">
              Explore how agents perform across different cities around the world
            </p>
          </div>
          <Link to="/">
            <Button 
              variant="outline" 
              size="sm" 
              className="bg-gray-800 hover:bg-gray-700 border-gray-700 flex items-center gap-1"
            >
              <Home className="h-4 w-4" />
              <span>Back to Leaderboard</span>
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* City Distribution Chart */}
        {loading ? (
          <Card className="bg-gray-800 border-gray-700 text-white">
            <CardHeader>
              <Skeleton className="h-8 w-48 bg-gray-700" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Skeleton className="h-4 w-full bg-gray-700" />
                <Skeleton className="h-4 w-full bg-gray-700" />
                <Skeleton className="h-4 w-full bg-gray-700" />
                <Skeleton className="h-4 w-2/3 bg-gray-700" />
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-gray-800 border-gray-700 text-white">
            <CardHeader>
              <CardTitle>City Distribution & Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <CityStatistics 
                agents={agents || []} 
                isLoading={loading} 
              />
            </CardContent>
          </Card>
        )}

        {/* Top Performers By City */}
        <TopPerformersByCity 
          agents={agents || []} 
          isLoading={loading}
          onAgentSelect={handleAgentSelect} 
        />
      </div>
      
      {/* Agent Detail Modal */}
      {selectedAgent && (
        <AgentDetailModal
          username={selectedAgent}
          isOpen={!!selectedAgent}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}