import { pickOne } from '@/lib/random';

/* 가상 학생 이름 */
const SURNAMES = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '류', '홍', '전', '고', '문', '양', '손'];
const GIVEN = ['민준', '서준', '도윤', '예준', '시우', '하준', '지호', '주원', '지후', '준우', '서연', '서윤', '지우', '하은', '하윤', '민서', '지유', '윤서', '채원', '수아', '지민', '유진', '현우', '건우', '다은', '예린', '수빈', '태윤', '은우', '소율', '라온', '도현', '시은', '연우', '하람', '지안', '이준', '서아', '로운', '나은'];

export function makeName(taken: Set<string>): string {
  for (let i = 0; i < 500; i++) {
    const n = pickOne(SURNAMES) + pickOne(GIVEN);
    if (!taken.has(n)) return n;
  }
  let k = 2;
  while (taken.has('학생' + k)) k++;
  return '학생' + k;
}
