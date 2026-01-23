"use client"
import * as React from 'react';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import DeviceList from '@/components/DeviceList';
import { signIn, signOut } from 'next-auth/react';
import { Button, CircularProgress, Typography } from '@mui/material';
import CustomPatternControl from '@/components/CustomPatternControl';
import { useAuth } from '@/hooks/useAuth';
import { useOAuth2Error } from '@/hooks/useOAuth2Error';
import { useTranslation } from 'react-i18next';
import { useDeviceManagement } from '@/hooks/useDeviceManagement';
import { useGrantManagement } from '@/hooks/useGrantManagement';
import OAuth2ErrorDisplay from '@/components/OAuth2ErrorDisplay';
import { DevicesResponse } from '@/types/vreedaApi';

interface HomeClientProps {
  isWebView: boolean;
  initialGrantStatus: "active" | "needs renewal";
  initialDevices: DevicesResponse | null;
  initialSelectedDevices: string[];
}

export default function HomeClient({
  isWebView,
  initialGrantStatus,
  initialDevices,
  initialSelectedDevices
}: HomeClientProps) {
  const { t, ready: i18nReady } = useTranslation();
  const { isAuthenticated, isLoading } = useAuth();
  const { oauth2Error, clearError } = useOAuth2Error();

  // Device management with server-side initial data
  const {
    devices,
    selectedDevices,
    isLoading: loadingDevices,
    error: devicesError,
    reloading: reloadingDevices,
    handleSelectionChange,
    handleReload,
  } = useDeviceManagement(isAuthenticated, {
    initialDevices,
    initialSelectedDevices
  });

  // Grant management
  const {
    grantStatus,
    isLoading: loadingGrant,
    revokeGrant,
  } = useGrantManagement(initialGrantStatus, isAuthenticated);

  // OAuth2 error display
  if (oauth2Error) {
    return <OAuth2ErrorDisplay oauth2Error={oauth2Error} onDismiss={clearError} />;
  }

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
        {!isWebView && i18nReady && (
          <Typography variant="h4" gutterBottom>
            {t('home.title')}
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
                <Button variant="outlined" color="primary" onClick={() => signOut()}>
                  {t('home.auth.logout')}
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
              onReload={handleReload}
              reloading={reloadingDevices}
              onRevokeGrant={revokeGrant}
              isWebView={isWebView}
            />

            {/* Custom Patterns - always visible, Run button disabled without grant */}
            <Box sx={{ width: '100%', pt: 4 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Typography variant="h5" gutterBottom>
                  {t('patterns.title')}
                </Typography>
              </Box>
              <CustomPatternControl selectedDevices={selectedDevices} grantStatus={grantStatus}/>
            </Box>
          </>
        ) : (
          <>
            <Typography variant="body1" gutterBottom>
              {t('home.auth.pleaseSignIn')}
            </Typography>
            <Button variant="outlined" color="primary" onClick={() => signIn('azure-ad-b2c')}>
              {t('home.auth.signIn')}
            </Button>
          </>
        )}
      </Box>
    </Container>
  );
}
