export function formatGenreLabel(genre: string) {
  if (!genre) {
    return ''
  }

  const normalized = genre.trim()

  if (!normalized) {
    return ''
  }

  const key = normalized.toLowerCase()

  const genreMap: Record<string, string> = {
    action: '액션',
    adventure: '어드벤처',
    casual: '캐주얼',
    indie: '인디',
    rpg: 'RPG',
    'role-playing': 'RPG',
    'role playing': 'RPG',
    simulation: '시뮬레이션',
    strategy: '전략',
    sports: '스포츠',
    racing: '레이싱',
    'free to play': '무료 플레이',
    'early access': '앞서 해보기',
    'massively multiplayer': '대규모 멀티플레이어',
    multiplayer: '멀티플레이어',
    'single-player': '싱글플레이어',
    singleplayer: '싱글플레이어',
    'co-op': '협동',
    coop: '협동',
    cooperative: '협동',
    horror: '공포',
    puzzle: '퍼즐',
    platformer: '플랫포머',
    shooter: '슈팅',
    fps: 'FPS',
    tps: 'TPS',
    survival: '생존',
    sandbox: '샌드박스',
    openworld: '오픈월드',
    'open world': '오픈월드',
    anime: '애니메이션',
    fighting: '격투',
    arcade: '아케이드',
    rhythm: '리듬',
    educational: '교육',
    utilities: '유틸리티',
    design: '디자인',
    animation: '애니메이션',
    'video production': '비디오 제작',
    'audio production': '오디오 제작',
    'photo editing': '사진 편집',
    accounting: '회계',
    software: '소프트웨어',
    'software training': '소프트웨어 교육',
    'web publishing': '웹 퍼블리싱',
    documentary: '다큐멘터리',
    episodic: '에피소드',
    tutorial: '튜토리얼',
    nudity: '선정성',
    'sexual content': '성인 콘텐츠',
    violent: '폭력성',
    gore: '고어',
  }

  const korean = genreMap[key]

  if (!korean) {
    return normalized
  }

  return `${korean} (${normalized})`
}

export function formatGenreList(value: unknown) {
  if (Array.isArray(value)) {
    const result = value
      .map((genre) => formatGenreLabel(String(genre).trim()))
      .filter(Boolean)

    return result.length > 0 ? result : ['장르 없음']
  }

  const raw = String(value ?? '')

  const result = raw
    .split(',')
    .map((genre) => formatGenreLabel(genre.trim()))
    .filter(Boolean)

  return result.length > 0 ? result : ['장르 없음']
}
