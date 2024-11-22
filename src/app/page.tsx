"use client"
import * as React from 'react';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import DeviceList from '@/components/DeviceList'; // Importieren Sie die DeviceList-Komponente
import { signIn, signOut, useSession } from 'next-auth/react';
import { Button, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import CustomPatternControl from '@/components/CustomPatternColtrol';

export default function Home() {
  const { data: session, status } = useSession(); // Session-Status abrufen
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

  useEffect(() => {
    fetchSelectedDevices();
  }, []);

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

  // Check grant status on mount
  useEffect(() => {
    if (session) {
      checkGrantStatus();
    }
  }, [session]);

  const checkGrantStatus = async () => {
    setLoadingGrant(true);
    try {
      const response = await fetch(`/api/user/granted`);
      if (!response.ok) {
        throw new Error("Failed to check grant status");
      }
      const data = await response.json();
      setGrantStatus(data.granted ? "active" : "needs renewal");
    } catch (error) {
      console.error("Error checking grant status:", error);
      setGrantStatus("needs renewal");
    } finally {
      setLoadingGrant(false);
    }
  };

  const revokeGrant = async () => {
    if (!session?.user?.email) return;
    try {
      const response = await fetch(`/api/user/revoke`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to revoke grant");
      }
      await logoutAzureB2C(); // Log out after revoking the grant
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
        {status === 'loading' ? (
          <Typography variant="body1">Loading...</Typography>
        ) : session ? (
          <>
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

            <Typography variant="body1">
              Welcome, {session.user?.name || "User"}!
            </Typography>

            {/* Display Grant Status */}
            <Box pt={2}>
              <Typography variant="body2">
                Grant Status:{" "}
                {loadingGrant ? "Checking..." : grantStatus === "active" ? "Active" : "Needs Renewal"}
              </Typography>
            </Box>

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
