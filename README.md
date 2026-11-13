# OpenPencil KR

[OpenPencil](https://github.com/open-pencil/open-pencil)(Figma 파일을 열고 저장하는 오픈소스 디자인 편집기)의 최신 소스에 한글 글꼴을 넣어 만든 비공식 Electron 데스크톱 앱입니다. 내려받아 설치하면 바로 사용할 수 있습니다.

- **한글 글꼴을 내장했습니다.** Pretendard·Noto Sans KR·나눔명조를 앱에 넣었습니다. 인터넷에 연결되지 않아도 한글이 표시되며, 글꼴 목록에서 선택할 수 있습니다. 공개 웹판(app.openpencil.dev)에서는 한글이 포함된 글 상자 전체가 표시되지 않는 경우가 있었습니다.
- **사내 AI 모델을 연결합니다.** 설정 → AI & agents → Models에서 OpenAI 호환 주소(예: 사내 게이트웨이 `http://…/v1`)를 입력합니다. 웹판과 달리 CORS·혼합 콘텐츠로 연결이 차단되지 않아 중계 서버가 필요 없습니다.
- **최신 소스로 빌드했습니다.** 빌드 기준은 `UPSTREAM_REF`에 지정한 커밋입니다.

## 내려받기

[Releases](https://github.com/uengine-oss/openpencil-desktop/releases/latest)에서 운영체제에 맞는 파일을 받습니다.

| 운영체제 | 파일 |
|---|---|
| macOS (Apple Silicon) | `OpenPencil-KR-<버전>-mac-arm64.dmg` |
| macOS (Intel) | `OpenPencil-KR-<버전>-mac-x64.dmg` |
| Windows 10·11 (64비트) | `OpenPencil-KR-<버전>-win-x64-setup.exe` |

코드 서명 전 버전입니다. macOS에서 처음 실행할 때 차단되면 **시스템 설정 → 개인정보 보호 및 보안**에서 **그래도 열기**를 누르세요. Windows에서 SmartScreen 경고가 뜨면 **추가 정보 → 실행**을 누르세요.

사용법은 [튜토리얼: 디자인 도구 하나 더 — OpenPencil과 사내 모델](https://www.uengine.org/docs/ai-planning/openpencil.html)을 참고하세요.

## 직접 빌드하기

Node.js 20 이상, git, [Rust(rustup)](https://rustup.rs)가 필요합니다. Rust는 편집기의 WebAssembly 모듈을 빌드하는 데 사용합니다. Bun은 스크립트가 저장소에 지정된 버전을 `.tools/`에 내려받습니다.

```sh
npm install
npm run web        # open-pencil 을 UPSTREAM_REF 커밋으로 받아 한글 글꼴 패치를 얹고 web/ 에 빌드
npm start          # 앱 실행
npm run dist       # release/ 에 macOS DMG(arm64·x64)와 Windows 설치 파일
node scripts/e2e.mjs   # 한글 입력·글꼴 목록 확인(글꼴 CDN 차단 상태)
```

최신 소스로 갱신하려면 `UPSTREAM_REF`의 커밋을 바꾸고 `npm run web`을 다시 실행합니다. 패치가 충돌하면 `upstream/`에서 고친 뒤 그 파일들의 `git diff`로 `patches/`의 해당 패치를 다시 저장합니다.

## 변경 사항

| 위치 | 내용 |
|---|---|
| `patches/0001-korean-fonts.patch` | 편집기 코어에 Pretendard·Noto Sans KR·나눔명조를 내장하고 글꼴 목록에 추가했습니다. 한글 대체 글꼴은 내장 Pretendard를 먼저 사용하고, 시스템 글꼴과 온라인 글꼴을 그다음으로 사용합니다. |
| `patches/0002-default-output-limit.patch` | 새로 설치한 앱에서 사용자 지정 모델의 출력 한도가 1,024토큰으로 저장되던 문제를 고쳤습니다(설정 화면에는 16,384로 보였음). 추론 모델은 1,024토큰을 생각에 다 써서 빈 답을 냈습니다. |
| `electron/main.cjs` | `web/`을 보안 출처(`openpencil://app`)로 엽니다. 편집기가 요청한 외부 주소의 응답에 CORS 허용을 추가하고, http 주소와 로컬 글꼴 접근을 허용합니다. 웹판용 서비스 워커는 끄고, 외부 링크는 기본 브라우저로 엽니다. |
| `fonts/` | 내장한 글꼴과 라이선스(SIL OFL 1.1, 원본 그대로)입니다. |

---

**English.** Unofficial Electron build of [OpenPencil](https://github.com/open-pencil/open-pencil) with bundled Korean fonts (Pretendard as the Hangul fallback; Noto Sans KR and Nanum Myeongjo in the font picker) so Korean text renders offline, and an Electron shell that lets the AI chat reach OpenAI-compatible endpoints without CORS or mixed-content errors. Not affiliated with the OpenPencil project. MIT; fonts under SIL OFL 1.1. See `NOTICE.md`.
