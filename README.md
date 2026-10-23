# LoanLens AI

Intelligent Lending Platform & Decision Support System.

## Architecture & Monorepo Layout

- `packages/shared`: Shared TypeScript types, Zod validation schemas, and common API contracts.
- `apps/backend`: Express.js + TypeScript REST API with request validation and centralized error handling.
- `apps/frontend`: React 19 + Vite + TypeScript + Tailwind CSS v4 dashboard shell.
- `docker-compose.yml`: PostgreSQL 16 + pgvector container mapped to host port **5433**.

## Ports & Services

| Service | Host Port | Internal Port | Description |
| :--- | :--- | :--- | :--- |
| Frontend | `5173` | `5173` | React 19 + Vite development server |
| Backend | `5000` | `5000` | Express REST API |
| Database | `5433` | `5432` | PostgreSQL 16 with pgvector |

## Quickstart

### 1. Environment Setup
```bash
cp .env.example .env
npm install
```

### 2. Start PostgreSQL (Docker)
```bash
npm run db:up
```

### 3. Start Development Servers
```bash
# Start both backend and frontend concurrently:
npm run dev

# Or independently:
npm run dev:backend
npm run dev:frontend
```

### 4. Build and Test
```bash
npm run build
npm run test
```

## API Endpoints (Phase 1)

- `GET /api/health` — Service status check.
- `GET /api` — Application metadata and API version.
