import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";
import HostHomePage from "@/pages/HostHomePage";

export const Route = createFileRoute("/host/")({
  head: () => ({
    meta: [
      { title: "내 게임방 — 교실 마피아" },
      { name: "description", content: "새 게임방을 만들거나 진행 중인 방을 이어서 진행하세요." },
      { property: "og:title", content: "내 게임방 — 교실 마피아" },
      { property: "og:description", content: "새 게임방을 만들거나 진행 중인 방을 이어서 진행하세요." },
    ],
  }),
  component: () => (
    <ProtectedRoute>
      <HostHomePage />
    </ProtectedRoute>
  ),
});
