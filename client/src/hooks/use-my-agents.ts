import { useState, useEffect } from 'react';

// Keep the storage key consistent across the application
export const MY_AGENTS_KEY = 'freysa-my-agents';

/**
 * Custom hook to manage the user's saved agents with localStorage persistence
 * This ensures consistency across different parts of the application
 */
export function useMyAgents() {
  const [myAgents, setMyAgents] = useState<string[]>([]);
  
  // Load saved agents from localStorage on mount
  useEffect(() => {
    try {
      const savedAgents = localStorage.getItem(MY_AGENTS_KEY);
      if (savedAgents) {
        const parsed = JSON.parse(savedAgents);
        if (Array.isArray(parsed)) {
          setMyAgents(parsed);
        }
      }
    } catch (error) {
      console.error('Error loading saved agents:', error);
    }
  }, []);
  
  // Save agents to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(MY_AGENTS_KEY, JSON.stringify(myAgents));
  }, [myAgents]);
  
  // Add an agent to the saved list
  const addAgent = (username: string) => {
    if (!myAgents.includes(username)) {
      setMyAgents(prev => [...prev, username]);
      return true; // Added successfully
    }
    return false; // Already in the list
  };
  
  // Remove an agent from the saved list
  const removeAgent = (username: string) => {
    if (myAgents.includes(username)) {
      setMyAgents(prev => prev.filter(agent => agent !== username));
      return true; // Removed successfully
    }
    return false; // Not in the list
  };
  
  // Toggle an agent (add if not present, remove if present)
  const toggleAgent = (username: string) => {
    if (myAgents.includes(username)) {
      return removeAgent(username);
    } else {
      return addAgent(username);
    }
  };
  
  // Clear all saved agents
  const clearAgents = () => {
    setMyAgents([]);
  };
  
  // Check if an agent is saved
  const isAgentSaved = (username: string) => {
    return myAgents.includes(username);
  };
  
  return {
    myAgents,
    setMyAgents,
    addAgent,
    removeAgent,
    toggleAgent,
    clearAgents,
    isAgentSaved
  };
}