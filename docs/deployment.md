# ThoughtFlow Deployment Notes

The repository is split into:

- `frontend/` - Vite React player, served as static files.
- `backend/` - ASP.NET Core Minimal API, proxied behind nginx.
- PostgreSQL - stores published flows and completed play results.

## Local Development

Start PostgreSQL:

```bash
docker compose up -d postgres
```

Start the API:

```bash
cd backend
dotnet run
```

Seed the sample flow:

```bash
curl -X POST http://localhost:5165/api/dev/seed
```

Start the frontend:

```bash
cd frontend
npm install
npm run dev
```

Open:

```txt
http://localhost:5173/play/is-taste-enough
```

The writing-first editor is available locally at:

```txt
http://localhost:5173/editor
```

## Production Settings

Set the API connection string with an environment variable:

```bash
ConnectionStrings__DefaultConnection="Host=127.0.0.1;Port=5432;Database=thoughtflow;Username=thoughtflow;Password=change-me"
Database__EnsureCreated=false
Cors__AllowedOrigins__0="https://thoughtflow.example.com"
ASPNETCORE_URLS="http://127.0.0.1:5165"
```

For the first simple VPS deploy, you can set `Database__EnsureCreated=true` once to create the schema, then turn it back off. Later, replace that with EF migrations.

## GitHub Actions VPS Deploy

The repository includes `.github/workflows/deploy-vps.yml`. It builds and pushes two GHCR images:

- `thoughtflow-api`
- `thoughtflow-web`

It then copies `docker-compose.production.yml` to `/opt/thoughtflow/docker-compose.yml` and runs `docker compose pull && docker compose up -d` on the VPS.

Configure the same GitHub environment used by Dinzer, `Prod`, with:

- Repository/environment variables: `VPS_HOST`, `VPS_PORT`, `VPS_USER`
- Repository/environment secret: `VPS_SSH_PRIVATE_KEY`

The first deploy creates `/opt/thoughtflow/.env` if it does not exist. Review it on the VPS before pointing public traffic at the app:

```bash
sudo nano /opt/thoughtflow/.env
```

Important values:

```bash
GITHUB_OWNER=your-ghcr-owner
POSTGRES_DOCKER_NETWORK=dinzer_default
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=thoughtflow
POSTGRES_USER=thoughtflow
POSTGRES_PASSWORD=generated-by-deploy
POSTGRES_ADMIN_USER=dinzer-postgres-admin-user
POSTGRES_ADMIN_PASSWORD=dinzer-postgres-admin-password
CORS_ALLOWED_ORIGIN=https://thoughtflow.example.com
WEB_PORT=10000
DATABASE_ENSURE_CREATED=true
```

This setup reuses the existing Dinzer Postgres container by joining its Docker network, but creates a separate `thoughtflow` database and user. Do not point ThoughtFlow at Dinzer's application database.

Only the web container is bound to the host. The API stays private on Docker's internal app network and is reached through the frontend container's `/api` proxy. ThoughtFlow uses the `10000` block; reserve `10001` for a temporary API host port only if you ever need direct API debugging.

After the schema exists, set `DATABASE_ENSURE_CREATED=false` and redeploy once migrations are introduced.

## Host nginx

```nginx
server {
    listen 80;
    server_name thoughtflow.example.com;

    location / {
        proxy_pass http://127.0.0.1:10000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
