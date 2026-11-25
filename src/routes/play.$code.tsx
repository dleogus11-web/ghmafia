import { createFileRoute } from "@tanstack/react-router";
import PlayPage from "@/pages/PlayPage";

export const Route = createFileRoute("/play/$code")({
  head: () => ({
    meta: [
      { title: "교실 마피아 — 게임 중" },
      { name: "description", content: "학생 게임 화면: 역할 확인, 밤 미션, 낮 투표." },
      { property: "og:title", content: "교실 마피아 — 게임 중" },
      { property: "og:description", content: "학생 게임 화면: 역할 확인, 밤 미션, 낮 투표." },
    ],
  }),
  component: PlayPage,
});
