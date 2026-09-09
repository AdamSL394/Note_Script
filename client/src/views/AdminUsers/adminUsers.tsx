import { useEffect, useState } from 'react';
import Table from '@mui/material/Table/index.js';
import TableBody from '@mui/material/TableBody/index.js';
import TableCell from '@mui/material/TableCell/index.js';
import TableContainer from '@mui/material/TableContainer/index.js';
import TableHead from '@mui/material/TableHead/index.js';
import TableRow from '@mui/material/TableRow/index.js';
import Chip from '@mui/material/Chip/index.js';
import CircularProgress from '@mui/material/CircularProgress/index.js';
import Box from '@mui/material/Box/index.js';
import NoteRoutes from '../../router/noteRoutes';
import type { UserRecord } from '../../types';
import './adminUsers.css';

type LoadState = 'loading' | 'forbidden' | 'error' | 'ready';

const AdminUsers = () => {
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [state, setState] = useState<LoadState>('loading');

    useEffect(() => {
        const fetchUsers = async () => {
            const result = await NoteRoutes.getAllUsers();
            // requestJson doesn't check HTTP status -- a 403's
            // {"error": "Forbidden"} body parses as valid JSON just
            // fine, but isn't actually an array. Checking this
            // explicitly rather than trusting the type is what stops
            // that from crashing the page on .map() below.
            if (!result) {
                setState('error');
                return;
            }
            if (!Array.isArray(result)) {
                setState('forbidden');
                return;
            }
            setUsers(result);
            setState('ready');
        };
        fetchUsers();
    }, []);

    return (
        <div>
            <div className="adminPage">
                {state === 'loading' && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                        <CircularProgress />
                    </Box>
                )}

                {state === 'forbidden' && (
                    <p className="adminMessage">You don&apos;t have access to this page.</p>
                )}

                {state === 'error' && (
                    <p className="adminMessage">Something went wrong loading users. Try again shortly.</p>
                )}

                {state === 'ready' && (
                    <>
                        <p className="adminEyebrow">Admin</p>
                        <h1 className="adminHeading">All users ({users.length})</h1>
                        <TableContainer className="adminTableContainer">
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell className="adminTableHeadCell">Email</TableCell>
                                        <TableCell className="adminTableHeadCell">Role</TableCell>
                                        <TableCell className="adminTableHeadCell">User ID</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {users.map((u) => (
                                        <TableRow key={u._id}>
                                            <TableCell className="adminTableCell">{u.email}</TableCell>
                                            <TableCell className="adminTableCell">
                                                <Chip
                                                    label={u.role}
                                                    size="small"
                                                    className={
                                                        u.role === 'admin'
                                                            ? 'adminRoleChip admin'
                                                            : 'adminRoleChip'
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell className="adminTableCell adminIdCell">
                                                {u._id}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </>
                )}
            </div>
        </div>
    );
};

export default AdminUsers;
