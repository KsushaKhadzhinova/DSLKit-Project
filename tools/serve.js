import { staticServer } from './server.js';

const [dir, port] = process.argv.slice(2);
export const server = staticServer(dir).listen(Number(port), () => console.log(`http://localhost:${server.address().port}`));
