import { useEffect } from 'react';

/** 화면 팔레트를 밤/낮으로 바꿈 (src/index.css 의 body[data-time]) */
export function useTimeOfDay(time: 'day' | 'night') {
  useEffect(() => {
    document.body.dataset.time = time;
  }, [time]);
}
