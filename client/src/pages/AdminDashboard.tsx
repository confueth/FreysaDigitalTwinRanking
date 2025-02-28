import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { formatDate } from "@/utils/formatters";

interface AdminUser {
  id: number;
  username: string;
  isAdmin: boolean;
  createdAt: string;
}

interface Snapshot {
  id: number;
  timestamp: string;
  description?: string;
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [snapshotDescription, setSnapshotDescription] = useState("");

  // Fetch the current user
  const { data: currentUser, isLoading: isLoadingUser, error: userError } = useQuery<AdminUser>({
    queryKey: ['/api/admin/me'],
    retry: false,
  });

  // Fetch all snapshots
  const { data: snapshots, isLoading: isLoadingSnapshots } = useQuery<Snapshot[]>({
    queryKey: ['/api/snapshots'],
    enabled: !!currentUser,
  });

  // Check if the user is logged in
  useEffect(() => {
    if (userError) {
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: "You must be logged in to access this page",
      });
      setLocation("/admin");
    }
  }, [userError, toast, setLocation]);

  const handleLogout = async () => {
    try {
      await apiRequest(
        "/api/admin/logout",
        {
          method: "POST",
          withCredentials: true,
        }
      );
      
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
      
      // Invalidate the user query
      queryClient.invalidateQueries({ queryKey: ['/api/admin/me'] });
      
      // Redirect to login
      setLocation("/admin");
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        variant: "destructive",
        title: "Logout failed",
        description: "There was an error logging out",
      });
    }
  };

  const handleCreateSnapshot = async () => {
    setIsCreatingSnapshot(true);
    try {
      const description = snapshotDescription.trim() || `Manual snapshot - ${new Date().toLocaleString()}`;
      
      const response = await apiRequest(
        "/api/snapshots",
        {
          method: "POST",
          data: { description },
          withCredentials: true,
        }
      );
      
      toast({
        title: "Snapshot Created",
        description: `Successfully created snapshot #${response.id}`,
      });
      
      // Clear the description
      setSnapshotDescription("");
      
      // Invalidate the snapshots query
      queryClient.invalidateQueries({ queryKey: ['/api/snapshots'] });
    } catch (error) {
      console.error("Snapshot creation error:", error);
      toast({
        variant: "destructive",
        title: "Snapshot Creation Failed",
        description: "There was an error creating the snapshot",
      });
    } finally {
      setIsCreatingSnapshot(false);
    }
  };

  if (isLoadingUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="animate-spin w-16 h-16 border-t-2 border-b-2 border-green-500 rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with logout */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
            {currentUser && (
              <p className="text-gray-400">
                Logged in as <span className="text-green-400">{currentUser.username}</span>
              </p>
            )}
          </div>
          <Button 
            variant="outline"
            className="border-red-500/50 text-red-400 hover:bg-red-950/30 hover:text-red-300"
            onClick={handleLogout}
          >
            Logout
          </Button>
        </div>

        {/* Main content */}
        <Tabs defaultValue="snapshots" className="space-y-6">
          <TabsList className="bg-gray-800 border-gray-700">
            <TabsTrigger 
              value="snapshots"
              className="data-[state=active]:bg-green-900/30 data-[state=active]:text-green-300"
            >
              Snapshots
            </TabsTrigger>
            <TabsTrigger 
              value="settings"
              className="data-[state=active]:bg-green-900/30 data-[state=active]:text-green-300"
            >
              Settings
            </TabsTrigger>
          </TabsList>
          
          {/* Snapshots Tab */}
          <TabsContent value="snapshots" className="space-y-6">
            {/* Create new snapshot card */}
            <Card className="bg-gray-800 border-gray-700 text-white">
              <CardHeader>
                <CardTitle className="text-xl">Create New Snapshot</CardTitle>
                <CardDescription className="text-gray-400">
                  Take a new snapshot of the current leaderboard data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400">Description (optional)</label>
                  <input
                    type="text"
                    className="w-full p-2 mt-1 bg-gray-700 border border-gray-600 rounded-md text-white"
                    placeholder="Enter a description for this snapshot"
                    value={snapshotDescription}
                    onChange={(e) => setSnapshotDescription(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={handleCreateSnapshot}
                  disabled={isCreatingSnapshot}
                  className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white"
                >
                  {isCreatingSnapshot ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating Snapshot...
                    </span>
                  ) : (
                    "Take New Snapshot"
                  )}
                </Button>
              </CardContent>
            </Card>
            
            {/* Snapshots list */}
            <Card className="bg-gray-800 border-gray-700 text-white">
              <CardHeader>
                <CardTitle className="text-xl">Snapshot History</CardTitle>
                <CardDescription className="text-gray-400">
                  View all historical snapshots of the leaderboard
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingSnapshots ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin w-8 h-8 border-t-2 border-b-2 border-green-500 rounded-full"></div>
                  </div>
                ) : snapshots && snapshots.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b border-gray-700">
                        <tr>
                          <th className="px-4 py-3 text-left text-gray-400">ID</th>
                          <th className="px-4 py-3 text-left text-gray-400">Timestamp</th>
                          <th className="px-4 py-3 text-left text-gray-400">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {snapshots.map((snapshot) => (
                          <tr key={snapshot.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                            <td className="px-4 py-3">{snapshot.id}</td>
                            <td className="px-4 py-3">{formatDate(snapshot.timestamp)}</td>
                            <td className="px-4 py-3">{snapshot.description || "No description"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    No snapshots found. Create your first one!
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card className="bg-gray-800 border-gray-700 text-white">
              <CardHeader>
                <CardTitle className="text-xl">Account Information</CardTitle>
                <CardDescription className="text-gray-400">
                  Your admin account details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentUser && (
                  <div className="grid gap-2">
                    <div>
                      <span className="text-gray-400">Username:</span> {currentUser.username}
                    </div>
                    <div>
                      <span className="text-gray-400">Admin Status:</span> {currentUser.isAdmin ? "Admin" : "Standard User"}
                    </div>
                    <div>
                      <span className="text-gray-400">Account Created:</span> {formatDate(currentUser.createdAt)}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}