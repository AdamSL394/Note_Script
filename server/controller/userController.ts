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
    const mongooseId = new mongoose.Types.ObjectId(id);
    let user: IUser[] = await User.find({ _id: mongooseId }).exec();
    // User.find() always returns an array (possibly empty), never
    // null/undefined — `!user` was never true here, so a missing user
    // never actually triggered account creation.
    if (!user || user.length < 1) {
        user = await saveNewUser(id, userDetails);
    }
    return user;
};

const saveNewUser = async (
    id: string,
    userDetails: UserDetails
): Promise<IUser[]> => {
    const mongooseId = new mongoose.Types.ObjectId(id);
    // Explicit .toString() here since the schema declares _id as String,
    // not ObjectId — Mongoose's driver auto-casts this at runtime either
    // way, but being explicit matches the schema's actual declared type
    // instead of relying on implicit casting.
    const newUser = new User({ _id: mongooseId.toString(), email: userDetails.email });
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
    const mongooseId = new mongoose.Types.ObjectId(id);
    const filter = { _id: mongooseId };
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
    const mongooseId = new mongoose.Types.ObjectId(userId);
    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
            await Note.deleteMany({ userId }).session(session);
            await User.deleteOne({ _id: mongooseId }).session(session);
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
};