import type { Animal } from "../components/AnimalCard";
import type { ResultStory } from "../components/ResultCard";

/** 서버 함수에 내 사연임을 알리는 방법: 로그인(story_id) 또는 접수번호 + 비밀 코드 */
export type StoryAuth = { story_id: string } | { receipt_no: number; code: string };

export type FollowUp = { id: string; body: string; created_at: string };

export type AirResult = {
  aired_at: string | null;
  vod_url: string | null;
  vod_offset_sec: number | null;
  host_note: string | null;
};

export type Review = {
  reaction: string;
  comment: string;
  share: boolean;
  status: "new" | "approved" | "hidden";
  updated_at: string;
};

export type DexInfo = {
  golden: boolean;
  golden_code: string | null;
  claim_name: string | null;
  claimed_at: string | null;
  paid_at: string | null;
  collected_at: string;
};

export type StoryBundle = {
  story: ResultStory & { viewer_status: string; claimed: boolean; body: string; voice: string; visibility: string };
  animal: Animal | null;
  follow_ups: FollowUp[];
  result: AirResult | null;
  private_message: string | null;
  waiting_notice: boolean;
  review: Review | null;
  dex: DexInfo | null;
};
