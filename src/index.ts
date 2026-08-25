import { createApp } from "./app.js";
import { connectDb, disconnectDb } from "./db.js";

const port = Number(process.env.PORT) || 3000;

try {
  const db = await connectDb();
  console.log(`MongoDB connected: ${db.name}`);
} catch (err) {
  console.error("MongoDB connection failed:", err instanceof Error ? err.message : err);
  process.exit(1);
}

const server = createApp().listen(port, () => {
  console.log(`Tripora API listening on http://localhost:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close(() => {
      disconnectDb()
        .catch(() => {})
        .finally(() => process.exit(0));
    });
  });
}
