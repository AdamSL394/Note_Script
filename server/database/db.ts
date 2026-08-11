import mongoose from 'mongoose';

// Single source of truth for connecting to Mongo. Accepts the
// connection string as an argument rather than hardcoding one, so the
// caller (server.ts, a seed script, tests, etc.) decides which
// environment/URI to use instead of this module deciding for them.
const connectToDB = async (connectionString: string) => {
  const connect = await mongoose.connect(connectionString);
  console.log(`MongoDB connected: ${connect.connection.host}`);
  return connect;
};

export default connectToDB;