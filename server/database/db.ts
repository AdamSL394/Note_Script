import mongoose from 'mongoose';

// Single source of truth for connecting to Mongo. Accepts the
// connection string as an argument rather than hardcoding one, so the
// caller (server.ts, a seed script, tests, etc.) decides which
// environment/URI to use instead of this module deciding for them.
//
// These options are NOT no-ops on Mongoose 5.x (this app's pinned
// version, per package.json) — they only became defaults/no-ops
// starting in Mongoose 6.0. On 5.x, omitting them forces the driver
// onto its old legacy URL parser and topology engine, which can fail
// TLS negotiation against modern MongoDB Atlas clusters.
const connectToDB = async (connectionString: string) => {
  const connect = await mongoose.connect(connectionString, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false,
  } as mongoose.ConnectOptions);
  console.log(`MongoDB connected: ${connect.connection.host}`);
  return connect;
};

export default connectToDB;
