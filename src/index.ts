import mongoose from "mongoose";
import { createApp } from "./app.js";

const port = Number(process.env.PORT) || 3000;
const uri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/tripora";

try {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  console.log(`MongoDB connected: ${mongoose.connection.name}`);
} catch (err) {
  console.error(
    "MongoDB connection failed:",
    err instanceof Error ? err.message : err,
  );
  process.exit(1);
}

const server = createApp().listen(port, () => {
  console.log(`Tripora API listening on http://localhost:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close(() => {
      mongoose
        .disconnect()
        .catch(() => {})
        .finally(() => process.exit(0));
    });
  });
}
