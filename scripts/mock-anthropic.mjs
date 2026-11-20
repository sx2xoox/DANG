// 로컬 테스트용 가짜 Claude API (실제 키 없이 AI 경로를 확인하기 위함)
import http from "node:http";
import fs from "node:fs";
const log = process.env.MOCK_LOG ?? "/tmp/mock-anthropic.log";
const animals = [
  { name: "답장 기다리는 미어캣", emoji: "🐾", why: "읽씹 화면만 고개 빼고 지켜보는 중이라서", quote: "1 사라졌는데요…?", hashtags: ["#관계고민", "#활활", "#판결파"] },
  { name: "새벽 3시 부엉이", emoji: "🦉", why: "다들 잘 때 혼자 고민을 지키고 있어서", quote: "부엉… 벌써 3시야?", hashtags: ["#새벽고민", "#잠못듦", "#생각과다"] },
  { name: "갈팡질팡 문어", emoji: "🐙", why: "여덟 다리가 다 다른 쪽을 가리켜서", quote: "잠깐, 다리 좀 정리할게.", hashtags: ["#멘붕", "#선택장애", "#정리중"] },
];
let n = 0;
http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    fs.appendFileSync(log, `${req.method} ${req.url}\n${body.slice(0, 4000)}\n----\n`);
    const parsed = JSON.parse(body || "{}");
    const isAnimal = JSON.stringify(parsed.system ?? "").includes("고민 동물");
    let text;
    if (isAnimal) {
      const a = animals[n++ % animals.length];
      const hasPrev = JSON.stringify(parsed.messages).includes("예전에 받은 고민 동물");
      text = JSON.stringify({
        ...a,
        description: "지금은 마음이 한쪽으로 기울었다가 다시 돌아오기를 반복하는 상태예요. 그만큼 이 관계를 소중하게 여긴다는 뜻이에요. 이 유형은 상대의 마음을 오래 헤아리는 다정함이 장점이에요. \"네 마음도 충분히 중요해\"라는 말이 힘이 돼요.",
        change_reason: hasPrev ? "기다림이 길어지면서 마음이 밤으로 옮겨갔어요." : "",
      });
    } else {
      text = "안녕하세요, 다웅이에요. 사연 정말 잘 읽었어요. 많이 서운했겠다는 마음이 먼저 들었어요. 그래도 먼저 연락해 보는 용기를 내보면 어떨까요? 응원할게요!";
    }
    res.writeHead(200, { "content-type": "application/json", "request-id": "req_mock" });
    res.end(JSON.stringify({
      id: "msg_mock_" + n, type: "message", role: "assistant", model: parsed.model,
      content: [{ type: "text", text }], stop_reason: "end_turn", stop_sequence: null,
      usage: { input_tokens: 900, output_tokens: 300 },
    }));
  });
}).listen(54401, "127.0.0.1", () => console.log("mock anthropic on 54401"));
