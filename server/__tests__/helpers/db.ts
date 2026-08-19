import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod: MongoMemoryServer | undefined;

// Real (ephemeral) MongoDB rather than mocked Mongoose models, on purpose:
// the bug class this suite exists to catch (any authenticated user could
// read/edit/delete any other user's note by guessing an _id) is a query-shape
// bug. A mocked model would happily return whatever we told it to and never
// notice that the *filter* itself was wrong.
export const connect = async (): Promise<void> => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex: true,
        useFindAndModify: false,
    } as mongoose.ConnectOptions);
};

export const closeDatabase = async (): Promise<void> => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    if (mongod) {
        await mongod.stop();
    }
};

export const clearDatabase = async (): Promise<void> => {
    const { collections } = mongoose.connection;
    for (const key of Object.keys(collections)) {
        await collections[key].deleteMany({});
    }
};