/**
 * BENUTZERDETAIL.JSX - Detail-Ansicht für einzelnen Benutzer
 */

import React from 'react';
import {
    Box,
    Typography,
    Grid,
    Divider,
    Chip,
    Paper,
    Avatar,
    Card,
} from '@mui/material';
import { Person as PersonIcon, Email as EmailIcon, Phone as PhoneIcon, Business as BusinessIcon, Badge as BadgeIcon, AccountCircle as AccountCircleIcon, LocationOn as LocationOnIcon, ContactPhone as ContactPhoneIcon } from '@mui/icons-material';

/**
 * BenutzerDetail-Komponente
 * @param {Object} user - Benutzerobjekt mit allen Details
 */
const BenutzerDetail = ({ user }) => {
    // Fallback, falls keine Benutzerdaten vorhanden sind
    if (!user) {
        return <Typography>Keine Benutzerdaten verfügbar</Typography>;
    }

    const initials = `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`;

    return (
        <Box sx={{ pt: 0 }}>
            {/* Header mit großem Avatar und Name */}
            <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                mb: 4,
                p: 3,
                background: 'linear-gradient(135deg, rgba(65, 105, 225, 0.08) 0%, rgba(46, 76, 184, 0.08) 100%)',
                borderRadius: 4,
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '80px',
                    background: 'linear-gradient(135deg, #4169E1 0%, #2E4CB8 100%)',
                    zIndex: 0,
                }
            }}>
                <Avatar
                    sx={{
                        width: 100,
                        height: 100,
                        background: 'linear-gradient(135deg, #4169E1 0%, #2E4CB8 100%)',
                        fontSize: '2.5rem',
                        fontWeight: 700,
                        boxShadow: '0 8px 24px rgba(65, 105, 225, 0.4)',
                        border: '4px solid white',
                        position: 'relative',
                        zIndex: 1,
                        mb: 2,
                    }}
                >
                    {initials || '?'}
                </Avatar>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#2E4CB8', textAlign: 'center', position: 'relative', zIndex: 1 }}>
                    {user.firstName} {user.lastName}
                </Typography>
                <Typography variant="body1" sx={{ color: '#666', fontWeight: 500, position: 'relative', zIndex: 1, mt: 0.5 }}>
                    @{user.username || '-'}
                </Typography>
                {user.deleted !== undefined && (
                    <Chip
                        label={user.deleted ? 'Gelöscht' : 'Aktiv'}
                        color={user.deleted ? 'error' : 'success'}
                        sx={{ fontWeight: 700, mt: 2, position: 'relative', zIndex: 1 }}
                    />
                )}
            </Box>

            {/* Grid-Layout für responsive Anordnung der Felder */}
            <Grid container spacing={3}>

                {/* ===== KONTAKTINFORMATIONEN ===== */}
                <Grid item xs={12}>
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        mb: 2
                    }}>
                        <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 36,
                            height: 36,
                            borderRadius: '10px',
                            background: 'linear-gradient(135deg, #4169E1 0%, #2E4CB8 100%)',
                            boxShadow: '0 4px 12px rgba(65, 105, 225, 0.3)'
                        }}>
                            <ContactPhoneIcon sx={{ color: 'white', fontSize: 20 }} />
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#2E4CB8' }}>
                            Kontaktinformationen
                        </Typography>
                    </Box>

                    {/* Grid-Container für Kontakt-Cards */}
                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                        gap: 2.5,
                    }}>
                        {/* Email */}
                        <Card
                            elevation={0}
                            sx={{
                                p: 2.5,
                                border: '1px solid rgba(65, 105, 225, 0.2)',
                                borderRadius: 3,
                                transition: 'all 0.3s ease',
                                height: '100%',
                                '&:hover': {
                                    borderColor: '#4169E1',
                                    boxShadow: '0 4px 12px rgba(65, 105, 225, 0.15)',
                                    transform: 'translateY(-2px)',
                                }
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                                <EmailIcon sx={{ color: '#4169E1', fontSize: 24 }} />
                                <Typography variant="caption" sx={{ fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    E-Mail
                                </Typography>
                            </Box>
                            <Typography variant="body1" sx={{ fontWeight: 600, color: '#4169E1', wordBreak: 'break-all' }}>
                                {user.mail || 'Keine E-Mail'}
                            </Typography>
                        </Card>

                        {/* Telefon */}
                        <Card
                            elevation={0}
                            sx={{
                                p: 2.5,
                                border: '1px solid rgba(65, 105, 225, 0.2)',
                                borderRadius: 3,
                                transition: 'all 0.3s ease',
                                height: '100%',
                                '&:hover': {
                                    borderColor: '#4169E1',
                                    boxShadow: '0 4px 12px rgba(65, 105, 225, 0.15)',
                                    transform: 'translateY(-2px)',
                                }
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                                <PhoneIcon sx={{ color: '#4169E1', fontSize: 24 }} />
                                <Typography variant="caption" sx={{ fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    Telefon
                                </Typography>
                            </Box>
                            <Typography variant="body1" sx={{ fontWeight: 600, color: '#333' }}>
                                {user.phone || 'Keine Telefonnummer'}
                            </Typography>
                        </Card>
                    </Box>
                </Grid>

                {/* ===== ORGANISATIONEN & ROLLEN ===== */}
                {user.organisations && user.organisations.filter(org => !org.deleted).length > 0 && (
                    <Grid item xs={12}>
                        {/* Trennlinie */}
                        <Divider sx={{ my: 3 }} />

                        {/* Überschrift mit Icon */}
                        <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            mb: 3
                        }}>
                            <Box sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 36,
                                height: 36,
                                borderRadius: '10px',
                                background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
                                boxShadow: '0 4px 12px rgba(255, 152, 0, 0.3)'
                            }}>
                                <BusinessIcon sx={{ color: 'white', fontSize: 20 }} />
                            </Box>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: '#FF9800' }}>
                                Organisationen & Rollen ({user.organisations.filter(org => !org.deleted).length})
                            </Typography>
                        </Box>

                        {/* Grid-Container für Organisations-Cards */}
                        <Box sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
                            gap: 2.5,
                        }}>
                            {/* 
                                Durch alle Organisationen iterieren (nur nicht-gelöschte)
                                Ein Benutzer kann mehrere Organisationen angehören,
                                und jede Organisation kann mehrere Rollen enthalten
                            */}
                            {user.organisations.filter(org => !org.deleted).map((org, index) => (
                                <Card
                                    key={index}
                                    elevation={0}
                                    sx={{
                                        p: 2.5,
                                        border: '2px solid rgba(255, 152, 0, 0.3)',
                                        borderRadius: 3,
                                        background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.05) 0%, rgba(245, 124, 0, 0.05) 100%)',
                                        transition: 'all 0.3s ease',
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        '&:hover': {
                                            background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.1) 0%, rgba(245, 124, 0, 0.1) 100%)',
                                            borderColor: '#FF9800',
                                            boxShadow: '0 8px 24px rgba(255, 152, 0, 0.2)',
                                            transform: 'translateY(-4px)'
                                        },
                                    }}
                                >
                                    {/* Organisation Header */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                                        <Box sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: 40,
                                            height: 40,
                                            borderRadius: '10px',
                                            background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
                                            boxShadow: '0 4px 12px rgba(255, 152, 0, 0.3)',
                                            flexShrink: 0,
                                        }}>
                                            <BusinessIcon sx={{ color: 'white', fontSize: 20 }} />
                                        </Box>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#FF9800', lineHeight: 1.3 }}>
                                            {org.orgName || 'Ohne Organisation'}
                                        </Typography>
                                    </Box>

                                    {/* Adressinformationen */}
                                    {(org.street || org.hnr || org.postcode || org.city) && (
                                        <Box sx={{ mb: 2, p: 2, backgroundColor: 'rgba(255, 255, 255, 0.8)', borderRadius: 2, border: '1px solid rgba(255, 152, 0, 0.15)' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                <LocationOnIcon sx={{ color: '#FF9800', fontSize: 18 }} />
                                                <Typography variant="caption" sx={{ fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.7rem' }}>
                                                    Adresse
                                                </Typography>
                                            </Box>
                                            <Typography variant="body2" sx={{ color: '#333', fontWeight: 500, lineHeight: 1.5 }}>
                                                {org.street} {org.hnr}<br />
                                                {org.postcode} {org.city}
                                            </Typography>
                                        </Box>
                                    )}

                                    {/* Kontaktinformationen */}
                                    {(org.phone || org.fax || org.email) && (
                                        <Box sx={{ mb: 2, p: 2, backgroundColor: 'rgba(255, 255, 255, 0.8)', borderRadius: 2, border: '1px solid rgba(255, 152, 0, 0.15)' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                <ContactPhoneIcon sx={{ color: '#FF9800', fontSize: 18 }} />
                                                <Typography variant="caption" sx={{ fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.7rem' }}>
                                                    Kontakt
                                                </Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                {org.phone && (
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <PhoneIcon sx={{ fontSize: 16, color: '#666' }} />
                                                        <Typography variant="body2" sx={{ color: '#333', fontWeight: 500, fontSize: '0.813rem' }}>
                                                            {org.phone}
                                                        </Typography>
                                                    </Box>
                                                )}
                                                {org.fax && (
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Typography variant="caption" sx={{ color: '#666', fontWeight: 600, fontSize: '0.7rem' }}>
                                                            FAX:
                                                        </Typography>
                                                        <Typography variant="body2" sx={{ color: '#333', fontWeight: 500, fontSize: '0.813rem' }}>
                                                            {org.fax}
                                                        </Typography>
                                                    </Box>
                                                )}
                                                {org.email && (
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <EmailIcon sx={{ fontSize: 16, color: '#4169E1' }} />
                                                        <Typography variant="body2" sx={{ color: '#4169E1', fontWeight: 500, fontSize: '0.813rem', wordBreak: 'break-all' }}>
                                                            {org.email}
                                                        </Typography>
                                                    </Box>
                                                )}
                                            </Box>
                                        </Box>
                                    )}

                                    {/* Rollen - flexGrow für gleichmäßige Höhe */}
                                    <Box sx={{ p: 2, backgroundColor: 'rgba(65, 105, 225, 0.05)', borderRadius: 2, border: '1px solid rgba(65, 105, 225, 0.15)', mt: 'auto' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                            <BadgeIcon sx={{ color: '#4169E1', fontSize: 18 }} />
                                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.7rem' }}>
                                                Rollen
                                            </Typography>
                                        </Box>
                                        {org.roles && org.roles.length > 0 ? (
                                            <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap' }}>
                                                {org.roles.map((role, roleIndex) => (
                                                    <Chip
                                                        key={roleIndex}
                                                        label={role.roleName}
                                                        size="small"
                                                        sx={{
                                                            backgroundColor: '#4169E1',
                                                            color: '#FFFFFF',
                                                            fontWeight: 600,
                                                            fontSize: '0.75rem',
                                                            height: 26,
                                                            '&:hover': {
                                                                backgroundColor: '#2E4CB8',
                                                            }
                                                        }}
                                                    />
                                                ))}
                                            </Box>
                                        ) : (
                                            <Typography variant="body2" sx={{ color: '#999', fontStyle: 'italic', fontWeight: 500, fontSize: '0.813rem' }}>
                                                Keine Rollen
                                            </Typography>
                                        )}
                                    </Box>
                                </Card>
                            ))}
                        </Box>
                    </Grid>
                )}

            </Grid>
        </Box>
    );
};

export default BenutzerDetail;
