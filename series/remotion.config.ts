import { Config } from "@remotion/cli/config";

// 글꼴·고민 동물 그림은 홍보 영상 폴더(video/public)에 있는 걸 같이 써요. (파일을 복사하지 않음)
Config.setPublicDir("../video/public");
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
Config.setCodec("h264");
Config.setCrf(18);
// 이 작업 환경에 설치된 크롬을 씁니다. 다른 컴퓨터에서는 신경 쓰지 않아도 Remotion 이 알아서 받아요.
if (process.env.REMOTION_CHROME) Config.setBrowserExecutable(process.env.REMOTION_CHROME);
