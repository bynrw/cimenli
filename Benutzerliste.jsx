/**
 * BENUTZERLISTE.JSX - Haupt-Tabellen-Komponente
 * 
 * Diese Komponente verwaltet:
 * - Anzeige aller Benutzer in einer Tabelle
 * - Suchfunktion nach Name/Email/Benutzername
 * - Filterung nach Organisationen
 * - Anzeige von Benutzerdetails in einem Modal
 * - Löschen von Benutzern mit Bestätigungsdialog
 * - Kommunikation mit dem Backend über userService
 * - Keycloak-Integration für Authentifizierung
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    TextField,
    Box,
    CircularProgress,
    Alert,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Card,
    InputAdornment,
    Tooltip,
    Chip,
    Typography,
    TablePagination,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    ListItemButton,
    Avatar,
    Divider,
    ToggleButton,
    ToggleButtonGroup
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Visibility as VisibilityIcon, Search as SearchIcon, Close as CloseIcon, Add as AddIcon, FilterList as FilterListIcon, Business as BusinessIcon, AccountCircle as AccountCircleIcon, ViewModule as ViewModuleIcon, ViewList as ViewListIcon } from '@mui/icons-material';
// import { useKeycloak } from '@react-keycloak/web';
import userService, { setKeycloakInstance } from '../services/mockUserService';  // Echter userService für Backend-API
// import userService, { setKeycloakInstance } from '../services/mockUserService';  // Mock-Daten für lokale Tests ohne Backend
import BenutzerDetail from './BenutzerDetail';
import BenutzerFormStepper from './BenutzerFormStepper';

const Benutzerliste = () => {
    // const { keycloak } = useKeycloak();

    // Keycloak-Instanz im userService setzen
    // useEffect(() => {
    //     if (keycloak) {
    //         setKeycloakInstance(keycloak);
    //     }
    // }, [keycloak]);

    // ========== STATE-VERWALTUNG ==========

    // Vollständige Benutzerliste (ungefiltert)
    const [allUsers, setAllUsers] = useState([]);

    // Gefilterte Benutzerdaten für Anzeige
    const [users, setUsers] = useState([]);

    // Ladezustand während API-Anfragen
    const [loading, setLoading] = useState(false);

    // Fehlermeldungen für API-Fehler
    const [error, setError] = useState(null);

    // Suchbegriff für Name/Email-Suche
    const [searchTerm, setSearchTerm] = useState('');

    // Ausgewählte Organisation für Filterung
    const [organisationFilter, setOrganisationFilter] = useState('');

    // Aktuell ausgewählter Benutzer für Detailansicht
    const [selectedUser, setSelectedUser] = useState(null);

    // Status des Detail-Dialogs (offen/geschlossen)
    const [detailOpen, setDetailOpen] = useState(false);

    // Status des Lösch-Bestätigungsdialogs
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    // ID des zu löschenden Benutzers
    const [deleteTargetId, setDeleteTargetId] = useState(null);

    // Liste aller verfügbaren Organisationen (für Filter-Dropdown)
    const [organisations, setOrganisations] = useState([]);

    // Map für Organisation Name -> UUID
    const [orgNameToUidMap, setOrgNameToUidMap] = useState({});

    // Liste aller verfügbaren Rollen (für Filter-Dropdown)
    const [availableRoles, setAvailableRoles] = useState([]);

    // Map für Rollen Name -> ID/UUID
    const [roleNameToIdMap, setRoleNameToIdMap] = useState({});

    // Ausgewählte Rolle für Filterung
    const [roleFilter, setRoleFilter] = useState('');

    // Status des Formular-Dialogs (offen/geschlossen)
    const [formOpen, setFormOpen] = useState(false);

    // Benutzer für Bearbeitung (null = neuer Benutzer erstellen)
    const [editingUser, setEditingUser] = useState(null);

    // Pagination-State
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(50);

    // View Mode (table oder cards)
    const [viewMode, setViewMode] = useState('cards'); // 'table' oder 'cards'

    // Debouncing-Timer für Suche
    const searchTimerRef = useRef(null);

    /**
     * useEffect: Wird beim ersten Laden der Komponente ausgeführt
     * - Lädt alle Benutzer vom Backend
     * - Lädt alle verfügbaren Organisationen
     * - Lädt alle verfügbaren Rollen
     */
    useEffect(() => {
        fetchUsers();              // Benutzer vom Backend laden
        fetchOrganisations();      // Organisationen vom Backend laden
        fetchRoles();              // Alle verfügbaren Rollen laden

        // Cleanup: Timer beim Unmount abbrechen
        return () => {
            if (searchTimerRef.current) {
                clearTimeout(searchTimerRef.current);
            }
        };
    }, []); // Leeres Array [] bedeutet: nur einmal beim Komponentenstart ausführen

    // ========== API-KOMMUNIKATION ==========

    /**
     * Benutzer vom Backend laden mit Server-Side-Filtering
     * @param {string} nameSearch - Suchbegriff für Username/Nachname
     * @param {string} orgUid - Organisation UID zum Filtern
     * @param {string} roleId - Rollen-ID zum Filtern
     * 
     * Diese Funktion:
     * 1. Setzt den Ladezustand
     * 2. Baut Filter-Parameter für Backend auf
     * 3. Ruft die API über userService auf
     * 4. Verarbeitet verschiedene Antwortformate (HAL, Array, Content)
     * 5. Extrahiert und speichert die Benutzerdaten
     * 6. Extrahiert die Organisationen für den Filter
     */
    const fetchUsers = async (nameSearch = '', orgUid = '', roleId = '') => {
        setLoading(true);
        setError(null);

        try {
            console.log('fetchUsers called with:', { nameSearch, orgUid, roleId });

            // Filter-Parameter für Backend vorbereiten
            const searchParams = {};
            if (nameSearch) {
                searchParams.searchUsernameOrLastname = nameSearch;
            }
            if (orgUid) {
                searchParams.orgUid = orgUid;
            }
            if (roleId) {
                searchParams.roleId = roleId;  // Backend erwartet roleId, nicht roleName!
            }

            console.log('Sending searchParams to backend:', searchParams);

            // API-Aufruf über userService mit Filter-Parametern
            const response = await userService.getUsers(searchParams);
            console.log('API Response:', response);

            // ===== Verschiedene API-Antwortformate verarbeiten =====
            let userList = [];

            if (response._embedded && response._embedded.users) {
                userList = response._embedded.users;
            }
            else if (Array.isArray(response)) {
                userList = response;
            }
            else if (response.content && Array.isArray(response.content)) {
                userList = response.content;
            }

            console.log('Extracted users:', userList);
            const userArray = Array.isArray(userList) ? userList : [];
            setAllUsers(userArray);  // Vollständige Liste speichern
            setUsers(userArray);     // Gefilterte Liste vom Backend anzeigen
        } catch (err) {
            setError('Fehler beim Laden der Benutzer');
            console.error('Error details:', err.response?.data || err.message);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Alle verfügbaren Organisationen vom Backend laden
     */
    const fetchOrganisations = async () => {
        try {
            const orgs = await userService.getOrganisations();
            // API gibt [{uuid, label}] zurück
            if (Array.isArray(orgs)) {
                const orgLabels = orgs.map(org => org.label).sort();
                setOrganisations(orgLabels);

                // Map erstellen: Organisationsname -> UUID
                const nameToUid = {};
                orgs.forEach(org => {
                    nameToUid[org.label] = org.uuid;
                });
                setOrgNameToUidMap(nameToUid);
                console.log('Organisations-Map erstellt:', nameToUid);
            }
        } catch (err) {
            console.error('Fehler beim Laden der Organisationen:', err);
            setOrganisations([]);
            setOrgNameToUidMap({});
        }
    };

    /**
     * Alle verfügbaren Rollen vom Backend laden
     */
    const fetchRoles = async () => {
        try {
            const roles = await userService.getRoles();
            console.log('Geladene Rollen vom Backend:', roles);

            // API gibt uuid statt id zurück - transformieren
            const transformedRoles = Array.isArray(roles)
                ? roles.map(role => ({ id: role.uuid || role.id, label: role.label }))
                : [];
            setAvailableRoles(transformedRoles);

            // Map erstellen: Rollenname -> UUID/ID (für Backend-Filter)
            const nameToId = {};
            if (Array.isArray(roles)) {
                roles.forEach(role => {
                    nameToId[role.label] = role.uuid || role.id;
                });
            }
            setRoleNameToIdMap(nameToId);
            console.log('Rollen-Map erstellt:', nameToId);
        } catch (err) {
            console.error('Fehler beim Laden der Rollen:', err);
            setAvailableRoles([]);
            setRoleNameToIdMap({});
        }
    };

    // ========== SUCH- UND FILTER-FUNKTIONEN ==========

    /**
     * Handler für Name/Email/Benutzername-Suche mit Debouncing
     * @param {Event} e - Input-Change-Event
     * 
     * Wartet 500ms nach letzter Eingabe bevor Backend abgefragt wird
     * Verhindert zu viele API-Calls bei 10.000+ Benutzern
     */
    const handleNameSearch = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        setPage(0); // Zurück zur ersten Seite bei neuer Suche

        // Vorherigen Timer abbrechen
        if (searchTimerRef.current) {
            clearTimeout(searchTimerRef.current);
        }

        // Neuen Timer starten (500ms Verzögerung)
        searchTimerRef.current = setTimeout(() => {
            const orgUid = organisationFilter ? orgNameToUidMap[organisationFilter] : '';
            const roleId = roleFilter ? roleNameToIdMap[roleFilter] : '';
            fetchUsers(value, orgUid, roleId);
        }, 500);
    };

    /**
     * Handler für Organisations-Filter
     * @param {Event} e - Select-Change-Event
     * 
     * Wird aufgerufen, wenn eine Organisation im Dropdown ausgewählt wird und löst Backend-Filterung aus
     */
    const handleOrganisationFilter = (e) => {
        const orgName = e.target.value;
        setOrganisationFilter(orgName);
        setPage(0); // Zurück zur ersten Seite

        // Organisation-Name in UUID umwandeln
        const orgUid = orgName ? orgNameToUidMap[orgName] : '';

        // Rollen-Name in ID umwandeln
        const roleId = roleFilter ? roleNameToIdMap[roleFilter] : '';

        console.log('Filter Organisation:', { orgName, orgUid, roleId });

        // Server-Side-Filtering: Backend mit UUID abfragen
        fetchUsers(searchTerm, orgUid, roleId);
    };

    /**
     * Handler für Rollen-Filter
     * @param {Event} e - Select-Change-Event
     * 
     * Wird aufgerufen, wenn eine Rolle im Dropdown ausgewählt wird und löst Backend-Filterung aus
     */
    const handleRoleFilter = (e) => {
        const roleName = e.target.value;
        setRoleFilter(roleName);
        setPage(0); // Zurück zur ersten Seite

        // Organisation-Name in UUID umwandeln
        const orgUid = organisationFilter ? orgNameToUidMap[organisationFilter] : '';

        // Rollen-Name in ID/UUID umwandeln
        const roleId = roleName ? roleNameToIdMap[roleName] : '';

        console.log('=== Filter Rolle ===');
        console.log('Rollenname:', roleName);
        console.log('Rollen-ID:', roleId);
        console.log('Suchbegriff:', searchTerm);
        console.log('Org-UUID:', orgUid);

        // Server-Side-Filtering: Backend mit roleId (nicht roleName!) abfragen
        fetchUsers(searchTerm, orgUid, roleId);
    };

    /**
     * HINWEIS: Client-seitige Filterung wurde entfernt!
     * 
     * Alle Filter werden jetzt SERVER-SEITIG im Backend angewendet.
     * Die Filter-Handler (handleNameSearch, handleOrganisationFilter, handleRoleFilter)
     * rufen direkt fetchUsers() auf, welche die Parameter ans Backend sendet.
     * 
     * Vorteile:
     * - Bessere Performance bei großen Datenmengen
     * - Weniger Netzwerkverkehr (nur gefilterte Daten werden übertragen)
     * - Geringerer Speicherverbrauch im Browser
     * - Konsistente Filterlogik (Backend ist Single Source of Truth)
     */

    // ========== DETAIL-ANSICHT FUNKTIONEN ==========

    /**
     * Benutzerdetails in Modal anzeigen
     * @param {string} userId - UUID des anzuzeigenden Benutzers
     * 
     * Diese Funktion:
     * 1. Lädt vollständige Benutzerdaten vom Backend
     * 2. Öffnet das Detail-Modal
     * 3. Zeigt die Daten in der BenutzerDetail-Komponente an
     */
    const handleViewDetails = async (userId) => {
        try {
            const response = await userService.getUserById(userId);

            const userData = response.content || response;

            setSelectedUser(userData);
            setDetailOpen(true);
        } catch (err) {
            setError('Fehler beim Laden der Benutzerdetails');
        }
    };

    /**
     * Detail-Modal schließen und State zurücksetzen
     */
    const handleCloseDetail = () => {
        setDetailOpen(false);
        setSelectedUser(null);
    };

    // ========== LÖSCH-FUNKTIONEN ==========

    /**
     * Lösch-Bestätigungsdialog öffnen
     * @param {string} userId - UUID des zu löschenden Benutzers
     * 
     * Öffnet einen Bestätigungsdialog, bevor der Benutzer
     * tatsächlich gelöscht wird (Best Practice: Sicherheitsabfrage)
     */
    const handleOpenDeleteDialog = (userId) => {
        setDeleteTargetId(userId);
        setDeleteDialogOpen(true);
    };

    /**
     * Lösch-Bestätigungsdialog schließen ohne zu löschen
     */
    const handleCloseDeleteDialog = () => {
        setDeleteDialogOpen(false);
        setDeleteTargetId(null);
    };

    /**
     * Benutzer endgültig löschen (nach Bestätigung)
     * 
     * Diese Funktion:
     * 1. Sendet DELETE-Request an Backend
     * 2. Entfernt Benutzer aus der lokalen Liste (UI-Update)
     * 3. Schließt den Bestätigungsdialog
     * 4. Zeigt Fehlermeldung bei Problemen
     */
    const handleConfirmDelete = async () => {
        try {
            // API-Aufruf zum Löschen
            await userService.deleteUser(deleteTargetId);

            setUsers(users.filter(user => user.userUid !== deleteTargetId));

            handleCloseDeleteDialog();

            setError(null);
        } catch (err) {
            setError('Fehler beim Löschen des Benutzers');
            console.error(err);
        }
    };

    // ========== CREATE/EDIT-FUNKTIONEN ==========

    /**
     * Formular zum Erstellen eines neuen Benutzers öffnen
     */
    const handleOpenCreateForm = () => {
        setEditingUser(null);
        setFormOpen(true);
    };

    /**
     * Formular zum Bearbeiten eines Benutzers öffnen
     * @param {Object} user - Zu bearbeitender Benutzer
     */
    const handleOpenEditForm = (user) => {
        setEditingUser(user);
        setFormOpen(true);
    };

    /**
     * Formular schließen und State zurücksetzen
     */
    const handleCloseForm = () => {
        setFormOpen(false);
        setEditingUser(null);
    };

    /**
     * Nach erfolgreichem Speichern: Benutzerliste neu laden
     */
    const handleFormSuccess = () => {
        fetchUsers();
        handleCloseForm();
    };

    // ========== PAGINATION-HANDLER ==========

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    // Berechne die anzuzeigenden Benutzer für aktuelle Seite
    const displayedUsers = users.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    if (loading && users.length === 0) {
        return <CircularProgress />;
    }

    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            height: 'calc(100vh - 64px)',
            width: '100%',
            overflow: 'hidden'
        }}>
            {/* Moderne Filter Card */}
            <Box sx={{ mb: 3, mx: 2, mt: 2, flexShrink: 0 }}>
                <Card
                    elevation={0}
                    sx={{
                        p: 3,
                        background: 'linear-gradient(135deg, rgba(65, 105, 225, 0.05) 0%, rgba(255, 255, 255, 1) 100%)',
                        border: '1px solid rgba(65, 105, 225, 0.1)',
                        backdropFilter: 'blur(10px)',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                            boxShadow: '0 8px 24px rgba(65, 105, 225, 0.15)',
                            borderColor: 'rgba(65, 105, 225, 0.3)',
                        }
                    }}
                >
                    {/* Header mit Button */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 48,
                                height: 48,
                                borderRadius: '14px',
                                background: 'linear-gradient(135deg, #4169E1 0%, #2E4CB8 100%)',
                                boxShadow: '0 4px 14px rgba(65, 105, 225, 0.3)',
                            }}>
                                <FilterListIcon sx={{ color: 'white', fontSize: 24 }} />
                            </Box>
                            <Box>
                                <Typography variant="h6" sx={{ fontWeight: 700, color: '#2E4CB8', lineHeight: 1.2 }}>
                                    Benutzer suchen & filtern
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>
                                    {users.length} Benutzer gefunden
                                </Typography>
                            </Box>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                            <ToggleButtonGroup
                                value={viewMode}
                                exclusive
                                onChange={(e, newMode) => newMode && setViewMode(newMode)}
                                size="small"
                                sx={{
                                    backgroundColor: 'white',
                                    '& .MuiToggleButton-root': {
                                        px: 2,
                                        py: 1,
                                        border: '1px solid rgba(65, 105, 225, 0.2)',
                                        '&.Mui-selected': {
                                            backgroundColor: '#4169E1',
                                            color: 'white',
                                            '&:hover': {
                                                backgroundColor: '#2E4CB8',
                                            },
                                        },
                                        '&:hover': {
                                            backgroundColor: 'rgba(65, 105, 225, 0.1)',
                                        },
                                    },
                                }}
                            >
                                <ToggleButton value="cards" aria-label="card view">
                                    <ViewModuleIcon sx={{ mr: 0.5 }} />
                                    Cards
                                </ToggleButton>
                                <ToggleButton value="list" aria-label="list view">
                                    <ViewListIcon sx={{ mr: 0.5 }} />
                                    Liste
                                </ToggleButton>
                            </ToggleButtonGroup>
                            <Button
                                variant="contained"
                                size="large"
                                startIcon={<AddIcon />}
                                onClick={handleOpenCreateForm}
                                sx={{
                                    px: 4,
                                    py: 1.5,
                                    borderRadius: 3,
                                    background: 'linear-gradient(135deg, #4CAF50 0%, #45A049 100%)',
                                    fontSize: '1rem',
                                    fontWeight: 700,
                                    textTransform: 'none',
                                    boxShadow: '0 4px 14px rgba(76, 175, 80, 0.4)',
                                    '&:hover': {
                                        background: 'linear-gradient(135deg, #45A049 0%, #388E3C 100%)',
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 6px 20px rgba(76, 175, 80, 0.5)',
                                    },
                                    transition: 'all 0.3s ease',
                                }}
                            >
                                Neuer Benutzer
                            </Button>
                        </Box>
                    </Box>

                    {/* Filter-Felder */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
                        <TextField
                            fullWidth
                            label="Benutzer suchen"
                            placeholder="Name, Email, Benutzername..."
                            value={searchTerm}
                            onChange={handleNameSearch}
                            variant="outlined"
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon sx={{ color: '#4169E1' }} />
                                    </InputAdornment>
                                ),
                                endAdornment: searchTerm && (
                                    <InputAdornment position="end">
                                        <Tooltip title="Filter löschen">
                                            <Button
                                                size="small"
                                                onClick={() => handleNameSearch({ target: { value: '' } })}
                                                sx={{
                                                    minWidth: 'auto',
                                                    p: 0.5,
                                                    borderRadius: '50%',
                                                    '&:hover': {
                                                        backgroundColor: 'rgba(65, 105, 225, 0.1)',
                                                    }
                                                }}
                                            >
                                                <CloseIcon sx={{ fontSize: 20 }} />
                                            </Button>
                                        </Tooltip>
                                    </InputAdornment>
                                ),
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    backgroundColor: 'white',
                                    borderRadius: 2,
                                    '&:hover fieldset': {
                                        borderColor: '#4169E1',
                                        borderWidth: 2,
                                    },
                                    '&.Mui-focused fieldset': {
                                        borderColor: '#4169E1',
                                        borderWidth: 2,
                                        boxShadow: '0 0 0 4px rgba(65, 105, 225, 0.1)',
                                    },
                                },
                            }}
                        />
                        <TextField
                            fullWidth
                            select
                            value={organisationFilter}
                            onChange={handleOrganisationFilter}
                            variant="outlined"
                            SelectProps={{
                                native: true,
                            }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <BusinessIcon sx={{ color: '#FF9800' }} />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    backgroundColor: 'white',
                                    borderRadius: 2,
                                    '&:hover fieldset': {
                                        borderColor: '#4169E1',
                                        borderWidth: 2,
                                    },
                                    '&.Mui-focused fieldset': {
                                        borderColor: '#4169E1',
                                        borderWidth: 2,
                                        boxShadow: '0 0 0 4px rgba(65, 105, 225, 0.1)',
                                    },
                                },
                            }}
                        >
                            <option value="">Alle Organisationen</option>
                            {organisations.map((org) => (
                                <option key={org} value={org}>
                                    {org}
                                </option>
                            ))}
                        </TextField>
                        <TextField
                            fullWidth
                            select
                            value={roleFilter}
                            onChange={handleRoleFilter}
                            variant="outlined"
                            SelectProps={{
                                native: true,
                            }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <AccountCircleIcon sx={{ color: '#4169E1' }} />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    backgroundColor: 'white',
                                    borderRadius: 2,
                                    '&:hover fieldset': {
                                        borderColor: '#4169E1',
                                        borderWidth: 2,
                                    },
                                    '&.Mui-focused fieldset': {
                                        borderColor: '#4169E1',
                                        borderWidth: 2,
                                        boxShadow: '0 0 0 4px rgba(65, 105, 225, 0.1)',
                                    },
                                },
                            }}
                        >
                            <option value="">Alle Rollen</option>
                            {availableRoles.map((role, index) => (
                                <option key={role.id || `role-${index}`} value={role.label}>
                                    {role.label}
                                </option>
                            ))}
                        </TextField>
                    </Box>
                </Card>
            </Box>

            {error && (
                <Alert
                    severity="error"
                    sx={{ mb: 2, mx: 2, borderRadius: 1 }}
                    onClose={() => setError(null)}
                >
                    {error}
                </Alert>
            )}

            {loading && users.length === 0 ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress sx={{ color: '#4169E1' }} />
                </Box>
            ) : (
                <>
                    {viewMode === 'cards' ? (
                        /* Moderne Card-Ansicht */
                        <Box sx={{
                            display: 'grid',
                            gridTemplateColumns: {
                                xs: '1fr',
                                sm: 'repeat(2, 1fr)',
                                lg: 'repeat(3, 1fr)',
                                xl: 'repeat(4, 1fr)'
                            },
                            gap: 2.5,
                            mx: 2,
                            mb: 3,
                            flex: 1,
                            overflowY: 'auto'
                        }}>
                            {displayedUsers.length === 0 ? (
                                <Box sx={{ gridColumn: '1 / -1', textAlign: 'center', py: 8 }}>
                                    <Typography variant="h6" sx={{ color: '#9E9E9E', fontWeight: 500 }}>
                                        Keine Benutzer gefunden
                                    </Typography>
                                </Box>
                            ) : (
                                displayedUsers.map((user) => {
                                    const activeOrgs = user.organisations?.filter(org => !org.deleted) || [];
                                    const initials = `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`;

                                    return (
                                        <Card
                                            key={user.userUid}
                                            elevation={0}
                                            sx={{
                                                p: 3,
                                                border: '1px solid rgba(0, 0, 0, 0.08)',
                                                borderRadius: 3,
                                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                cursor: 'pointer',
                                                position: 'relative',
                                                overflow: 'visible',
                                                '&:hover': {
                                                    transform: 'translateY(-8px)',
                                                    boxShadow: '0 12px 24px rgba(65, 105, 225, 0.15)',
                                                    borderColor: 'rgba(65, 105, 225, 0.3)',
                                                },
                                            }}
                                            onClick={() => handleViewDetails(user.userUid)}
                                        >
                                            {/* Avatar & Name */}
                                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                                <Box sx={{
                                                    width: 56,
                                                    height: 56,
                                                    borderRadius: '16px',
                                                    background: 'linear-gradient(135deg, #4169E1 0%, #2E4CB8 100%)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    boxShadow: '0 4px 14px rgba(65, 105, 225, 0.3)',
                                                    mr: 2,
                                                }}>
                                                    <Typography variant="h6" sx={{ color: 'white', fontWeight: 700 }}>
                                                        {initials || '?'}
                                                    </Typography>
                                                </Box>
                                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                                    <Typography variant="h6" sx={{
                                                        fontWeight: 700,
                                                        color: '#2E4CB8',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        {user.firstName} {user.lastName}
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ color: '#666', fontSize: '0.875rem' }}>
                                                        @{user.username || '-'}
                                                    </Typography>
                                                </Box>
                                            </Box>

                                            {/* Email */}
                                            <Box sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1,
                                                mb: 2,
                                                p: 1.5,
                                                backgroundColor: 'rgba(65, 105, 225, 0.05)',
                                                borderRadius: 2,
                                            }}>
                                                <Typography variant="body2" sx={{
                                                    color: '#4169E1',
                                                    fontWeight: 500,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {user.mail || 'Keine E-Mail'}
                                                </Typography>
                                            </Box>

                                            {/* Organisationen & Rollen */}
                                            {activeOrgs.length > 0 && (
                                                <Box sx={{ mb: 2 }}>
                                                    <Typography variant="caption" sx={{
                                                        color: '#666',
                                                        fontWeight: 600,
                                                        textTransform: 'uppercase',
                                                        letterSpacing: 0.5,
                                                        display: 'block',
                                                        mb: 1.5
                                                    }}>
                                                        Organisationen & Rollen
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                                        {activeOrgs.slice(0, 2).map((org, idx) => (
                                                            <Box
                                                                key={idx}
                                                                sx={{
                                                                    p: 1.5,
                                                                    backgroundColor: 'rgba(255, 152, 0, 0.05)',
                                                                    borderRadius: 2,
                                                                    border: '1px solid rgba(255, 152, 0, 0.2)',
                                                                }}
                                                            >
                                                                {/* Organisation Name */}
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                                    <BusinessIcon sx={{ fontSize: 16, color: '#FF9800' }} />
                                                                    <Typography variant="body2" sx={{
                                                                        fontWeight: 700,
                                                                        color: '#FF9800',
                                                                        fontSize: '0.813rem'
                                                                    }}>
                                                                        {org.orgName}
                                                                    </Typography>
                                                                </Box>
                                                                {/* Rollen */}
                                                                {org.roles && org.roles.length > 0 ? (
                                                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                                                                        {org.roles.map((role, roleIdx) => (
                                                                            <Chip
                                                                                key={roleIdx}
                                                                                label={role.roleName}
                                                                                size="small"
                                                                                sx={{
                                                                                    backgroundColor: '#4169E1',
                                                                                    color: 'white',
                                                                                    fontWeight: 600,
                                                                                    fontSize: '0.688rem',
                                                                                    height: 20,
                                                                                }}
                                                                            />
                                                                        ))}
                                                                    </Box>
                                                                ) : (
                                                                    <Typography variant="caption" sx={{
                                                                        color: '#999',
                                                                        fontStyle: 'italic',
                                                                        fontSize: '0.75rem'
                                                                    }}>
                                                                        Keine Rollen zugewiesen
                                                                    </Typography>
                                                                )}
                                                            </Box>
                                                        ))}
                                                        {activeOrgs.length > 2 && (
                                                            <Chip
                                                                label={`+${activeOrgs.length - 2} weitere Organisation${activeOrgs.length - 2 > 1 ? 'en' : ''}`}
                                                                size="small"
                                                                sx={{
                                                                    backgroundColor: '#E0E0E0',
                                                                    color: '#666',
                                                                    fontWeight: 600,
                                                                    fontSize: '0.75rem',
                                                                    width: 'fit-content',
                                                                }}
                                                            />
                                                        )}
                                                    </Box>
                                                </Box>
                                            )}

                                            {/* Action Buttons */}
                                            <Box
                                                className="action-buttons"
                                                sx={{
                                                    display: 'flex',
                                                    gap: 1,
                                                    mt: 2,
                                                    pt: 2,
                                                    borderTop: '1px solid rgba(0, 0, 0, 0.08)',
                                                    transition: 'all 0.3s ease',
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <Button
                                                    size="small"
                                                    startIcon={<VisibilityIcon />}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleViewDetails(user.userUid);
                                                    }}
                                                    sx={{
                                                        flex: 1,
                                                        borderRadius: 2,
                                                        textTransform: 'none',
                                                        fontWeight: 600,
                                                        color: '#4169E1',
                                                        backgroundColor: 'rgba(65, 105, 225, 0.1)',
                                                        '&:hover': {
                                                            backgroundColor: 'rgba(65, 105, 225, 0.2)',
                                                        },
                                                    }}
                                                >
                                                    Details
                                                </Button>
                                                <Button
                                                    size="small"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleOpenEditForm(user);
                                                    }}
                                                    sx={{
                                                        minWidth: 'auto',
                                                        px: 1.5,
                                                        borderRadius: 2,
                                                        color: '#FF9800',
                                                        backgroundColor: 'rgba(255, 152, 0, 0.1)',
                                                        '&:hover': {
                                                            backgroundColor: 'rgba(255, 152, 0, 0.2)',
                                                        },
                                                    }}
                                                >
                                                    <EditIcon fontSize="small" />
                                                </Button>
                                                <Button
                                                    size="small"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleOpenDeleteDialog(user.userUid);
                                                    }}
                                                    sx={{
                                                        minWidth: 'auto',
                                                        px: 1.5,
                                                        borderRadius: 2,
                                                        color: '#F44336',
                                                        backgroundColor: 'rgba(244, 67, 54, 0.1)',
                                                        '&:hover': {
                                                            backgroundColor: 'rgba(244, 67, 54, 0.2)',
                                                        },
                                                    }}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </Button>
                                            </Box>
                                        </Card>
                                    );
                                })
                            )}
                        </Box>
                    ) : (
                        /* Moderne Tabellen-Ansicht */
                        <Box sx={{ mx: 2, mb: 3, flex: 1, overflowY: 'auto' }}>
                            <TableContainer
                                component={Paper}
                                elevation={0}
                                sx={{
                                    border: '1px solid rgba(0, 0, 0, 0.08)',
                                    borderRadius: 3,
                                    overflow: 'hidden',
                                }}
                            >
                                <Table sx={{ minWidth: 800 }}>
                                    <TableHead>
                                        <TableRow sx={{ backgroundColor: 'rgba(65, 105, 225, 0.05)' }}>
                                            <TableCell sx={{ fontWeight: 700, color: '#2E4CB8', fontSize: '0.875rem' }}>
                                                Benutzer
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 700, color: '#2E4CB8', fontSize: '0.875rem' }}>
                                                Benutzername
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 700, color: '#2E4CB8', fontSize: '0.875rem' }}>
                                                E-Mail
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 700, color: '#2E4CB8', fontSize: '0.875rem' }}>
                                                Organisationen & Rollen
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700, color: '#2E4CB8', fontSize: '0.875rem' }}>
                                                Aktionen
                                            </TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {displayedUsers.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                                                    <Typography variant="h6" sx={{ color: '#9E9E9E', fontWeight: 500 }}>
                                                        Keine Benutzer gefunden
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            displayedUsers.map((user) => {
                                                const activeOrgs = user.organisations?.filter(org => !org.deleted) || [];
                                                const initials = `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`;

                                                return (
                                                    <TableRow
                                                        key={user.userUid}
                                                        sx={{
                                                            transition: 'all 0.2s ease',
                                                            '&:hover': {
                                                                backgroundColor: 'rgba(65, 105, 225, 0.05)',
                                                            },
                                                        }}
                                                    >
                                                        {/* Benutzer (Avatar + Name) */}
                                                        <TableCell>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                                <Avatar
                                                                    sx={{
                                                                        width: 40,
                                                                        height: 40,
                                                                        background: 'linear-gradient(135deg, #4169E1 0%, #2E4CB8 100%)',
                                                                        fontWeight: 700,
                                                                        fontSize: '0.875rem',
                                                                    }}
                                                                >
                                                                    {initials || '?'}
                                                                </Avatar>
                                                                <Box>
                                                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#2E4CB8', lineHeight: 1.3 }}>
                                                                        {user.firstName} {user.lastName}
                                                                    </Typography>
                                                                </Box>
                                                            </Box>
                                                        </TableCell>

                                                        {/* Benutzername */}
                                                        <TableCell>
                                                            <Typography variant="body2" sx={{ color: '#666', fontWeight: 500 }}>
                                                                @{user.username || '-'}
                                                            </Typography>
                                                        </TableCell>

                                                        {/* E-Mail */}
                                                        <TableCell>
                                                            <Typography variant="body2" sx={{ color: '#4169E1', fontWeight: 500 }}>
                                                                {user.mail || 'Keine E-Mail'}
                                                            </Typography>
                                                        </TableCell>

                                                        {/* Organisationen & Rollen */}
                                                        <TableCell>
                                                            {activeOrgs.length > 0 ? (
                                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                                    {activeOrgs.slice(0, 2).map((org, idx) => (
                                                                        <Box key={idx} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                                <BusinessIcon sx={{ fontSize: 14, color: '#FF9800' }} />
                                                                                <Typography variant="caption" sx={{ fontWeight: 700, color: '#FF9800', fontSize: '0.75rem' }}>
                                                                                    {org.orgName}
                                                                                </Typography>
                                                                            </Box>
                                                                            {org.roles && org.roles.length > 0 && (
                                                                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, ml: 2.5 }}>
                                                                                    {org.roles.map((role, roleIdx) => (
                                                                                        <Chip
                                                                                            key={roleIdx}
                                                                                            label={role.roleName}
                                                                                            size="small"
                                                                                            sx={{
                                                                                                backgroundColor: '#4169E1',
                                                                                                color: 'white',
                                                                                                fontWeight: 600,
                                                                                                fontSize: '0.688rem',
                                                                                                height: 20,
                                                                                            }}
                                                                                        />
                                                                                    ))}
                                                                                </Box>
                                                                            )}
                                                                        </Box>
                                                                    ))}
                                                                    {activeOrgs.length > 2 && (
                                                                        <Chip
                                                                            label={`+${activeOrgs.length - 2} weitere`}
                                                                            size="small"
                                                                            sx={{
                                                                                backgroundColor: '#E0E0E0',
                                                                                color: '#666',
                                                                                fontWeight: 600,
                                                                                fontSize: '0.688rem',
                                                                                height: 20,
                                                                                width: 'fit-content',
                                                                            }}
                                                                        />
                                                                    )}
                                                                </Box>
                                                            ) : (
                                                                <Typography variant="caption" sx={{ color: '#999', fontStyle: 'italic' }}>
                                                                    Keine Organisationen
                                                                </Typography>
                                                            )}
                                                        </TableCell>

                                                        {/* Aktionen */}
                                                        <TableCell align="right">
                                                            <Box
                                                                className="table-actions"
                                                                sx={{
                                                                    display: 'flex',
                                                                    gap: 1,
                                                                    justifyContent: 'flex-end',
                                                                }}
                                                            >
                                                                <Tooltip title="Details">
                                                                    <Button
                                                                        size="small"
                                                                        onClick={() => handleViewDetails(user.userUid)}
                                                                        sx={{
                                                                            minWidth: 'auto',
                                                                            px: 1.5,
                                                                            borderRadius: 2,
                                                                            color: '#4169E1',
                                                                            backgroundColor: 'rgba(65, 105, 225, 0.1)',
                                                                            '&:hover': {
                                                                                backgroundColor: 'rgba(65, 105, 225, 0.2)',
                                                                            },
                                                                        }}
                                                                    >
                                                                        <VisibilityIcon fontSize="small" />
                                                                    </Button>
                                                                </Tooltip>
                                                                <Tooltip title="Bearbeiten">
                                                                    <Button
                                                                        size="small"
                                                                        onClick={() => handleOpenEditForm(user)}
                                                                        sx={{
                                                                            minWidth: 'auto',
                                                                            px: 1.5,
                                                                            borderRadius: 2,
                                                                            color: '#FF9800',
                                                                            backgroundColor: 'rgba(255, 152, 0, 0.1)',
                                                                            '&:hover': {
                                                                                backgroundColor: 'rgba(255, 152, 0, 0.2)',
                                                                            },
                                                                        }}
                                                                    >
                                                                        <EditIcon fontSize="small" />
                                                                    </Button>
                                                                </Tooltip>
                                                                <Tooltip title="Löschen">
                                                                    <Button
                                                                        size="small"
                                                                        onClick={() => handleOpenDeleteDialog(user.userUid)}
                                                                        sx={{
                                                                            minWidth: 'auto',
                                                                            px: 1.5,
                                                                            borderRadius: 2,
                                                                            color: '#F44336',
                                                                            backgroundColor: 'rgba(244, 67, 54, 0.1)',
                                                                            '&:hover': {
                                                                                backgroundColor: 'rgba(244, 67, 54, 0.2)',
                                                                            },
                                                                        }}
                                                                    >
                                                                        <DeleteIcon fontSize="small" />
                                                                    </Button>
                                                                </Tooltip>
                                                            </Box>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>
                    )}

                    {/* Pagination */}
                    <Box sx={{
                        mx: 2,
                        mb: 2,
                        p: 2,
                        backgroundColor: 'white',
                        borderRadius: 3,
                        border: '1px solid rgba(0, 0, 0, 0.08)',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
                    }}>
                        <TablePagination
                            component="div"
                            count={users.length}
                            page={page}
                            onPageChange={handleChangePage}
                            rowsPerPage={rowsPerPage}
                            onRowsPerPageChange={handleChangeRowsPerPage}
                            rowsPerPageOptions={[25, 50, 100, 200]}
                            labelRowsPerPage="Einträge pro Seite:"
                            labelDisplayedRows={({ from, to, count }) => `${from}-${to} von ${count}`}
                            sx={{
                                '.MuiTablePagination-toolbar': {
                                    paddingLeft: 0,
                                    paddingRight: 0,
                                },
                                '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                                    fontWeight: 600,
                                    color: '#666',
                                },
                                '.MuiTablePagination-select': {
                                    fontWeight: 600,
                                },
                            }}
                        />
                    </Box>
                </>
            )}

            {/* Detail View Modal */}
            <Dialog open={detailOpen} onClose={handleCloseDetail} maxWidth="md" fullWidth>
                <DialogTitle sx={{ background: 'linear-gradient(135deg, #4169E1 0%, #2E4CB8 100%)', color: '#FFFFFF', fontWeight: 700, py: 2 }}>
                    Benutzerdetails
                </DialogTitle>
                <DialogContent sx={{ pt: 3, pb: 3 }}>
                    {selectedUser && <BenutzerDetail user={selectedUser} />}
                </DialogContent>
                <DialogActions sx={{ borderTop: '1px solid #E0E0E0', p: 2 }}>
                    <Button onClick={handleCloseDetail} sx={{ color: '#666' }}>
                        Schließen
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
                <DialogTitle sx={{ fontWeight: 700, color: '#D32F2F' }}>
                    Benutzer löschen?
                </DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    Sind Sie sicher, dass Sie diesen Benutzer löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.
                </DialogContent>
                <DialogActions sx={{ p: 2, gap: 1 }}>
                    <Button onClick={handleCloseDeleteDialog} variant="outlined" sx={{ color: '#666' }}>
                        Abbrechen
                    </Button>
                    <Button onClick={handleConfirmDelete} color="error" variant="contained" sx={{ boxShadow: '0 2px 8px rgba(244, 67, 54, 0.3)' }}>
                        Löschen
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Formular für Create/Edit mit Stepper */}
            <BenutzerFormStepper
                open={formOpen}
                onClose={handleCloseForm}
                onSuccess={handleFormSuccess}
                editUser={editingUser}
            />
        </Box>
    );
};

export default Benutzerliste;
