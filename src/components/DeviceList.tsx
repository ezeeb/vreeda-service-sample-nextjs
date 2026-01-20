"use client"
import { DevicesResponse } from '@/types/vreedaApi';
import DeviceControl from './DeviceControl';
import { Alert, Box, Button, CircularProgress, IconButton, List, Typography } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

interface DeviceListProps {
  selectedDevices: string[];
  onSelectionChange: (id: string, selected: boolean) => void;
  grantStatus: "active" | "needs renewal" | null;
  loadingGrant: boolean;
  devices: DevicesResponse;
  loadingDevices: boolean;
  error: string | null;
  onReload: () => void;
  reloading: boolean;
  onRevokeGrant: () => void;
  isWebView: boolean;
}

export default function DeviceList({
  selectedDevices,
  onSelectionChange,
  grantStatus,
  loadingGrant,
  devices,
  loadingDevices,
  error,
  onReload,
  reloading,
  onRevokeGrant,
  isWebView
}: DeviceListProps) {

  return (
    <Box sx={{ width: '100%', pt: 4 }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: { sm: 'space-between' },
          gap: { xs: 2, sm: 0 }
        }}
      >
        <Box display="flex" gap={1} alignItems="center">
          <Typography variant="h5" gutterBottom>
            Devices
          </Typography>

          {/* In WebView mode: show Reload button right next to title */}
          {grantStatus === "active" && isWebView && (
            <IconButton onClick={onReload} disabled={reloading}>
              {reloading ? <CircularProgress size={24} /> : <RefreshIcon />}
            </IconButton>
          )}

          {/* Show Revoke button only in Browser mode when grant is active */}
          {grantStatus === "active" && !isWebView && (
            <Button
              variant="outlined"
              color="error"
              size="small"
              onClick={onRevokeGrant}
              sx={{
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                whiteSpace: 'nowrap'
              }}
            >
              Revoke Device Access
            </Button>
          )}
        </Box>

        {/* In Browser mode: show Reload button on the right side */}
        {grantStatus === "active" && !isWebView && (
          <IconButton onClick={onReload} disabled={reloading}>
            {reloading ? <CircularProgress size={24} /> : <RefreshIcon />}
          </IconButton>
        )}
      </Box>

      {/* Show loading state while checking grant status */}
      {loadingGrant ? (
        <Box sx={{ textAlign: 'center', pt: 2 }}>
          <Typography variant="body2">Checking grant status...</Typography>
        </Box>
      ) : grantStatus !== "active" ? (
        // Show "Connect Devices" box if grant is not active
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
      ) : (
        // Grant is active - show device list
        <>
          {error && <Alert severity="error">Error: {error}</Alert>}
          {loadingDevices ? (
            <Box display="flex" justifyContent="center" pt={2}>
              <CircularProgress />
            </Box>
          ) : (
            <List>
              {devices &&
                Object.entries(devices).map(([id, device]) => (
                  <DeviceControl model={device} id={id} key={id} selected={selectedDevices.includes(id)} onSelectionChange={onSelectionChange}/>
                ))}
            </List>
          )}
        </>
      )}
    </Box>
  );
}