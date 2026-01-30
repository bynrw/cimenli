import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';
let keycloakInstance = null;

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

const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    withCredentials: true
});

// Request Interceptor: Fügt Keycloak Bearer Token hinzu
axiosInstance.interceptors.request.use(
    async (config) => {
        if (keycloakInstance && keycloakInstance.token) {
            try {
                const refreshed = await keycloakInstance.updateToken(5);
                if (refreshed) console.log('🔄 Token wurde erneuert');
            } catch (error) {
                console.error('❌ Token konnte nicht erneuert werden:', error);
                keycloakInstance.login();
            }

            config.headers.Authorization = `Bearer ${keycloakInstance.token}`;

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

// Response Interceptor: Behandelt 401/403 Fehler
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
            const params = {};

            if (searchParams.searchUsernameOrLastname) {
                params.searchUsernameOrLastname = searchParams.searchUsernameOrLastname;
                params.searchMode = 'SUBSTRING';
            }
            if (searchParams.orgUid) params.orgUid = searchParams.orgUid;
            if (searchParams.levelTypeId) params.levelTypeId = searchParams.levelTypeId;
            if (searchParams.levelId) params.levelId = searchParams.levelId;

            const response = await axiosInstance.get('/users', { params });
            return response.data;
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
            const response = await axiosInstance.get('/roles/select', { params });
            return response.data.options || [];
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
            const response = await axiosInstance.get('/organisations/select', { params });
            return response.data.options || [];
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
            const response = await axiosInstance.get('/organisations/leveltypes/select');
            return response.data.options || [];
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
            const response = await axiosInstance.get('/organisations/level/select');
            return response.data.options || [];
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
            const response = await axiosInstance.get(`/users/${userUid}`);
            return response.data;
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

            const response = await axiosInstance.post('/users', requestData);
            return response.data;
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
            if (!userData.userUid) throw new Error('userUid ist erforderlich für Update');

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

            const response = await axiosInstance.put(`/users/${userData.userUid}`, requestData);
            return response.data;
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
            const response = await axiosInstance.delete(`/users/${userUid}`);
            return response.data;
        } catch (error) {
            console.error(`Fehler beim Löschen von Benutzer ${userUid}:`, error);
            throw error;
        }
    }
};

export default userService;
