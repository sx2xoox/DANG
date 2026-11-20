import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
Config.setCodec("h264");
Config.setCrf(18);
// 이 작업 환경에 설치된 크롬을 씁니다. 다른 컴퓨터에서는 이 줄을 지우면 Remotion 이 알아서 받아요.
if (process.env.REMOTION_CHROME) Config.setBrowserExecutable(process.env.REMOTION_CHROME);
