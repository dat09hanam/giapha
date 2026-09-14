# Gia Phả Việt

Base source cho ứng dụng web gia phả đa dòng họ. Mỗi tenant được truy cập bằng URL `/{slug}`, ví dụ `http://localhost:3000/demo`.

## Stack

- Web: Next.js App Router (React + TypeScript), Tailwind CSS, shadcn/ui conventions, React Flow.
- API: NestJS, TypeScript, REST, class-validator.
- Data: MySQL 8.4 và Prisma ORM 6.19 với MySQL engine tích hợp.
- Tooling: npm workspaces, ESLint, Prettier, Vitest, Docker Compose.

## Cấu trúc

```text
apps/
  web/                  Next.js UI và dynamic route app/[slug]
  api/                  NestJS API và Prisma schema
.codex/agents/          Project-scoped Codex agents
docs/architecture.md    Ranh giới hệ thống và multi-tenancy
docker-compose.yml      MySQL cho môi trường local
```

## Chạy local

Yêu cầu Node.js 22.22.3+, npm 10+ và Docker.

```bash
npm install
docker compose up -d
```

Tạo file môi trường từ các bản mẫu:

```powershell
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env.local
```

Khởi tạo database và dữ liệu mẫu:

```bash
npm run db:migrate -- --name init
npm run db:seed
```

Chạy cả web và API:

```bash
npm run dev
```

- Trang chủ: `http://localhost:3000`
- Tenant mẫu: `http://localhost:3000/demo`
- Health check: `http://localhost:4000/api/health`

## Lệnh kiểm tra

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Multi-tenant baseline

Ứng dụng bắt đầu với mô hình shared schema. `slug` chỉ dùng để định vị tenant công khai; API luôn resolve slug sang ID nội bộ rồi thêm `tenantId` vào truy vấn dữ liệu gia phả. Khi bổ sung màn hình quản trị, mọi mutation phải xác thực membership và role thay vì tin `tenantId` từ client.

Các quyết định và nguyên tắc mở rộng nằm trong `docs/architecture.md` và `AGENTS.md`.
