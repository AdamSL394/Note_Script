import mongoose, { Schema, Model } from 'mongoose';

// Matches the client's TrackedStat shape (client/src/types.ts) — kept as
// a local duplicate rather than a shared import, since client and server
// are separate TypeScript projects with no shared-package setup here.
export interface ISetting {
    icon: string;
    name: string;
    visible: 'visible' | 'hidden';
}

// Deliberately NOT extending Document — per Mongoose's own TypeScript
// guidance, doing so makes it hard for Mongoose to correctly infer
// document shapes for query filters, lean documents, etc. This is a
// plain interface describing the data shape; Mongoose wraps it in a
// hydrated document (with .save() and friends) structurally wherever
// needed, rather than IUser itself carrying those methods in its type.
export interface IUser {
    _id: string;
    settings: ISetting[];
    email: string;
}

const SettingSchema = new Schema<ISetting>(
    {
        icon: { type: String, required: true },
        name: { type: String, required: true },
        visible: { type: String, enum: ['visible', 'hidden'], required: true },
    },
    { _id: false }
);

const UserSchema = new Schema<IUser>({
    _id: String,
    // Was `{ type: Array, default: [] }` — a bare Array type gives
    // Mongoose no idea what's actually inside it, so individual setting
    // entries were never validated or cast against ISetting's shape at
    // all. This sub-schema means each entry is now properly validated.
    settings: { type: [SettingSchema], default: [] },
    email: String,
});

const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema);

export default User;