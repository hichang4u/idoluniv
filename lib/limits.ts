// 입력 한도. 폼의 maxLength, Server Action 의 사전 검사, DB CHECK 제약(마이그레이션 0009 등)이
// 같은 값을 쓰도록 한 곳에 둔다. DB 가 최종 방어선이고 여기는 빠른 오류 메시지용이다.
export const LIMITS = {
  postTitle: 100,
  postContent: 10_000,
  comment: 1_000,
  chat: 500,
  reportDetail: 300,
  nickname: {
    min: 2,
    max: 20,
    // 한글 완성형·영문·숫자·밑줄 (D-11). DB CHECK 와 같은 정규식
    pattern: /^[가-힣A-Za-z0-9_]{2,20}$/,
  },
} as const;
