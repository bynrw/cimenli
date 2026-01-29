/**
 * USER SERVICE - API-Kommunikationsschicht
 * 
 * Diese Datei verwaltet alle HTTP-Anfragen zum Backend:
 * - CRUD-Operationen für Benutzer (Create, Read, Update, Delete)
 * - Axios-Konfiguration mit CORS-Unterstützung
 * - Keycloak-Token-Integration für Authentifizierung
 * - Fehlerbehandlung für API-Aufrufe
 */

import axios from 'axios';

// Basis-URL des Spring Boot Backend-Servers
const API_BASE_URL = 'http://localhost:8080/api';

// Variable für Keycloak-Instanz (wird von außen gesetzt)
let keycloakInstance = null;

/**
 * Keycloak-Instanz setzen
 * Diese Methode muss beim App-Start aufgerufen werden
 * @param {Object} keycloak - Die Keycloak-Instanz aus useKeycloak()
 */
export const setKeycloakInstance = (keycloak) => {
    keycloakInstance = keycloak;

    if (keycloak && keycloak.token) {
        console.log('✅ Keycloak-Instanz erfolgreich gesetzt:', {
            authenticated: keycloak.authenticated,
            user: keycloak.tokenParsed?.preferred_username,
            email: keycloak.tokenParsed?.email,
            roles: keycloak.tokenParsed?.realm_access?.roles,
            tokenLength: keycloak.token.length,
            expiresAt: keycloak.tokenParsed?.exp
                ? new Date(keycloak.tokenParsed.exp * 1000).toLocaleString('de-DE')
                : 'N/A'
        });
    } else {
        console.warn('⚠️ Keycloak-Instanz gesetzt, aber kein Token verfügbar');
    }
};

/**
 * Aktuellen Token-Status abrufen (für Debugging)
 * @returns {Object} Token-Status-Informationen
 */
export const getTokenInfo = () => {
    if (!keycloakInstance) {
        return { error: 'Keine Keycloak-Instanz gesetzt' };
    }

    if (!keycloakInstance.token) {
        return { error: 'Kein Token verfügbar' };
    }

    return {
        hasToken: !!keycloakInstance.token,
        authenticated: keycloakInstance.authenticated,
        tokenPreview: keycloakInstance.token.substring(0, 100) + '...',
        fullToken: keycloakInstance.token,
        tokenParsed: keycloakInstance.tokenParsed,
        user: keycloakInstance.tokenParsed?.preferred_username,
        email: keycloakInstance.tokenParsed?.email,
        roles: keycloakInstance.tokenParsed?.realm_access?.roles,
        expiresAt: keycloakInstance.tokenParsed?.exp
            ? new Date(keycloakInstance.tokenParsed.exp * 1000).toLocaleString('de-DE')
            : 'N/A',
        isExpired: keycloakInstance.isTokenExpired()
    };
};

/**
 * Konfigurierte Axios-Instanz für API-Anfragen
 * - baseURL: Automatisches Voranstellen der API-URL bei allen Anfragen
 * - headers: JSON-Content-Type für Request und Response
 * - withCredentials: Ermöglicht das Senden von Cookies für CORS-Anfragen
 */
const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',  // Daten als JSON senden
        'Accept': 'application/json'          // JSON-Antworten erwarten
    },
    withCredentials: true  // Wichtig für Cross-Origin-Requests mit Authentifizierung
});

/**
 * Request Interceptor: Fügt Keycloak-Token zu jedem Request hinzu
 */
axiosInstance.interceptors.request.use(
    async (config) => {
        if (keycloakInstance && keycloakInstance.token) {
            // Token automatisch erneuern, wenn es bald abläuft (5 Sekunden vor Ablauf)
            try {
                const refreshed = await keycloakInstance.updateToken(5);
                if (refreshed) {
                    console.log('🔄 Token wurde erneuert');
                }
            } catch (error) {
                console.error('❌ Token konnte nicht erneuert werden:', error);
                keycloakInstance.login();
            }

            // Bearer Token zu Authorization-Header hinzufügen
            config.headers.Authorization = `Bearer ${keycloakInstance.token}`;

            // Debug: Token-Info ausgeben
            console.log('🔐 Bearer Token wird gesendet:', {
                url: config.url,
                method: config.method.toUpperCase(),
                tokenPreview: keycloakInstance.token.substring(0, 50) + '...',
                tokenLength: keycloakInstance.token.length,
                expiresAt: keycloakInstance.tokenParsed?.exp
                    ? new Date(keycloakInstance.tokenParsed.exp * 1000).toLocaleString('de-DE')
                    : 'N/A',
                user: keycloakInstance.tokenParsed?.preferred_username || 'N/A'
            });
        } else {
            console.warn('⚠️ Kein Keycloak-Token verfügbar für Request:', config.url);
        }
        return config;
    },
    (error) => {
        console.error('❌ Request Interceptor Fehler:', error);
        return Promise.reject(error);
    }
);

/**
 * Response Interceptor: Behandelt 401-Fehler (nicht autorisiert)
 */
axiosInstance.interceptors.response.use(
    (response) => {
        console.log('✅ API Response erfolgreich:', {
            url: response.config.url,
            status: response.status,
            dataType: Array.isArray(response.data) ? 'Array' : typeof response.data
        });
        return response;
    },
    (error) => {
        if (error.response?.status === 401) {
            console.error('🚫 401 Unauthorized - Token ungültig oder abgelaufen');
            if (keycloakInstance) {
                console.log('🔄 Weiterleitung zur Anmeldung...');
                keycloakInstance.login();
            }
        } else if (error.response?.status === 403) {
            console.error('🚫 403 Forbidden - Keine Berechtigung für diese Ressource');
        } else {
            console.error('❌ API Fehler:', {
                url: error.config?.url,
                status: error.response?.status,
                message: error.message,
                data: error.response?.data
            });
        }
        return Promise.reject(error);
    }
);

/**
 * UserService-Objekt mit allen API-Methoden für Benutzerverwaltung
 */
const userService = {
    /**
     * Alle Benutzer abrufen mit optionalen Suchparametern
     * @param {Object} searchParams - Optional: Filter-Parameter für die Suche
     * @param {string} searchParams.searchUsernameOrLastname - Suche nach Username oder Nachname
     * @param {string} searchParams.orgUid - Organisation UID zum Filtern
     * @param {number} searchParams.levelTypeId - Level Type ID zum Filtern
     * @param {number} searchParams.levelId - Level ID zum Filtern
     * @returns {Promise} Promise mit Benutzerdaten vom Server
     */
    getUsers: async (searchParams = {}) => {
        try {
            // Query-Parameter als flache Struktur vorbereiten
            const params = {};

            // Suchbegriff für Username/Nachname
            if (searchParams.searchUsernameOrLastname) {
                params.searchUsernameOrLastname = searchParams.searchUsernameOrLastname;
                params.searchMode = 'SUBSTRING';
            }

            // Organisation UID
            if (searchParams.orgUid) {
                params.orgUid = searchParams.orgUid;
            }

            // Level Type ID
            if (searchParams.levelTypeId) {
                params.levelTypeId = searchParams.levelTypeId;
            }

            // Level ID
            if (searchParams.levelId) {
                params.levelId = searchParams.levelId;
            }

            console.log('Sending GET request to /api/users with params:', params);

            // GET-Request an /api/users mit Query-Parametern
            const response = await axiosInstance.get('/users', { params });

            console.log('Received response:', response.data);
            return response.data;  // Gibt die Benutzerliste zurück
        } catch (error) {
            console.error('Fehler beim Abrufen der Benutzer:', error);
            console.error('Request params were:', searchParams);
            throw error;  // Fehler wird an aufrufende Komponente weitergegeben
        }
    },

    /**
    * Alle verfügbaren Rollen abrufen
    * @param {Object} params - Optional: Filter-Parameter
    * @param {string} params.orgUid - Organisation UID zum Filtern
    * @param {number} params.levelTypeId - Level Type ID zum Filtern
    * @returns {Promise} Promise mit Liste aller Rollen
    */
    getRoles: async (params = {}) => {
        try {
            // GET-Request an /api/roles/select mit Query-Parametern
            const response = await axiosInstance.get('/roles/select', { params });
            return response.data.options || [];  // API gibt { options: [{id, label}] } zurück
        } catch (error) {
            console.error('Fehler beim Abrufen der Rollen:', error);
            throw error;
        }
    },

    /**
    * Alle verfügbaren Organisationen abrufen
    * @param {Object} params - Optional: Filter-Parameter
    * @param {string} params.orgUid - Organisation UID zum Filtern
    * @param {number} params.levelTypeId - Level Type ID zum Filtern
    * @param {number} params.levelId - Level ID zum Filtern
    * @returns {Promise} Promise mit Liste aller Organisationen (mit uuid statt id)
    */
    getOrganisations: async (params = {}) => {
        try {
            // GET-Request an /api/organisations/select mit Query-Parametern
            const response = await axiosInstance.get('/organisations/select', { params });
            return response.data.options || [];  // API gibt { options: [{uuid, label}] } zurück
        } catch (error) {
            console.error('Fehler beim Abrufen der Organisationen:', error);
            throw error;
        }
    },

    /**
    * Alle verfügbaren Organisationstypen abrufen (z.B. Gemeinde, Stadt, etc.)
    * @returns {Promise} Promise mit Liste aller Organisationstypen
    */
    getOrganisationLevelTypes: async () => {
        try {
            // GET-Request an /api/organisations/leveltypes/select
            const response = await axiosInstance.get('/organisations/leveltypes/select');
            return response.data.options || [];  // API gibt { options: [{id, label}] } zurück
        } catch (error) {
            console.error('Fehler beim Abrufen der Organisationstypen:', error);
            throw error;
        }
    },

    /**
    * Alle verfügbaren Organisationsebenen abrufen (z.B. Aachen, Köln, etc.)
    * @returns {Promise} Promise mit Liste aller Organisationsebenen
    */
    getOrganisationLevels: async () => {
        try {
            // GET-Request an /api/organisations/level/select
            const response = await axiosInstance.get('/organisations/level/select');
            return response.data.options || [];  // API gibt { options: [{id, label}] } zurück
        } catch (error) {
            console.error('Fehler beim Abrufen der Organisationsebenen:', error);
            throw error;
        }
    },

    /**
     * Einzelnen Benutzer anhand der UUID abrufen
     * @param {string} userUid - Eindeutige Benutzer-ID (UUID)
     * @returns {Promise} Promise mit Benutzerdetails
     */
    getUserById: async (userUid) => {
        try {
            // GET-Request an /api/users/{userUid}
            const response = await axiosInstance.get(`/users/${userUid}`);
            return response.data;  // Gibt detaillierte Benutzerdaten zurück
        } catch (error) {
            console.error(`Fehler beim Abrufen von Benutzer ${userUid}:`, error);
            throw error;
        }
    },

    /**
     * Neuen Benutzer erstellen
     * @param {Object} userData - Benutzerdaten
     * @param {string} userData.firstName - Vorname
     * @param {string} userData.lastName - Nachname
     * @param {string} userData.mail - E-Mail
     * @param {string} userData.phone - Telefon
     * @param {Array} userData.organisations - Array von Organisationen mit Rollen
     * @returns {Promise} Promise mit dem erstellten Benutzer
     */
    createUser: async (userData) => {
        try {
            // Datenstruktur für Backend vorbereiten
            const requestData = {
                firstName: userData.firstName,
                lastName: userData.lastName,
                mail: userData.mail,
                phone: userData.phone || '',
                organisations: (userData.organisations || []).map(org => ({
                    orgUid: org.orgUid,
                    roles: (org.roles || []).map(role => ({
                        roleId: role.roleId || role.id
                    }))
                }))
            };

            console.log('Sending POST request to /users with data:', requestData);
            // POST-Request an /api/users mit Benutzerdaten im Body
            const response = await axiosInstance.post('/users', requestData);
            console.log('Create user response:', response);
            return response.data;  // Gibt den neu erstellten Benutzer zurück
        } catch (error) {
            console.error('Fehler beim Erstellen des Benutzers:', error);
            console.error('Error response:', error.response);
            console.error('Error status:', error.response?.status);
            console.error('Error data:', error.response?.data);
            throw error;
        }
    },

    /**
     * Bestehenden Benutzer aktualisieren
     * @param {Object} userData - Aktualisierte Benutzerdaten (muss userUid enthalten)
     * @returns {Promise} Promise mit dem aktualisierten Benutzer
     */
    updateUser: async (userData) => {
        try {
            if (!userData.userUid) {
                throw new Error('userUid ist erforderlich für Update');
            }

            // Datenstruktur für Backend vorbereiten
            const requestData = {
                firstName: userData.firstName,
                lastName: userData.lastName,
                mail: userData.mail,
                phone: userData.phone || '',
                organisations: (userData.organisations || []).map(org => ({
                    orgUid: org.orgUid,
                    roles: (org.roles || []).map(role => ({
                        roleId: role.roleId || role.id
                    }))
                }))
            };

            console.log(`Sending PUT request to /users/${userData.userUid} with data:`, requestData);
            // PUT-Request an /api/users/{userUid} mit vollständigen Benutzerdaten
            const response = await axiosInstance.put(`/users/${userData.userUid}`, requestData);
            return response.data;  // Gibt den aktualisierten Benutzer zurück
        } catch (error) {
            console.error('Fehler beim Aktualisieren des Benutzers:', error);
            throw error;
        }
    },

    /**
     * Benutzer löschen
     * @param {string} userUid - UUID des zu löschenden Benutzers
     * @returns {Promise} Promise mit Bestätigung des Löschvorgangs
     */
    deleteUser: async (userUid) => {
        try {
            // DELETE-Request an /api/users/{userUid}
            const response = await axiosInstance.delete(`/users/${userUid}`);
            return response.data;  // Gibt Bestätigung zurück
        } catch (error) {
            console.error(`Fehler beim Löschen von Benutzer ${userUid}:`, error);
            throw error;
        }
    }


};

export default userService;
