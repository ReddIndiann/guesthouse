import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  breakpoints: {
    values: {
      xs: 0,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
    },
  },
  palette: {
    primary: { main: '#3d6b4f' },
    text: { primary: '#1a1814', secondary: '#8a8478' },
    background: { default: '#faf8f5', paper: '#ffffff' },
    divider: '#ebe6de',
  },
  typography: {
    fontFamily: '"DM Sans", system-ui, sans-serif',
    h4: { fontWeight: 600, letterSpacing: '-0.02em' },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 500 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 10, padding: '8px 18px' },
        contained: { boxShadow: 'none' },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 16, boxShadow: '0 8px 32px rgba(26, 24, 20, 0.08)' },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined', size: 'small' },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: 10, backgroundColor: '#faf8f5' },
        notchedOutline: { borderColor: '#ebe6de' },
      },
    },
  },
})
