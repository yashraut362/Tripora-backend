import mongoose from "mongoose";

const DEFAULT_URI = "mongodb://127.0.0.1:27017/tripora";

export async function connectDb() {
  const uri = process.env.MONGODB_URI ?? DEFAULT_URI;

  mongoose.connection.on("error", (err) => {
    console.error("MongoDB error:", err.message);
  });
  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB disconnected");
  });

  // Fail fast if no server is reachable instead of the 30s default.
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });

  return mongoose.connection;
}

export async function disconnectDb() {
  await mongoose.disconnect();
}

export function dbState(): "connected" | "disconnected" {
  return mongoose.connection.readyState === 1 ? "connected" : "disconnected";
}
