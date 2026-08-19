import React, { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import NoteRoutes from '../../router/noteRoutes';
import Container from '@mui/material/Container/index.js';
import Grid from '@mui/material/Grid/index.js';
import type { TrackedStat, UserRecord, UserInfoResponse, AuthUser } from '../../types';
import './userSettings.css';

// Same "win" convention as CreateNote's tag chips, NotesHomeView's card
// accent, and homeView's streak strip - a third hand-copied list of the
// same two tags. Worth pulling all of these (and the tag icon/label
// tables) into one shared file the next time this page gets touched,
// rather than keeping four sources of truth in sync by hand.
const WIN_TAGS = new Set(['medal', 'king']);

const UserSetting = () => {
    const [currentUser, setCurrentUser] = useState<UserRecord | undefined>();
    const [trackedStats, setTrackedStats] = useState<TrackedStat[]>([]);
    const { user } = useAuth0();

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

    const changeName = () => {};

    if (!user) {
        return null;
    }

    return (
        <Container id="container" className="userInformation">
            <Grid item xs={12} sm={10} md={8} lg={8} style={{ margin: '0 auto', textAlign: 'left' }}>
                <div className="settingsHeader">
                    <img
                        id="userInfo"
                        className="settingsAvatar"
                        style={{ height: '80px', width: '80px' }}
                        src={user.picture}
                        referrerPolicy="no-referrer"
                        alt="User Profile"
                    ></img>
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
                            const isWin = WIN_TAGS.has(icon.name);
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
                    <h4 className="settingsLabel">
                        Total Notes
                        <span className="comingSoon">coming soon</span>
                    </h4>
                </div>
                <div className="Form">
                    <h4 className="settingsLabel">
                        Dark Mode
                        <span className="comingSoon">coming soon</span>
                    </h4>
                </div>
            </Grid>
        </Container>
    );
};

export { UserSetting };