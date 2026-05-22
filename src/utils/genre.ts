const GENRE_KO_MAP: Record<string, string> = {
  Action: '액션',
  Adventure: '어드벤처',
  Casual: '캐주얼',
  Indie: '인디',
  RPG: '롤플레잉',
  Simulation: '시뮬레이션',
  Strategy: '전략',
  Sports: '스포츠',
  Racing: '레이싱',
  'Free To Play': '무료 플레이',
  'Massively Multiplayer': '대규모 멀티플레이어',
  'Early Access': '앞서 해보기',
  'Animation & Modeling': '애니메이션 및 모델링',
  'Audio Production': '오디오 제작',
  'Design & Illustration': '디자인 및 일러스트레이션',
  Education: '교육',
  'Game Development': '게임 개발',
  'Photo Editing': '사진 편집',
  'Software Training': '소프트웨어 교육',
  Utilities: '유틸리티',
  'Video Production': '영상 제작',
  'Web Publishing': '웹 퍼블리싱',
  Accounting: '회계',
  Documentary: '다큐멘터리',
  Episodic: '에피소드',
  Movie: '영화',
  Short: '단편',
  Tutorial: '튜토리얼',
}

const GENRE_ALIAS_MAP: Record<string, string> = {
  action: 'Action',
  액션: 'Action',

  adventure: 'Adventure',
  어드벤처: 'Adventure',
  모험: 'Adventure',

  casual: 'Casual',
  캐주얼: 'Casual',

  indie: 'Indie',
  인디: 'Indie',

  rpg: 'RPG',
  roleplaying: 'RPG',
  'role playing': 'RPG',
  'role-playing': 'RPG',
  롤플레잉: 'RPG',
  역할수행: 'RPG',

  simulation: 'Simulation',
  시뮬레이션: 'Simulation',

  strategy: 'Strategy',
  전략: 'Strategy',

  sports: 'Sports',
  스포츠: 'Sports',

  racing: 'Racing',
  레이싱: 'Racing',

  'free to play': 'Free To Play',
  freetoplay: 'Free To Play',
  무료플레이: 'Free To Play',
  무료: 'Free To Play',

  'massively multiplayer': 'Massively Multiplayer',
  massivelymultiplayer: 'Massively Multiplayer',
  대규모멀티플레이어: 'Massively Multiplayer',
  멀티플레이어: 'Massively Multiplayer',

  'early access': 'Early Access',
  earlyaccess: 'Early Access',
  앞서해보기: 'Early Access',

  'animation modeling': 'Animation & Modeling',
  'animation & modeling': 'Animation & Modeling',
  애니메이션및모델링: 'Animation & Modeling',

  'audio production': 'Audio Production',
  오디오제작: 'Audio Production',

  'design illustration': 'Design & Illustration',
  'design & illustration': 'Design & Illustration',
  디자인및일러스트레이션: 'Design & Illustration',

  education: 'Education',
  교육: 'Education',

  'game development': 'Game Development',
  gamedevelopment: 'Game Development',
  게임개발: 'Game Development',

  'photo editing': 'Photo Editing',
  photoediting: 'Photo Editing',
  사진편집: 'Photo Editing',

  'software training': 'Software Training',
  softwaretraining: 'Software Training',
  소프트웨어교육: 'Software Training',

  utilities: 'Utilities',
  유틸리티: 'Utilities',

  'video production': 'Video Production',
  videoproduction: 'Video Production',
  영상제작: 'Video Production',

  'web publishing': 'Web Publishing',
  webpublishing: 'Web Publishing',
  웹퍼블리싱: 'Web Publishing',
}

function splitGenreValue(value: unknown): string[] {
  if (value === null || value === undefined) {
    return []
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => splitGenreValue(item))
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((genre) => genre.trim())
      .filter(Boolean)
  }

  return [String(value).trim()].filter(Boolean)
}

function extractEnglishFromDisplayName(value: string) {
  const matched = value.match(/\(([^)]+)\)/)

  if (matched?.[1]) {
    return matched[1].trim()
  }

  return value.trim()
}

function normalizeGenreKey(value: string) {
  return value
    .replace(/\([^)]*\)/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&/g, ' & ')
    .replace(/[^a-zA-Z가-힣0-9&+\-\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function compactGenreKey(value: string) {
  return normalizeGenreKey(value).toLowerCase().replace(/\s+/g, '')
}

function toCanonicalGenre(value: string) {
  const extracted = extractEnglishFromDisplayName(value)
  const normalized = normalizeGenreKey(extracted)
  const lowerKey = normalized.toLowerCase()
  const compacted = compactGenreKey(extracted)

  if (GENRE_KO_MAP[normalized]) {
    return normalized
  }

  if (GENRE_ALIAS_MAP[lowerKey]) {
    return GENRE_ALIAS_MAP[lowerKey]
  }

  if (GENRE_ALIAS_MAP[compacted]) {
    return GENRE_ALIAS_MAP[compacted]
  }

  return normalized
}

function toDisplayGenre(canonicalGenre: string) {
  const koName = GENRE_KO_MAP[canonicalGenre]

  if (!koName) {
    return canonicalGenre
  }

  return `${koName} (${canonicalGenre})`
}

/**
 * 여러 장르 값을 배열로 변환한다.
 *
 * 사용 예:
 * - "Action, Free To Play"
 *   → ["액션 (Action)", "무료 플레이 (Free To Play)"]
 *
 * - ["액션 (Action)", "Action", "Free To Play"]
 *   → ["액션 (Action)", "무료 플레이 (Free To Play)"]
 */
export function formatGenreList(value: unknown) {
  const rawGenres = splitGenreValue(value)
  const seen = new Set<string>()
  const result: string[] = []

  rawGenres.forEach((rawGenre) => {
    const canonicalGenre = toCanonicalGenre(rawGenre)

    if (!canonicalGenre) {
      return
    }

    const dedupeKey = canonicalGenre.toLowerCase()

    if (seen.has(dedupeKey)) {
      return
    }

    seen.add(dedupeKey)
    result.push(toDisplayGenre(canonicalGenre))
  })

  return result.length > 0 ? result : ['장르 없음']
}

/**
 * 여러 장르 값을 한 줄 문자열로 변환한다.
 *
 * 사용 예:
 * - "Action, Free To Play"
 *   → "액션 (Action), 무료 플레이 (Free To Play)"
 */
export function formatGenreDisplay(value: unknown) {
  return formatGenreList(value).join(', ')
}

/**
 * HomePage.tsx 기존 import 호환용 함수.
 *
 * 기존 HomePage에서 formatGenreLabel()을 쓰고 있으므로
 * 해당 함수명을 유지하되 내부적으로는 formatGenreDisplay()를 사용한다.
 */
export function formatGenreLabel(value: unknown) {
  return formatGenreDisplay(value)
}

/**
 * 장르 검색용 문자열을 만든다.
 *
 * 원본 영어 장르와 화면 표시용 한글+영어 장르를 함께 넣어서
 * "Action", "액션", "Free To Play", "무료 플레이" 모두 검색 가능하게 한다.
 */
export function getGenreSearchText(value: unknown) {
  const rawGenres = splitGenreValue(value)
  const displayGenres = formatGenreList(value)

  return [...rawGenres, ...displayGenres].join(' ').toLowerCase()
}
