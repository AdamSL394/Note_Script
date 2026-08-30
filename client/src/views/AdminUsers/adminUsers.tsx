import { useEffect, useState } from 'react';
import Table from '@mui/material/Table/index.js';
import TableBody from '@mui/material/TableBody/index.js';
import TableCell from '@mui/material/TableCell/index.js';
import TableContainer from '@mui/material/TableContainer/index.js';
import TableHead from '@mui/material/TableHead/index.js';
import TableRow from '@mui/material/TableRow/index.js';
import Paper from '@mui/material/Paper/index.js';
import Chip from '@mui/material/Chip/index.js';
import CircularProgress from '@mui/material/CircularProgress/index.js';
import Box from '@mui/material/Box/index.js';
import Typography from '@mui/material/Typography/index.js';
import NoteRoutes from '../../router/noteRoutes';
import type { UserRecord } from '../../types';
import Navbar from '../../components/Navbar/nav';

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

    if (state === 'loading') {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (state === 'forbidden') {
        return (
            <Box sx={{ padding: '2rem', textAlign: 'center' }}>
                <Typography>You don&apos;t have access to this page.</Typography>
            </Box>
        );
    }

    if (state === 'error') {
        return (
            <Box sx={{ padding: '2rem', textAlign: 'center' }}>
                <Typography>Something went wrong loading users. Try again shortly.</Typography>
            </Box>
        );
    }

    return (
        <>

            <Navbar></Navbar>
            <Box sx={{ padding: '2rem' }}>

                <Typography variant="h5" sx={{ marginBottom: '1rem' }}>
                    All Users ({users.length})
                </Typography>
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Email</TableCell>
                                <TableCell>Role</TableCell>
                                <TableCell>User ID</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {users.map((u) => (
                                <TableRow key={u._id}>
                                    <TableCell>{u.email}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={u.role}
                                            size="small"
                                            color={u.role === 'admin' ? 'secondary' : 'default'}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                            {u._id}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        </>
    );
};

export default AdminUsers;
