// OpenPencil KR 앱을 띄워 확인한다: 한글 입력(조합 포함)이 그려지는지, 글꼴 목록에 내장 한글 글꼴이 있는지,
// 사내 AI 게이트웨이(http, CORS 없음)에 중계 없이 연결되는지. 글꼴 CDN 은 막아 둔다(오프라인과 같은 조건).
// usage: node scripts/e2e.mjs [앱 실행 파일]   (없으면 node_modules 의 electron 으로 이 폴더를 연다)
//   AI 확인: OP_AI_URL=<게이트웨이 /v1 주소> OP_AI_MODEL=<모델> OP_AI_KEY_FILE=<KEY=값 이 든 .env> OP_AI_KEY_VAR=<변수 이름>
import fs from 'node:fs'; import path from 'node:path';
const { _electron } = await import('/Users/uengine/uengine-platform/pgpt-pro/server/node_modules/playwright/index.mjs');
const D = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = process.env.OUT || path.join(D, 'release', 'e2e'); fs.mkdirSync(OUT, { recursive: true });
const exe = process.argv[2];
const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
// 매번 새 프로필로 연다(첫 실행 안내가 다시 나오고, 이전 실행의 설정이 섞이지 않게)
const profile = fs.mkdtempSync(path.join(OUT, 'profile-'));
const args = [`--user-data-dir=${profile}`];
const app = await _electron.launch(exe ? { executablePath: exe, args, env } : { args: [D, ...args], env, executablePath: path.join(D, 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron') });
await app.context().route(/fontsource|jsdelivr|googleapis|gstatic|fonts\.bunny/, (r) => r.abort());
const p = await app.firstWindow();
await p.setViewportSize({ width: 1280, height: 800 }).catch(() => {});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = {};
const shot = (n) => p.screenshot({ path: path.join(OUT, n + '.png') });

await p.waitForLoadState('load'); await sleep(4000); await shot('01-home');
results.origin = await p.evaluate(() => location.origin);
results.fsAccess = await p.evaluate(() => typeof window.showSaveFilePicker === 'function' && typeof window.showOpenFilePicker === 'function');
results.serviceWorker = await p.evaluate(() => 'serviceWorker' in navigator);
results.toasts = await p.evaluate(() => [...document.querySelectorAll('[role=status], [data-sonner-toast], [role=alert]')].map((e) => e.textContent.trim()).filter(Boolean));
// 사내 게이트웨이 연결(중계 없이)
if (process.env.OP_AI_URL) {
  const env2 = fs.readFileSync(process.env.OP_AI_KEY_FILE, 'utf8');
  const key = (env2.match(new RegExp('^' + process.env.OP_AI_KEY_VAR + '=(.*)$', 'm')) || [])[1]?.replace(/"/g, '').trim();
  await p.getByText('Set up AI', { exact: true }).click({ timeout: 5000 }); await sleep(1500);
  await p.getByRole('button', { name: 'Advanced settings' }).first().click({ timeout: 5000 }); await sleep(1500);
  await p.getByRole('button', { name: 'No thanks' }).click({ timeout: 1500 }).catch(() => {});
  await p.getByRole('button', { name: /^Design model/ }).first().click({ timeout: 5000 }).catch(() => {}); await sleep(1000);
  const d = p.locator('[role=dialog]').last();
  await d.locator('input').first().fill('Frentis 사내 모델');
  await d.getByRole('combobox', { name: /Select a model|Model ID/ }).or(d.getByText('Select a model')).first().click(); await sleep(800);
  await p.getByText(/^Custom model/).last().click(); await sleep(600);
  await d.locator('input[placeholder="e.g. llama-3.3-70b"]').fill(process.env.OP_AI_MODEL);
  await d.locator('input[placeholder="http://localhost:11434/v1"]').fill(process.env.OP_AI_URL);
  await d.locator('input[type=password]').fill(key || '');
  if ((await d.innerText()).indexOf('Thinking level') < 0) await d.getByRole('button', { name: 'Advanced settings' }).last().click();
  await d.getByRole('combobox').filter({ hasText: 'Default' }).first().click(); await sleep(500);
  await p.getByRole('option', { name: 'Low', exact: true }).click(); await sleep(500);
  await d.getByRole('button', { name: 'Test connection' }).click();
  results.aiConnect = await d.getByText(/Connected successfully|Could not reach|failed|error/i).first().textContent({ timeout: 60000 }).catch((e) => 'timeout ' + e.message.split('\n')[0]);
  await shot('00-ai-connected');
  await d.getByRole('button', { name: 'Save model' }).click(); await sleep(1000);
  await p.getByRole('button', { name: 'Done' }).click({ timeout: 2000 }).catch(() => {});
  await p.keyboard.press('Escape'); await sleep(800);
}
await p.getByText('Start designing', { exact: true }).click({ timeout: 3000 }).catch(() => {});
await sleep(800);
await p.getByRole('button', { name: 'Design', exact: true }).click({ timeout: 5000 }).catch(() => {});
await sleep(3000);
await p.getByRole('button', { name: 'No thanks' }).click({ timeout: 2000 }).catch(() => {});
await p.keyboard.press('Escape'); await sleep(500);

// 흰 프레임 위에 글자 상자: 한 줄은 insertText, 한 줄은 IME 조합(ㅎ→하→한, ㄱ→그→글 …)으로 넣는다
await p.keyboard.press('f'); await p.mouse.move(300, 150); await p.mouse.down(); await p.mouse.move(900, 600, { steps: 8 }); await p.mouse.up(); await sleep(500);
await p.keyboard.press('t'); await p.mouse.click(400, 260); await sleep(800);
await p.keyboard.type('Parking ', { delay: 40 }); await p.keyboard.insertText('주차장 예약 앱');
await sleep(500); await p.keyboard.press('Escape'); await p.keyboard.press('Escape'); await sleep(500);
await p.keyboard.press('t'); await p.mouse.click(400, 340); await sleep(800);
const cdp = await p.context().newCDPSession(p);
for (const syl of [['ㅎ', '하', '한'], ['ㄱ', '그', '글']]) {
  for (const s of syl) { await cdp.send('Input.imeSetComposition', { text: s, selectionStart: s.length, selectionEnd: s.length }); await sleep(120); }
  await cdp.send('Input.insertText', { text: syl[syl.length - 1] }); await sleep(150);
}
await p.keyboard.type(' IME', { delay: 40 });
await sleep(800); await p.keyboard.press('Escape'); await p.keyboard.press('Escape'); await sleep(2500);
await shot('02-korean-text');
results.layers = await p.evaluate(() => [...document.querySelectorAll('[data-test-id*=layer], [role=treeitem]')].map((e) => e.textContent.trim()).filter(Boolean).slice(0, 8));

// 글꼴 목록: 첫 글자 상자를 골라 글꼴 고르기를 열고 내장 한글 글꼴을 찾는다
await p.mouse.click(420, 268); await sleep(800);
const fontBtn = p.getByRole('combobox').filter({ hasText: /^Inter$/ }).first();
await fontBtn.click({ timeout: 5000 }).catch(async () => { await p.getByText('Inter', { exact: true }).last().click({ timeout: 5000 }); });
await sleep(1500);
const search = p.locator('input[placeholder*="Search" i]').last();
results.fontPicker = {};
for (const fam of ['Pretendard', 'Noto Sans KR', 'Nanum Myeongjo']) {
  await search.fill(fam).catch(() => {}); await sleep(900);
  results.fontPicker[fam] = await p.getByText(fam, { exact: true }).count();
}
await shot('03-font-picker');
await p.getByText('Nanum Myeongjo', { exact: true }).last().click({ timeout: 3000 }).catch(() => {});
await sleep(2500); await p.keyboard.press('Escape'); await p.mouse.click(1000, 700); await sleep(1500);
await shot('04-nanum-myeongjo');

if (process.env.OP_AI_URL && process.env.OP_AI_PROMPT) {
  await p.mouse.click(1000, 700); await p.keyboard.press('Escape');
  await p.getByRole('tab', { name: /^AI$/ }).first().click({ timeout: 5000 }); await sleep(1200);
  await shot('05-ai-tab');
  results.textareas = await p.evaluate(() => [...document.querySelectorAll('textarea')].map((t) => [t.getAttribute('data-test-id'), t.placeholder, t.offsetWidth]));
  await p.getByText('Describe a change...').or(p.locator('[contenteditable=true]')).last().click({ timeout: 15000 }); await sleep(400);
  await p.keyboard.insertText(process.env.OP_AI_PROMPT); await sleep(400); await p.keyboard.press('Enter'); const t0 = Date.now();
  results.aiDone = await p.getByText('Revert changes').first().waitFor({ timeout: 300000 }).then(() => `${Math.round((Date.now() - t0) / 1000)}s`).catch((e) => 'timeout ' + e.message.split('\n')[0]);
  await sleep(3000); await shot('05-ai-result');
}
fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 1));
console.log(JSON.stringify(results, null, 1));
// 저장 안 한 문서 확인 창 없이 끝낸다
await app.evaluate(({ app: a }) => a.exit(0)).catch(() => {});
process.exit(0);
