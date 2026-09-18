import mongoose, { Schema, Model } from 'mongoose';

export interface IContactSubmission {
    email: string;
    message: string;
    createdAt: Date;
}

const ContactSubmissionSchema = new Schema<IContactSubmission>({
    email: { type: String, required: true },
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});

const ContactSubmission: Model<IContactSubmission> = mongoose.model<IContactSubmission>(
    'ContactSubmission',
    ContactSubmissionSchema
);

export default ContactSubmission;
