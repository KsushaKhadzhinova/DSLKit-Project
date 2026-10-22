import puppeteer from 'puppeteer-core';
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PORT = 9333;
export const start = async () => {
  const b = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', headless: true, defaultViewport: { width: 1600, height: 900 },
    args: [`--remote-debugging-port=${PORT}`, '--remote-allow-origins=*', '--disable-features=LocalNetworkAccessChecks,LocalNetworkAccessChecksWebSockets,BlockInsecurePrivateNetworkRequests', '--lang=en-US'],
  });
  const app = await b.newPage();
  await app.setViewport({ width: 1280, height: 800 });
  const cdp = await app.createCDPSession();
  await cdp.send('Emulation.setUserAgentOverride', {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36',
    userAgentMetadata: { brands: [{ brand: 'Google Chrome', version: '155' }, { brand: 'Chromium', version: '155' }, { brand: 'Not(A:Brand', version: '24' }], fullVersion: '155.0.8059.41', platform: 'Windows', platformVersion: '10.0.0', architecture: 'x86', model: '', mobile: false },
  });
  await app.goto('about:blank');
  const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
  const t = list.find((x) => x.type === 'page' && x.url === 'about:blank');
  const open = async (panel) => {
    const dt = await b.newPage();
    await dt.setViewport({ width: 1600, height: 900 });
    await dt.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
    const url = t.devtoolsFrontendUrl.replace('inspector.html', 'devtools_app.html') + `&panel=${panel}&dockSide=bottom`;
    await dt.goto(url, { waitUntil: 'load', timeout: 60000 });
    await sleep(2500);
    return dt;
  };
  return { b, app, open };
};
