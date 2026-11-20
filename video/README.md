# 홍보 영상 (쇼츠·릴스, 9:16, 22초)

사이트 기본 디자인(코르크 보드) 그대로 만든 모션그래픽입니다. 코드로 만들어서 문구나 주소를 바꾸고 다시 뽑을 수 있어요.

- 박자: 120BPM, 1박 = 15프레임. 모든 등장과 효과음이 `src/timeline.json` 한 파일의 시간표를 따릅니다.
- 소리: `scripts/make-audio.mjs` 가 비트와 효과음을 직접 합성합니다 (외부 음원 없음, 저작권 걱정 없음).

## 다시 뽑기

```bash
npm install
```

```bash
npm run render
```

결과: `out/shorts.mp4`

- 사이트 주소 바꾸기: `src/Root.tsx` 의 `siteUrl`
- 화면 보면서 고치기: `npm run studio`
