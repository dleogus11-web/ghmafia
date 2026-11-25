/** 네트워크 지연 흉내 */
export const delay = (min = 120, max = 380) =>
  new Promise<void>((r) => setTimeout(r, min + Math.floor(Math.random() * (max - min))));
