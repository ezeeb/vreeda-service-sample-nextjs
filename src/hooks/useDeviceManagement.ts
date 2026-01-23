import { useState, useEffect } from 'react';
import { DevicesResponse } from '@/types/vreedaApi';

interface UseDeviceManagementOptions {
  initialDevices?: DevicesResponse | null;
  initialSelectedDevices?: string[];
}

/**
 * Custom hook for managing device state and operations
 * Handles fetching devices, selected devices configuration, and device selection changes
 * Accepts optional initial data to avoid client-side fetching on first render
 */
export function useDeviceManagement(
  isAuthenticated: boolean,
  options?: UseDeviceManagementOptions
) {
  const [selectedDevices, setSelectedDevices] = useState<string[]>(options?.initialSelectedDevices || []);
  const [devices, setDevices] = useState<DevicesResponse>(options?.initialDevices || {});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloading, setReloading] = useState(false);

  // Track if we have initial data to avoid unnecessary fetch
  const hasInitialData = options?.initialDevices !== undefined && options?.initialDevices !== null;

  const fetchSelectedDevices = async () => {
    try {
      const response = await fetch(`/api/user/configuration`);
      if (!response.ok) throw new Error("Failed to fetch configuration");
      const data = await response.json();
      setSelectedDevices(data.devices || []);
    } catch (error) {
      console.error("Error fetching selected devices:", error);
    }
  };

  const fetchDevices = async () => {
    setError(null);
    try {
      const response = await fetch('/api/vreeda/list-devices');
      if (!response.ok) throw new Error('Failed to fetch devices');
      const data: DevicesResponse = await response.json();
      setDevices(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setReloading(false);
    }
  };

  // Load data only if:
  // - User is authenticated
  // - We don't have initial data (first load)
  useEffect(() => {
    if (isAuthenticated && !hasInitialData) {
      setIsLoading(true);

      Promise.all([
        fetchSelectedDevices(),
        fetchDevices()
      ]).finally(() => {
        setIsLoading(false);
      });
    }
  }, [isAuthenticated, hasInitialData]);

  const handleSelectionChange = async (deviceId: string, isSelected: boolean) => {
    const updatedDevices = isSelected
      ? [...selectedDevices, deviceId]
      : selectedDevices.filter((id) => id !== deviceId);

    setSelectedDevices(updatedDevices);

    // Save changes to the backend
    try {
      const response = await fetch("/api/user/configuration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          configuration: { devices: updatedDevices },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update configuration");
      }

      console.log("Configuration updated successfully");
    } catch (error) {
      console.error("Error updating configuration:", error);
    }
  };

  const handleReload = () => {
    setReloading(true);
    fetchDevices();
  };

  return {
    devices,
    selectedDevices,
    isLoading,
    error,
    reloading,
    handleSelectionChange,
    handleReload,
  };
}
