"use client"
import * as React from 'react';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import DeviceList from '@/components/DeviceList';
import { signIn, signOut } from 'next-auth/react';
import { Button, CircularProgress, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import CustomPatternControl from '@/components/CustomPatternControl';
import { useAuth } from '@/hooks/useAuth';
import { DevicesResponse } from '@/types/vreedaApi';

interface HomeClientProps {
  isWebView: boolean;
  initialGrantStatus: "active" | "needs renewal";
}

export default function HomeClient({ isWebView, initialGrantStatus }: HomeClientProps) {
  const { isAuthenticated, isLoading } = useAuth();

  const [grantStatus, setGrantStatus] = useState<"active" | "needs renewal">(initialGrantStatus);
  const [loadingGrant, setLoadingGrant] = useState(false);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [devices, setDevices] = useState<DevicesResponse>({});
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [devicesError, setDevicesError] = useState<string | null>(null);
  const [reloadingDevices, setReloadingDevices] = useState(false);

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

  const fetchDevices = async () => {
    setDevicesError(null);
    try {
      const response = await fetch('/api/vreeda/list-devices');
      if (!response.ok) throw new Error('Failed to fetch devices');
      const data: DevicesResponse = await response.json();
      setDevices(data);
    } catch (err) {
      setDevicesError((err as Error).message);
    } finally {
      setReloadingDevices(false);
    }
  };

  // Load all data in parallel on mount (when authenticated)
  useEffect(() => {
    if (isAuthenticated) {
      setLoadingDevices(true);

      // Load in parallel for better performance (grant status already loaded server-side)
      Promise.all([
        fetchSelectedDevices(),
        fetchDevices()
      ]).finally(() => {
        setLoadingDevices(false);
      });
    }
  }, [isAuthenticated]);

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

  const handleReloadDevices = () => {
    setReloadingDevices(true);
    fetchDevices();
  };

  const revokeGrant = async () => {
    if (!isAuthenticated) return;
    setLoadingGrant(true);
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
      setLoadingGrant(false);
    }
  };

  const loginAzureADB2C = async () => {
    await signIn('azure-ad-b2c')
  };

  const logoutAzureB2C = async () => {
    await signOut();
  };

  return (
    <Container
      maxWidth="md"
      sx={{
        bgcolor: isWebView ? 'transparent' : undefined,
        backgroundImage: isWebView ? 'none' : undefined,
        px: isWebView ? 0 : undefined,
      }}
    >
      <Box
        sx={{
          py: isWebView ? 0 : 4,
          px: isWebView ? 0 : undefined,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {/* Show title only in Browser mode */}
        {!isWebView && (
          <Typography variant="h4" gutterBottom>
            VREEDA Sample Service
          </Typography>
        )}
        {isLoading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
            {!isWebView && (<CircularProgress />)}
          </Box>
        ) : isAuthenticated ? (
          <>
            {/* Show Logout button only in Browser mode */}
            {!isWebView && (
              <Box
                sx={{
                  position: "absolute",
                  top: 16,
                  right: 16,
                }}
              >
                <Button variant="outlined" color="primary" onClick={logoutAzureB2C}>
                  Logout
                </Button>
              </Box>
            )}

            {/* DeviceList with integrated grant status display */}
            <DeviceList
              selectedDevices={selectedDevices}
              onSelectionChange={handleSelectionChange}
              grantStatus={grantStatus}
              loadingGrant={loadingGrant}
              devices={devices}
              loadingDevices={loadingDevices}
              error={devicesError}
              onReload={handleReloadDevices}
              reloading={reloadingDevices}
              onRevokeGrant={revokeGrant}
              isWebView={isWebView}
            />

            {/* Custom Patterns - always visible, Run button disabled without grant */}
            <Box sx={{ width: '100%', pt: 4 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Typography variant="h5" gutterBottom>
                  Custom Patterns
                </Typography>
              </Box>
              <CustomPatternControl selectedDevices={selectedDevices} grantStatus={grantStatus}/>
            </Box>
          </>
        ) : (
          <>
            <Typography variant="body1" gutterBottom>
              Please sign in to activate service.
            </Typography>
            {/* SignIn Button */}
            <Button variant="outlined" color="primary" onClick={loginAzureADB2C}>
              Sign In
            </Button>
          </>
        )}
      </Box>
    </Container>
  );
}
