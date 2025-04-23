"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

// Define the structure of user preferences
export interface UserPreferences {
  confirmations: {
    deleteQuestion: boolean;
    // Add more confirmation settings as needed
  };
  // Add other preference categories as needed
}

// Default preferences
const defaultPreferences: UserPreferences = {
  confirmations: {
    deleteQuestion: true, // By default, show confirmation
  },
};

/**
 * Hook to manage user preferences
 * Uses localStorage to persist preferences
 */
export function useUserPreferences() {
  const { currentUser } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [loaded, setLoaded] = useState(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    if (!currentUser) return;
    
    try {
      const userId = currentUser.uid;
      const storedPrefs = localStorage.getItem(`user-preferences-${userId}`);
      
      if (storedPrefs) {
        setPreferences(JSON.parse(storedPrefs));
      }
      
      setLoaded(true);
    } catch (error) {
      console.error("Error loading user preferences:", error);
      setLoaded(true);
    }
  }, [currentUser]);

  // Save preferences to localStorage whenever they change
  useEffect(() => {
    if (!currentUser || !loaded) return;
    
    try {
      const userId = currentUser.uid;
      localStorage.setItem(`user-preferences-${userId}`, JSON.stringify(preferences));
    } catch (error) {
      console.error("Error saving user preferences:", error);
    }
  }, [preferences, currentUser, loaded]);

  // Update a specific preference
  const updatePreference = <K extends keyof UserPreferences>(
    category: K,
    key: keyof UserPreferences[K],
    value: any
  ) => {
    setPreferences((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }));
  };

  // Reset preferences to default
  const resetPreferences = () => {
    setPreferences(defaultPreferences);
  };

  // Reset a specific category to default
  const resetCategory = <K extends keyof UserPreferences>(category: K) => {
    setPreferences((prev) => ({
      ...prev,
      [category]: defaultPreferences[category],
    }));
  };

  return {
    preferences,
    loaded,
    updatePreference,
    resetPreferences,
    resetCategory,
  };
}
