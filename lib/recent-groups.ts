// 최근 방문한 그룹 (TECH-DESIGN §6.5 `/me`, PRD §9). 팔로우 없이 이 기기에만 저장한다.
// 저장이 막힌 환경(사생활 보호 창 등)에서는 조용히 빈 목록으로 동작한다.

export type RecentGroup = { slug: string; name: string; colorKey: string; at: number };

const KEY = "iu-recent-groups";
const MAX = 6;
const EVENT = "iu-recent-groups";
const EMPTY: RecentGroup[] = [];

let cachedRaw: string | null = null;
let cachedList: RecentGroup[] = EMPTY;

function read(): RecentGroup[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return EMPTY;
  }
  // useSyncExternalStore 는 같은 값이면 같은 참조를 돌려받아야 한다
  if (raw === cachedRaw) return cachedList;
  cachedRaw = raw;
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cachedList = Array.isArray(parsed)
      ? parsed.filter(
          (g): g is RecentGroup =>
            !!g && typeof g.slug === "string" && typeof g.name === "string" && typeof g.colorKey === "string" && typeof g.at === "number"
        )
      : EMPTY;
  } catch {
    cachedList = EMPTY;
  }
  return cachedList;
}

export function getRecentGroups(): RecentGroup[] {
  return read();
}

export function getServerRecentGroups(): RecentGroup[] {
  return EMPTY;
}

export function recordRecentGroup(group: Omit<RecentGroup, "at">) {
  const next = [{ ...group, at: Date.now() }, ...read().filter((g) => g.slug !== group.slug)].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    return;
  }
  window.dispatchEvent(new Event(EVENT));
}

export function subscribeRecentGroups(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
