import { useEffect, useMemo, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import './RankingPage.css'

type SortOption =
  | 'popular'
  | 'positiveHigh'
  | 'positiveLow'
  | 'playtimeHigh'
  | 'playtimeLow'
  | 'priceLow'
  | 'priceHigh'
  | 'name'

type PriceFilter = 'all' | 'free' | '0-10' | '10-30' | '30plus'

type SearchGame = {
  id: number
  name: string
  genres: string[]
  genreSearchText: string
  primaryGenre: string
  price: number
  isFree: boolean
  platforms: string[]
  positiveReviews: number | null
  negativeReviews: number | null
  positiveRatio: number | null
  reviewCount: number | null
  averagePlaytime: number | null
  imageUrl: string
}

type GamesApiMeta = {
  loadedCount: number
  limit: number | null
  hasNextCursor: boolean
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''
const ITEMS_PER_PAGE = 5

// 원화 표시는 프론트 임시 환율 기준입니다.
// 필요하면 1350 값을 프로젝트 기준 환율에 맞게 조정하면 됩니다.
const USD_TO_KRW_RATE = 1350

function RankingPage() {
  const [games, setGames] = useState<SearchGame[]>([])
  const [apiMeta, setApiMeta] = useState<GamesApiMeta>({
    loadedCount: 0,
    limit: null,
    hasNextCursor: false,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const [searchText, setSearchText] = useState('')
  const [appliedSearchText, setAppliedSearchText] = useState('')
  const [selectedGenre, setSelectedGenre] = useState('all')
  const [selectedPrice, setSelectedPrice] = useState<PriceFilter>('all')
  const [selectedPlatform, setSelectedPlatform] = useState('all')
  const [sortBy, setSortBy] = useState<SortOption>('popular')
  const [onlyFree, setOnlyFree] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    async function loadGames() {
      try {
        setIsLoading(true)
        setErrorMessage('')

        const response = await fetch(`${API_BASE_URL}/games`)

        if (!response.ok) {
          throw new Error(`/games API error: ${response.status}`)
        }

        const rawData = await response.json()
        const normalizedGames = normalizeGames(rawData)

        setGames(normalizedGames)
        setApiMeta({
          loadedCount: normalizedGames.length,
          limit: readApiLimit(rawData),
          hasNextCursor: hasNextCursor(rawData),
        })
      } catch (error) {
        console.error('게임 목록을 불러오지 못했습니다.', error)
        setGames([])
        setApiMeta({
          loadedCount: 0,
          limit: null,
          hasNextCursor: false,
        })
        setErrorMessage('검색 화면에 사용할 게임 데이터를 불러오지 못했습니다.')
      } finally {
        setIsLoading(false)
      }
    }

    loadGames()
  }, [])

  const genreOptions = useMemo(() => {
    const uniqueGenres = Array.from(
      new Set(games.flatMap((game) => game.genres).filter((genre) => genre && genre.trim())),
    )

    return ['all', ...uniqueGenres]
  }, [games])

  const platformOptions = useMemo(() => {
    const uniquePlatforms = Array.from(
      new Set(
        games.flatMap((game) => game.platforms).filter((platform) => platform && platform.trim()),
      ),
    )

    return ['all', ...uniquePlatforms]
  }, [games])

  const sampleStats = useMemo(() => {
    const freeCount = games.filter((game) => game.isFree).length
    const paidCount = games.length - freeCount

    const representativeGenre = games
      .flatMap((game) => game.genres)
      .reduce<Record<string, number>>((acc, genre) => {
        acc[genre] = (acc[genre] ?? 0) + 1
        return acc
      }, {})

    const topGenre =
      Object.entries(representativeGenre).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '-'

    return {
      freeCount,
      paidCount,
      topGenre,
    }
  }, [games])

  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      const normalizedSearchText = appliedSearchText.trim().toLowerCase()

      const matchesSearch =
        !normalizedSearchText ||
        game.name.toLowerCase().includes(normalizedSearchText) ||
        game.genreSearchText.toLowerCase().includes(normalizedSearchText)

      const matchesGenre =
        selectedGenre === 'all' ||
        game.primaryGenre === selectedGenre ||
        game.genres.includes(selectedGenre)

      const matchesPrice = matchesPriceFilter(game.price, selectedPrice)

      const matchesPlatform =
        selectedPlatform === 'all' || game.platforms.includes(selectedPlatform)

      const matchesFree = !onlyFree || game.isFree

      return matchesSearch && matchesGenre && matchesPrice && matchesPlatform && matchesFree
    })
  }, [games, appliedSearchText, selectedGenre, selectedPrice, selectedPlatform, onlyFree])

  const sortedGames = useMemo(() => {
    const copied = [...filteredGames]

    copied.sort((a, b) => {
      if (sortBy === 'popular') {
        return (b.reviewCount ?? 0) - (a.reviewCount ?? 0)
      }

      if (sortBy === 'positiveHigh') {
        return (
          getPositiveRatioForSort(b.positiveRatio, 'high') -
          getPositiveRatioForSort(a.positiveRatio, 'high')
        )
      }

      if (sortBy === 'positiveLow') {
        return (
          getPositiveRatioForSort(a.positiveRatio, 'low') -
          getPositiveRatioForSort(b.positiveRatio, 'low')
        )
      }

      if (sortBy === 'playtimeHigh') {
        return (b.averagePlaytime ?? 0) - (a.averagePlaytime ?? 0)
      }

      if (sortBy === 'playtimeLow') {
        return (a.averagePlaytime ?? 0) - (b.averagePlaytime ?? 0)
      }

      if (sortBy === 'priceLow') {
        return a.price - b.price
      }

      if (sortBy === 'priceHigh') {
        return b.price - a.price
      }

      if (sortBy === 'name') {
        return a.name.localeCompare(b.name)
      }

      return 0
    })

    return copied
  }, [filteredGames, sortBy])

  const totalPages = Math.max(1, Math.ceil(sortedGames.length / ITEMS_PER_PAGE))

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const visibleGames = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return sortedGames.slice(start, start + ITEMS_PER_PAGE)
  }, [sortedGames, currentPage])

  const paginationItems = useMemo(() => {
    return buildPagination(currentPage, totalPages)
  }, [currentPage, totalPages])

  function handleSearch() {
    setAppliedSearchText(searchText)
    setCurrentPage(1)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      handleSearch()
    }
  }

  function handleGenreChange(event: ChangeEvent<HTMLSelectElement>) {
    setSelectedGenre(event.target.value)
    setCurrentPage(1)
  }

  function handlePriceChange(event: ChangeEvent<HTMLSelectElement>) {
    setSelectedPrice(event.target.value as PriceFilter)
    setCurrentPage(1)
  }

  function handlePlatformChange(event: ChangeEvent<HTMLSelectElement>) {
    setSelectedPlatform(event.target.value)
    setCurrentPage(1)
  }

  function handleSortChange(event: ChangeEvent<HTMLSelectElement>) {
    setSortBy(event.target.value as SortOption)
    setCurrentPage(1)
  }

  function handleOnlyFreeChange(event: ChangeEvent<HTMLInputElement>) {
    setOnlyFree(event.target.checked)
    setCurrentPage(1)
  }

  return (
    <section className="search-page" aria-label="게임 검색 화면">
      <div className="sample-notice-card">
        <div>
          <span>샘플 데이터 안내</span>
          <strong>현재 검색 화면은 첫 페이지 50개 게임 기준입니다.</strong>
          <p>
            이 화면의 검색, 필터, 정렬 결과는 전체 Steam 데이터가 아니라{' '}
            <b>/games API에서 현재 불러온 샘플 데이터</b>를 기준으로 표시됩니다.
            전체 검색 기능은 백엔드 검색·페이지네이션 API가 연결되면 확장할 수 있습니다.
          </p>
        </div>

        <div className="sample-notice-badge">
          <strong>{apiMeta.loadedCount.toLocaleString('ko-KR')}개</strong>
          <span>현재 불러온 게임</span>
        </div>
      </div>

      <div className="sample-summary-grid">
        <div>
          <span>검색 기준</span>
          <strong>샘플 {apiMeta.loadedCount.toLocaleString('ko-KR')}개</strong>
        </div>

        <div>
          <span>무료 게임</span>
          <strong>{sampleStats.freeCount.toLocaleString('ko-KR')}개</strong>
        </div>

        <div>
          <span>유료 게임</span>
          <strong>{sampleStats.paidCount.toLocaleString('ko-KR')}개</strong>
        </div>

        <div>
          <span>대표 장르</span>
          <strong>{sampleStats.topGenre}</strong>
        </div>
      </div>

      <div className="search-top-bar">
        <div className="search-input-group">
          <input
            className="search-input"
            type="text"
            placeholder="샘플 50개 안에서 게임명 또는 장르를 검색해보세요"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="search-button" type="button" onClick={handleSearch}>
            검색
          </button>
        </div>

        <div className="sample-mode-pill">샘플 검색 모드</div>
      </div>

      <div className="search-filter-bar">
        <div className="search-filter-item">
          <label htmlFor="genre-filter">장르</label>
          <select id="genre-filter" value={selectedGenre} onChange={handleGenreChange}>
            {genreOptions.map((genre) => (
              <option key={genre} value={genre}>
                {genre === 'all' ? '전체' : genre}
              </option>
            ))}
          </select>
        </div>

        <div className="search-filter-item">
          <label htmlFor="price-filter">가격</label>
          <select id="price-filter" value={selectedPrice} onChange={handlePriceChange}>
            <option value="all">전체</option>
            <option value="free">무료</option>
            <option value="0-10">$0 ~ $10</option>
            <option value="10-30">$10 ~ $30</option>
            <option value="30plus">$30 이상</option>
          </select>
        </div>

        <div className="search-filter-item">
          <label htmlFor="platform-filter">플랫폼</label>
          <select id="platform-filter" value={selectedPlatform} onChange={handlePlatformChange}>
            {platformOptions.map((platform) => (
              <option key={platform} value={platform}>
                {platform === 'all' ? '전체' : platform}
              </option>
            ))}
          </select>
        </div>

        <div className="search-filter-item">
          <label htmlFor="sort-filter">정렬</label>
          <select id="sort-filter" value={sortBy} onChange={handleSortChange}>
            <option value="popular">리뷰 수 많은순</option>
            <option value="positiveHigh">리뷰 긍정률 높은순</option>
            <option value="positiveLow">리뷰 긍정률 낮은순</option>
            <option value="playtimeHigh">평균 플레이시간 높은순</option>
            <option value="playtimeLow">평균 플레이시간 낮은순</option>
            <option value="priceLow">가격 낮은순</option>
            <option value="priceHigh">가격 높은순</option>
            <option value="name">이름순</option>
          </select>
        </div>

        <label className="free-only-check">
          <input type="checkbox" checked={onlyFree} onChange={handleOnlyFreeChange} />
          <span>무료 게임만 보기</span>
        </label>
      </div>

      <div className="search-result-card">
        <div className="search-result-header">
          <div>
            <strong>검색 결과 {sortedGames.length.toLocaleString('ko-KR')}건</strong>
            <p>
              현재 불러온 샘플 {apiMeta.loadedCount.toLocaleString('ko-KR')}개 중 조건에 맞는
              게임만 표시합니다.
            </p>
          </div>

          {apiMeta.hasNextCursor && (
            <span className="sample-cursor-note">다음 데이터 페이지가 존재합니다</span>
          )}
        </div>

        {isLoading && <div className="search-empty">샘플 게임 데이터를 불러오는 중입니다.</div>}

        {!isLoading && errorMessage && <div className="search-empty">{errorMessage}</div>}

        {!isLoading && !errorMessage && visibleGames.length === 0 && (
          <div className="search-empty">현재 샘플 데이터 안에서 조건에 맞는 게임이 없습니다.</div>
        )}

        {!isLoading && !errorMessage && visibleGames.length > 0 && (
          <>
            <div className="search-table-wrap">
              <table className="search-table">
                <thead>
                  <tr>
                    <th>게임</th>
                    <th>장르</th>
                    <th>가격</th>
                    <th>리뷰 수</th>
                    <th>리뷰 긍정률</th>
                    <th>평균 플레이시간</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleGames.map((game) => (
                    <tr key={game.id}>
                      <td>
                        <div className="game-cell">
                          <div className="game-thumb-wrap">
                            {game.imageUrl ? (
                              <img
                                className="game-thumb"
                                src={game.imageUrl}
                                alt={game.name}
                                loading="lazy"
                              />
                            ) : (
                              <div className="game-thumb placeholder">No Image</div>
                            )}
                          </div>
                          <div className="game-info">
                            <strong>{game.name}</strong>
                            <span>ID {game.id}</span>
                          </div>
                        </div>
                      </td>

                      <td>{game.primaryGenre || '-'}</td>

                      <td>{formatPriceText(game.price, game.isFree)}</td>

                      <td>{game.reviewCount === null ? '-' : formatCount(game.reviewCount)}</td>

                      <td className="positive-cell">
                        {game.positiveRatio === null ? '-' : `${game.positiveRatio.toFixed(1)}%`}
                      </td>

                      <td>{formatPlaytime(game.averagePlaytime)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="search-pagination">
              <button
                type="button"
                className="page-nav"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                ‹
              </button>

              {paginationItems.map((item, index) =>
                item === 'ellipsis' ? (
                  <span className="page-ellipsis" key={`ellipsis-${index}`}>
                    ...
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    className={`page-number ${currentPage === item ? 'active' : ''}`}
                    onClick={() => setCurrentPage(item)}
                  >
                    {item}
                  </button>
                ),
              )}

              <button
                type="button"
                className="page-nav"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                ›
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  )
}

function normalizeGames(rawData: unknown): SearchGame[] {
  const rawList = unwrapList(rawData)

  return rawList
    .map((item, index) => {
      const name = readString(item, ['name', 'title', 'game_name', 'gameName']) || `게임 ${index + 1}`
      const rawGenres = readStringArray(item, ['genres', 'genre', 'tags'])
      const genres = rawGenres.length > 0 ? rawGenres.map(formatGenreLabel) : ['기타']
      const primaryGenre = genres[0] ?? '기타'

      const rawPrice =
        readOptionalNumber(item, ['price', 'final_price', 'initial_price', 'price_usd']) ?? 0
      const price = normalizePrice(rawPrice)
      const isFree =
        price === 0 ||
        readBoolean(item, ['is_free', 'free_to_play', 'free']) ||
        name.toLowerCase().includes('free')

      const platforms = normalizePlatforms(item)

      const positiveReviews = readOptionalNumber(item, [
        'positive_reviews',
        'positiveReviews',
        'positive_review_count',
      ])

      const negativeReviews = readOptionalNumber(item, [
        'negative_reviews',
        'negativeReviews',
        'negative_review_count',
      ])

      const reviewCount = calculateReviewCount(
        positiveReviews,
        negativeReviews,
        readOptionalNumber(item, ['review_count', 'reviews', 'total_reviews', 'num_reviews']),
      )

      const positiveRatio = calculatePositiveRatio(
        positiveReviews,
        negativeReviews,
        readOptionalNumber(item, [
          'positive_ratio',
          'positivePercent',
          'positive_percent',
          'avg_positive_ratio',
        ]),
      )

      const averagePlaytime = readOptionalNumber(item, [
        'average_playtime',
        'averagePlaytime',
        'avg_playtime',
        'avgPlaytime',
      ])

      const imageUrl =
        readString(item, [
          'header_image',
          'headerImage',
          'capsule_image',
          'capsuleImage',
          'image_url',
          'imageUrl',
          'thumbnail',
        ]) || ''

      const id =
        readOptionalNumber(item, ['app_id', 'appid', 'id', 'game_id', 'gameId']) ?? index + 1

      return {
        id,
        name,
        genres,
        genreSearchText: `${rawGenres.join(' ')} ${genres.join(' ')}`,
        primaryGenre,
        price,
        isFree,
        platforms,
        positiveReviews,
        negativeReviews,
        positiveRatio,
        reviewCount,
        averagePlaytime,
        imageUrl,
      }
    })
    .filter((game) => Boolean(game.name))
}

function normalizePlatforms(item: Record<string, unknown>): string[] {
  const directPlatforms = readStringArray(item, ['platforms', 'supported_platforms', 'platform'])

  const result = new Set<string>()

  directPlatforms.forEach((platform) => {
    const normalized = formatPlatformLabel(platform)
    if (normalized) {
      result.add(normalized)
    }
  })

  if (readBoolean(item, ['windows', 'is_windows'])) {
    result.add('Windows')
  }

  if (readBoolean(item, ['mac', 'macos', 'is_mac'])) {
    result.add('macOS')
  }

  if (readBoolean(item, ['linux', 'is_linux'])) {
    result.add('Linux')
  }

  if (result.size === 0) {
    result.add('플랫폼 정보 없음')
  }

  return Array.from(result)
}

function matchesPriceFilter(price: number, filter: PriceFilter): boolean {
  if (filter === 'all') {
    return true
  }

  if (filter === 'free') {
    return price === 0
  }

  if (filter === '0-10') {
    return price > 0 && price <= 10
  }

  if (filter === '10-30') {
    return price > 10 && price <= 30
  }

  if (filter === '30plus') {
    return price > 30
  }

  return true
}

function buildPagination(currentPage: number, totalPages: number): Array<number | 'ellipsis'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const result: Array<number | 'ellipsis'> = [1]

  if (currentPage > 3) {
    result.push('ellipsis')
  }

  const start = Math.max(2, currentPage - 1)
  const end = Math.min(totalPages - 1, currentPage + 1)

  for (let page = start; page <= end; page += 1) {
    result.push(page)
  }

  if (currentPage < totalPages - 2) {
    result.push('ellipsis')
  }

  result.push(totalPages)

  return result
}

function calculateReviewCount(
  positiveReviews: number | null,
  negativeReviews: number | null,
  fallbackReviewCount: number | null,
): number | null {
  if (
    positiveReviews !== null &&
    negativeReviews !== null &&
    positiveReviews + negativeReviews > 0
  ) {
    return positiveReviews + negativeReviews
  }

  return fallbackReviewCount
}

function calculatePositiveRatio(
  positiveReviews: number | null,
  negativeReviews: number | null,
  fallbackRatio: number | null,
): number | null {
  if (
    positiveReviews !== null &&
    negativeReviews !== null &&
    positiveReviews + negativeReviews > 0
  ) {
    return (positiveReviews / (positiveReviews + negativeReviews)) * 100
  }

  return normalizeRatio(fallbackRatio)
}

function getPositiveRatioForSort(value: number | null, direction: 'high' | 'low'): number {
  if (value === null || !Number.isFinite(value)) {
    return direction === 'high' ? -1 : 101
  }

  return value
}

function formatGenreLabel(genre: string): string {
  const trimmed = genre.trim()
  const normalized = trimmed.toLowerCase()

  const genreMap: Record<string, string> = {
    action: '액션',
    adventure: '어드벤처',
    indie: '인디',
    rpg: 'RPG',
    simulation: '시뮬레이션',
    strategy: '전략',
    casual: '캐주얼',
    sports: '스포츠',
    racing: '레이싱',
    'free to play': '무료 플레이',
    'massively multiplayer': '대규모 멀티플레이',
    'early access': '앞서 해보기',
  }

  if (!trimmed || /[가-힣]/.test(trimmed)) {
    return trimmed
  }

  return genreMap[normalized] ?? trimmed
}

function formatPlatformLabel(platform: string): string {
  const normalized = platform.trim().toLowerCase()

  if (normalized.includes('win')) {
    return 'Windows'
  }

  if (normalized.includes('mac')) {
    return 'macOS'
  }

  if (normalized.includes('linux')) {
    return 'Linux'
  }

  return platform.trim()
}

function formatPriceText(price: number, isFree: boolean): string {
  if (isFree || price === 0) {
    return '무료'
  }

  const krwPrice = Math.round(price * USD_TO_KRW_RATE)

  return `₩${krwPrice.toLocaleString('ko-KR')} ($${price.toFixed(2)})`
}

function formatCount(value: number): string {
  return value.toLocaleString('ko-KR')
}

function formatPlaytime(value: number | null): string {
  if (value === null || !Number.isFinite(value) || value <= 0) {
    return '-'
  }

  if (value < 60) {
    return `${Math.round(value)}분`
  }

  const hours = Math.floor(value / 60)
  const minutes = Math.round(value % 60)

  if (minutes === 0) {
    return `${hours.toLocaleString('ko-KR')}시간`
  }

  return `${hours.toLocaleString('ko-KR')}시간 ${minutes}분`
}

function normalizePrice(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  if (value === 0) {
    return 0
  }

  if (value >= 200) {
    return value / 100
  }

  return value
}

function normalizeRatio(value: number | null): number | null {
  if (value === null || !Number.isFinite(value)) {
    return null
  }

  if (value <= 1) {
    return value * 100
  }

  if (value > 100) {
    return 100
  }

  return value
}

function unwrapList(rawData: unknown): Record<string, unknown>[] {
  if (Array.isArray(rawData)) {
    return rawData.filter(isRecord)
  }

  if (!isRecord(rawData)) {
    return []
  }

  const nestedKeys = ['items', 'results', 'data', 'games']

  for (const key of nestedKeys) {
    const value = rawData[key]

    if (Array.isArray(value)) {
      return value.filter(isRecord)
    }
  }

  return []
}

function readApiLimit(rawData: unknown): number | null {
  if (!isRecord(rawData)) {
    return null
  }

  return readOptionalNumber(rawData, ['limit', 'page_size', 'pageSize'])
}

function hasNextCursor(rawData: unknown): boolean {
  if (!isRecord(rawData)) {
    return false
  }

  return Boolean(rawData.next_cursor || rawData.nextCursor)
}

function readString(item: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = item[key]

    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  return ''
}

function readOptionalNumber(item: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = item[key]

    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }

    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value.replace(/,/g, ''))

      if (Number.isFinite(parsed)) {
        return parsed
      }
    }
  }

  return null
}

function readBoolean(item: Record<string, unknown>, keys: string[]): boolean {
  for (const key of keys) {
    const value = item[key]

    if (typeof value === 'boolean') {
      return value
    }

    if (typeof value === 'number') {
      return value === 1
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase()
      if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
        return true
      }
    }
  }

  return false
}

function readStringArray(item: Record<string, unknown>, keys: string[]): string[] {
  for (const key of keys) {
    const value = item[key]

    if (Array.isArray(value)) {
      return value
        .map((entry) => {
          if (typeof entry === 'string') {
            return entry.trim()
          }

          if (isRecord(entry)) {
            return (
              readString(entry, ['name', 'label', 'genre', 'tag', 'platform']) || ''
            ).trim()
          }

          return ''
        })
        .filter(Boolean)
    }

    if (typeof value === 'string' && value.trim()) {
      return value
        .split(/[|,/]/)
        .map((entry) => entry.trim())
        .filter(Boolean)
    }
  }

  return []
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export default RankingPage
