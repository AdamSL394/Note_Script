import mongoose, { Schema, Model } from 'mongoose';

// Matches the shape the browser's PushManager.subscribe() returns
// (via .toJSON()) -- endpoint is the push service URL to send to,
// keys are what web-push needs to encrypt the payload for this
// specific subscriber.
export interface IPushSubscription {
    userId: string;
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
    createdAt: Date;
}

const PushSubscriptionSchema = new Schema<IPushSubscription>({
    userId: { type: String, required: true, index: true },
    endpoint: { type: String, required: true, unique: true },
    keys: {
        p256dh: { type: String, required: true },
        auth: { type: String, required: true },
    },
    createdAt: { type: Date, default: Date.now },
});

const PushSubscriptionModel: Model<IPushSubscription> = mongoose.model<IPushSubscription>(
    'PushSubscription',
    PushSubscriptionSchema
);

export default PushSubscriptionModel;
