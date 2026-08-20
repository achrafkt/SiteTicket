# SiteTicket

Internal ticketing platform starter for construction projects.

## Stack

- Backend: NestJS + TypeScript + Prisma + PostgreSQL
- Frontend: Next.js + React + TypeScript
- Local services: PostgreSQL + Redis with Docker Compose

## Project Structure

- `backend`: NestJS API
- `web`: Next.js web frontend

## Local Startup

1. Start PostgreSQL and Redis:

   ```bash
   docker compose up -d
   ```

2. Install backend dependencies:

   ```bash
   npm --prefix backend install
   ```

3. Generate the Prisma client and apply migrations:

   ```bash
   npm --prefix backend run prisma:generate
   npm --prefix backend run migrate:deploy
   ```

   When changing `prisma/schema.prisma` locally, create a new migration instead with `npm --prefix backend run migrate:dev`.

4. Start the backend:

   ```bash
   npm --prefix backend run start:dev
   ```

5. Install frontend dependencies if needed, then start the web app:

   ```bash
   npm --prefix web install
   npm --prefix web run dev
   ```

6. Open the applications:

- Web: `http://localhost:3000/login`
- API health: `http://localhost:3001/health`

## Default Seeded Admin

The backend seeds reference data and a default administrator account at startup if it does not already exist.

- Email: `admin@site-ticket.local`
- Password: `Admin1234!`

## Main API Endpoints

- `GET /health`
- `POST /auth/login`
- `GET /users`
- `POST /users`
- `PATCH /users/:id`
- `DELETE /users/:id`
- `GET /projects`
- `POST /projects`
- `PATCH /projects/:id`
- `DELETE /projects/:id`

All `users` and `projects` routes require a Bearer token from `POST /auth/login`.