"use client"
import * as React from 'react';
import { Suspense } from 'react';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { signOut } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

/**
 * Authentication Error Page Content
 * Wrapped in Suspense boundary for useSearchParams()
 */
function AuthErrorContent() {
  const searchParams = useSearchParams();
  const message = searchParams.get('message') || 'An authentication error occurred.';
  const action = searchParams.get('action');

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/' });
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <ErrorOutlineIcon
            color="error"
            sx={{ fontSize: 64, mb: 2 }}
          />

          <Typography variant="h5" gutterBottom>
            Authentication Error
          </Typography>

          <Typography variant="body1" color="text.secondary" paragraph>
            {message}
          </Typography>

          {action === 'logout_required' && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Please log out and log in again to continue.
              </Typography>

              <Button
                variant="contained"
                color="primary"
                onClick={handleLogout}
                size="large"
              >
                Logout and Sign In Again
              </Button>
            </>
          )}

          {action !== 'logout_required' && (
            <Button
              variant="contained"
              color="primary"
              href="/"
              size="large"
            >
              Go to Home
            </Button>
          )}
        </Paper>
      </Box>
    </Container>
  );
}

/**
 * Authentication Error Page
 * Displays error messages when token refresh fails or authentication issues occur
 * Provides logout button to allow user to re-authenticate
 */
export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <CircularProgress />
        </Box>
      }
    >
      <AuthErrorContent />
    </Suspense>
  );
}
