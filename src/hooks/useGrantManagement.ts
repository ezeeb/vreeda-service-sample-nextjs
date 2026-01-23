import { useState } from 'react';

/**
 * Custom hook for managing OAuth2 consent grant status
 * Handles checking and revoking device access grants
 */
export function useGrantManagement(
  initialGrantStatus: "active" | "needs renewal",
  isAuthenticated: boolean
) {
  const [grantStatus, setGrantStatus] = useState<"active" | "needs renewal">(initialGrantStatus);
  const [isLoading, setIsLoading] = useState(false);

  const checkGrantStatus = async () => {
    try {
      const response = await fetch(`/api/consent/granted`);
      if (!response.ok) {
        throw new Error("Failed to check grant status");
      }
      const data = await response.json();
      setGrantStatus(data.granted ? "active" : "needs renewal");
    } catch (error) {
      console.error("Error checking grant status:", error);
      setGrantStatus("needs renewal");
    }
  };

  const revokeGrant = async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/consent/revoke`, {
        method: "GET",
      });
      if (!response.ok) {
        throw new Error("Failed to revoke grant");
      }
      // After revoking, update grant status
      await checkGrantStatus();
    } catch (error) {
      console.error("Error revoking grant:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    grantStatus,
    isLoading,
    revokeGrant,
  };
}
