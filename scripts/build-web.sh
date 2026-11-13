#!/usr/bin/env bash
# OpenPencil 웹 편집기를 고정한 커밋(UPSTREAM_REF)에서 받아 한글 글꼴 패치를 얹고 빌드해 web/ 에 둔다.
# 필요: bun(저장소가 고정한 버전을 .tools 에 받는다), Rust(rustup — html-engine.wasm 빌드), git, node/npm
# usage: bash scripts/build-web.sh        (upstream/ 이 있으면 그 커밋으로 맞춘 뒤 다시 빌드)
set -euo pipefail
D=$(cd "$(dirname "$0")/.." && pwd)
cd "$D"
REF=$(cat UPSTREAM_REF)

[ -x .tools/node_modules/.bin/bun ] || npm install --silent --prefix .tools "bun@$(cat BUN_VERSION)"
export PATH="$D/.tools/node_modules/.bin:$HOME/.cargo/bin:$PATH"
command -v cargo >/dev/null || { echo "Rust 가 필요합니다: https://rustup.rs" >&2; exit 1; }

if [ ! -d upstream/.git ]; then
  git clone --filter=blob:none https://github.com/open-pencil/open-pencil.git upstream
fi
cd upstream
git fetch -q origin "$REF" 2>/dev/null || git fetch -q origin
git checkout -q --force "$REF"
git clean -qfd packages/core/assets packages/core/src packages/core/tests src
for f in "$D"/patches/*.patch; do git apply "$f"; done
cp "$D"/fonts/*.ttf "$D"/fonts/*.woff2 "$D"/fonts/*-OFL.txt packages/core/assets/

bun install
bun run build:packages
bun x vite build

rm -rf "$D/web"
cp -R dist "$D/web"
rm -f "$D/web/sw.js" "$D"/web/workbox-*.js
cp "$D/web/brand/app-icon-1024.png" "$D/build/icon.png"
echo "web/ ← open-pencil $REF ($(du -sh "$D/web" | cut -f1))"
