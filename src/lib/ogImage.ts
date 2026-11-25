import ogPoster from "@/assets/godfather-poster.jpg.asset.json";

/** 링크 공유 미리보기(OG) 이미지. 카카오톡 등은 절대 주소가 필요해 배포 주소를 붙입니다. */
export const OG_IMAGE_URL = `https://ghmafia.lovable.app${ogPoster.url}`;

export const OG_IMAGE_META = [
  { property: "og:image", content: OG_IMAGE_URL },
  { name: "twitter:image", content: OG_IMAGE_URL },
];
