import mongoose, { Schema, Document, Model } from 'mongoose';

// Matches the client's TrackedStat shape (client/src/types.ts) — kept as
// a local duplicate rather than a shared import, since client and server
// are separate TypeScript projects with no shared-package setup here.
export interface ISetting {
    icon: string;
    name: string;
    visible: 'visible' | 'hidden';
}

export interface IUser extends Document {
    _id: string;
    settings: ISetting[];
    email: string;
}

const UserSchema = new Schema<IUser>({
    _id: String,
    settings: { type: Array, default: [] },
    email: String,
});

const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema);

export default User;