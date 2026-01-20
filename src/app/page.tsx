"use client"
import * as React from 'react';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import DeviceList from '@/components/DeviceList';
import { signIn, signOut } from 'next-auth/react';
import { Button, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import CustomPatternControl from '@/components/CustomPatternColtrol';
import { useAuth } from '@/hooks/useAuth';

export default function Home() {
  const { user, isAuthenticated, isLoading, isWebView } = useAuth();

  const [grantStatus, setGrantStatus] = useState<"active" | "needs renewal" | null>(null);
  const [loadingGrant, setLoadingGrant] = useState(false);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);

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

  // Load all data in parallel on mount (when authenticated)
  useEffect(() => {
    if (isAuthenticated) {
      setLoadingGrant(true);

      // Load in parallel for better performance
      Promise.all([
        fetchSelectedDevices(),
        checkGrantStatus()
      ]).finally(() => {
        setLoadingGrant(false);
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

  const revokeGrant = async () => {
    if (!isAuthenticated) return;
    try {
      const response = await fetch(`/api/consent/revoke`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to revoke grant");
      }
      // After revoking, update grant status
      await checkGrantStatus();
    } catch (error) {
      console.error("Error revoking grant:", error);
    }
  };

  const loginAzureADB2C = async () => {
    await signIn('azure-ad-b2c')
  };

  const logoutAzureB2C = async () => {
    await signOut();
  };

  return (
    <Container maxWidth="md">
      <Box
        sx={{
          py: 4,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Typography variant="h4" gutterBottom>
          VREEDA Sample Service
        </Typography>
        {isLoading ? (
          <Typography variant="body1">Loading...</Typography>
        ) : isAuthenticated ? (
          <>
            {/* Show Logout/Revoke buttons only in Browser mode */}
            {!isWebView && (
              <Box
                sx={{
                  position: "absolute",
                  top: 16,
                  right: 16,
                  display: "flex",
                  gap: 2,
                }}
              >
                {/* Logout Button */}
                <Button variant="outlined" color="primary" onClick={logoutAzureB2C}>
                  Logout
                </Button>
                {/* Revoke Button */}
                <Button variant="contained" color="error" onClick={revokeGrant}>
                  Revoke
                </Button>
              </Box>
            )}

            <Typography variant="body1">
              Welcome, {user?.name || "User"}!
            </Typography>

            {/* Display Grant Status */}
            <Box pt={2} pb={2}>
              {loadingGrant ? (
                <Typography variant="body2">Checking grant status...</Typography>
              ) : grantStatus === "active" ? (
                <Box sx={{
                  p: 2,
                  bgcolor: 'success.light',
                  borderRadius: 1,
                  color: 'success.contrastText'
                }}>
                  <Typography variant="body1" fontWeight="bold">
                    ✓ Connected to VREEDA Devices
                  </Typography>
                  <Typography variant="caption">
                    You can control your devices below
                  </Typography>
                </Box>
              ) : (
                <Box sx={{
                  p: 2,
                  bgcolor: 'warning.light',
                  borderRadius: 1,
                  color: 'warning.contrastText',
                  textAlign: 'center'
                }}>
                  <Typography variant="body1" fontWeight="bold" gutterBottom>
                    Device Access Required
                  </Typography>
                  <Typography variant="caption" gutterBottom display="block">
                    Connect your VREEDA devices to use this service
                  </Typography>
                  <Button
                    variant="contained"
                    color="primary"
                    sx={{ mt: 2 }}
                    onClick={() => window.location.href = '/api/consent/authorize'}
                  >
                    Connect Devices
                  </Button>
                </Box>
              )}
            </Box>

            {/* Only show device controls when grant is active */}
            {grantStatus === "active" && (
              <>
                <DeviceList selectedDevices={selectedDevices} onSelectionChange={handleSelectionChange}/>

                <Box sx={{ width: '100%', pt: 4 }}>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Typography variant="h5" gutterBottom>
                      Custom Patterns
                    </Typography>
                  </Box>
                  <CustomPatternControl selectedDevices={selectedDevices}/>
                </Box>
              </>
            )}
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
