import User, { IUser, ISetting } from '../models/user';
import mongoose from 'mongoose';
import Note from '../models/notes';
import { logger } from '../logger';

interface UserDetails {
    email: string;
}

const getSingleUser = async (
    id: string,
    userDetails: UserDetails
): Promise<IUser[]> => {
    let user: IUser[] = await User.find({ _id: id }).exec();
    // User.find() always returns an array (possibly empty), never
    // null/undefined — `!user` was never true here, so a missing user
    // never actually triggered account creation.
    if (!user || user.length < 1) {
        user = await saveNewUser(id, userDetails);
    }
    return user;
};

const STARTER_TAGS: ISetting[] = [
    { icon: '👋', name: 'welcome', visible: 'hidden' },
    { icon: '🥇', name: 'medal', visible: 'hidden' },
];

function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

async function seedExampleNotes(userId: string): Promise<void> {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    await Note.insertMany([
        {
            userId,
            text:
                'Welcome to Note Script! This is what a note looks like -- tap the tag icon below ' +
                "to track things like exercise, reading, or anything else you'd like to notice " +
                'patterns in over time.',
            date: formatDate(today),
            tags: [{ name: 'welcome', icon: '👋' }],
        },
        {
            userId,
            text:
                'Notes can be as short or as detailed as you like. Tags with a gold border, like ' +
                'this one, count as a "win" for the day.',
            date: formatDate(yesterday),
            tags: [{ name: 'medal', icon: '🥇' }],
        },
    ]);
}

const saveNewUser = async (
    id: string,
    userDetails: UserDetails
): Promise<IUser[]> => {
    const newUser = new User({ _id: id, email: userDetails.email, settings: STARTER_TAGS });
    // Previously used the callback form of .save() without awaiting it,
    // so this function returned before the callback could ever set
    // errorMessage — it almost always reported success regardless of
    // whether the save worked. It also returned a bare string, but every
    // caller (getSingleUser, updateUserStats) expects an array and reads
    // user[0] off the result — a brand-new user's first request was
    // silently broken either way. Returning [savedUser]/[] here matches
    // the shape User.find() returns, so both callers work unchanged.
    try {
        const savedUser = await newUser.save();
        try {
            await seedExampleNotes(id);
        } catch (err) {
            // Best-effort: the example notes are an onboarding nice-to-
            // have, not a requirement for the account to work. A failure
            // here shouldn't block signup or surface as an account
            // creation error to the new user.
            logger.error({ err, userId: id }, 'Failed to seed example notes for new user');
        }
        return [savedUser];
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error({ err }, message);
        return [];
    }
};

const updateUserStats = async (
    id: string,
    userDetails: UserDetails,
    stats: ISetting
): Promise<IUser | null> => {
    const filter = { _id: id };
    let user: IUser[] = await User.find(filter).exec();
    if (user.length < 1 || user == undefined) {
        user = await saveNewUser(id, userDetails);
    }
    const userSettings = user[0].settings;
    // Was `typeof(userSettings) == []`, which can never be true (typeof
    // always returns a string, and comparing it to an array coerces the
    // array to '""' via ==) — this silently made the entire
    // remove-existing-stat branch below unreachable dead code.
    if (Array.isArray(userSettings)) {
        for (const setting of userSettings) {
            if (setting.name == stats.name) {
                const arr = userSettings.filter(function (item) {
                    return item.name != stats.name;
                });
                const filteredUserStats = { settings: arr };
                const userWithUpdatedStats = await User.findOneAndUpdate(filter, filteredUserStats, { new: true });
                return userWithUpdatedStats;
            }
        }

    }

    userSettings.push(stats);
    const updatedUser = { settings: userSettings };
    const userWithUpdatedStats = await User.findOneAndUpdate(filter, updatedUser, { new: true });
    return userWithUpdatedStats;
};

const getAllUsers = async (): Promise<Pick<IUser, '_id' | 'email' | 'role'>[]> => {
    const users = await User.find({}, '_id email role').exec();
    return users;
};

const deleteAccount = async (userId: string): Promise<void> => {
    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
            await Note.deleteMany({ userId }).session(session);
            await User.deleteOne({ _id: userId }).session(session);
        });
    } finally {
        await session.endSession();
    }
};

export interface ExportedNote {
    text: string;
    date: string;
    star: string;
    tags: { name: string; icon: string }[];
    edit: boolean;
    updatedAt?: Date;
}

export interface ExportedAccountData {
    exportedAt: string;
    account: {
        email: string;
        settings: ISetting[];
        notificationPreferences?: IUser['notificationPreferences'];
    };
    notes: ExportedNote[];
}

// Bundles everything a user would reasonably consider "their data" into
// one downloadable file -- the export counterpart to deleteAccount
// above, for the same reason: users should always be able to get their
// data OUT, not just have it deleted. Deliberately excludes push
// subscription keys (technical browser artifacts, not meaningful user
// data, and including raw subscription credentials in a downloadable
// file would be a minor exposure) and internal fields like the
// Mongo _id, userId, or role (database internals a user exporting
// their own data neither needs nor expects to see).
const markOnboardingDemoSeen = async (userId: string): Promise<void> => {
    await User.updateOne({ _id: userId }, { hasSeenOnboardingDemo: true });
};

const exportUserData = async (userId: string): Promise<ExportedAccountData> => {
    const [user, notes] = await Promise.all([
        User.findOne({ _id: userId }).lean(),
        Note.find({ userId }).sort({ date: -1 }).lean(),
    ]);

    return {
        exportedAt: new Date().toISOString(),
        account: {
            email: user?.email ?? '',
            settings: user?.settings ?? [],
            notificationPreferences: user?.notificationPreferences,
        },
        notes: notes.map((note) => ({
            text: note.text,
            date: note.date,
            star: note.star,
            tags: note.tags ?? [],
            edit: note.edit,
            updatedAt: note.updatedAt,
        })),
    };
};

export default {
    getSingleUser,
    saveNewUser,
    updateUserStats,
    getAllUsers,
    deleteAccount,
    exportUserData,
    markOnboardingDemoSeen,
};