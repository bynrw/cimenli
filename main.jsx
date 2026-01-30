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
    checkLoginIframe: false, // Deaktiviert iframe-basierte Session-Checks
    pkceMethod: 'S256', // PKCE für sichere Authentifizierung
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

// Token-Event Handler - speichert Tokens für Session-Persistenz
const onKeycloakTokens = (tokens) => {
    if (tokens?.token) {
        console.log('Keycloak tokens received')
    }
}

// Event Handler für Keycloak-Events
const onKeycloakEvent = (event, error) => {
    console.log('Keycloak event:', event)
    if (error) {
        console.error('Keycloak error:', error)
    }
    // Nach erfolgreichem Login: URL-Parameter bereinigen
    if (event === 'onAuthSuccess') {
        // Entferne Keycloak-Parameter aus der URL um Redirect-Schleife zu verhindern
        if (window.location.search.includes('state=') || window.location.search.includes('code=')) {
            window.history.replaceState({}, document.title, window.location.pathname)
        }
    }
}

// React-App in das DOM-Element mit der ID 'root' rendern
// HINWEIS: React.StrictMode ist deaktiviert, da es mit Keycloak zu Problemen führt
// Im StrictMode werden Komponenten zweimal gerendert, was die Keycloak-Initialisierung stört
ReactDOM.createRoot(document.getElementById('root')).render(
    // <React.StrictMode>
    <ReactKeycloakProvider
        authClient={keycloak}
        initOptions={keycloakInitOptions}
        LoadingComponent={LoadingComponent}
        onEvent={onKeycloakEvent}
        onTokens={onKeycloakTokens}
    >
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <App />
        </ThemeProvider>
    </ReactKeycloakProvider>
    // </React.StrictMode>
)
