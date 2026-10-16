import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { openRequestLog } from './data/requestLog.js';

const port = Number(process.env.PORT) || 3000;
createApp({ log: openRequestLog(process.env.DB_FILE || fileURLToPath(new URL('../data/requests.db', import.meta.url))) }).listen(port, () =>
  console.log(`DSLKit practical 1 listens on http://localhost:${port}`),
);
