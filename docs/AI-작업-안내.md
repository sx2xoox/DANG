# AI 작업 안내 (함께 작업하는 AI 가 먼저 읽을 것)

이 저장소는 사람 둘이 각자 AI 와 함께 작업해요. 이 문서는 그 AI 들이 서로 엇갈리지 않게 지금 상태와 규칙을 적어 둔 거예요.

## 1. 대화 규칙

- 사용자와는 **한국어로만** 이야기해요. 영어로 답하면 안 돼요.
- 사용자는 개발자가 아니에요. 짧고 쉽게, 해야 할 일은 번호를 매겨서 알려 주세요.
- 디자인이 "AI 가 만든 티"(흔한 그라데이션, 뻔한 카드, 이모지 남발)가 나는 걸 아주 싫어해요.
- 비밀값(토큰, API 키, 비밀번호)은 채팅에 붙여넣게 하지 마세요. 해당 서비스 화면에 직접 넣게 안내해요.

## 2. 지금 상태 (실제 사이트 운영 중)

| 무엇 | 값 |
|---|---|
| 사이트 | https://dawoong-gomin.pages.dev |
| 관리자 | https://dawoong-gomin.pages.dev/admin (비밀번호는 운영자만 앎) |
| Supabase 프로젝트 | `dawoong` / ref `vuutwxhucbimcujyleob` / https://vuutwxhucbimcujyleob.supabase.co |
| Cloudflare Pages 프로젝트 | `dawoong-gomin` (계정 ID `17bcf986e4a6df06382d909f64ed7828`) |
| AI 모델 | `claude-opus-5-5` (Supabase 비밀값 `ANTHROPIC_API_KEY` 로 호출) |

- 데이터베이스는 `supabase/migrations/` 의 파일이 전부 적용된 상태예요 (마지막: `20261126000000_service_role_grants.sql`).
- 서버 함수 `public`, `admin`, `obs` 가 올라가 있어요.
- 진행 중: 카카오·구글 로그인 설정 (운영자가 각 개발자 사이트에서 앱 등록 중). 지금은 비로그인 사연만 받아요.

**실제 시청자 사연이 들어오는 운영 중인 사이트예요.** 실제 데이터베이스에 시험 사연을 넣었다면 반드시 지우고, 사연 내용을 밖으로 옮기지 마세요.

## 3. 브랜치와 배포

- 운영 브랜치: **`claude/sharp-goodall-u9aey8`** (아직 `main` 은 없어요)
- 이 브랜치에 `web/**` 이 바뀐 커밋이 올라가면 GitHub Actions(`.github/workflows/deploy.yml`)가 **바로 실제 사이트에 배포**해요.
- 다른 브랜치에서 작업한다면 **작업 시작 전에 운영 브랜치를 먼저 합쳐** 주세요. 실제 사이트 설정(`web/.env.production`), 배포 설정, 권한 파일이 거기에만 있어요.
- 운영 브랜치에 올리기 전에 꼭 확인:

```bash
cd web && npx tsc --noEmit -p . && npm run build
```

- 두 AI 가 같은 파일을 동시에 크게 고치지 않게, 큰 작업을 시작할 때는 사용자에게 어느 부분을 맡았는지 말해 주세요.

## 4. 데이터베이스 바꾸기

- 표나 함수를 바꿀 때는 **항상 새 파일**을 `supabase/migrations/` 에 추가해요. 이미 적용된 파일은 고치지 않아요.
- 새로 만든 Supabase 프로젝트는 새 표에 권한을 자동으로 주지 않아요.
  - 서버 함수용 `service_role` 권한은 `20261126000000_service_role_grants.sql` 이 앞으로 만들 표까지 자동으로 주게 해 두었어요.
  - 시청자용 `anon` / `authenticated` 권한은 **표·열마다 직접** `grant` 해요. 기존 파일들처럼 `revoke all` 후 필요한 열만 열어 주세요. 사연 본문은 절대 `anon` 에 열지 않아요.
- 실제 데이터베이스에 적용하는 법 (사용자 본인 Supabase 토큰 필요):

```bash
npx supabase link --project-ref vuutwxhucbimcujyleob
```

```bash
npx supabase db push
```

## 5. 서버 함수 올리기

```bash
npx supabase functions deploy public admin obs --no-verify-jwt --project-ref vuutwxhucbimcujyleob
```

- 비밀값(`ADMIN_INITIAL_PASSWORD`, `ANTHROPIC_API_KEY`)은 Supabase 대시보드 → Edge Functions → Secrets 에만 있어요. 코드에 넣지 마세요.
- `web/.env.production` 에 있는 값(Supabase 주소, `sb_publishable_` 공개 키, 사이트 주소)은 공개되어도 되는 값이에요. `service_role` / `sb_secret_` 키는 절대 저장소에 넣지 않아요.

## 6. 고민 동물 캐릭터 그림

- 그림 파일: `web/public/mascots/<영문이름>.webp`, 목록: `supabase/functions/_shared/mascots.ts`
- 새 그림을 넣을 때는 선과 눈을 기존 그림과 맞추려고 이 스크립트를 꼭 거쳐요 (선을 진하게, 눈은 세로로 긴 눈).

```bash
python3 web/scripts/mascot-ink.py <원본폴더> <결과폴더> --eyes oval
```

- 홍보 영상에도 같은 그림을 써요. 바꿨다면 `video/public/mascots/` 에도 복사해요.

## 7. 홍보 영상 (`video/`)

- Remotion 프로젝트. 시간표는 `video/src/timeline.json`, 소리는 `video/scripts/make-audio.mjs` 가 직접 합성해요.
- 굵은 글씨는 **리틱체(REATIC)**. 다시 배포가 금지된 글꼴이라 저장소에 없어요. 받는 법은 `video/public/fonts/README.md`.
- 사이트에는 리틱체를 쓰지 않아요 (웹에 쓰려면 제작사 허락이 먼저 필요).

## 8. 더 읽을 것

- `README.md`: 전체 소개
- `docs/설치-안내.md`: 설치와 운영 순서
- `docs/방송-후-정리.md`: 방송 뒤 할 일
