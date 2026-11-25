import { createFileRoute } from "@tanstack/react-router";
import HomePage from "@/pages/HomePage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "교실 마피아 — 방 코드로 참여하기" },
      { name: "description", content: "방 코드와 이름만 입력하면 휴대폰으로 교실 마피아 게임에 참여할 수 있어요." },
      { property: "og:title", content: "교실 마피아 — 방 코드로 참여하기" },
      { property: "og:description", content: "밤에는 각자 휴대폰으로 미션을, 낮에는 교실에서 토론과 투표를." },
    ],
  }),
  component: HomePage,
});
