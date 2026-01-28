/**
 * BENUTZERFORMSTEPPER.JSX - Mehrstufiges Formular zum Erstellen und Bearbeiten von Benutzern
 * 
 * 4-Schritte-Prozess:
 * 1. Organisationen auswählen (mehrere möglich)
 * 2. Rollen pro Organisation zuweisen
 * 3. Persönliche Informationen eingeben
 * 4. Übersicht und Bestätigung
 */

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Grid,
    Box,
    Alert,
    CircularProgress,
    Typography,
    Stepper,
    Step,
    StepLabel,
    Chip,
    IconButton,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    Paper,
    Checkbox,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Divider
} from '@mui/material';
import {
    Person as PersonIcon,
    Email as EmailIcon,
    Phone as PhoneIcon,
    Save as SaveIcon,
    Close as CloseIcon,
    Business as BusinessIcon,
    Badge as BadgeIcon,
    ArrowBack as ArrowBackIcon,
    ArrowForward as ArrowForwardIcon,
    Delete as DeleteIcon,
    Add as AddIcon,
    CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import userService from '../services/userService';  // Echter userService für Backend-API
// import userService from '../services/mockUserService';  // Mock-Daten für lokale Tests ohne Backend

const steps = ['Organisationen', 'Rollen zuweisen', 'Persönliche Daten', 'Übersicht'];

const BenutzerFormStepper = ({ open, onClose, onSuccess, editUser = null }) => {
    // ========== STATE-VERWALTUNG ==========

    // Aktueller Schritt (0-3)
    const [activeStep, setActiveStep] = useState(0);

    // Ausgewählte Organisationen (Array von {id, label})
    const [selectedOrganisations, setSelectedOrganisations] = useState([]);

    // Temporäre Organisation für Selectbox
    const [tempOrgId, setTempOrgId] = useState('');

    // Rollen pro Organisation ({orgId: [roleId1, roleId2, ...]})
    const [organisationRoles, setOrganisationRoles] = useState({});

    // Persönliche Daten
    const [personalData, setPersonalData] = useState({
        username: '',
        firstName: '',
        lastName: '',
        mail: '',
        phone: ''
    });

    // Verfügbare Daten von API
    const [availableOrganisations, setAvailableOrganisations] = useState([]);
    const [availableRoles, setAvailableRoles] = useState([]);

    // Ladezustände
    const [loading, setLoading] = useState(false);
    const [dataLoading, setDataLoading] = useState(false);

    // Fehler und Validierung
    const [errors, setErrors] = useState({});
    const [error, setError] = useState(null);

    // ========== LIFECYCLE ==========

    useEffect(() => {
        if (open) {
            fetchOrganisations();
            fetchRoles();
        }
    }, [open]);

    useEffect(() => {
        if (open && editUser) {
            loadEditUser();
        } else if (open && !editUser) {
            resetForm();
        }
    }, [open, editUser]);

    // ========== API-AUFRUFE ==========

    const fetchOrganisations = async () => {
        setDataLoading(true);
        try {
            const orgs = await userService.getOrganisations();
            // API gibt uuid statt id zurück - transformieren
            const transformedOrgs = Array.isArray(orgs)
                ? orgs.map(org => ({ id: org.uuid || org.id, label: org.label }))
                : [];
            setAvailableOrganisations(transformedOrgs);
        } catch (err) {
            console.error('Fehler beim Laden der Organisationen:', err);
            setError('Organisationen konnten nicht geladen werden');
        } finally {
            setDataLoading(false);
        }
    };

    const fetchRoles = async () => {
        try {
            const roles = await userService.getRoles();
            // API gibt uuid statt id zurück - transformieren
            const transformedRoles = Array.isArray(roles)
                ? roles.map(role => ({ id: role.uuid || role.id, label: role.label }))
                : [];
            setAvailableRoles(transformedRoles);
        } catch (err) {
            console.error('Fehler beim Laden der Rollen:', err);
            setError('Rollen konnten nicht geladen werden');
        }
    };

    // ========== FORM-VERWALTUNG ==========

    const resetForm = () => {
        setActiveStep(0);
        setSelectedOrganisations([]);
        setTempOrgId('');
        setOrganisationRoles({});
        setPersonalData({
            username: '',
            firstName: '',
            lastName: '',
            mail: '',
            phone: ''
        });
        setErrors({});
        setError(null);
    };

    const loadEditUser = () => {
        if (!editUser) return;

        // Persönliche Daten laden
        setPersonalData({
            userUid: editUser.userUid || '',
            username: editUser.username || '',
            firstName: editUser.firstName || '',
            lastName: editUser.lastName || '',
            mail: editUser.mail || '',
            phone: editUser.phone || ''
        });

        // Organisationen und Rollen laden
        if (editUser.organisations && Array.isArray(editUser.organisations)) {
            const activeOrgs = editUser.organisations.filter(org => !org.deleted);
            const orgs = activeOrgs.map(org => ({ id: org.orgUid, label: org.orgName }));
            setSelectedOrganisations(orgs);

            const roles = {};
            activeOrgs.forEach(org => {
                if (org.roles && Array.isArray(org.roles)) {
                    roles[org.orgUid] = org.roles.map(role => role.roleId);
                }
            });
            setOrganisationRoles(roles);
        }
    };

    // ========== SCHRITT-NAVIGATION ==========

    const handleNext = () => {
        if (validateCurrentStep()) {
            setActiveStep((prev) => prev + 1);
        }
    };

    const handleBack = () => {
        setActiveStep((prev) => prev - 1);
    };

    const validateCurrentStep = () => {
        setErrors({});

        switch (activeStep) {
            case 0: // Organisationen
                if (selectedOrganisations.length === 0) {
                    setError('Bitte wählen Sie mindestens eine Organisation aus');
                    return false;
                }
                break;
            case 1: // Rollen
                for (const org of selectedOrganisations) {
                    if (!organisationRoles[org.id] || organisationRoles[org.id].length === 0) {
                        setError(`Bitte weisen Sie der Organisation "${org.label}" mindestens eine Rolle zu`);
                        return false;
                    }
                }
                break;
            case 2: // Persönliche Daten
                const newErrors = {};
                if (!personalData.username?.trim()) newErrors.username = 'Benutzername ist erforderlich';
                if (!personalData.firstName?.trim()) newErrors.firstName = 'Vorname ist erforderlich';
                if (!personalData.lastName?.trim()) newErrors.lastName = 'Nachname ist erforderlich';
                if (!personalData.mail?.trim()) {
                    newErrors.mail = 'E-Mail ist erforderlich';
                } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personalData.mail)) {
                    newErrors.mail = 'Ungültige E-Mail-Adresse';
                }

                if (Object.keys(newErrors).length > 0) {
                    setErrors(newErrors);
                    return false;
                }
                break;
        }

        setError(null);
        return true;
    };

    // ========== SCHRITT 1: ORGANISATIONEN ==========

    const handleAddOrganisation = () => {
        if (!tempOrgId) return;

        const org = availableOrganisations.find(o => o.id === tempOrgId);
        if (!org) return;

        // Prüfen ob bereits ausgewählt
        if (selectedOrganisations.some(o => o.id === org.id)) {
            setError('Diese Organisation wurde bereits hinzugefügt');
            return;
        }

        setSelectedOrganisations(prev => [...prev, org]);
        setTempOrgId(''); // Selectbox zurücksetzen
        setError(null);
    };

    const handleRemoveOrganisation = (orgId, event) => {
        if (event) {
            event.stopPropagation();
        }
        setSelectedOrganisations(prev => prev.filter(o => o.id !== orgId));
        const newRoles = { ...organisationRoles };
        delete newRoles[orgId];
        setOrganisationRoles(newRoles);
    };

    // ========== SCHRITT 2: ROLLEN ==========

    const handleToggleRole = (orgId, roleId, event) => {
        if (event) {
            event.stopPropagation();
        }
        setOrganisationRoles(prev => {
            const orgRoles = prev[orgId] || [];
            const hasRole = orgRoles.includes(roleId);

            return {
                ...prev,
                [orgId]: hasRole
                    ? orgRoles.filter(id => id !== roleId)
                    : [...orgRoles, roleId]
            };
        });
    };

    // ========== SCHRITT 3: PERSÖNLICHE DATEN ==========

    const handlePersonalDataChange = (e) => {
        const { name, value } = e.target;
        setPersonalData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    // ========== SUBMIT ==========

    const handleSubmit = async () => {
        setLoading(true);
        setError(null);

        try {
            // Payload aufbauen - username wird nur für Edit benötigt, nicht für Create
            const payload = {
                firstName: personalData.firstName,
                lastName: personalData.lastName,
                mail: personalData.mail,
                phone: personalData.phone || '',
                organisations: selectedOrganisations.map(org => ({
                    orgUid: org.id,
                    roles: (organisationRoles[org.id] || []).map(roleId => ({ roleId }))
                }))
            };

            // Bei Edit: userUid hinzufügen
            if (editUser && personalData.userUid) {
                payload.userUid = personalData.userUid;
            }

            console.log('Payload:', payload);

            if (editUser) {
                await userService.updateUser(payload);
            } else {
                await userService.createUser(payload);
            }

            onSuccess();
            handleClose();
        } catch (err) {
            console.error('Fehler beim Speichern:', err);
            setError(err.response?.data?.message || 'Fehler beim Speichern des Benutzers');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    // ========== RENDER: STEP CONTENT ==========

    const renderStepContent = () => {
        switch (activeStep) {
            case 0:
                return renderOrganisationsStep();
            case 1:
                return renderRolesStep();
            case 2:
                return renderPersonalDataStep();
            case 3:
                return renderOverviewStep();
            default:
                return null;
        }
    };

    // Organisation direkt per Klick auswählen/abwählen
    const handleToggleOrganisation = (org) => {
        const isSelected = selectedOrganisations.some(o => o.id === org.id);
        if (isSelected) {
            // Entfernen
            setSelectedOrganisations(prev => prev.filter(o => o.id !== org.id));
            const newRoles = { ...organisationRoles };
            delete newRoles[org.id];
            setOrganisationRoles(newRoles);
        } else {
            // Hinzufügen
            setSelectedOrganisations(prev => [...prev, org]);
        }
        setError(null);
    };

    // Schritt 1: Organisationen auswählen
    const renderOrganisationsStep = () => (
        <Box>
            <Typography variant="h6" sx={{ mb: 2, color: '#4169E1', fontWeight: 700 }}>
                Wählen Sie Organisationen aus
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, color: '#666' }}>
                Der Benutzer kann mehreren Organisationen zugeordnet werden. Klicken Sie auf eine Organisation, um sie auszuwählen.
            </Typography>

            {dataLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <>
                    {/* Organisationen als klickbare Karten */}
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        {availableOrganisations.map((org) => {
                            const isSelected = selectedOrganisations.some(o => o.id === org.id);
                            return (
                                <Grid item xs={12} sm={6} md={4} key={org.id}>
                                    <Box
                                        onClick={() => handleToggleOrganisation(org)}
                                        sx={{
                                            p: 2,
                                            border: isSelected ? '2px solid #4169E1' : '2px solid #E0E0E0',
                                            borderRadius: 2,
                                            cursor: 'pointer',
                                            backgroundColor: isSelected ? 'rgba(65, 105, 225, 0.08)' : '#FFF',
                                            transition: 'all 0.3s ease',
                                            '&:hover': {
                                                borderColor: '#4169E1',
                                                backgroundColor: 'rgba(65, 105, 225, 0.08)',
                                            }
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <BusinessIcon sx={{ color: isSelected ? '#4169E1' : '#666', mr: 1 }} />
                                                <Typography variant="body1" sx={{ fontWeight: isSelected ? 600 : 400 }}>
                                                    {org.label}
                                                </Typography>
                                            </Box>
                                            {isSelected && <CheckCircleIcon sx={{ color: '#4169E1', fontSize: 24 }} />}
                                        </Box>
                                    </Box>
                                </Grid>
                            );
                        })}
                    </Grid>

                    {selectedOrganisations.length > 0 && (
                        <Box>
                            <Divider sx={{ mb: 2 }} />
                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: '#4169E1' }}>
                                Ausgewählte Organisationen ({selectedOrganisations.length})
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                {selectedOrganisations.map((org) => (
                                    <Chip
                                        key={org.id}
                                        label={org.label}
                                        onDelete={(e) => handleRemoveOrganisation(org.id, e)}
                                        color="primary"
                                        sx={{ fontWeight: 600 }}
                                    />
                                ))}
                            </Box>
                        </Box>
                    )}
                </>
            )}
        </Box>
    );

    // Schritt 2: Rollen zuweisen
    const renderRolesStep = () => (
        <Box>
            <Typography variant="h6" sx={{ mb: 2, color: '#4169E1', fontWeight: 700 }}>
                Rollen zuweisen
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, color: '#666' }}>
                Weisen Sie jeder Organisation die passenden Rollen zu.
            </Typography>

            {selectedOrganisations.map((org, index) => (
                <Paper key={org.id} sx={{ p: 3, mb: 2, border: '2px solid rgba(65, 105, 225, 0.2)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <BusinessIcon sx={{ color: '#4169E1', mr: 1 }} />
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#4169E1' }}>
                            {org.label}
                        </Typography>
                    </Box>

                    <Grid container spacing={1}>
                        {availableRoles.map((role) => {
                            const isSelected = (organisationRoles[org.id] || []).includes(role.id);
                            return (
                                <Grid item xs={12} sm={6} md={4} key={role.id}>
                                    <Box
                                        onClick={(e) => handleToggleRole(org.id, role.id, e)}
                                        sx={{
                                            p: 1.5,
                                            border: isSelected ? '2px solid #4169E1' : '2px solid #E0E0E0',
                                            borderRadius: 2,
                                            cursor: 'pointer',
                                            backgroundColor: isSelected ? 'rgba(65, 105, 225, 0.08)' : '#FFF',
                                            transition: 'all 0.3s ease',
                                            '&:hover': {
                                                borderColor: '#4169E1',
                                                backgroundColor: 'rgba(65, 105, 225, 0.08)',
                                            }
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <Typography variant="body2" sx={{ fontWeight: isSelected ? 600 : 400 }}>
                                                {role.label}
                                            </Typography>
                                            {isSelected && <CheckCircleIcon sx={{ color: '#4169E1', fontSize: 20 }} />}
                                        </Box>
                                    </Box>
                                </Grid>
                            );
                        })}
                    </Grid>

                    {(organisationRoles[org.id] || []).length === 0 && (
                        <Alert severity="info" sx={{ mt: 2 }}>
                            Bitte wählen Sie mindestens eine Rolle aus
                        </Alert>
                    )}
                </Paper>
            ))}
        </Box>
    );

    // Schritt 3: Persönliche Daten
    const renderPersonalDataStep = () => (
        <Box>
            <Typography variant="h6" sx={{ mb: 2, color: '#4169E1', fontWeight: 700 }}>
                Persönliche Informationen
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, color: '#666' }}>
                Geben Sie die persönlichen Daten des Benutzers ein.
            </Typography>

            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <TextField
                        fullWidth
                        name="username"
                        label="Benutzername"
                        value={personalData.username}
                        onChange={handlePersonalDataChange}
                        error={!!errors.username}
                        helperText={errors.username}
                        required
                        InputProps={{
                            startAdornment: <Typography sx={{ mr: 1, color: '#4169E1', fontWeight: 600 }}>@</Typography>
                        }}
                    />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField
                        fullWidth
                        name="firstName"
                        label="Vorname"
                        value={personalData.firstName}
                        onChange={handlePersonalDataChange}
                        error={!!errors.firstName}
                        helperText={errors.firstName}
                        required
                        InputProps={{
                            startAdornment: <PersonIcon sx={{ mr: 1, color: '#4169E1' }} />
                        }}
                    />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField
                        fullWidth
                        name="lastName"
                        label="Nachname"
                        value={personalData.lastName}
                        onChange={handlePersonalDataChange}
                        error={!!errors.lastName}
                        helperText={errors.lastName}
                        required
                        InputProps={{
                            startAdornment: <PersonIcon sx={{ mr: 1, color: '#4169E1' }} />
                        }}
                    />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField
                        fullWidth
                        name="mail"
                        label="E-Mail"
                        type="email"
                        value={personalData.mail}
                        onChange={handlePersonalDataChange}
                        error={!!errors.mail}
                        helperText={errors.mail}
                        required
                        InputProps={{
                            startAdornment: <EmailIcon sx={{ mr: 1, color: '#4169E1' }} />
                        }}
                    />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField
                        fullWidth
                        name="phone"
                        label="Telefon"
                        value={personalData.phone}
                        onChange={handlePersonalDataChange}
                        InputProps={{
                            startAdornment: <PhoneIcon sx={{ mr: 1, color: '#4169E1' }} />
                        }}
                    />
                </Grid>
            </Grid>
        </Box>
    );

    // Schritt 4: Übersicht
    const renderOverviewStep = () => (
        <Box>
            <Box sx={{
                mb: 3,
                p: 3,
                borderRadius: 3,
                background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.08) 0%, rgba(69, 160, 73, 0.08) 100%)',
                border: '2px solid rgba(76, 175, 80, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: 2
            }}>
                <CheckCircleIcon sx={{ fontSize: 48, color: '#4CAF50' }} />
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#4CAF50', mb: 0.5 }}>
                        Bereit zum Speichern!
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#666' }}>
                        Bitte überprüfen Sie alle Angaben vor dem Speichern.
                    </Typography>
                </Box>
            </Box>

            {/* Persönliche Daten */}
            <Paper elevation={0} sx={{
                p: 3,
                mb: 2,
                border: '2px solid rgba(65, 105, 225, 0.2)',
                borderRadius: 3,
                background: 'linear-gradient(135deg, rgba(65, 105, 225, 0.04) 0%, rgba(46, 76, 184, 0.04) 100%)',
                transition: 'all 0.3s ease',
                '&:hover': {
                    borderColor: '#4169E1',
                    boxShadow: '0 4px 12px rgba(65, 105, 225, 0.15)',
                }
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 40,
                        height: 40,
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #4169E1 0%, #2E4CB8 100%)',
                        boxShadow: '0 4px 12px rgba(65, 105, 225, 0.3)'
                    }}>
                        <PersonIcon sx={{ color: 'white', fontSize: 24 }} />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#4169E1' }}>
                        Persönliche Daten
                    </Typography>
                </Box>
                <Grid container spacing={2.5}>
                    <Grid item xs={12}>
                        <Box sx={{ p: 2, backgroundColor: 'rgba(255, 255, 255, 0.7)', borderRadius: 2 }}>
                            <Typography variant="caption" sx={{ fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: 1, display: 'block', mb: 0.5 }}>
                                Benutzername
                            </Typography>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: '#4169E1' }}>@{personalData.username}</Typography>
                        </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Box sx={{ p: 2, backgroundColor: 'rgba(255, 255, 255, 0.7)', borderRadius: 2 }}>
                            <Typography variant="caption" sx={{ fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: 1, display: 'block', mb: 0.5 }}>
                                Vorname
                            </Typography>
                            <Typography variant="body1" fontWeight={600}>{personalData.firstName}</Typography>
                        </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Box sx={{ p: 2, backgroundColor: 'rgba(255, 255, 255, 0.7)', borderRadius: 2 }}>
                            <Typography variant="caption" sx={{ fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: 1, display: 'block', mb: 0.5 }}>
                                Nachname
                            </Typography>
                            <Typography variant="body1" fontWeight={600}>{personalData.lastName}</Typography>
                        </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Box sx={{ p: 2, backgroundColor: 'rgba(255, 255, 255, 0.7)', borderRadius: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <EmailIcon sx={{ color: '#4169E1', fontSize: 20 }} />
                                <Box>
                                    <Typography variant="caption" sx={{ fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: 1, display: 'block' }}>
                                        E-Mail
                                    </Typography>
                                    <Typography variant="body1" fontWeight={600} sx={{ color: '#4169E1' }}>{personalData.mail}</Typography>
                                </Box>
                            </Box>
                        </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Box sx={{ p: 2, backgroundColor: 'rgba(255, 255, 255, 0.7)', borderRadius: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <PhoneIcon sx={{ color: '#4169E1', fontSize: 20 }} />
                                <Box>
                                    <Typography variant="caption" sx={{ fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: 1, display: 'block' }}>
                                        Telefon
                                    </Typography>
                                    <Typography variant="body1" fontWeight={600}>{personalData.phone || '-'}</Typography>
                                </Box>
                            </Box>
                        </Box>
                    </Grid>
                </Grid>
            </Paper>

            {/* Organisationen & Rollen */}
            <Paper elevation={0} sx={{
                p: 3,
                border: '2px solid rgba(255, 152, 0, 0.3)',
                borderRadius: 3,
                background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.04) 0%, rgba(245, 124, 0, 0.04) 100%)',
                transition: 'all 0.3s ease',
                '&:hover': {
                    borderColor: '#FF9800',
                    boxShadow: '0 4px 12px rgba(255, 152, 0, 0.15)',
                }
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 40,
                        height: 40,
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
                        boxShadow: '0 4px 12px rgba(255, 152, 0, 0.3)'
                    }}>
                        <BusinessIcon sx={{ color: 'white', fontSize: 24 }} />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#FF9800' }}>
                        Organisationen & Rollen
                    </Typography>
                </Box>
                {selectedOrganisations.map((org, index) => {
                    const roles = (organisationRoles[org.id] || [])
                        .map(roleId => availableRoles.find(r => r.id === roleId))
                        .filter(Boolean);

                    return (
                        <Box
                            key={org.id}
                            sx={{
                                mb: index < selectedOrganisations.length - 1 ? 2.5 : 0,
                                p: 2.5,
                                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                                borderRadius: 2,
                                border: '1px solid rgba(255, 152, 0, 0.2)',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                    borderColor: '#FF9800',
                                }
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                                <Chip
                                    label={org.label}
                                    size="medium"
                                    sx={{
                                        backgroundColor: '#FF9800',
                                        color: '#FFF',
                                        fontWeight: 700,
                                        fontSize: '0.9rem',
                                        height: 32
                                    }}
                                />
                            </Box>
                            <Typography variant="caption" sx={{ fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: 1, display: 'block', mb: 1 }}>
                                Zugewiesene Rollen
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                {roles.map((role) => (
                                    <Chip
                                        key={role.id}
                                        label={role.label}
                                        size="small"
                                        icon={<BadgeIcon sx={{ fontSize: 16 }} />}
                                        sx={{ backgroundColor: '#4169E1', color: '#FFF', fontWeight: 600 }}
                                    />
                                ))}
                            </Box>
                        </Box>
                    );
                })}
            </Paper>
        </Box>
    );

    // ========== MAIN RENDER ==========

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    minHeight: '80vh'
                }
            }}
        >
            <DialogTitle sx={{
                background: 'linear-gradient(135deg, #4169E1 0%, #2E4CB8 100%)',
                color: 'white',
                py: 3
            }}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {editUser ? 'Benutzer bearbeiten' : 'Neuen Benutzer anlegen'}
                </Typography>
            </DialogTitle>

            <Box sx={{ px: 3, pt: 3 }}>
                <Stepper activeStep={activeStep} alternativeLabel>
                    {steps.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>
            </Box>

            <DialogContent sx={{ px: 4, py: 3, minHeight: 400 }}>
                {error && (
                    <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                {renderStepContent()}
            </DialogContent>

            <DialogActions sx={{ px: 4, pb: 3, pt: 2, gap: 2 }}>
                <Button
                    onClick={handleClose}
                    disabled={loading}
                    startIcon={<CloseIcon />}
                    sx={{ color: '#666' }}
                >
                    Abbrechen
                </Button>

                <Box sx={{ flex: 1 }} />

                {activeStep > 0 && (
                    <Button
                        onClick={handleBack}
                        disabled={loading}
                        startIcon={<ArrowBackIcon />}
                        variant="outlined"
                    >
                        Zurück
                    </Button>
                )}

                {activeStep < steps.length - 1 ? (
                    <Button
                        onClick={handleNext}
                        disabled={loading}
                        endIcon={<ArrowForwardIcon />}
                        variant="contained"
                        sx={{
                            background: 'linear-gradient(135deg, #4169E1 0%, #2E4CB8 100%)',
                        }}
                    >
                        Weiter
                    </Button>
                ) : (
                    <Button
                        onClick={handleSubmit}
                        disabled={loading}
                        startIcon={loading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : <SaveIcon />}
                        variant="contained"
                        sx={{
                            background: 'linear-gradient(135deg, #4CAF50 0%, #45A049 100%)',
                        }}
                    >
                        {loading ? 'Speichern...' : 'Speichern'}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default BenutzerFormStepper;
