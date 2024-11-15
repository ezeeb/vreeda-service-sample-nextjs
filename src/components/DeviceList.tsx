"use client"
import { DevicesResponse } from '@/types/vreedaApi';
import { useEffect, useState } from 'react';
import DeviceControl from './DeviceControl';
import { Alert, Box, CircularProgress, IconButton, List, Typography } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

export default function DeviceList() {
  const [devices, setDevices] = useState<DevicesResponse>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [reloading, setReloading] = useState<boolean>(false);

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
      setLoading(false);
      setReloading(false); // Reset reloading state
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  // Handler for the reload button
  const handleReload = () => {
    setReloading(true);
    fetchDevices();
  };

  return (
    <Box sx={{ width: '100%', mt: 4 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Typography variant="h5" gutterBottom>
          Devices
        </Typography>
        <IconButton onClick={handleReload} disabled={reloading}>
          {reloading ? <CircularProgress size={24} /> : <RefreshIcon />}
        </IconButton>
      </Box>
      {error && <Alert severity="error">Error: {error}</Alert>}
      {loading ? (
        <Box display="flex" justifyContent="center" mt={2}>
          <CircularProgress />
        </Box>
      ) : (
        <List>
          {devices &&
            Object.entries(devices).map(([id, device]) => (
              <DeviceControl model={device} id={id} key={id} />
            ))}
        </List>
      )}
    </Box>
  );
}