import { createApp } from './app.js';

const port = Number(process.env.PORT) || 3000;
createApp().listen(port, () => console.log(`DSLKit practical 1 listens on http://localhost:${port}`));
