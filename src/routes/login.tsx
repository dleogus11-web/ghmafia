import { createFileRoute } from "@tanstack/react-router";
import LoginPage from "@/pages/LoginPage";
import { OG_IMAGE_META } from "@/lib/ogImage";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "교사 로그인 — 교실 마피아" },
      { name: "description", content: "교사 계정으로 로그인하고 게임방을 만들어 진행하세요." },
      { property: "og:title", content: "교사 로그인 — 교실 마피아" },
      { property: "og:description", content: "교사 계정으로 로그인하고 게임방을 만들어 진행하세요." },
      ...OG_IMAGE_META,
    ],
  }),
  component: LoginPage,
});
