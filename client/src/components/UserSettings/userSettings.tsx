import { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import NoteRoutes from '../../router/noteRoutes';
import Container from '@mui/material/Container/index.js';
import Grid from '@mui/material/Grid/index.js';
import Button from '@mui/material/Button/index.js';
import DeleteAccountDialog from '../DeleteAccountDialog';
import type { TrackedStat, UserRecord, UserInfoResponse, AuthUser } from '../../types';
import { WIN_TAGS } from '../../constants/noteFields';
import { useThemeMode } from '../../hooks/useThemeMode';
import { NS_TOKENS, THEME_MODES } from '../../theme/nsTokens';
import { UserAvatar } from '../UserAvatar/index';
import './userSettings.css';

const UserSetting = () => {
    const [currentUser, setCurrentUser] = useState<UserRecord | undefined>();
    const [trackedStats, setTrackedStats] = useState<TrackedStat[]>([]);
    const [noteCount, setNoteCount] = useState<number | undefined>();
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | undefined>();
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

    const changeName = () => {};

    if (!user) {
        return null;
    }

    return (
        <Container id="container" className="userInformation">
            <Grid item xs={12} sm={10} md={8} lg={8} style={{ margin: '0 auto', textAlign: 'left' }}>
                <div className="settingsHeader">
                    <UserAvatar id="userInfo" className="settingsAvatar" src={user.picture} size={80} />
                    <h2 className="settingsName" onClick={() => changeName()}>
                        {user.name ? user.name : ''}
                    </h2>
                </div>

                <div className="Form">
                    <h4 className="settingsLabel">Email</h4>
                    <div className="settingsValue">
                        {currentUser ? currentUser.email : user.email}
                    </div>
                </div>

                <div className="Form">
                    <h4 className="settingsLabel">Tracked Stats</h4>
                    <div className="statChipRow">
                        {withoutDups.map((icon, i) => {
                            const active = icon.visible === 'visible';
                            const isWin = WIN_TAGS.includes(icon.name);
                            const className = [
                                'tagChip',
                                active ? 'active' : '',
                                active && isWin ? 'win' : '',
                            ]
                                .filter(Boolean)
                                .join(' ');
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
                    </div>
                </div>

                <div className="Form">
                    <h4 className="settingsLabel">Total Notes</h4>
                    <div className="settingsValue">
                        {noteCount !== undefined ? noteCount : '—'}
                    </div>
                </div>
                <div className="Form">
                    <h4 className="settingsLabel">Theme</h4>
                    <div className="statChipRow">
                        {THEME_MODES.map((themeMode) => {
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
                    </div>
                </div>

                <div className="Form">
                    <h4 className="settingsLabel">Danger Zone</h4>
                    <Button
                        variant="outlined"
                        color="error"
                        onClick={() => setDeleteDialogOpen(true)}
                    >
                        Delete my account
                    </Button>
                </div>
            </Grid>

            <DeleteAccountDialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                onConfirm={handleDeleteAccount}
                isDeleting={isDeleting}
                errorMessage={deleteError}
            />
        </Container>
    );
};

export { UserSetting };