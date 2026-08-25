# Tripora backend

REST API for Tripora, the AI travel planner. Node + Express + TypeScript + MongoDB (Mongoose).

## Prerequisites

A MongoDB server. Either run one locally:

```sh
brew tap mongodb/brew && brew install mongodb-community
brew services start mongodb-community
```

or use a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster and put its
connection string in `.env` as `MONGODB_URI`. Defaults to
`mongodb://127.0.0.1:27017/tripora` when unset.

## Commands

```sh
npm install       # once
npm run dev       # dev server with reload (nodemon + tsx)
npm run typecheck # tsc --noEmit
npm run build     # compile to dist/
npm start         # run compiled build
```

Server defaults to port 3000 (`PORT` env var to change). Quick check:

```sh
curl http://localhost:3000/health
```

## Layout

- `src/index.ts` — entry point: connects to MongoDB, then starts the server
- `src/app.ts` — Express app: middleware, health route, 404 + error handlers
- `src/db.ts` — MongoDB connection (Mongoose)
- `src/routes/` — API routers, mounted under `/api`
# Tripora-backend
