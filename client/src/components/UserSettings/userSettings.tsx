import { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import NoteRoutes from '../../router/noteRoutes';
import Container from '@mui/material/Container/index.js';
import Button from '@mui/material/Button/index.js';
import Tooltip from '@mui/material/Tooltip/index.js';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import DeleteAccountDialog from '../DeleteAccountDialog';
import type { TrackedStat, UserRecord, UserInfoResponse, AuthUser } from '../../types';
import { WIN_TAGS } from '../../constants/noteFields';
import { useThemeMode } from '../../hooks/useThemeMode';
import { NS_TOKENS, THEME_MODES } from '../../theme/nsTokens';
import { UserAvatar } from '../UserAvatar/index';
import { NotificationSettings } from '../NotificationSettings/index';
import { ConfirmCheckmark } from '../ConfirmCheckmark';
import './userSettings.css';

const UserSetting = () => {
    const [currentUser, setCurrentUser] = useState<UserRecord | undefined>();
    const [trackedStats, setTrackedStats] = useState<TrackedStat[]>([]);
    const [noteCount, setNoteCount] = useState<number | undefined>();
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | undefined>();
    const [isExporting, setIsExporting] = useState(false);
    const [exportError, setExportError] = useState<string | undefined>();
    const [exportSignal, setExportSignal] = useState(0);
    const [showAllStats, setShowAllStats] = useState(false);
    const [showAllThemes, setShowAllThemes] = useState(false);
    const { user, logout } = useAuth0();
    const { mode, setMode } = useThemeMode();

    useEffect(() => {
        // Auth0's `user` is undefined until authentication resolves.
        // Without this guard, getUserInformation() can run before `user`
        // exists and throw on `user.sub` inside NoteRoutes. Re-running
        // whenever `user` changes (rather than only on mount) also means
        // this actually fires once auth is ready, instead of being stuck
        // with whatever `user` was at the very first render.
        if (!user) {
            return;
        }
        getUserInformation();
        NoteRoutes.getNoteCount().then(setNoteCount);
    }, [user]);

    const getUserInformation = async () => {
        if (!user) return;
        const res = await NoteRoutes.getUserInfomation(user as AuthUser);
        if (res) {
            const userInfo = JSON.parse(res) as UserInfoResponse;
            setCurrentUser(userInfo.searchedUser);
            // Was reading `.trackedStats`, which doesn't exist on this
            // response shape — the real field is `.settings` (confirmed
            // by deleteStat below, which already used the correct name).
            // This meant tracked stats loaded on this page were silently
            // always empty.
            setTrackedStats(userInfo?.searchedUser?.settings ?? []);
        }
    };

    const uniqueIds: string[] = [];
    const withoutDups = trackedStats.filter((element) => {
        const isDuplicate = uniqueIds.includes(element.name);
        if (!isDuplicate) {
            uniqueIds.push(element.name);
            return true;
        }
        return false;
    });

    const deleteStat = async (deleteUser: AuthUser, icon: TrackedStat) => {
        const updatedStates = await NoteRoutes.postUserStats(deleteUser, icon);
        if (updatedStates) {
            const userInfo = JSON.parse(updatedStates);
            setTrackedStats(userInfo['settings']);
        }
    };

    const handleDeleteAccount = async () => {
        setIsDeleting(true);
        setDeleteError(undefined);
        const success = await NoteRoutes.deleteAccount();
        if (success) {
            // The account no longer exists server-side, so the local
            // Auth0 session needs to be cleared too -- otherwise the app
            // would still think the user is logged in as an account
            // that no longer has any data behind it.
            logout({ returnTo: window.location.origin });
            return;
        }
        setIsDeleting(false);
        setDeleteError('Something went wrong deleting your account. Please try again.');
    };

    const handleExportData = async () => {
        setIsExporting(true);
        setExportError(undefined);
        const success = await NoteRoutes.exportUserData();
        setIsExporting(false);
        if (!success) {
            setExportError('Something went wrong exporting your data. Please try again.');
        } else {
            setExportSignal((s) => s + 1);
        }
    };

    if (!user) {
        return null;
    }

    return (
        <>
        <Container id="container" className="userInformation">
            <div style={{ margin: '0 auto', textAlign: 'left' }}>
                <div className="settingsHeader">
                    <UserAvatar id="userInfo" className="settingsAvatar" src={user.picture} size={80} />
                    <div className="settingsIdentity">
                        <h2 className="settingsName">{user.name ? user.name : ''}</h2>
                        <div className="settingsEmail">{currentUser ? currentUser.email : user.email}</div>
                    </div>
                </div>

                <div className="settingsGroup">
                    <h4 className="settingsGroupLabel">
                        <span className="settingsGroupDot" aria-hidden="true"></span>
                        Activity
                    </h4>
                    <div className="Form">
                        <h4 className="settingsLabel">Tracked Stats</h4>
                        <div className="statChipRow">
                            {(showAllStats ? withoutDups : withoutDups.slice(0, 5)).map((icon, i) => {
                                const isWin = WIN_TAGS.includes(icon.name);
                                const className = isWin ? 'trackedStatChip win' : 'trackedStatChip';
                                return (
                                    <button
                                        key={i}
                                        type="button"
                                        className={className}
                                        title="Double-click to stop tracking this stat"
                                        onDoubleClick={() => {
                                            deleteStat(user as AuthUser, icon);
                                        }}
                                    >
                                        <span aria-hidden="true">{icon.icon}</span>
                                        <span>{icon.name}</span>
                                    </button>
                                );
                            })}
                            {!showAllStats && withoutDups.length > 5 && (
                                <button
                                    type="button"
                                    className="settingsShowMoreButton"
                                    onClick={() => setShowAllStats(true)}
                                >
                                    +{withoutDups.length - 5} more
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="Form">
                        <h4 className="settingsLabel">Total Notes</h4>
                        <div className="settingsValue">
                            {noteCount !== undefined ? noteCount : '—'}
                        </div>
                    </div>
                </div>

                <div className="settingsGroup">
                    <h4 className="settingsGroupLabel">
                        <span className="settingsGroupDot" aria-hidden="true"></span>
                        Preferences
                    </h4>
                    <div className="Form">
                        <h4 className="settingsLabel">Theme</h4>
                        <div className="statChipRow">
                            {(showAllThemes
                                ? THEME_MODES
                                : [mode, ...THEME_MODES.filter((m) => m !== mode).slice(0, 2)]
                            ).map((themeMode) => {
                                const tokens = NS_TOKENS[themeMode];
                                const active = themeMode === mode;
                                return (
                                    <button
                                        key={themeMode}
                                        type="button"
                                        className={active ? 'themeChip active' : 'themeChip'}
                                        onClick={() => setMode(themeMode)}
                                    >
                                        <span
                                            className="themeChipSwatch"
                                            style={{ backgroundColor: tokens.blue }}
                                        ></span>
                                        <span>{tokens.label}</span>
                                    </button>
                                );
                            })}
                            {!showAllThemes && THEME_MODES.length > 3 && (
                                <button
                                    type="button"
                                    className="settingsShowMoreButton"
                                    onClick={() => setShowAllThemes(true)}
                                >
                                    +{THEME_MODES.length - 3} more
                                </button>
                            )}
                        </div>
                    </div>

                    <NotificationSettings />
                </div>

                <div className="settingsGroup">
                    <h4 className="settingsGroupLabel">
                        <span className="settingsGroupDot" aria-hidden="true"></span>
                        Your data
                        <Tooltip title="Download everything you've written here -- every note, tag, and setting -- as a single file you can keep.">
                            <InfoOutlinedIcon className="settingsInfoIcon" fontSize="inherit" />
                        </Tooltip>
                    </h4>
                    <div className="Form">
                        <Button variant="outlined" onClick={handleExportData} disabled={isExporting}>
                            {isExporting ? 'Preparing your export...' : 'Export my data'}
                        </Button>
                        <ConfirmCheckmark trigger={exportSignal} label="Downloaded" />
                        {exportError && <p className="settingsErrorText">{exportError}</p>}
                    </div>
                </div>
            </div>
        </Container>

        <Container id="dangerZoneContainer" className="settingsDangerZone">
            <h4 className="settingsLabel">Danger Zone</h4>
            <Button
                variant="outlined"
                color="error"
                onClick={() => setDeleteDialogOpen(true)}
            >
                Delete my account
            </Button>

            <DeleteAccountDialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                onConfirm={handleDeleteAccount}
                isDeleting={isDeleting}
                errorMessage={deleteError}
            />
        </Container>
        </>
    );
};

export { UserSetting };