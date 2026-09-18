import { useEffect, useState } from 'react';
import Table from '@mui/material/Table/index.js';
import TableBody from '@mui/material/TableBody/index.js';
import TableCell from '@mui/material/TableCell/index.js';
import TableContainer from '@mui/material/TableContainer/index.js';
import TableHead from '@mui/material/TableHead/index.js';
import TableRow from '@mui/material/TableRow/index.js';
import CircularProgress from '@mui/material/CircularProgress/index.js';
import Box from '@mui/material/Box/index.js';
import NoteRoutes from '../../router/noteRoutes';
import type { ContactSubmissionRecord } from '../../types';
import { AdminTabs } from '../../components/AdminTabs';
import '../AdminUsers/adminUsers.css';

type LoadState = 'loading' | 'forbidden' | 'error' | 'ready';

const AdminContact = () => {
    const [submissions, setSubmissions] = useState<ContactSubmissionRecord[]>([]);
    const [state, setState] = useState<LoadState>('loading');

    useEffect(() => {
        const fetchSubmissions = async () => {
            const result = await NoteRoutes.getContactSubmissions();
            // Same reasoning as AdminUsers: a 403's {"error": "Forbidden"}
            // body parses as valid JSON just fine, but isn't actually an
            // array -- checked explicitly rather than trusted, so it
            // doesn't crash the page on .map() below.
            if (!result) {
                setState('error');
                return;
            }
            if (!Array.isArray(result)) {
                setState('forbidden');
                return;
            }
            setSubmissions(result);
            setState('ready');
        };
        fetchSubmissions();
    }, []);

    return (
        <div>
            <div className="adminPage">
                <AdminTabs />

                {state === 'loading' && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                        <CircularProgress />
                    </Box>
                )}

                {state === 'forbidden' && (
                    <p className="adminMessage">You don&apos;t have access to this page.</p>
                )}

                {state === 'error' && (
                    <p className="adminMessage">Something went wrong loading submissions. Try again shortly.</p>
                )}

                {state === 'ready' && (
                    <>
                        <p className="adminEyebrow">Admin</p>
                        <h1 className="adminHeading">Contact submissions ({submissions.length})</h1>
                        <TableContainer className="adminTableContainer">
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell className="adminTableHeadCell">Date</TableCell>
                                        <TableCell className="adminTableHeadCell">Email</TableCell>
                                        <TableCell className="adminTableHeadCell">Message</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {submissions.map((s) => (
                                        <TableRow key={s._id}>
                                            <TableCell className="adminTableCell adminIdCell">
                                                {new Date(s.createdAt).toLocaleString()}
                                            </TableCell>
                                            <TableCell className="adminTableCell">{s.email}</TableCell>
                                            <TableCell className="adminTableCell">{s.message}</TableCell>
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

export default AdminContact;
