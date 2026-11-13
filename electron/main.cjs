// OpenPencil KR — OpenPencil 웹 편집기(빌드 결과 web/)를 Electron 창에 띄운다.
//  - web/ 은 openpencil://app/ 으로 서빙한다(보안 출처라 파일 열기·저장, 로컬 글꼴 접근이 된다).
//  - AI 모델 주소(사내 게이트웨이 등)는 CORS 를 갖추지 않아도, http 여도 부를 수 있게 응답 머리글을 채운다.
//    공식 데스크톱(Tauri)판이 CORS 를 거치지 않고 부르는 것과 같은 동작이다.
//  - 바깥 링크는 기본 브라우저로 연다.
const { app, BrowserWindow, Menu, net, protocol, session, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');

const SCHEME = 'openpencil';
const ORIGIN = `${SCHEME}://app`;
const WEB = path.join(__dirname, '..', 'web');

protocol.registerSchemesAsPrivileged([
  { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true, codeCache: true } }
]);

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.wasm': 'application/wasm', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.webp': 'image/webp',
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8', '.fig': 'application/octet-stream'
};

// 요청 경로 → web/ 안의 파일. 확장자 없는 경로(편집기 화면 주소)는 index.html. web/ 밖으로 나가는 경로는 막는다.
async function serve(request) {
  const url = new URL(request.url);
  let rel = decodeURIComponent(url.pathname).replace(/^\/+/, '');
  if (!rel || rel.endsWith('/')) rel += 'index.html';
  let file = path.normalize(path.join(WEB, rel));
  if (!file.startsWith(WEB + path.sep)) return new Response('forbidden', { status: 403 });
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    if (path.extname(rel)) return new Response('not found', { status: 404 });
    file = path.join(WEB, 'index.html');
  }
  // 서비스 워커는 웹판의 새 버전 받기용이라 앱에서는 쓰지 않는다: 편집기 스크립트보다 먼저 navigator 에서 뺀다
  // (편집기는 'serviceWorker' in navigator 가 아니면 등록·업데이트 확인을 건너뛴다)
  if (rel === 'sw.js') return new Response('not found', { status: 404 });
  if (path.basename(file) === 'index.html') {
    const html = fs.readFileSync(file, 'utf8').replace('<head>', '<head><script>delete Navigator.prototype.serviceWorker</script>');
    return new Response(html, { status: 200, headers: { 'content-type': TYPES['.html'] } });
  }
  const res = await net.fetch(pathToFileURL(file).toString());
  const headers = new Headers(res.headers);
  headers.set('content-type', TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream');
  return new Response(res.body, { status: 200, headers });
}

// 편집기가 부르는 바깥 주소(AI 모델, 글꼴 목록 등)의 응답에 CORS 허용을 붙인다. 사전 확인(OPTIONS)은 성공으로 돌린다.
function allowCrossOrigin(ses) {
  const asked = new Map();
  ses.webRequest.onBeforeSendHeaders({ urls: ['http://*/*', 'https://*/*'] }, (d, cb) => {
    const h = d.requestHeaders;
    const want = h['Access-Control-Request-Headers'] || h['access-control-request-headers'];
    if (want) asked.set(d.id, want);
    cb({ requestHeaders: h });
  });
  ses.webRequest.onHeadersReceived({ urls: ['http://*/*', 'https://*/*'] }, (d, cb) => {
    if (!d.webContentsId) return cb({});
    const out = {};
    for (const [k, v] of Object.entries(d.responseHeaders || {})) if (!/^access-control-/i.test(k)) out[k] = v;
    out['access-control-allow-origin'] = [ORIGIN];
    out['access-control-allow-credentials'] = ['true'];
    out['access-control-allow-methods'] = ['GET, POST, PUT, PATCH, DELETE, OPTIONS'];
    out['access-control-allow-headers'] = [asked.get(d.id) || '*'];
    out['access-control-expose-headers'] = ['*'];
    out['access-control-allow-private-network'] = ['true'];
    asked.delete(d.id);
    const res = { responseHeaders: out };
    if (d.method === 'OPTIONS' && !(d.statusCode >= 200 && d.statusCode < 300)) res.statusLine = 'HTTP/1.1 204 No Content';
    cb(res);
  });
}

// 이 앱 화면이 묻는 권한(로컬 글꼴·클립보드·전체 화면·사설망)은 허락하고, 다른 출처는 거절한다
const ALLOWED = new Set(['local-fonts', 'clipboard-read', 'clipboard-sanitized-write', 'fullscreen', 'local-network-access', 'local-network', 'loopback-network', 'fileSystem', 'notifications']);
function grantPermissions(ses) {
  const ours = (origin) => typeof origin === 'string' && origin.startsWith(ORIGIN);
  ses.setPermissionRequestHandler((wc, permission, cb, details) => cb(ours(details.requestingUrl || wc.getURL()) && ALLOWED.has(permission)));
  ses.setPermissionCheckHandler((wc, permission, origin) => ours(origin || (wc && wc.getURL())) && ALLOWED.has(permission));
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 900, minHeight: 600, show: false,
    title: 'OpenPencil KR', backgroundColor: '#1e1e1e',
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: false, allowRunningInsecureContent: true }
  });
  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith(ORIGIN)) { e.preventDefault(); if (/^https?:/i.test(url)) shell.openExternal(url); }
  });
  win.loadURL(`${ORIGIN}/`);
  return win;
}

// 맥은 메뉴의 편집 항목이 있어야 입력칸에서 ⌘C·⌘V 가 된다. 실행 취소·다시 실행은 편집기가 직접 처리한다.
function setMenu() {
  const mac = process.platform === 'darwin';
  const template = [
    ...(mac ? [{ role: 'appMenu' }] : []),
    { label: '편집', submenu: [{ role: 'cut', label: '잘라내기' }, { role: 'copy', label: '복사' }, { role: 'paste', label: '붙여넣기' }, { role: 'selectAll', label: '모두 선택' }] },
    { label: '보기', submenu: [{ role: 'reload', label: '새로 고침' }, { role: 'togglefullscreen', label: '전체 화면' }, { type: 'separator' }, { role: 'toggleDevTools', label: '개발자 도구' }] },
    { role: 'windowMenu', label: '창' },
    { label: '도움말', submenu: [
      { label: 'OpenPencil 문서', click: () => shell.openExternal('https://openpencil.dev') },
      { label: 'uEngine AI 도구 모음', click: () => shell.openExternal('https://www.uengine.org/contents/aitools.html#openpencil') },
      { label: '튜토리얼: OpenPencil과 사내 모델', click: () => shell.openExternal('https://www.uengine.org/docs/ai-planning/openpencil.html') }
    ] }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { const w = BrowserWindow.getAllWindows()[0]; if (w) { if (w.isMinimized()) w.restore(); w.focus(); } });
  app.whenReady().then(() => {
    const ses = session.defaultSession;
    ses.protocol.handle(SCHEME, serve);
    allowCrossOrigin(ses);
    grantPermissions(ses);
    setMenu();
    createWindow();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  });
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
}
