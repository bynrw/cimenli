/**
 * MAIN.JSX - Einstiegspunkt der React-Anwendung
 * 
 * Diese Datei ist der zentrale Einstiegspunkt, der:
 * - Die React-Anwendung initialisiert
 * - Das Material-UI Theme bereitstellt
 * - Die Keycloak-Authentifizierung bereitstellt
 * - Die Haupt-App-Komponente rendert
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { ReactKeycloakProvider } from '@react-keycloak/web'
import App from './App.jsx'
import keycloak from './keycloak.js'

// Grundlegendes Theme für Material-UI erstellen
// Wird später in App.jsx durch ein detaillierteres Theme überschrieben
const theme = createTheme({
    palette: {
        mode: 'light', // Heller Modus für die Anwendung
    },
})

// Keycloak-Initialisierungsoptionen
const keycloakInitOptions = {
    onLoad: 'login-required', // Benutzer muss sich anmelden, um die App zu nutzen
    checkLoginIframe: false, // Deaktiviert iframe-basierte Session-Checks (optional)
}

// Loading-Komponente während Keycloak initialisiert wird
const LoadingComponent = (
    <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
    }}>
        Lade Authentifizierung...
    </div>
)

// React-App in das DOM-Element mit der ID 'root' rendern
// HINWEIS: React.StrictMode ist deaktiviert, da es mit Keycloak zu Problemen führt
// Im StrictMode werden Komponenten zweimal gerendert, was die Keycloak-Initialisierung stört
ReactDOM.createRoot(document.getElementById('root')).render(
    // <React.StrictMode>
    <ReactKeycloakProvider
        authClient={keycloak}
        initOptions={keycloakInitOptions}
        LoadingComponent={LoadingComponent}
    >
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <App />
        </ThemeProvider>
    </ReactKeycloakProvider>
    // </React.StrictMode>
)
