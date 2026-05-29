import { useEffect, useState } from 'react'
import './MarketDistributionPage.css'

type MarketTab = 'genre' | 'price' | 'platform' | 'release'

type GameItem = {
  title: string
  genres: string[]
  price: number | null
  positiveRatio: number | null
  platforms: string[]
  releaseYear: number | null
}

type GenreStat = {
  genre: string
  label: string
  gameCount: number
  share: number
}

type PriceBandStat = {
  priceBand: string
  label: string
  gameCount: number
  share: number
}

type PlatformStat = {
  platform: string
  label: string
  gameCount: number
  share: number
}

type ReleaseYearStat = {
  year: number
  gameCount: number
}

type PricePositivePoint = {
  title: string
  price: number
  positiveRatio: number
}

type MarketDistributionData = {
  genres: GenreStat[]
  priceBands: PriceBandStat[]
  platforms: PlatformStat[]
  releaseYears: ReleaseYearStat[]
  pricePositivePoints: PricePositivePoint[]
  totalGames: number
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

const INITIAL_MARKET_DATA: MarketDistributionData = {
  genres: [],
  priceBands: [],
  platforms: [],
  releaseYears: [],
  pricePositivePoints: [],
  totalGames: 0,
}

const PIE_COLORS = [
  '#5d63f1',
  '#6aa8ff',
  '#48c78e',
  '#8f7cf7',
  '#f59e0b',
  '#ef6b6b',
  '#94a3b8',
  '#2dd4bf',
]

const GENRE_LABEL_MAP: Record<string, string> = {
  action: '액션',
  adventure: '어드벤처',
  indie: '인디',
  strategy: '전략',
  casual: '캐주얼',
  rpg: 'RPG',
  simulation: '시뮬레이션',
  sports: '스포츠',
  racing: '레이싱',
  puzzle: '퍼즐',
  horror: '호러',
  arcade: '아케이드',
  platformer: '플랫폼',
  platform: '플랫폼',
  fighting: '격투',
  shooter: '슈팅',
  mmo: 'MMO',
  mmorpg: 'MMORPG',
  survival: '서바이벌',
  sandbox: '샌드박스',
  'open world': '오픈월드',
  'visual novel': '비주얼노벨',
  roguelike: '로그라이크',
  roguelite: '로그라이트',
  unknown: '알 수 없음',
}

const PLATFORM_LABEL_MAP: Record<string, string> = {
  windows: 'Windows',
  steam: 'Steam',
  steamos: 'SteamOS',
  'steam os': 'SteamOS',
  mac: 'macOS',
  macos: 'macOS',
  osx: 'macOS',
  linux: 'Linux',
}

function MarketDistributionPage() {
  const [activeTab, setActiveTab] = useState<MarketTab>('genre')
  const [marketData, setMarketData] = useState<MarketDistributionData>(INITIAL_MARKET_DATA)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function loadMarketDistributionData() {
      try {
        setIsLoading(true)
        setErrorMessage('')

        const [genreResult, priceResult, platformResult, releaseYearResult, gamesResult] =
          await Promise.allSettled([
            fetchOptionalJson('/analysis/genre-stats'),
            fetchOptionalJson('/analysis/price-band-stats'),
            fetchOptionalJson('/analysis/platform-stats'),
            fetchOptionalJson('/analysis/release-year-stats'),
            fetchOptionalJson('/games'),
          ])

        const games =
          gamesResult.status === 'fulfilled' && gamesResult.value
            ? normalizeGames(gamesResult.value)
            : []

        const genres =
          genreResult.status === 'fulfilled' && genreResult.value
            ? normalizeGenreStats(genreResult.value, games)
            : aggregateGenreStatsFromGames(games)

        const priceBands =
          priceResult.status === 'fulfilled' && priceResult.value
            ? normalizePriceBandStats(priceResult.value, games)
            : aggregatePriceBandStatsFromGames(games)

        const platforms =
          platformResult.status === 'fulfilled' && platformResult.value
            ? normalizePlatformStats(platformResult.value, games)
            : aggregatePlatformStatsFromGames(games)

        const releaseYears =
          releaseYearResult.status === 'fulfilled' && releaseYearResult.value
            ? normalizeReleaseYearStats(releaseYearResult.value, games)
            : aggregateReleaseYearStatsFromGames(games)

        const pricePositivePoints = createPricePositivePoints(games)

        setMarketData({
          genres,
          priceBands,
          platforms,
          releaseYears,
          pricePositivePoints,
          totalGames: games.length || calculateTotalCount(genres),
        })
      } catch (error) {
        console.error('시장 분포 데이터를 불러오지 못했습니다.', error)
        setMarketData(INITIAL_MARKET_DATA)
        setErrorMessage('시장 분포 데이터를 불러오지 못했습니다.')
      } finally {
        setIsLoading(false)
      }
    }

    loadMarketDistributionData()
  }, [])

  const hasAnyData =
    marketData.genres.length > 0 ||
    marketData.priceBands.length > 0 ||
    marketData.platforms.length > 0 ||
    marketData.releaseYears.length > 0 ||
    marketData.pricePositivePoints.length > 0

  return (
    <section className="market-distribution-page" aria-label="시장 분포 분석 화면">
      <header className="market-distribution-header">
        <div>
          <span>6. 시장 분포</span>
          <h1>시장 분포 분석</h1>
        </div>

        <strong>
          총 게임 수{' '}
          {marketData.totalGames > 0 ? marketData.totalGames.toLocaleString('ko-KR') : '-'}
        </strong>
      </header>

      <nav className="market-distribution-tabs" aria-label="시장 분포 탭">
        <button
          className={activeTab === 'genre' ? 'active' : ''}
          type="button"
          onClick={() => setActiveTab('genre')}
        >
          장르 분포
        </button>

        <button
          className={activeTab === 'price' ? 'active' : ''}
          type="button"
          onClick={() => setActiveTab('price')}
        >
          가격대 분포
        </button>

        <button
          className={activeTab === 'platform' ? 'active' : ''}
          type="button"
          onClick={() => setActiveTab('platform')}
        >
          플랫폼 분포
        </button>

        <button
          className={activeTab === 'release' ? 'active' : ''}
          type="button"
          onClick={() => setActiveTab('release')}
        >
          출시 연도 분포
        </button>
      </nav>

      {isLoading && <div className="market-empty">시장 분포 데이터를 불러오는 중입니다.</div>}

      {!isLoading && errorMessage && <div className="market-empty">{errorMessage}</div>}

      {!isLoading && !errorMessage && !hasAnyData && (
        <div className="market-empty">표시할 시장 분포 데이터가 없습니다.</div>
      )}

      {!isLoading && !errorMessage && hasAnyData && (
        <div className="market-dashboard-grid">
          <GenreDistributionCard genres={marketData.genres} isFocused={activeTab === 'genre'} />

          <PriceBandDistributionCard
            priceBands={marketData.priceBands}
            isFocused={activeTab === 'price'}
          />

          <PlatformDistributionCard
            platforms={marketData.platforms}
            isFocused={activeTab === 'platform'}
          />

          <ReleaseYearDistributionCard
            releaseYears={marketData.releaseYears}
            isFocused={activeTab === 'release'}
          />

          <PricePositiveScatterCard points={marketData.pricePositivePoints} />
        </div>
      )}
    </section>
  )
}

function GenreDistributionCard({
  genres,
  isFocused,
}: {
  genres: GenreStat[]
  isFocused: boolean
}) {
  const topGenres = genres.slice(0, 7)
  const pieBackground = buildPieBackground(topGenres)

  return (
    <article className={`market-card market-card--large ${isFocused ? 'focused' : ''}`}>
      <div className="market-card-header">
        <h2>장르별 게임 비중</h2>
        <span>genre share</span>
      </div>

      {topGenres.length === 0 ? (
        <div className="market-empty inside">장르 분포 데이터가 없습니다.</div>
      ) : (
        <div className="genre-distribution-body">
          <div
            className="genre-pie-chart"
            style={{
              background: pieBackground,
            }}
            aria-label="장르별 게임 비중 차트"
          >
            <div>
              <span>전체</span>
              <strong>{calculateTotalCount(genres).toLocaleString('ko-KR')}</strong>
            </div>
          </div>

          <div className="genre-legend-list">
            {topGenres.map((genre, index) => (
              <div className="genre-legend-item" key={genre.genre}>
                <i
                  style={{
                    background: PIE_COLORS[index % PIE_COLORS.length],
                  }}
                  aria-hidden="true"
                />
                <span>{genre.label}</span>
                <strong>{genre.share.toFixed(1)}%</strong>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  )
}

function PriceBandDistributionCard({
  priceBands,
  isFocused,
}: {
  priceBands: PriceBandStat[]
  isFocused: boolean
}) {
  const maxCount = Math.max(...priceBands.map((item) => item.gameCount), 1)

  return (
    <article className={`market-card ${isFocused ? 'focused' : ''}`}>
      <div className="market-card-header">
        <h2>가격대별 게임 수 분포</h2>
        <span>price band</span>
      </div>

      {priceBands.length === 0 ? (
        <div className="market-empty inside">가격대 분포 데이터가 없습니다.</div>
      ) : (
        <div className="market-bar-list">
          {priceBands.slice(0, 6).map((item) => {
            const width = (item.gameCount / maxCount) * 100

            return (
              <div className="market-bar-row" key={item.priceBand}>
                <div className="market-bar-label">
                  <strong>{item.label}</strong>
                  <span>{item.share.toFixed(1)}%</span>
                </div>

                <div className="market-bar-track">
                  <div
                    style={{
                      width: `${width}%`,
                    }}
                  />
                </div>

                <em>{item.gameCount.toLocaleString('ko-KR')}</em>
              </div>
            )
          })}
        </div>
      )}
    </article>
  )
}

function PlatformDistributionCard({
  platforms,
  isFocused,
}: {
  platforms: PlatformStat[]
  isFocused: boolean
}) {
  return (
    <article className={`market-card ${isFocused ? 'focused' : ''}`}>
      <div className="market-card-header">
        <h2>플랫폼별 비중</h2>
        <span>platform</span>
      </div>

      {platforms.length === 0 ? (
        <div className="market-empty inside">플랫폼 분포 데이터가 없습니다.</div>
      ) : (
        <div className="platform-grid">
          {platforms.slice(0, 4).map((platform) => (
            <div className="platform-item" key={platform.platform}>
              <div className="platform-icon" aria-hidden="true">
                {getPlatformIcon(platform.platform)}
              </div>
              <strong>{platform.label}</strong>
              <span>{platform.share.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      )}
    </article>
  )
}

function ReleaseYearDistributionCard({
  releaseYears,
  isFocused,
}: {
  releaseYears: ReleaseYearStat[]
  isFocused: boolean
}) {
  const recentYears = releaseYears.slice(-6)
  const maxCount = Math.max(...recentYears.map((item) => item.gameCount), 1)

  return (
    <article className={`market-card ${isFocused ? 'focused' : ''}`}>
      <div className="market-card-header">
        <h2>출시 연도별 게임 수</h2>
        <span>release year</span>
      </div>

      {recentYears.length === 0 ? (
        <div className="market-empty inside">출시 연도 분포 데이터가 없습니다.</div>
      ) : (
        <div className="release-year-chart">
          {recentYears.map((item) => {
            const height = Math.max((item.gameCount / maxCount) * 100, 4)

            return (
              <div className="release-year-item" key={item.year}>
                <div className="release-year-bar-wrap">
                  <div
                    className="release-year-bar"
                    style={{
                      height: `${height}%`,
                    }}
                  />
                </div>

                <strong>{formatLargeNumber(item.gameCount)}</strong>
                <span>{item.year}</span>
              </div>
            )
          })}
        </div>
      )}
    </article>
  )
}

function PricePositiveScatterCard({ points }: { points: PricePositivePoint[] }) {
  return (
    <article className="market-card market-card--wide">
      <div className="market-card-header">
        <h2>가격 vs 평균 긍정 비율</h2>
        <span>price correlation</span>
      </div>

      {points.length === 0 ? (
        <div className="market-empty inside">가격과 긍정 비율 데이터가 없습니다.</div>
      ) : (
        <PricePositiveScatterPlot points={points} />
      )}
    </article>
  )
}

function PricePositiveScatterPlot({ points }: { points: PricePositivePoint[] }) {
  const chartPoints = points.slice(0, 90)
  const width = 620
  const height = 260
  const margin = {
    top: 18,
    right: 22,
    bottom: 32,
    left: 44,
  }

  const xMax = Math.max(...chartPoints.map((point) => point.price), 1)
  const yMax = 100
  const plotWidth = width - margin.left - margin.right
  const plotHeight = height - margin.top - margin.bottom

  const xScale = (price: number) => margin.left + (price / xMax) * plotWidth
  const yScale = (ratio: number) => margin.top + ((yMax - ratio) / yMax) * plotHeight

  const regression = calculateRegression(chartPoints)
  const yTicks = [100, 75, 50, 25, 0]
  const xTicks = [0, xMax / 2, xMax]

  return (
    <div className="price-positive-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="가격 대비 긍정 비율 산점도">
        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={margin.left}
              x2={width - margin.right}
              y1={yScale(tick)}
              y2={yScale(tick)}
              className="scatter-grid-line"
            />
            <text x={margin.left - 10} y={yScale(tick) + 4} textAnchor="end">
              {tick}%
            </text>
          </g>
        ))}

        {xTicks.map((tick) => (
          <g key={tick}>
            <text x={xScale(tick)} y={height - 8} textAnchor="middle">
              {formatPriceTick(tick)}
            </text>
          </g>
        ))}

        {chartPoints.map((point, index) => (
          <circle
            key={`${point.title}-${index}`}
            cx={xScale(point.price)}
            cy={yScale(point.positiveRatio)}
            r="3.3"
            className="scatter-point"
          />
        ))}

        {regression && (
          <line
            x1={xScale(0)}
            y1={yScale(clamp(regression.intercept, 0, 100))}
            x2={xScale(xMax)}
            y2={yScale(clamp(regression.slope * xMax + regression.intercept, 0, 100))}
            className="scatter-regression-line"
          />
        )}

        <text x={width / 2} y={height - 2} textAnchor="middle" className="scatter-axis-label">
          가격
        </text>

        <text
          x="14"
          y={height / 2}
          textAnchor="middle"
          className="scatter-axis-label"
          transform={`rotate(-90 14 ${height / 2})`}
        >
          긍정 비율
        </text>
      </svg>
    </div>
  )
}

async function fetchOptionalJson(path: string): Promise<unknown | null> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`)

    if (!response.ok) {
      return null
    }

    return response.json()
  } catch {
    return null
  }
}

function normalizeGames(rawData: unknown): GameItem[] {
  const rawList = unwrapList(rawData)

  return rawList.map((item, index) => {
    const title = readString(item, ['name', 'title', 'game_name', 'gameName']) || `Game ${index + 1}`
    const genres = readGenreList(item)
    const price = readOptionalNumber(item, [
      'price',
      'initial_price',
      'initialPrice',
      'final_price',
      'finalPrice',
      'price_initial',
      'priceInitial',
    ])
    const positiveRatio = normalizeOptionalPercent(
      readOptionalNumber(item, [
        'positive_ratio',
        'positiveRatio',
        'positive_rate',
        'positiveRate',
        'positive_percent',
        'positivePercent',
      ]),
    )
    const platforms = readPlatformList(item)
    const releaseYear = readReleaseYear(item)

    return {
      title,
      genres,
      price,
      positiveRatio,
      platforms,
      releaseYear,
    }
  })
}

function normalizeGenreStats(rawData: unknown, fallbackGames: GameItem[]): GenreStat[] {
  const rawList = unwrapList(rawData)

  if (rawList.length === 0) {
    return aggregateGenreStatsFromGames(fallbackGames)
  }

  const items = rawList
    .map((item) => {
      const genre = readString(item, ['genre', 'genres', 'category', 'name', 'label']) || 'Unknown'
      const gameCount = readOptionalNumber(item, ['game_count', 'gameCount', 'count', 'total']) ?? 0
      const rawShare = readOptionalNumber(item, ['share', 'share_percent', 'sharePercent', 'percentage'])
      const share = normalizeOptionalPercent(rawShare) ?? 0

      return {
        genre,
        label: formatGenreLabel(genre),
        gameCount,
        share,
      }
    })
    .filter((item) => item.gameCount > 0 || item.share > 0)
    .sort((a, b) => b.gameCount - a.gameCount)

  return ensureShare(items)
}

function normalizePriceBandStats(rawData: unknown, fallbackGames: GameItem[]): PriceBandStat[] {
  const rawList = unwrapList(rawData)

  if (rawList.length === 0) {
    return aggregatePriceBandStatsFromGames(fallbackGames)
  }

  const items = rawList
    .map((item) => {
      const priceBand =
        readString(item, ['price_band', 'priceBand', 'band', 'range', 'label', 'name']) || 'Unknown'
      const gameCount = readOptionalNumber(item, ['game_count', 'gameCount', 'count', 'total']) ?? 0
      const rawShare = readOptionalNumber(item, ['share', 'share_percent', 'sharePercent', 'percentage'])
      const share = normalizeOptionalPercent(rawShare) ?? 0

      return {
        priceBand,
        label: formatPriceBandLabel(priceBand),
        gameCount,
        share,
      }
    })
    .filter((item) => item.gameCount > 0 || item.share > 0)

  return ensureShare(items)
}

function normalizePlatformStats(rawData: unknown, fallbackGames: GameItem[]): PlatformStat[] {
  const rawList = unwrapList(rawData)

  if (rawList.length === 0) {
    return aggregatePlatformStatsFromGames(fallbackGames)
  }

  const items = rawList
    .map((item) => {
      const platform =
        readString(item, ['platform', 'platform_name', 'platformName', 'name', 'label']) || 'Unknown'
      const gameCount = readOptionalNumber(item, ['game_count', 'gameCount', 'count', 'total']) ?? 0
      const rawShare = readOptionalNumber(item, ['share', 'share_percent', 'sharePercent', 'percentage'])
      const share = normalizeOptionalPercent(rawShare) ?? 0

      return {
        platform,
        label: formatPlatformLabel(platform),
        gameCount,
        share,
      }
    })
    .filter((item) => item.gameCount > 0 || item.share > 0)
    .sort((a, b) => b.share - a.share)

  return ensureShare(items)
}

function normalizeReleaseYearStats(rawData: unknown, fallbackGames: GameItem[]): ReleaseYearStat[] {
  const rawList = unwrapList(rawData)

  if (rawList.length === 0) {
    return aggregateReleaseYearStatsFromGames(fallbackGames)
  }

  return rawList
    .map((item) => {
      const year = readOptionalNumber(item, ['year', 'release_year', 'releaseYear']) ?? 0
      const gameCount = readOptionalNumber(item, ['game_count', 'gameCount', 'count', 'total']) ?? 0

      return {
        year,
        gameCount,
      }
    })
    .filter((item) => item.year > 0 && item.gameCount > 0)
    .sort((a, b) => a.year - b.year)
}

function aggregateGenreStatsFromGames(games: GameItem[]): GenreStat[] {
  const countMap = new Map<string, number>()

  games.forEach((game) => {
    const targetGenres = game.genres.length > 0 ? game.genres : ['Unknown']

    targetGenres.forEach((genre) => {
      countMap.set(genre, (countMap.get(genre) ?? 0) + 1)
    })
  })

  const total = Array.from(countMap.values()).reduce((sum, count) => sum + count, 0)

  return Array.from(countMap.entries())
    .map(([genre, gameCount]) => ({
      genre,
      label: formatGenreLabel(genre),
      gameCount,
      share: total > 0 ? (gameCount / total) * 100 : 0,
    }))
    .sort((a, b) => b.gameCount - a.gameCount)
}

function aggregatePriceBandStatsFromGames(games: GameItem[]): PriceBandStat[] {
  const bandMap = new Map<string, number>()

  games.forEach((game) => {
    const band = getPriceBand(game.price)
    bandMap.set(band, (bandMap.get(band) ?? 0) + 1)
  })

  const total = Array.from(bandMap.values()).reduce((sum, count) => sum + count, 0)

  return Array.from(bandMap.entries())
    .map(([priceBand, gameCount]) => ({
      priceBand,
      label: formatPriceBandLabel(priceBand),
      gameCount,
      share: total > 0 ? (gameCount / total) * 100 : 0,
    }))
    .sort((a, b) => getPriceBandOrder(a.priceBand) - getPriceBandOrder(b.priceBand))
}

function aggregatePlatformStatsFromGames(games: GameItem[]): PlatformStat[] {
  const platformMap = new Map<string, number>()

  games.forEach((game) => {
    const targetPlatforms = game.platforms.length > 0 ? game.platforms : []

    targetPlatforms.forEach((platform) => {
      platformMap.set(platform, (platformMap.get(platform) ?? 0) + 1)
    })
  })

  const total = Array.from(platformMap.values()).reduce((sum, count) => sum + count, 0)

  return Array.from(platformMap.entries())
    .map(([platform, gameCount]) => ({
      platform,
      label: formatPlatformLabel(platform),
      gameCount,
      share: total > 0 ? (gameCount / total) * 100 : 0,
    }))
    .sort((a, b) => b.gameCount - a.gameCount)
}

function aggregateReleaseYearStatsFromGames(games: GameItem[]): ReleaseYearStat[] {
  const yearMap = new Map<number, number>()

  games.forEach((game) => {
    if (game.releaseYear !== null) {
      yearMap.set(game.releaseYear, (yearMap.get(game.releaseYear) ?? 0) + 1)
    }
  })

  return Array.from(yearMap.entries())
    .map(([year, gameCount]) => ({
      year,
      gameCount,
    }))
    .sort((a, b) => a.year - b.year)
}

function createPricePositivePoints(games: GameItem[]): PricePositivePoint[] {
  return games
    .filter((game) => game.price !== null && game.positiveRatio !== null)
    .map((game) => ({
      title: game.title,
      price: game.price ?? 0,
      positiveRatio: game.positiveRatio ?? 0,
    }))
    .filter((point) => point.price >= 0 && point.positiveRatio >= 0)
    .sort((a, b) => b.price - a.price)
}

function buildPieBackground(items: GenreStat[]): string {
  if (items.length === 0) {
    return '#edf1ff'
  }

  let current = 0
  const segments = items.map((item, index) => {
    const start = current
    current += item.share

    return `${PIE_COLORS[index % PIE_COLORS.length]} ${start}% ${current}%`
  })

  if (current < 100) {
    segments.push(`#edf1ff ${current}% 100%`)
  }

  return `conic-gradient(${segments.join(', ')})`
}

function ensureShare<T extends { gameCount: number; share: number }>(items: T[]): T[] {
  const hasShare = items.some((item) => item.share > 0)

  if (hasShare) {
    return items
  }

  const total = items.reduce((sum, item) => sum + item.gameCount, 0)

  if (total <= 0) {
    return items
  }

  return items.map((item) => ({
    ...item,
    share: (item.gameCount / total) * 100,
  }))
}

function calculateTotalCount(items: Array<{ gameCount: number }>): number {
  return items.reduce((sum, item) => sum + item.gameCount, 0)
}

function calculateRegression(points: PricePositivePoint[]):
  | {
      slope: number
      intercept: number
    }
  | null {
  if (points.length < 2) {
    return null
  }

  const n = points.length
  const sumX = points.reduce((sum, point) => sum + point.price, 0)
  const sumY = points.reduce((sum, point) => sum + point.positiveRatio, 0)
  const sumXY = points.reduce((sum, point) => sum + point.price * point.positiveRatio, 0)
  const sumXX = points.reduce((sum, point) => sum + point.price * point.price, 0)
  const denominator = n * sumXX - sumX * sumX

  if (denominator === 0) {
    return null
  }

  const slope = (n * sumXY - sumX * sumY) / denominator
  const intercept = (sumY - slope * sumX) / n

  return {
    slope,
    intercept,
  }
}

function readGenreList(item: Record<string, unknown>): string[] {
  const rawValue = item.genres ?? item.genre ?? item.categories ?? item.tags

  if (Array.isArray(rawValue)) {
    return rawValue
      .map((entry) => {
        if (typeof entry === 'string') {
          return entry.trim()
        }

        if (isRecord(entry)) {
          return readString(entry, ['description', 'name', 'genre', 'label'])
        }

        return ''
      })
      .filter((entry) => entry.length > 0)
  }

  if (typeof rawValue === 'string') {
    return rawValue
      .split(/[,/|;]/)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
  }

  return []
}

function readPlatformList(item: Record<string, unknown>): string[] {
  const platforms = new Set<string>()

  const rawValue = item.platforms ?? item.platform ?? item.supported_platforms

  if (Array.isArray(rawValue)) {
    rawValue.forEach((entry) => {
      if (typeof entry === 'string' && entry.trim()) {
        platforms.add(entry.trim())
      }

      if (isRecord(entry)) {
        const platform = readString(entry, ['name', 'platform', 'label'])

        if (platform) {
          platforms.add(platform)
        }
      }
    })
  }

  if (typeof rawValue === 'string') {
    rawValue
      .split(/[,/|;]/)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
      .forEach((entry) => platforms.add(entry))
  }

  if (readBoolean(item, ['windows', 'is_windows', 'support_windows', 'supports_windows'])) {
    platforms.add('Windows')
  }

  if (readBoolean(item, ['mac', 'macos', 'is_mac', 'support_mac', 'supports_mac'])) {
    platforms.add('macOS')
  }

  if (readBoolean(item, ['linux', 'is_linux', 'support_linux', 'supports_linux'])) {
    platforms.add('Linux')
  }

  return Array.from(platforms)
}

function readReleaseYear(item: Record<string, unknown>): number | null {
  const directYear = readOptionalNumber(item, ['release_year', 'releaseYear', 'year'])

  if (directYear !== null && directYear > 1900) {
    return Math.trunc(directYear)
  }

  const releaseDate = readString(item, [
    'release_date',
    'releaseDate',
    'released_at',
    'releasedAt',
    'date',
  ])

  const matched = releaseDate.match(/\b(19|20)\d{2}\b/)

  if (!matched) {
    return null
  }

  const year = Number(matched[0])

  return Number.isFinite(year) ? year : null
}

function getPriceBand(price: number | null): string {
  if (price === null || price <= 0) {
    return 'Free'
  }

  if (price <= 5000) {
    return '0-5000'
  }

  if (price <= 15000) {
    return '5000-15000'
  }

  if (price <= 30000) {
    return '15000-30000'
  }

  if (price <= 50000) {
    return '30000-50000'
  }

  return '50000+'
}

function getPriceBandOrder(priceBand: string): number {
  const normalized = priceBand.toLowerCase()

  if (normalized.includes('free')) {
    return 0
  }

  if (normalized.includes('0-5000') || normalized.includes('0~5000')) {
    return 1
  }

  if (normalized.includes('5000-15000') || normalized.includes('5000~15000')) {
    return 2
  }

  if (normalized.includes('15000-30000') || normalized.includes('15000~30000')) {
    return 3
  }

  if (normalized.includes('30000-50000') || normalized.includes('30000~50000')) {
    return 4
  }

  return 5
}

function formatPriceBandLabel(priceBand: string): string {
  const trimmed = priceBand.trim()
  const normalized = trimmed.toLowerCase()

  if (!trimmed) {
    return '알 수 없음'
  }

  if (normalized.includes('free')) {
    return '무료'
  }

  const matchedRange = trimmed.match(/(\d+)\s*[-~]\s*(\d+)/)

  if (matchedRange) {
    return `${Number(matchedRange[1]).toLocaleString('ko-KR')}~${Number(
      matchedRange[2],
    ).toLocaleString('ko-KR')}`
  }

  const matchedOver = trimmed.match(/(\d+)\s*\+/)

  if (matchedOver) {
    return `${Number(matchedOver[1]).toLocaleString('ko-KR')} 이상`
  }

  return trimmed
}

function formatGenreLabel(genre: string): string {
  const trimmedGenre = genre.trim()

  if (!trimmedGenre) {
    return '알 수 없음'
  }

  if (/[가-힣]/.test(trimmedGenre) && trimmedGenre.includes('(') && trimmedGenre.includes(')')) {
    return trimmedGenre
  }

  const originalParts = trimmedGenre
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)

  if (originalParts.length === 0) {
    return trimmedGenre
  }

  const koreanParts = originalParts.map((part) => {
    const normalizedPart = normalizeToken(part)

    return GENRE_LABEL_MAP[normalizedPart] ?? part
  })

  const hasChanged = koreanParts.some((part, index) => part !== originalParts[index])

  if (!hasChanged) {
    return trimmedGenre
  }

  return `${koreanParts.join(', ')} (${trimmedGenre})`
}

function formatPlatformLabel(platform: string): string {
  const trimmed = platform.trim()

  if (!trimmed) {
    return '알 수 없음'
  }

  const normalized = normalizeToken(trimmed)

  return PLATFORM_LABEL_MAP[normalized] ?? trimmed
}

function getPlatformIcon(platform: string): string {
  const normalized = normalizeToken(platform)

  if (normalized.includes('windows')) {
    return '▦'
  }

  if (normalized.includes('steam')) {
    return '●'
  }

  if (normalized.includes('mac') || normalized.includes('osx')) {
    return '◐'
  }

  if (normalized.includes('linux')) {
    return '◇'
  }

  return '◆'
}

function formatLargeNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }

  return value.toLocaleString('ko-KR')
}

function formatPriceTick(value: number): string {
  if (value >= 10000) {
    return `${Math.round(value / 1000)}K`
  }

  return Math.round(value).toLocaleString('ko-KR')
}

function normalizeOptionalPercent(value: number | null): number | null {
  if (value === null) {
    return null
  }

  if (value <= 0) {
    return 0
  }

  if (value <= 1) {
    return value * 100
  }

  return Math.min(value, 100)
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function unwrapList(rawData: unknown): Record<string, unknown>[] {
  if (Array.isArray(rawData)) {
    return rawData.filter(isRecord)
  }

  if (!isRecord(rawData)) {
    return []
  }

  return readNestedList(rawData, [
    'items',
    'data',
    'results',
    'games',
    'stats',
    'genres',
    'platforms',
    'price_bands',
    'priceBands',
    'release_years',
    'releaseYears',
  ])
}

function readNestedList(item: Record<string, unknown>, keys: string[]): Record<string, unknown>[] {
  for (const key of keys) {
    const value = item[key]

    if (Array.isArray(value)) {
      return value.filter(isRecord)
    }

    if (isRecord(value)) {
      const nestedList = unwrapList(value)

      if (nestedList.length > 0) {
        return nestedList
      }
    }
  }

  return []
}

function readString(item: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = item[key]

    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value)
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

    if (typeof value === 'string') {
      const parsedValue = Number(value.replace(/[^0-9.-]/g, ''))

      if (Number.isFinite(parsedValue)) {
        return parsedValue
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
      return value > 0
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase()

      if (['true', 'yes', '1', 'y'].includes(normalized)) {
        return true
      }
    }
  }

  return false
}

function normalizeToken(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export default MarketDistributionPage
