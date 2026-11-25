import type { CheckProps } from "./formats/Check";
import type { DexProps } from "./formats/Dex";
import type { LetterProps } from "./formats/Letter";
import type { PollProps } from "./formats/Poll";

// =====================================================================
// 시리즈 쇼츠 목록 (이틀에 한 편, 형식은 돌아가며)
//  * id: 영상 이름 = 사이트 추적 코드 (사이트주소/v/s01 로 들어오면 통계에 "s01" 로 잡혀요)
//  * date: 올릴 날 (참고용)
//  * post: 올릴 때 쓰는 제목·설명·해시태그
// 새 편 추가: 아래 목록에 한 줄 추가 → npm run render -- s08
// =====================================================================

type Post = { title: string; caption: string; tags: string[] };
type Base = { id: string; date: string; post: Post };

export type Episode =
  | (Base & { format: "dex"; props: DexProps })
  | (Base & { format: "poll"; props: PollProps })
  | (Base & { format: "check"; props: CheckProps })
  | (Base & { format: "letter"; props: LetterProps });

const COMMON_TAGS = ["#고민상담", "#고민", "#공감", "#익명고민", "#고민동물", "#쇼츠", "#릴스"];

export const EPISODES: Episode[] = [
  {
    id: "s01",
    date: "2026-11-25",
    format: "dex",
    props: {
      hook: "새벽만 되면\n[[생각 많아지는]] 사람 특징",
      traits: ["누우면 그때부터\n오늘 하루 다시 재생", "보낸 카톡\n괜히 다시 읽어 봄", "'진짜 자야지' 하고\n1시간 더 폰 봄"],
      animal: { id: "hedgehog", name: "새벽 3시 고슴도치", quote: "…지금 몇 시지…?", bg: "#d9d4f0" },
      ask: "너도 고슴도치면 댓글에 🦔",
    },
    post: {
      title: "새벽만 되면 생각 많아지는 사람 특징 🦔",
      caption: "새벽 3시에 이거 보고 있으면 당신도 고슴도치…🦔\n말 못 한 고민, 익명으로 보내면 나만의 고민 동물이 나와요.\n👉 프로필 링크",
      tags: ["#새벽감성", "#생각많은사람", "#불면증", ...COMMON_TAGS],
    },
  },
  {
    id: "s02",
    date: "2026-11-27",
    format: "poll",
    props: {
      hook: "너라면 [[어떻게]] 할래?",
      situation: "좋아하는 사람한테서\n\"뭐해?\" 카톡이 왔다",
      a: { text: "1초 만에 답장\n(티 나도 상관없음)", mascot: "rabbit" },
      b: { text: "일부러 10분\n기다렸다 답장", mascot: "cat" },
      comments: ["A 무조건ㅋㅋ", "B… 근데 10분 못 참음", "읽고 3시간 고민함", "친구한테 캡처 보냄"],
    },
    post: {
      title: "좋아하는 사람한테 '뭐해?' 카톡 오면 너는? A vs B",
      caption: "솔직하게 댓글로 A / B 골라줘 👀\n더 깊은 연애 고민은 익명으로 보내 줘. 유튜브 생방송에서 같이 읽어요.\n👉 프로필 링크",
      tags: ["#짝사랑", "#연애고민", "#밸런스게임", "#카톡", ...COMMON_TAGS],
    },
  },
  {
    id: "s03",
    date: "2026-11-29",
    format: "check",
    props: {
      hook: "3개 이상이면 너는\n[[이 동물]]이야",
      items: ["보낸 카톡 세 번 다시 읽어 봄", "'ㅋ' 개수로 기분 파악함", "집 가는 길에 오늘 한 말 복기함", "답장 썼다 지웠다 반복함", "\"괜찮아\" 해 놓고 안 괜찮음"],
      animal: { id: "raccoon", name: "곱씹는 라쿤", quote: "근데 그때 내가 이렇게 말했으면…?", bg: "#e8e2d6" },
      ask: "몇 개였는지 댓글로 알려 줘",
    },
    post: {
      title: "3개 이상이면 너는 '곱씹는 라쿤' 🦝",
      caption: "나만 이런 거 아니지…? 몇 개였는지 댓글로 알려 줘 🦝\n고민 보내면 나만의 고민 동물이 바로 나와요.\n👉 프로필 링크",
      tags: ["#공감짤", "#생각많은사람", "#인간관계", "#테스트", ...COMMON_TAGS],
    },
  },
  {
    id: "s04",
    date: "2026-12-01",
    format: "letter",
    props: {
      title: "오늘 하루\n[[버틴 너]]에게",
      lines: ["오늘도 많이 애썼어.", "티 안 나게 참은 거,", "괜찮은 척한 거,", "다 알아.", "", "내일 걱정은 내일의 너한테", "잠깐 맡겨 두고", "오늘은 그냥 푹 자자."],
      to: "오늘도 애쓴 너",
      from: "다웅",
    },
    post: {
      title: "오늘 하루 버틴 너에게 💌",
      caption: "힘들 때 꺼내 보게 저장해 둬 📌\n말 못 한 고민이 있으면 익명으로 털어놔도 괜찮아요. 생방송에서 같이 이야기해요.\n👉 프로필 링크",
      tags: ["#위로", "#위로글", "#힘내", "#오늘하루", "#저장", ...COMMON_TAGS],
    },
  },
  {
    id: "s05",
    date: "2026-12-03",
    format: "dex",
    props: {
      hook: "좋아하는 사람 앞에서\n[[고장 나는]] 사람 특징",
      traits: ["할 말 백 번\n연습해 놓고 버벅임", "그 사람 프사 바뀐 거\n제일 먼저 앎", "답장 오면\n일단 폰부터 엎어 둠"],
      animal: { id: "rabbit", name: "두근두근 토끼", quote: "연습은 끝났어… 근데 입이 안 떨어져…", bg: "#ffe0e8" },
      ask: "너도 토끼면 댓글에 🐰",
    },
    post: {
      title: "좋아하는 사람 앞에서 고장 나는 사람 특징 🐰",
      caption: "이거 완전 나잖아… 싶으면 댓글에 🐰\n짝사랑 고민, 익명으로 보내면 생방송에서 같이 고민해 줄게요.\n👉 프로필 링크",
      tags: ["#짝사랑", "#설렘", "#연애고민", "#짝사랑공감", ...COMMON_TAGS],
    },
  },
  {
    id: "s06",
    date: "2026-12-05",
    format: "poll",
    props: {
      hook: "너라면 [[어떻게]] 할래?",
      situation: "팀플 발표 전날,\n한 명이 아무것도 안 했다",
      a: { text: "교수님·팀장님께\n솔직하게 말한다", mascot: "tiger" },
      b: { text: "일단 내가 하고\n속으로 삭힌다", mascot: "capybara" },
      comments: ["A. 참을 이유 없음", "B… 결국 내가 함ㅠ", "이름 빼고 제출함", "단톡에 조용히 \"…\""],
    },
    post: {
      title: "팀플 무임승차한 팀원, 너라면? A vs B",
      caption: "학교든 회사든 한 번쯤 겪어 본 그 상황…😇 댓글로 A / B!\n억울한 일, 익명으로 보내면 생방송에서 같이 판결해 줄게요.\n👉 프로필 링크",
      tags: ["#팀플", "#조별과제", "#직장인공감", "#대학생공감", "#밸런스게임", ...COMMON_TAGS],
    },
  },
  {
    id: "s07",
    date: "2026-12-07",
    format: "check",
    props: {
      hook: "3개 이상이면 너는\n[[이 동물]]이야",
      items: ["알람 끄고 '5분만' 세 번 함", "약속 취소되면 은근 기쁨", "누워서 할 일 목록만 늘어남", "배달 앱 켜 놓고 30분 고민함", "\"나 요즘 왜 이러지\" 자주 함"],
      animal: { id: "seal", name: "이불 속 물범", quote: "5분만… 아니 5년만…", bg: "#dcecf5" },
      ask: "몇 개였는지 댓글로 알려 줘",
    },
    post: {
      title: "3개 이상이면 너는 '이불 속 물범' 🦭",
      caption: "이불 밖은 위험해…🦭 몇 개였는지 댓글로!\n요즘 지친 이유가 있다면 익명으로 털어놔도 돼요.\n👉 프로필 링크",
      tags: ["#번아웃", "#무기력", "#집순이", "#집돌이", "#공감짤", ...COMMON_TAGS],
    },
  },
];
