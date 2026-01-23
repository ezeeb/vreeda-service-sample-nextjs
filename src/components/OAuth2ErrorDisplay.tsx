'use client';

import { Container, Box, Typography, Alert, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface OAuth2Error {
  error: string;
  errorDescription?: string;
}

interface OAuth2ErrorDisplayProps {
  oauth2Error: OAuth2Error;
  onDismiss: () => void;
}

/**
 * Component for displaying OAuth2 authorization errors
 * Shows user-friendly error messages and dismiss button
 */
export default function OAuth2ErrorDisplay({ oauth2Error, onDismiss }: OAuth2ErrorDisplayProps) {
  const { t } = useTranslation();

  // OAuth2 error messages (user-friendly)
  const oauth2ErrorMessages: Record<string, string> = {
    'access_denied': t('home.oauth2Errors.accessDenied'),
    'invalid_grant': t('home.oauth2Errors.invalidGrant'),
    'invalid_scope': t('home.oauth2Errors.invalidScope'),
    'server_error': t('home.oauth2Errors.serverError'),
  };

  const userMessage = oauth2ErrorMessages[oauth2Error.error]
    || oauth2Error.errorDescription
    || t('home.oauth2Errors.genericError');

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="h5" color="error" gutterBottom>
          {t('home.oauth2Errors.authorizationError')}
        </Typography>
        <Alert severity="error" sx={{ mb: 2 }}>
          {userMessage}
        </Alert>
        <Button variant="contained" onClick={onDismiss}>
          {t('home.oauth2Errors.dismiss')}
        </Button>
      </Box>
    </Container>
  );
}
