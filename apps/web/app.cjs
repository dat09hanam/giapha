// Startup file cho Plesk/Passenger: chạy bản build Next.js (`npm run build`) ngay trong apps/web.
const { createServer } = require('node:http');
const next = require('next');

const app = next({ dev: false, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((request, response) => handle(request, response)).listen(
    Number(process.env.PORT ?? 3000),
  );
});
