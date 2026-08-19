import User, { IUser, ISetting } from '../models/user';
import mongoose from 'mongoose';

interface UserDetails {
    email: string;
}

const getSingleUser = async (
    id: string,
    userDetails: UserDetails
): Promise<IUser[]> => {
    const mongooseId = new mongoose.Types.ObjectId(id);
    let user = await User.find({ _id: mongooseId }).exec();
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
        console.log(message);
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
    let user = await User.find(filter).exec();
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

export default {
    getSingleUser,
    saveNewUser,
    updateUserStats,
};