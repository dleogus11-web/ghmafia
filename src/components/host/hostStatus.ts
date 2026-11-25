import type { HostStatus } from '@/lib/game/hostSession';
import { isMock } from '@/lib/env';

export function hostStatusText(status: HostStatus): string {
  switch (status) {
    case 'connecting': return '연결 준비 중…';
    case 'open': return isMock ? '목업 연결: 이 브라우저의 다른 탭에서 학생으로 들어올 수 있어요' : '학생 접속을 받을 수 있어요';
    case 'lib': return '연결 도구를 불러오지 못했어요. 인터넷 연결을 확인하거나 새로고침해 주세요.';
    case 'config': return '서버 설정(환경 변수)이 없어요. 관리자에게 알려 주세요.';
    case 'network': return '연결 서버와 통신이 끊겼어요. 자동으로 다시 연결하는 중이에요…';
    case 'moved': return '다른 기기에서 이 게임을 이어받았어요. 이 화면에서는 더 이상 진행되지 않아요.';
  }
}
