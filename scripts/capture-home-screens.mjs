#!/usr/bin/env node
// Captures the mobile feature screenshots shown on the landing page.
//
// Uses only the demo family (`ho-nguyen-mau`) so no real genealogy data ends up in
// public assets. Talks to Chrome directly over the DevTools Protocol, so it needs no
// npm dependency — only a local Chrome/Chromium and a running `npm run dev`.
//
//   node --experimental-websocket scripts/capture-home-screens.mjs [shot-name ...]
//
// Env: BASE_URL (default http://localhost:3005), CHROME (default google-chrome),
// OUT_DIR (default apps/web/public/images/decorations).

import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3005';
const CHROME = process.env.CHROME ?? 'google-chrome';
const DEMO = '/ho-nguyen-mau';
const OUT_DIR =
  process.env.OUT_DIR ??
  path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../apps/web/public/images/decorations',
  );
const VIEWPORT = { width: 390, height: 844, deviceScaleFactor: 2 };

/** Helpers injected into every page; actions below call them by name. */
const PAGE_HELPERS = `
  window.__sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  window.__byText = (selector, text) =>
    [...document.querySelectorAll(selector)].find((el) => el.textContent.trim().includes(text));
  window.__click = async (selector, text) => {
    const el = text ? window.__byText(selector, text) : document.querySelector(selector);
    if (!el) throw new Error('Not found: ' + selector + ' ' + (text ?? ''));
    el.scrollIntoView({ block: 'center' });
    el.click();
    await window.__sleep(700);
  };
  window.__type = async (selector, text) => {
    const el = document.querySelector(selector);
    if (!el) throw new Error('Not found: ' + selector);
    el.focus();
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(el, text);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    await window.__sleep(500);
  };
  window.__zoomAt = async (x, y, times = 1) => {
    for (let i = 0; i < times; i += 1) {
      const target = document.elementFromPoint(x, y);
      target.dispatchEvent(
        new MouseEvent('dblclick', { bubbles: true, clientX: x, clientY: y, view: window }),
      );
      await window.__sleep(600);
    }
  };
  window.__hideChrome = () => {
    const style = document.createElement('style');
    style.textContent =
      'nextjs-portal, [data-nextjs-toast], [data-next-badge-root] { display: none !important; }';
    document.head.append(style);
  };
`;

/**
 * `login: true` shots need a demo-family account: set GIAPHA_USERNAME and GIAPHA_PASSWORD.
 * Without them those shots are skipped.
 * `clip` crops to the first element matching that selector; `viewport` overrides the phone size.
 * @type {{
 *   name: string;
 *   url: string;
 *   login?: boolean;
 *   actions?: string[];
 *   scrollY?: number;
 *   clip?: string;
 *   viewport?: { width: number; height: number; deviceScaleFactor: number; mobile: boolean };
 * }[]}
 */
const SHOTS = [
  { name: 'screen-tree', url: '/gia-pha-mau', actions: ['await __zoomAt(195, 520, 2)'] },
  {
    name: 'screen-profile',
    url: '/gia-pha-mau',
    actions: [`await __click('.react-flow__node-person', '')`],
  },
  {
    name: 'screen-kinship',
    url: '/gia-pha-mau',
    actions: [
      `await __click('.react-flow__node-person', '')`,
      `await __click('button', 'Tính xưng hô')`,
      `await __type('[role="dialog"] input[role="combobox"]', 'Thanh vien thu 2')`,
      `[...document.querySelectorAll('[role="dialog"] [role="option"]')].at(-1).click(); await __sleep(800)`,
    ],
  },
  {
    name: 'screen-poster',
    url: '/gia-pha-mau',
    viewport: { width: 1280, height: 860, deviceScaleFactor: 1.5, mobile: false },
    clip: '[aria-label="Phả đồ cây gia phả"]',
  },
  { name: 'screen-login', url: '/login' },
  { name: 'screen-home', url: DEMO, login: true },
  { name: 'screen-feed', url: `${DEMO}/bang-tin`, login: true },
  { name: 'screen-fund', url: `${DEMO}/quy-ho`, login: true },
  { name: 'screen-merit', url: `${DEMO}/cong-duc`, login: true },
  { name: 'screen-library', url: `${DEMO}/tu-lieu`, login: true },
  { name: 'screen-print', url: `${DEMO}/in-gia-pha`, login: true },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function launchChrome() {
  const profile = await mkdtemp(path.join(tmpdir(), 'giapha-capture-'));
  const chrome = spawn(
    CHROME,
    [
      '--headless=new',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
      '--no-first-run',
      '--hide-scrollbars',
      '--force-color-profile=srgb',
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  );
  const wsUrl = await new Promise((resolve, reject) => {
    let log = '';
    chrome.stderr.on('data', (chunk) => {
      log += chunk;
      const match = log.match(/DevTools listening on (ws:\/\/\S+)/);
      if (match) resolve(match[1]);
    });
    chrome.on('exit', (code) => reject(new Error(`Chrome exited (${code}): ${log}`)));
  });
  return { chrome, profile, wsUrl };
}

function connect(wsUrl) {
  const socket = new WebSocket(wsUrl);
  let nextId = 0;
  const pending = new Map();
  const listeners = new Set();
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    } else {
      for (const listener of listeners) listener(message);
    }
  });
  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params, sessionId }));
    });
  const opened = new Promise((resolve) => socket.addEventListener('open', resolve));
  return { opened, send, listeners, close: () => socket.close() };
}

async function openPage(cdp, url, viewport = { ...VIEWPORT, mobile: true }) {
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  const send = (method, params) => cdp.send(method, params, sessionId);

  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', viewport);
  await send('Emulation.setTouchEmulationEnabled', { enabled: viewport.mobile });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: PAGE_HELPERS });

  const loaded = new Promise((resolve) => {
    const onEvent = (message) => {
      if (message.sessionId === sessionId && message.method === 'Page.loadEventFired') {
        cdp.listeners.delete(onEvent);
        resolve();
      }
    };
    cdp.listeners.add(onEvent);
  });
  await send('Page.navigate', { url: `${BASE_URL}${url}` });
  await loaded;
  await sleep(2500);

  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', {
      expression: `(async () => { ${expression} })()`,
      awaitPromise: true,
    });
    if (result.exceptionDetails) {
      throw new Error(`${url}: ${result.exceptionDetails.exception?.description}`);
    }
  };
  const close = () => cdp.send('Target.closeTarget', { targetId });
  return { send, evaluate, close };
}

async function login(cdp, username, password) {
  const page = await openPage(cdp, '/login');
  await page.evaluate(`await __type('input[name="username"]', ${JSON.stringify(username)})`);
  await page.evaluate(`await __type('input[name="password"]', ${JSON.stringify(password)})`);
  await page.evaluate(`document.querySelector('button[type="submit"]').click()`);
  await sleep(3000);
  await page.close();
}

async function capture(cdp, shot) {
  const page = await openPage(cdp, shot.url, shot.viewport);
  await page.evaluate('__hideChrome()');
  for (const action of shot.actions ?? []) await page.evaluate(action);
  if (shot.scrollY) await page.evaluate(`window.scrollTo(0, ${shot.scrollY}); await __sleep(600)`);
  await sleep(800);

  let clip;
  if (shot.clip) {
    const { result } = await page.send('Runtime.evaluate', {
      expression: `(() => {
        const nodes = [...document.querySelectorAll(${JSON.stringify(shot.clip)})];
        const rects = nodes.map((node) => node.getBoundingClientRect()).filter((r) => r.width);
        const left = Math.max(0, Math.min(...rects.map((r) => r.left)));
        const top = Math.max(0, Math.min(...rects.map((r) => r.top)));
        const right = Math.min(innerWidth, Math.max(...rects.map((r) => r.right)));
        const bottom = Math.min(innerHeight, Math.max(...rects.map((r) => r.bottom)));
        return JSON.stringify({ x: left, y: top, width: right - left, height: bottom - top });
      })()`,
      returnByValue: true,
    });
    clip = { ...JSON.parse(result.value), scale: 1 };
  }
  const { data } = await page.send('Page.captureScreenshot', {
    format: 'webp',
    quality: 82,
    ...(clip ? { clip, captureBeyondViewport: false } : {}),
  });
  const file = path.join(OUT_DIR, `${shot.name}.webp`);
  await writeFile(file, Buffer.from(data, 'base64'));
  await page.close();
  console.log(`✓ ${path.relative(process.cwd(), file)}`);
}

async function main() {
  const only = new Set(process.argv.slice(2));
  const { GIAPHA_USERNAME: username, GIAPHA_PASSWORD: password } = process.env;
  const shots = SHOTS.filter((shot) => {
    if (only.size && !only.has(shot.name)) return false;
    if (shot.login && !(username && password)) {
      console.warn(`- ${shot.name}: skipped (set GIAPHA_USERNAME and GIAPHA_PASSWORD)`);
      return false;
    }
    return true;
  });
  const { chrome, profile, wsUrl } = await launchChrome();
  const cdp = connect(wsUrl);
  try {
    await cdp.opened;
    if (shots.some((shot) => shot.login)) await login(cdp, username, password);
    for (const shot of shots) await capture(cdp, shot);
  } finally {
    cdp.close();
    chrome.kill();
    await sleep(300);
    await rm(profile, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
