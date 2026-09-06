/* eslint-disable max-len */
import React, { useState } from 'react';
import LogOut from '../LogoutButton/logoutButton';
import AppBar from '@mui/material/AppBar/AppBar.js';
import Toolbar from '@mui/material/Toolbar/Toolbar.js';
import IconButton from '@mui/material/IconButton/IconButton.js';
import Menu from '@mui/material/Menu/Menu.js';
import MenuItem from '@mui/material/MenuItem/index.js';
import Box from '@mui/material/Box/Box.js';
import Typography from '@mui/material/Typography/Typography.js';
import Tooltip from '@mui/material/Tooltip/index.js';
import CheckIcon from '@mui/icons-material/Check';
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';
import MenuIcon from '@mui/icons-material/Menu';
import { UserAvatar } from '../UserAvatar/index';
import './navbar.css';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { useThemeMode } from '../../hooks/useThemeMode';
import { useIsAdmin } from '../../hooks/useIsAdmin';
import { NS_TOKENS, THEME_MODES } from '../../theme/nsTokens';

function Navbar() {
  const { user } = useAuth0();
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();
  const [anchorElNav, setAnchorElNav] = useState<HTMLElement | null>(null);
  const [anchorElTheme, setAnchorElTheme] = useState<HTMLElement | null>(null);
  const { mode, setMode } = useThemeMode();

  const pages = isAdmin
    ? ['Home', 'All Notes', 'Analytics', 'User', 'Admin']
    : ['Home', 'All Notes', 'Analytics', 'User'];

  const handleOpenNavMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElNav(event.currentTarget);
  };

  const handleOpenThemeMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElTheme(event.currentTarget);
  };

  const handleSelectTheme = (selected: typeof mode) => {
    setMode(selected);
    setAnchorElTheme(null);
  };

  // Wired to two call sites with genuinely different event shapes: the
  // mobile menu's <span onClick> passes a real click event, but this is
  // also passed directly as <Menu onClose>, which MUI calls with `{}`
  // (no `.target` at all) when the menu is dismissed via backdrop click
  // or Escape. Reading `.target.innerHTML` unconditionally previously
  // meant dismissing the menu without clicking a link would throw.
  const handleCloseNavMenu = (value: React.MouseEvent<HTMLElement> | {}) => {
    if ('target' in value && value.target instanceof HTMLElement) {
      if (value.target.innerHTML === 'Home') {
        navigate('/');
      }
      if (value.target.innerHTML === 'All Notes') {
        navigate('/all');
      }
      if (value.target.innerHTML === 'Analytics') {
        navigate('/analytics');
      }
      if (value.target.innerHTML === 'User') {
        navigate('/userSettings');
      }
      if (value.target.innerHTML === 'Admin') {
        navigate('/admin/users');
      }
    }
    setAnchorElNav(null);
  };

  function handleClick() {
    navigate('/');
  }
  const routeChanges = () => {
    const path = `/all`;
    navigate(path);
  };
  const userSettings = () => {
    const path = `/userSettings`;
    navigate(path);
  };
  const adminUsers = () => {
    const path = `/admin/users`;
    navigate(path);
  };
  return (
    <AppBar position="static" className="xl12 l12 m12 s12 xs12" id="navbar">
      <Toolbar disableGutters>
        <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
          <IconButton
            size="large"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleOpenNavMenu}
            color="inherit"
          >
            <MenuIcon style={{ color: 'var(--ns-graphite)' }} />
          </IconButton>
          <Menu
            id="menu-appbar"
            anchorEl={anchorElNav}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'left',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'left',
            }}
            open={Boolean(anchorElNav)}
            onClose={handleCloseNavMenu}
            sx={{
              display: { xs: 'block', md: 'none' },
            }}
          >
            {pages.map((page) => (
              <span
                key={page}
                onClick={(e) => handleCloseNavMenu(e)}
                style={{ width: '100% !important' }}
              >
                <Typography
                  textAlign="center"
                  style={{
                    cursor: 'pointer',
                    padding: '10%',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {page}
                </Typography>
              </span>
            ))}
          </Menu>
        </Box>
        <span id="navItems">
          <span className="tabs" id="home" onClick={handleClick}>
            Home
          </span>
          <span className="tabs" id="all" onClick={routeChanges}>
            All Notes
          </span>
          <span className="tabs" id="analytics" onClick={() => navigate('/analytics')}>
            Analytics
          </span>
          {isAdmin && (
            <span className="tabs" id="admin" onClick={adminUsers}>
              Admin
            </span>
          )}
          <i className="tabs" id="userName" onClick={userSettings}>
            Hi{' '}
            <span role="img" aria-label="Star">
              👋🏼
            </span>{' '}
            {user?.name ? user.name : ''}
            <UserAvatar id="userAvatar" src={user?.picture} size={25} />
          </i>
        </span>
        <Tooltip title="Change theme">
          <IconButton
            onClick={handleOpenThemeMenu}
            className="themeToggleButton"
            aria-label="Change theme"
            aria-controls="theme-menu"
            aria-haspopup="true"
            size="small"
          >
            <PaletteOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Menu
          id="theme-menu"
          anchorEl={anchorElTheme}
          open={Boolean(anchorElTheme)}
          onClose={() => setAnchorElTheme(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          {THEME_MODES.map((themeMode) => (
            <MenuItem
              key={themeMode}
              onClick={() => handleSelectTheme(themeMode)}
              selected={themeMode === mode}
            >
              <span
                className="themeSwatch"
                style={{ backgroundColor: NS_TOKENS[themeMode].blue }}
              ></span>
              {NS_TOKENS[themeMode].label}
              {themeMode === mode && (
                <CheckIcon fontSize="small" className="themeMenuCheck" />
              )}
            </MenuItem>
          ))}
        </Menu>
        <LogOut></LogOut>
      </Toolbar>
    </AppBar>
  );
}

export default Navbar;