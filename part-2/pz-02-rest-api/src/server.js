import { createApp } from './app.js';

const port = Number(process.env.PORT) || 3000;
// Requests per minute and client address; a wrong or missing value keeps the default.
const max = Number(process.env.RATE_LIMIT_MAX) > 0 ? Number(process.env.RATE_LIMIT_MAX) : 300;
createApp({ limit: { windowMs: 60000, max } }).listen(port, () => console.log(`DSLKit REST API listens on http://localhost:${port}/api`));
