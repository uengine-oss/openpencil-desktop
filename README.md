# OpenPencil KR

[OpenPencil](https://github.com/open-pencil/open-pencil)(Figma 파일을 열고 저장하는 오픈소스 디자인 편집기)의 최신 소스를 한글 글꼴과 함께 빌드해 Electron 데스크톱 앱으로 묶은 비공식 배포판입니다. 내려받아 설치하면 바로 쓸 수 있습니다.

- **한글이 그대로 보입니다.** Pretendard·Noto Sans KR·나눔명조를 앱 안에 넣었습니다. 인터넷이 막힌 곳에서도 한글이 그려지고, 글꼴 목록에서 바로 고를 수 있습니다. 공개 웹판(app.openpencil.dev)에서는 한글이 섞인 글 상자가 통째로 그려지지 않는 경우가 있었습니다.
- **사내 AI 모델을 바로 연결합니다.** 설정 → AI & agents → Models에서 OpenAI 호환 주소(예: 사내 게이트웨이 `http://…/v1`)를 넣으면 됩니다. 웹판처럼 CORS·혼합 콘텐츠 때문에 막히지 않으므로 중계 서버가 필요 없습니다.
- **최신 소스로 빌드했습니다.** 빌드 기준은 `UPSTREAM_REF`에 적은 커밋입니다.

## 내려받기

[Releases](https://github.com/uengine-oss/openpencil-desktop/releases/latest)에서 운영체제에 맞는 파일을 받습니다.

| 운영체제 | 파일 |
|---|---|
| macOS (Apple Silicon) | `OpenPencil-KR-<버전>-mac-arm64.dmg` |
| macOS (Intel) | `OpenPencil-KR-<버전>-mac-x64.dmg` |
| Windows 10·11 (64비트) | `OpenPencil-KR-<버전>-win-x64-setup.exe` |

코드 서명 전 버전입니다. macOS는 처음 한 번 앱을 우클릭한 뒤 **열기**를 누르세요. Windows에서 SmartScreen 경고가 뜨면 **추가 정보 → 실행**을 누르세요.

사용법은 [튜토리얼: 디자인 도구 하나 더 — OpenPencil과 사내 모델](https://www.uengine.org/docs/ai-planning/openpencil.html)을 참고하세요.

## 직접 빌드하기

필요한 것: Node.js 20 이상, git, [Rust(rustup)](https://rustup.rs)(편집기의 WebAssembly 모듈 빌드용). Bun은 스크립트가 저장소에서 고정한 버전으로 `.tools/`에 받습니다.

```sh
npm install
npm run web        # open-pencil 을 UPSTREAM_REF 커밋으로 받아 한글 글꼴 패치를 얹고 web/ 에 빌드
npm start          # 앱 실행
npm run dist       # release/ 에 macOS DMG(arm64·x64)와 Windows 설치 파일
node scripts/e2e.mjs   # 한글 입력·글꼴 목록 확인(글꼴 CDN 차단 상태)
```

최신 소스로 올리려면 `UPSTREAM_REF`의 커밋을 바꾸고 `npm run web`을 다시 실행합니다. 패치가 충돌하면 `upstream/`에서 고친 뒤 `git diff -- packages/core/src packages/core/tests > ../patches/0001-korean-fonts.patch`로 다시 저장합니다.

## 무엇을 바꿨나

| 위치 | 내용 |
|---|---|
| `patches/0001-korean-fonts.patch` | 편집기 코어의 내장 글꼴에 Pretendard·Noto Sans KR·나눔명조를 추가해 글꼴 목록에 넣고, 한글 대체 글꼴의 첫 순서를 내장 Pretendard로 둠(시스템 글꼴과 온라인 글꼴은 그다음) |
| `electron/main.cjs` | `web/`을 보안 출처(`openpencil://app`)로 띄움. 편집기가 부르는 바깥 주소의 응답에 CORS 허용을 붙이고 http 주소를 허용함. 로컬 글꼴 접근 허용. 웹판용 서비스 워커는 끔. 바깥 링크는 기본 브라우저로 염 |
| `fonts/` | 넣은 글꼴과 라이선스(SIL OFL 1.1, 원본 그대로) |

---

**English.** Unofficial Electron build of [OpenPencil](https://github.com/open-pencil/open-pencil) with bundled Korean fonts (Pretendard as the Hangul fallback; Noto Sans KR and Nanum Myeongjo in the font picker) so Korean text renders offline, and an Electron shell that lets the AI chat reach OpenAI-compatible endpoints without CORS or mixed-content errors. Not affiliated with the OpenPencil project. MIT; fonts under SIL OFL 1.1. See `NOTICE.md`.
