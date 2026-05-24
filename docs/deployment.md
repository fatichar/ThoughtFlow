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

## nginx

```nginx
server {
    listen 80;
    server_name thoughtflow.example.com;

    root /var/www/thoughtflow/frontend/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:5165/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```
