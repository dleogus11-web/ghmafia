import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";
import HostRoomPage from "@/pages/HostRoomPage";
import { OG_IMAGE_META } from "@/lib/ogImage";

export const Route = createFileRoute("/host/$code")({
  head: () => ({
    meta: [
      { title: "게임 진행 — 교실 마피아" },
      { name: "description", content: "교사 진행 화면: 참여 현황, 밤·낮 진행, 투표와 결과." },
      { property: "og:title", content: "게임 진행 — 교실 마피아" },
      { property: "og:description", content: "교사 진행 화면: 참여 현황, 밤·낮 진행, 투표와 결과." },
      ...OG_IMAGE_META,
    ],
  }),
  component: () => (
    <ProtectedRoute>
      <HostRoomPage />
    </ProtectedRoute>
  ),
});
