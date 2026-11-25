/** 새 방에 기본으로 들어가는 예시 퀴즈. 한 줄에 "문제 / 정답 / 오답 / 오답" */
export const SAMPLE_QUIZ = [
  '우리나라의 수도는? / 서울 / 부산 / 대구',
  '1년은 몇 달일까요? / 12달 / 10달 / 11달',
  '물이 어는 온도는 몇 도일까요? / 0도 / 10도 / 100도',
  '태양계에서 가장 큰 행성은? / 목성 / 지구 / 화성',
  '훈민정음을 만든 왕은? / 세종대왕 / 태조 / 정조',
  '삼각형의 세 각을 더하면? / 180도 / 90도 / 360도',
  '7 × 8 = ? / 56 / 54 / 63',
  '우리나라의 국화는? / 무궁화 / 장미 / 진달래',
].join('\n');

export interface ParsedQuiz {
  q: string;
  answer: string;
  wrong: string[];
}

export function parseQuiz(text: string): ParsedQuiz[] {
  return String(text || '')
    .split('\n')
    .map((l) => l.split('/').map((s) => s.trim()).filter(Boolean))
    .filter((a) => a.length >= 3)
    .map((a) => ({ q: a[0], answer: a[1], wrong: a.slice(2) }));
}
