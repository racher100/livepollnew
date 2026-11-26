# LivePoll

Create a poll, share the link, and watch votes arrive in real time, with no refresh.

**Flow:** Create poll → Share link → Audience votes → Live results

**Live Link:** [Click here to open LivePoll](https://livepoll-1-faf5.onrender.com)
## Stack and what each part does

| Layer | Tech | Real job |
|---|---|---|
| Frontend | React (Vite) | UI, login, dashboard, live results page |
| Backend | Go + Gin | REST API, validation, JWT auth, SSE streaming |
| Database | MongoDB | Source of truth: users, polls, votes |
| Realtime | Redis | Live vote counters (hash), Pub/Sub for live push, viewer count, rate limiting |

## How the real-time part works

1. A voter's `POST /api/polls/:id/vote` is validated, then inserted into MongoDB. A **unique index on (pollId, voterId)** guarantees one vote per voter, even under race conditions.
2. The backend then `HINCRBY`s the poll's Redis hash and **publishes** the new tallies on the channel `poll:<id>:events`.
3. Every browser watching a poll holds an open **Server-Sent Events** connection (`GET /api/polls/:id/stream`). Each connection is subscribed to that Redis channel and forwards messages to the browser. Because delivery goes through Redis Pub/Sub, it works across multiple backend instances.
4. If the Redis counter is missing (restart/eviction), it is rebuilt from MongoDB.
5. The "watching" count is a Redis counter incremented/decremented as streams connect and disconnect.

## Key decisions

- **SSE instead of WebSockets:** updates only flow server → client, SSE auto-reconnects, and it needs no extra library. The client refetches a snapshot on every (re)connect so no vote is missed.
- **Mongo first, then Redis:** durability and dedup come from Mongo; Redis makes reads and pushes fast.
- **Auth:** signup/login with bcrypt-hashed passwords and 7-day JWTs. Creating, closing and deleting polls requires login and ownership; voting is open to anyone.
- **Anonymous voter identity:** a random httpOnly cookie. Clearing cookies lets someone vote again. Stopping that fully would need mandatory login or stronger fingerprinting, a deliberate trade-off.
- **Validation (server-side):** email format, password length, question 3-200 chars, 2-10 unique options of 1-100 chars, option must belong to the poll, 1 MB body limit.
- **Rate limiting:** Redis fixed-window per IP on auth (20/min) and voting (30/min).
- **Single deployable unit:** the Go server also serves the built React app, so cookies are same-origin.
- **Extras:** close/reopen poll, delete poll, "my polls" dashboard, live viewer count, copy-link.

## Structure

```
frontend/   React app (pages, api client, auth context)
backend/    Go service (config, models, store, handlers, middleware)
Dockerfile  builds both and ships one image
```

## Run locally

```bash
docker compose up -d                       # MongoDB + Redis
cp .env.example backend/.env               # or export the variables

cd backend && go mod tidy                  # creates go.sum (commit it)
export $(cat .env.example | xargs) && go run .     # API on :8080

cd ../frontend && npm install && npm run dev       # UI on :5173 (proxies /api)
```

## Deploy (free tier)

1. **MongoDB:** create a free cluster on MongoDB Atlas, allow access from anywhere (0.0.0.0/0), copy the connection string.
2. **Redis:** create a free database on Upstash (or Render Key Value) and copy the `rediss://...` URL.
3. **App:** on Render, create a *Web Service* from this repo with Runtime = Docker. Set `MONGO_URI`, `REDIS_URL`, `JWT_SECRET` (long random string) and `MONGO_DB`.
4. Open the Render URL, sign up, create a poll, and open the share link in two browsers to see live updates.

## API

`POST /api/auth/signup|login` · `GET /api/auth/me` · `POST /api/polls` · `GET /api/my/polls` ·
`GET /api/polls/:id` · `POST /api/polls/:id/vote` · `GET /api/polls/:id/stream` (SSE) ·
`PATCH /api/polls/:id/close` · `DELETE /api/polls/:id`

## New dashboard features (added on top of the original)

- **Sidebar dashboard:** `+ New Poll`, `My Polls` list, per-poll tabs **Live / Questions / Results**
- **Share tools:** Download QR code, Copy join link, Open projector display (`/d/:id`, public, full screen)
- **Control Flow:** `Show Lobby Screen`, and `Push` / `Reveal` for the question (lobby → voting → results)
- **Live Preview:** exactly what the projector shows, with coloured horizontal bars and legend
- **Reset Votes** (clears Mongo votes + Redis counters, voters can vote again) and **Delete Poll**
- **Results tab:** stat tiles and CSV export
- Dark theme in `frontend/src/theme.css` (palette: `#10121B`, `#1B1E2B`, `#8B5CF6`, `#38BDF8`)

New API: `POST /api/polls/:id/reset` · `PATCH /api/polls/:id/display` `{display: lobby|voting|results}`

After pulling these changes run `cd frontend && npm install` once (adds the `qrcode` package).
