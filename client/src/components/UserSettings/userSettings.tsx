import React, { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import NoteRoutes from '../../router/noteRoutes';
import Container from '@mui/material/Container/index.js';
import Grid from '@mui/material/Grid/index.js';
import type { TrackedStat, UserRecord, UserInfoResponse, AuthUser } from '../../types';
import './userSettings.css';

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
        <>
            <Container id="container" className="userInformation">
                <Grid
                    item
                    xs={6}
                    sm={6}
                    md={6}
                    lg={6}
                    style={{
                        margin: '0',
                        textAlign: 'left',
                    }}
                >
                    <span style={{ float: 'right' }}>
                        <h4>Profile Picture</h4>
                        <img
                            id="userInfo"
                            style=
                                {{ height: '125px',
                                    width: '125px',
                                    float: 'right',
                                }}
                            src={user.picture}
                            referrerPolicy="no-referrer"
                            alt="User Profile"
                        ></img>
                    </span>
                    <h4 className="Form" onClick={() => changeName()}>
            Name:
                        <span style={{ marginLeft: '13px' }}>
                            {user.name ? user.name : ''}
                        </span>
                    </h4>

                    <div className="Form">
                        <h4>
              Email:
                            <span style={{ marginLeft: '13px' }}>
                                {currentUser ? currentUser.email : user.email}
                            </span>
                        </h4>
                    </div>

                    <div className="Form">
                        <h4>
                            {' '}
              Tracked Stats:
                            <span style={{ marginLeft: '13px' }}>
                                {' '}
                                {withoutDups.map((icon, i) => {
                                    return (
                                        <span key={i + 300}>
                                            <span
                                                key={i + 100}
                                                style={{ cursor: 'pointer' }}
                                                onDoubleClick={() => {
                                                    deleteStat(user as AuthUser, icon);
                                                }}
                                            >
                                                {icon.icon}
                                            </span>
                                            <span
                                                key={i + 200}
                                                role="img"
                                                aria-label="checkmark"
                                                style={{
                                                    visibility: icon.visible,
                                                    marginRight: '.5rem',
                                                }}
                                            >
                        ✔️
                                            </span>
                                        </span>
                                    );
                                })}
                            </span>{' '}
                        </h4>
                    </div>
                    <h4 className="Form">Total Notes</h4>
                    <h4 className="Form">Dark Mode</h4>
                </Grid>
            </Container>
        </>
    );
};

export { UserSetting };