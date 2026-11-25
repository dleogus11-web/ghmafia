import type { RoleCounts, RoleDef, RoleId, TeamId } from '@/types';

export const ROLE: Record<RoleId, RoleDef> = {
  mafia: { id: 'mafia', name: '마피아', team: 'mafia', desc: '매일 밤 시민팀 또는 쥐인간 1명을 탈락시켜요. 동료 마피아가 누구인지 알고 있어요.' },
  rat: { id: 'rat', name: '쥐인간', team: 'rat', desc: '능력은 없어요. 어느 팀에도 속하지 않아요. 끝까지 살아남으면 승리해요.' },
  citizen: { id: 'citizen', name: '일반시민', team: 'citizen', desc: '특별한 능력은 없어요. 토론과 투표로 마피아를 찾아내세요.' },
  doctor: { id: 'doctor', name: '의사', team: 'citizen', desc: '매일 밤 1명을 마피아의 공격에서 지켜요. 나 자신도, 같은 사람을 계속 지켜도 돼요.' },
  police: { id: 'police', name: '경찰', team: 'citizen', desc: '매일 밤 1명이 마피아인지 아닌지 확인할 수 있어요.' },
  soldier: { id: 'soldier', name: '군인', team: 'citizen', desc: '마피아의 공격을 한 번 자동으로 막아요.' },
  priest: { id: 'priest', name: '성직자', team: 'citizen', desc: '게임 중 한 번, 밤에 탈락한 1명을 부활시켜요. 직업은 모른 채 골라야 해요.' },
  medium: { id: 'medium', name: '영매', team: 'citizen', desc: '매일 밤 탈락한 1명의 직업을 알 수 있어요.' },
  terrorist: { id: 'terrorist', name: '테러리스트', team: 'citizen', desc: '낮에 처형되면 1명을 지목해 함께 탈락해요. 밤에 공격받으면 나를 고른 마피아 1명과 함께 탈락해요.' },
  politician: { id: 'politician', name: '정치인', team: 'citizen', desc: '처형 투표로는 탈락하지 않아요. 투표할 때 내 표는 2표로 계산돼요.' },
};

export const ROLE_ORDER: RoleId[] = ['mafia', 'rat', 'citizen', 'doctor', 'police', 'soldier', 'priest', 'medium', 'terrorist', 'politician'];

export const TEAM_NAME: Record<TeamId, string> = { mafia: '마피아팀', citizen: '시민팀', rat: '쥐인간팀' };

export const defaultCounts = (): RoleCounts => ({
  mafia: 2, rat: 1, citizen: 0, doctor: 1, police: 1, soldier: 0, priest: 0, medium: 0, terrorist: 0, politician: 0,
});
