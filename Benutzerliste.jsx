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
import { useKeycloak } from '@react-keycloak/web';
import userService, { setKeycloakInstance } from '../services/userService';
import BenutzerDetail from './BenutzerDetail';
import BenutzerFormStepper from './BenutzerFormStepper';

const Benutzerliste = () => {
    const { keycloak } = useKeycloak();

    // Keycloak-Instanz im userService setzen
    useEffect(() => {
        if (keycloak) {
            setKeycloakInstance(keycloak);
            // Token in der Konsole ausgeben
            console.log('=== KEYCLOAK TOKEN INFORMATION ===');
            console.log('Bearer Token:', keycloak.token);
            console.log('Token Type:', keycloak.tokenType);
            console.log('Refresh Token:', keycloak.refreshToken);
            console.log('Decoded Token:', keycloak.tokenParsed);
            console.log('Token expires in:', keycloak.tokenParsed?.exp ? new Date(keycloak.tokenParsed.exp * 1000).toLocaleString() : 'N/A');
            console.log('User ID:', keycloak.tokenParsed?.sub);
            console.log('Username:', keycloak.tokenParsed?.preferred_username);
            console.log('Email:', keycloak.tokenParsed?.email);
            console.log('Roles:', keycloak.tokenParsed?.realm_access?.roles);
            console.log('==================================');

        }
    }, [keycloak]);

    const [allUsers, setAllUsers] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [organisationFilter, setOrganisationFilter] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState(null);
    const [organisations, setOrganisations] = useState([]);
    const [availableRoles, setAvailableRoles] = useState([]);
    const [roleFilter, setRoleFilter] = useState('');
    const [formOpen, setFormOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(50);
    const [viewMode, setViewMode] = useState('cards');
    const searchTimerRef = useRef(null);

    useEffect(() => {
        fetchUsers();
        fetchOrganisations();
        fetchRoles();
        return () => {
            if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        };
    }, []);

    // Server-Side-Filtering: Verarbeitet HAL, Array und Content-Formate
    const fetchUsers = async (nameSearch = '', orgUid = '', roleId = '') => {
        setLoading(true);
        setError(null);

        try {
            const searchParams = {};
            if (nameSearch) searchParams.searchUsernameOrLastname = nameSearch;
            if (orgUid) searchParams.orgUid = orgUid;
            if (roleId) searchParams.roleId = roleId;

            const response = await userService.getUsers(searchParams);

            let userList = [];
            if (response._embedded && response._embedded.users) {
                userList = response._embedded.users;
            } else if (Array.isArray(response)) {
                userList = response;
            } else if (response.content && Array.isArray(response.content)) {
                userList = response.content;
            }

            const userArray = Array.isArray(userList) ? userList : [];
            setAllUsers(userArray);
            setUsers(userArray);
        } catch (err) {
            setError('Fehler beim Laden der Benutzer');
            console.error('Error details:', err.response?.data || err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchOrganisations = async () => {
        try {
            const orgs = await userService.getOrganisations();
            if (Array.isArray(orgs)) {
                setOrganisations(orgs.sort((a, b) => a.label.localeCompare(b.label)));
            }
        } catch (err) {
            console.error('Fehler beim Laden der Organisationen:', err);
            setOrganisations([]);
        }
    };

    const fetchRoles = async () => {
        try {
            const roles = await userService.getRoles();
            const transformedRoles = Array.isArray(roles)
                ? roles.map(role => ({ id: role.uuid || role.id, label: role.label }))
                : [];
            setAvailableRoles(transformedRoles);
        } catch (err) {
            console.error('Fehler beim Laden der Rollen:', err);
            setAvailableRoles([]);
        }
    };

    // Debounce Search: 500ms Verzögerung verhindert zu viele API-Calls
    const handleNameSearch = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        setPage(0);
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        searchTimerRef.current = setTimeout(() => {
            fetchUsers(value, organisationFilter, roleFilter);
        }, 500);
    };

    const handleOrganisationFilter = (e) => {
        const orgUid = e.target.value;
        setOrganisationFilter(orgUid);
        setPage(0);
        fetchUsers(searchTerm, orgUid, roleFilter);
    };

    const handleRoleFilter = (e) => {
        const roleId = e.target.value;
        setRoleFilter(roleId);
        setPage(0);
        fetchUsers(searchTerm, organisationFilter, roleId);
    };

    // WICHTIG: Alle Filter sind SERVER-SEITIG (bessere Performance bei großen Datenmengen)
    const handleViewDetails = async (userId) => {
        try {
            const response = await userService.getUserById(userId);
            setSelectedUser(response.content || response);
            setDetailOpen(true);
        } catch (err) {
            setError('Fehler beim Laden der Benutzerdetails');
        }
    };

    const handleCloseDetail = () => {
        setDetailOpen(false);
        setSelectedUser(null);
    };

    const handleOpenDeleteDialog = (userId) => {
        setDeleteTargetId(userId);
        setDeleteDialogOpen(true);
    };

    const handleCloseDeleteDialog = () => {
        setDeleteDialogOpen(false);
        setDeleteTargetId(null);
    };

    const handleConfirmDelete = async () => {
        try {
            await userService.deleteUser(deleteTargetId);
            setUsers(users.filter(user => user.userUid !== deleteTargetId));
            handleCloseDeleteDialog();
            setError(null);
        } catch (err) {
            setError('Fehler beim Löschen des Benutzers');
            console.error(err);
        }
    };

    const handleOpenCreateForm = () => {
        setEditingUser(null);
        setFormOpen(true);
    };

    const handleOpenEditForm = (user) => {
        setEditingUser(user);
        setFormOpen(true);
    };

    const handleCloseForm = () => {
        setFormOpen(false);
        setEditingUser(null);
    };

    const handleFormSuccess = () => {
        fetchUsers();
        handleCloseForm();
    };

    const handleChangePage = (event, newPage) => setPage(newPage);

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

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
                                <option key={org.uuid} value={org.uuid}>
                                    {org.label}
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
                                <option key={role.id || `role-${index}`} value={role.id}>
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
                                                display: 'flex',
                                                flexDirection: 'column',
                                                height: '100%',
                                                '&:hover': {
                                                    transform: 'translateY(-8px)',
                                                    boxShadow: '0 12px 24px rgba(65, 105, 225, 0.15)',
                                                    borderColor: 'rgba(65, 105, 225, 0.3)',
                                                },
                                            }}
                                            onClick={() => handleViewDetails(user.userUid)}
                                        >
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

                                            <Box
                                                className="action-buttons"
                                                sx={{
                                                    display: 'flex',
                                                    gap: 1,
                                                    mt: 'auto',
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

                                                        <TableCell>
                                                            <Typography variant="body2" sx={{ color: '#666', fontWeight: 500 }}>
                                                                @{user.username || '-'}
                                                            </Typography>
                                                        </TableCell>

                                                        <TableCell>
                                                            <Typography variant="body2" sx={{ color: '#4169E1', fontWeight: 500 }}>
                                                                {user.mail || 'Keine E-Mail'}
                                                            </Typography>
                                                        </TableCell>

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
