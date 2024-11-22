'use client';
import { createTheme } from '@mui/material/styles';

// Define the custom theme
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#FF007A', // Vibrant pink/magenta for active elements (matches the switch color)
    },
    secondary: {
      main: '#FFFFFF', // White for general text and secondary elements
    },
    background: {
      default: '#370427', // Dark gradient background
      paper: '#2A1D24', // Dark, subtle purple background for cards
    },
    text: {
      primary: '#FFFFFF', // White text on dark background
      secondary: '#B3B3B3', // Light gray for secondary text
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h6: {
      fontSize: '1.1rem',
      fontWeight: 500,
      color: '#FFFFFF', // White title for headers
    },
    body1: {
      fontSize: '0.9rem',
      color: '#B3B3B3', // Light gray for secondary text
    },
    body2: {
      fontSize: '0.8rem',
      color: '#999999', // Even lighter gray for details or descriptions
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
      fontSize: '0.875rem',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          backgroundColor: '#000000',
        },
        body: {
          background: 'linear-gradient(to bottom, #000000, #370427)',
          minHeight: '100vh',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#2A1D24', // Dark purple shade for cards
          borderRadius: 12, // Rounded corners to match the style
          padding: '16px',
          boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.2)', // Soft shadow for depth
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        root: {
          color: '#FFFFFF', // Default text color to white
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: {
          width: 42,
          height: 26,
          padding: 0,
          display: 'flex',
        },
        switchBase: {
          padding: 1,
          '&.Mui-checked': {
            transform: 'translateX(16px)',
            color: '#FFFFFF',
            '& + .MuiSwitch-track': {
              backgroundColor: '#FF007A', // Magenta/pink color when switch is "On"
              opacity: 1,
              border: 'none',
            },
          },
          '&.Mui-disabled + .MuiSwitch-track': {
            opacity: 0.3, // Dimmed appearance when disabled
          },
        },
        thumb: {
          width: 24,
          height: 24,
          boxShadow: 'none',
        },
        track: {
          borderRadius: 13,
          backgroundColor: '#4D4D4D', // Gray color when switch is "Off"
          opacity: 1,
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: {
          color: '#FF007A', // Magenta/pink for the slider track
          height: 4,
        },
        thumb: {
          width: 16,
          height: 16,
          backgroundColor: '#FFFFFF', // White thumb for contrast
          boxShadow: '0 0 0 4px rgba(255, 0, 122, 0.2)', // Pink glow around thumb
        },
        track: {
          height: 4,
          borderRadius: 2,
        },
        rail: {
          height: 4,
          borderRadius: 2,
          opacity: 0.3,
          backgroundColor: '#B3B3B3', // Light gray for unfilled track
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
        },
        containedPrimary: {
          color: '#FFFFFF',
          backgroundColor: '#FF007A',
          '&:hover': {
            backgroundColor: '#D10065', // Slightly darker pink on hover
          },
        },
        containedSecondary: {
          color: '#FFFFFF',
          backgroundColor: '#333333',
          '&:hover': {
            backgroundColor: '#444444', // Darker gray on hover
          },
        },
      },
    },
  },
});

export default theme;