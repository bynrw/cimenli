/**
 * APP.JSX - Hauptkomponente der Anwendung
 * 
 * Diese Komponente definiert:
 * - Das komplette Material-UI Theme (Farben, Typografie, Komponenten-Styles)
 * - Das Layout mit AppBar (Kopfzeile) und Container
 * - Die Struktur der gesamten Anwendung
 * - Benutzerinformationen aus Keycloak
 */

import React from 'react'
import { Container, Typography, Box, AppBar, Toolbar, CssBaseline, ThemeProvider, createTheme, Button, Menu, MenuItem, Avatar } from '@mui/material'
import { People as PeopleIcon, AccountCircle, ExitToApp } from '@mui/icons-material'
import { useKeycloak } from '@react-keycloak/web'
import Benutzerliste from './components/Benutzerliste'

/**
 * Benutzerdefiniertes Material-UI Theme
 * Definiert das komplette Erscheinungsbild der Anwendung
 */
const theme = createTheme({
    palette: {
        primary: {
            main: '#4169E1',
            light: '#6A8FE1',
            dark: '#2E4CB8',
        },
        secondary: {
            main: '#00BCD4',
            light: '#4DD0E1',
        },
        background: {
            default: '#F5F7FA',
            paper: '#FFFFFF',
        },
        success: {
            main: '#4CAF50',
        },
        error: {
            main: '#F44336',
        },
    },
    typography: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        h1: {
            fontWeight: 600,
            letterSpacing: '-0.5px',
        },
        h3: {
            fontWeight: 600,
        },
        button: {
            textTransform: 'none',
            fontWeight: 500,
        },
    },
    shape: {
        borderRadius: 12,
    },
    /**
     * Komponentenspezifische Style-Überschreibungen
     * Hier werden Standard-Styles von Material-UI-Komponenten angepasst
     */
    components: {

        MuiAppBar: {
            styleOverrides: {
                root: {
                    boxShadow: '0 4px 20px rgba(65, 105, 225, 0.25)',
                    backdropFilter: 'blur(10px)',
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    textTransform: 'none',
                    fontWeight: 600,
                    padding: '10px 20px',
                    transition: 'all 0.3s ease',
                },
                contained: {
                    boxShadow: '0 4px 12px rgba(65, 105, 225, 0.3)',
                    '&:hover': {
                        boxShadow: '0 6px 16px rgba(65, 105, 225, 0.4)',
                        transform: 'translateY(-2px)',
                    },
                },
                outlined: {
                    borderWidth: '2px',
                    '&:hover': {
                        borderWidth: '2px',
                        transform: 'translateY(-2px)',
                    },
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                    borderRadius: 12,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                        boxShadow: '0 6px 20px rgba(0, 0, 0, 0.12)',
                    },
                },
            },
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 8,
                        transition: 'all 0.3s ease',
                        '&:hover:not(.Mui-disabled) .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#4169E1',
                            borderWidth: 2,
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#4169E1',
                            boxShadow: '0 0 0 4px rgba(65, 105, 225, 0.1)',
                        },
                    },
                },
            },
        },
        MuiTableHead: {
            styleOverrides: {
                root: {
                    backgroundColor: '#F5F7FA',
                    '& .MuiTableCell-head': {
                        backgroundColor: '#4169E1',
                        color: '#FFFFFF',
                        fontWeight: 600,
                    },
                },
            },
        },

        MuiDialog: {
            styleOverrides: {
                paper: {
                    borderRadius: 16,
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                },
            },
        },

        MuiChip: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    fontWeight: 600,
                },
            },
        },
    },
})

/**
 * Rendert das komplette Layout der Anwendung
 */
function App() {
    const { keycloak, initialized } = useKeycloak()
    const [anchorEl, setAnchorEl] = React.useState(null)

    const handleMenu = (event) => {
        setAnchorEl(event.currentTarget)
    }

    const handleClose = () => {
        setAnchorEl(null)
    }

    const handleLogout = () => {
        keycloak.logout()
    }

    // Warten bis Keycloak initialisiert ist
    if (!initialized) {
        return <div>Lade...</div>
    }

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />

            <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                minHeight: '100vh',
                background: 'linear-gradient(to bottom, #F5F7FA 0%, #E8EEF7 100%)'
            }}>

                <AppBar
                    position="sticky"
                    sx={{
                        background: 'linear-gradient(135deg, #4169E1 0%, #2E4CB8 100%)',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                >
                    <Toolbar sx={{ py: 1 }}>
                        <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 48,
                            height: 48,
                            borderRadius: '12px',
                            background: 'rgba(255, 255, 255, 0.15)',
                            backdropFilter: 'blur(10px)',
                            mr: 2,
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                background: 'rgba(255, 255, 255, 0.25)',
                                transform: 'scale(1.05)'
                            }
                        }}>
                            <PeopleIcon sx={{ fontSize: 28, color: 'white' }} />
                        </Box>

                        <Typography
                            variant="h6"
                            component="div"
                            sx={{
                                flexGrow: 1,
                                fontWeight: 700,
                                letterSpacing: '0.5px',
                                fontSize: '1.25rem'
                            }}
                        >
                            Benutzerverwaltung
                        </Typography>

                        {/* Benutzer-Menü */}
                        {keycloak.authenticated && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
                                    {keycloak.tokenParsed?.preferred_username || keycloak.tokenParsed?.name || 'Benutzer'}
                                </Typography>
                                <Button
                                    color="inherit"
                                    onClick={handleMenu}
                                    startIcon={<AccountCircle />}
                                    sx={{
                                        borderRadius: 2,
                                        '&:hover': {
                                            background: 'rgba(255, 255, 255, 0.15)'
                                        }
                                    }}
                                >
                                    Profil
                                </Button>
                                <Menu
                                    anchorEl={anchorEl}
                                    open={Boolean(anchorEl)}
                                    onClose={handleClose}
                                    anchorOrigin={{
                                        vertical: 'bottom',
                                        horizontal: 'right',
                                    }}
                                    transformOrigin={{
                                        vertical: 'top',
                                        horizontal: 'right',
                                    }}
                                >
                                    <MenuItem disabled>
                                        <Typography variant="body2" color="text.secondary">
                                            {keycloak.tokenParsed?.email || 'Keine E-Mail'}
                                        </Typography>
                                    </MenuItem>
                                    <MenuItem onClick={handleLogout}>
                                        <ExitToApp sx={{ mr: 1 }} />
                                        Abmelden
                                    </MenuItem>
                                </Menu>
                            </Box>
                        )}
                    </Toolbar>
                </AppBar>

                <Box sx={{ flex: 1, width: '100%', height: '100%' }}>
                    <Benutzerliste />
                </Box>
            </Box>
        </ThemeProvider>
    )
}

export default App
