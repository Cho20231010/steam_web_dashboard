import { useEffect, useState } from 'react'
import './MarketDistributionPage.css'

type MarketTab = 'genre' | 'price' | 'platform' | 'release'

type SummaryStat = {
  totalGames: number | null
  totalReviews: number | null
  averagePositiveRatio: number | null
  topGenre: string | null
}

type GenreStat = {
  genre: string
  label: string
  gameCount: number
  share: number
  avgPrice: number | null
  avgReviewCount: number | null
  avgPositiveRatio: number | null
}

type PriceBandStat = {
  priceBand: string
  label: string
  gameCount: number
  share: number
  avgReviewCount: number | null
  avgPositiveRatio: number | null
}

type PlatformStat = {
  platform: string
  label: string
  gameCount: number
  share: number
  avgPositiveRatio: number | null
}

type ReleaseYearStat = {
  year: number
  gameCount: number
  avgReviewCount: number | null
  avgPositiveRatio: number | null
}

type MarketDistributionData = {
  summary: SummaryStat
  genres: GenreStat[]
  priceBands: PriceBandStat[]
  platforms: PlatformStat[]
  releaseYears: ReleaseYearStat[]
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

const INITIAL_SUMMARY: SummaryStat = {
  totalGames: null,
  totalReviews: null,
  averagePositiveRatio: null,
  topGenre: null,
}

const INITIAL_MARKET_DATA: MarketDistributionData = {
  summary: INITIAL_SUMMARY,
  genres: [],
  priceBands: [],
  platforms: [],
  releaseYears: [],
}

const PIE_COLORS = [
  '#5d63f1',
  '#7ba7ff',
  '#74c993',
  '#8f7cf7',
  '#f2aa3b',
  '#df6f6f',
  '#94a3b8',
  '#2dd4bf',
]

const GENRE_LABEL_MAP: Record<string, string> = {
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
  utilities: '유틸리티',
  'animation modeling': '애니메이션·모델링',
  'animation & modeling': '애니메이션·모델링',
  'design illustration': '디자인·일러스트',
  'design & illustration': '디자인·일러스트',
  'video production': '영상 제작',
  'audio production': '오디오 제작',
  'game development': '게임 개발',
  'photo editing': '사진 편집',
  'software training': '소프트웨어 교육',
  violent: '폭력성',
  unknown: '알 수 없음',
}

const PLATFORM_LABEL_MAP: Record<string, string> = {
  windows: 'Windows',
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

        const [summaryResult, genreResult, priceResult, platformResult, releaseYearResult] =
          await Promise.allSettled([
            fetchRequiredJson('/dashboard/summary'),
            fetchRequiredJson('/analysis/genre-stats'),
            fetchRequiredJson('/analysis/price-band-stats'),
            fetchRequiredJson('/analysis/platform-stats'),
            fetchRequiredJson('/analysis/release-year-stats'),
          ])

        if (summaryResult.status === 'rejected') {
          throw summaryResult.reason
        }

        if (genreResult.status === 'rejected') {
          throw genreResult.reason
        }

        if (priceResult.status === 'rejected') {
          throw priceResult.reason
        }

        if (platformResult.status === 'rejected') {
          throw platformResult.reason
        }

        if (releaseYearResult.status === 'rejected') {
          throw releaseYearResult.reason
        }

        setMarketData({
          summary: normalizeSummaryStat(summaryResult.value),
          genres: normalizeGenreStats(genreResult.value),
          priceBands: normalizePriceBandStats(priceResult.value),
          platforms: normalizePlatformStats(platformResult.value),
          releaseYears: normalizeReleaseYearStats(releaseYearResult.value),
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
    marketData.releaseYears.length > 0

  return (
    <section className="market-distribution-page" aria-label="시장 분포 분석 화면">
      <header className="market-distribution-header">
        <div>
          <span>6. 시장 분포</span>
          <h1>시장 분포 분석</h1>
        </div>

        <div className="market-summary-badges" aria-label="시장 요약 지표">
          <strong>
            총 게임 수{' '}
            {marketData.summary.totalGames === null
              ? '-'
              : marketData.summary.totalGames.toLocaleString('ko-KR')}
          </strong>

          <strong>
            총 리뷰 수{' '}
            {marketData.summary.totalReviews === null
              ? '-'
              : marketData.summary.totalReviews.toLocaleString('ko-KR')}
          </strong>

          <strong>
            평균 긍정률{' '}
            {marketData.summary.averagePositiveRatio === null
              ? '-'
              : `${marketData.summary.averagePositiveRatio.toFixed(1)}%`}
          </strong>
        </div>
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

          <GenrePricePositiveScatterCard genres={marketData.genres} />
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
  const totalGenreCount = calculateTotalCount(genres)

  return (
    <article className={`market-card market-card--large ${isFocused ? 'focused' : ''}`}>
      <div className="market-card-header">
        <h2>장르별 게임 비중</h2>
        <span>장르 비중</span>
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
              <span>장르 합계</span>
              <strong>{totalGenreCount.toLocaleString('ko-KR')}</strong>
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
        <span>가격대</span>
      </div>

      {priceBands.length === 0 ? (
        <div className="market-empty inside">가격대 분포 데이터가 없습니다.</div>
      ) : (
        <div className="market-bar-list">
          {priceBands.map((item) => {
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
        <span>플랫폼 정보 기준</span>
      </div>

      {platforms.length === 0 ? (
        <div className="market-empty inside">플랫폼 분포 데이터가 없습니다.</div>
      ) : (
        <>
          <p className="market-card-caption">
            플랫폼 정보가 있는 게임의 수를 기준으로 비중을 계산합니다.
          </p>

          <div className="platform-grid">
            {platforms.map((platform) => (
              <div className="platform-item" key={platform.platform}>
                <div className="platform-icon" aria-hidden="true">
                  {getPlatformIcon(platform.platform)}
                </div>

                <strong>{platform.label}</strong>
                <span>{platform.share.toFixed(1)}%</span>

                <em>
                  {platform.avgPositiveRatio === null
                    ? '긍정률 -'
                    : `긍정률 ${platform.avgPositiveRatio.toFixed(1)}%`}
                </em>
              </div>
            ))}
          </div>
        </>
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
  const recentYears = releaseYears.slice(-10)
  const maxCount = Math.max(...recentYears.map((item) => item.gameCount), 1)

  return (
    <article className={`market-card market-card--release ${isFocused ? 'focused' : ''}`}>
      <div className="market-card-header">
        <h2>출시 연도별 게임 수</h2>
        <span>출시 연도</span>
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

function GenrePricePositiveScatterCard({ genres }: { genres: GenreStat[] }) {
  const points = genres
    .filter((genre) => genre.avgPrice !== null && genre.avgPositiveRatio !== null)
    .map((genre) => ({
      label: genre.label,
      price: genre.avgPrice ?? 0,
      positiveRatio: genre.avgPositiveRatio ?? 0,
      gameCount: genre.gameCount,
    }))
    .filter((point) => point.price >= 0 && point.positiveRatio >= 0)

  return (
    <article className="market-card market-card--scatter">
      <div className="market-card-header">
        <div>
          <h2>장르별 평균 가격 vs 평균 긍정 비율</h2>
          <p className="market-card-caption">
            장르 통계 API의 평균 가격과 평균 긍정 비율을 기준으로 가격대와 긍정률의 관계를
            비교합니다.
          </p>
        </div>

        <span>가격-긍정률 관계</span>
      </div>

      {points.length === 0 ? (
        <div className="market-empty inside">장르별 평균 가격과 긍정 비율 데이터가 없습니다.</div>
      ) : (
        <GenrePricePositiveScatterPlot points={points} />
      )}
    </article>
  )
}

function GenrePricePositiveScatterPlot({
  points,
}: {
  points: Array<{
    label: string
    price: number
    positiveRatio: number
    gameCount: number
  }>
}) {
  const width = 920
  const height = 380
  const margin = {
    top: 32,
    right: 34,
    bottom: 58,
    left: 72,
  }

  const xMax = Math.max(...points.map((point) => point.price), 1)
  const yMax = 100
  const plotWidth = width - margin.left - margin.right
  const plotHeight = height - margin.top - margin.bottom

  const xScale = (price: number) => margin.left + (price / xMax) * plotWidth
  const yScale = (ratio: number) => margin.top + ((yMax - ratio) / yMax) * plotHeight

  const regression = calculateRegression(points)
  const yTicks = [100, 75, 50, 25, 0]
  const xTicks = [0, xMax / 4, xMax / 2, (xMax / 4) * 3, xMax]

  return (
    <div className="price-positive-chart">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="장르별 평균 가격 대비 평균 긍정 비율 산점도"
      >
        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={margin.left}
              x2={width - margin.right}
              y1={yScale(tick)}
              y2={yScale(tick)}
              className="scatter-grid-line"
            />
            <text x={margin.left - 14} y={yScale(tick) + 4} textAnchor="end">
              {tick}%
            </text>
          </g>
        ))}

        {xTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={xScale(tick)}
              x2={xScale(tick)}
              y1={margin.top}
              y2={height - margin.bottom}
              className="scatter-grid-line vertical"
            />
            <text x={xScale(tick)} y={height - 24} textAnchor="middle">
              {formatPriceTick(tick)}
            </text>
          </g>
        ))}

        {points.map((point, index) => (
          <circle
            key={`${point.label}-${index}`}
            cx={xScale(point.price)}
            cy={yScale(point.positiveRatio)}
            r={getScatterPointRadius(point.gameCount)}
            className="scatter-point"
          >
            <title>
              {point.label} / 평균 가격 {Math.round(point.price).toLocaleString('ko-KR')} / 평균
              긍정률 {point.positiveRatio.toFixed(1)}%
            </title>
          </circle>
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

        <text x={width / 2} y={height - 5} textAnchor="middle" className="scatter-axis-label">
          평균 가격
        </text>

        <text
          x="18"
          y={height / 2}
          textAnchor="middle"
          className="scatter-axis-label"
          transform={`rotate(-90 18 ${height / 2})`}
        >
          평균 긍정 비율
        </text>
      </svg>

      <div className="scatter-note">
        <span>점 크기: 해당 장르의 게임 수</span>
        <span>점선: 평균 가격과 평균 긍정 비율의 추세선</span>
      </div>
    </div>
  )
}

async function fetchRequiredJson(path: string): Promise<unknown> {
  const response = await fetch(`${API_BASE_URL}${path}`)

  if (!response.ok) {
    throw new Error(`${path} API error: ${response.status}`)
  }

  return response.json()
}

function normalizeSummaryStat(rawData: unknown): SummaryStat {
  if (!isRecord(rawData)) {
    return INITIAL_SUMMARY
  }

  return {
    totalGames: readOptionalNumber(rawData, ['total_games', 'totalGames']),
    totalReviews: readOptionalNumber(rawData, ['total_reviews', 'totalReviews']),
    averagePositiveRatio: readOptionalNumber(rawData, [
      'average_positive_ratio',
      'averagePositiveRatio',
      'avg_positive_ratio',
      'avgPositiveRatio',
    ]),
    topGenre: readString(rawData, ['top_genre', 'topGenre']) || null,
  }
}

function normalizeGenreStats(rawData: unknown): GenreStat[] {
  const rawList = unwrapList(rawData)

  const items = rawList
    .map((item) => {
      const genre = readString(item, ['genre', 'genres', 'category', 'name', 'label']) || 'Unknown'
      const gameCount = readOptionalNumber(item, ['game_count', 'gameCount', 'count', 'total']) ?? 0

      return {
        genre,
        label: formatGenreLabel(genre),
        gameCount,
        share: 0,
        avgPrice: readOptionalNumber(item, ['avg_price', 'avgPrice', 'average_price', 'averagePrice']),
        avgReviewCount: readOptionalNumber(item, [
          'avg_review_count',
          'avgReviewCount',
          'average_review_count',
          'averageReviewCount',
        ]),
        avgPositiveRatio: readOptionalNumber(item, [
          'avg_positive_ratio',
          'avgPositiveRatio',
          'average_positive_ratio',
          'averagePositiveRatio',
        ]),
      }
    })
    .filter((item) => item.gameCount > 0)
    .sort((a, b) => b.gameCount - a.gameCount)

  return ensureShare(items)
}

function normalizePriceBandStats(rawData: unknown): PriceBandStat[] {
  const rawList = unwrapList(rawData)

  const items = rawList
    .map((item) => {
      const priceBand =
        readString(item, ['price_band', 'priceBand', 'band', 'range', 'label', 'name']) || 'Unknown'
      const gameCount = readOptionalNumber(item, ['game_count', 'gameCount', 'count', 'total']) ?? 0

      return {
        priceBand,
        label: formatPriceBandLabel(priceBand),
        gameCount,
        share: 0,
        avgReviewCount: readOptionalNumber(item, [
          'avg_review_count',
          'avgReviewCount',
          'average_review_count',
          'averageReviewCount',
        ]),
        avgPositiveRatio: readOptionalNumber(item, [
          'avg_positive_ratio',
          'avgPositiveRatio',
          'average_positive_ratio',
          'averagePositiveRatio',
        ]),
      }
    })
    .filter((item) => item.gameCount > 0)
    .sort((a, b) => getPriceBandOrder(a.priceBand) - getPriceBandOrder(b.priceBand))

  return ensureShare(items)
}

function normalizePlatformStats(rawData: unknown): PlatformStat[] {
  const rawList = unwrapList(rawData)

  const items = rawList
    .map((item) => {
      const platform =
        readString(item, ['platform', 'platform_name', 'platformName', 'name', 'label']) || 'Unknown'
      const gameCount = readOptionalNumber(item, ['game_count', 'gameCount', 'count', 'total']) ?? 0

      return {
        platform,
        label: formatPlatformLabel(platform),
        gameCount,
        share: 0,
        avgPositiveRatio: readOptionalNumber(item, [
          'avg_positive_ratio',
          'avgPositiveRatio',
          'average_positive_ratio',
          'averagePositiveRatio',
        ]),
      }
    })
    .filter((item) => item.gameCount > 0)
    .sort((a, b) => b.gameCount - a.gameCount)

  return ensureShare(items)
}

function normalizeReleaseYearStats(rawData: unknown): ReleaseYearStat[] {
  const rawList = unwrapList(rawData)

  return rawList
    .map((item) => {
      const year =
        readOptionalNumber(item, ['release_year', 'releaseYear', 'year']) ??
        readOptionalNumber(item, ['period'])

      return {
        year: year ?? 0,
        gameCount: readOptionalNumber(item, ['game_count', 'gameCount', 'count', 'total']) ?? 0,
        avgReviewCount: readOptionalNumber(item, [
          'avg_review_count',
          'avgReviewCount',
          'average_review_count',
          'averageReviewCount',
        ]),
        avgPositiveRatio: readOptionalNumber(item, [
          'avg_positive_ratio',
          'avgPositiveRatio',
          'average_positive_ratio',
          'averagePositiveRatio',
        ]),
      }
    })
    .filter((item) => item.year > 0 && item.gameCount > 0)
    .sort((a, b) => a.year - b.year)
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

function calculateRegression(points: Array<{ price: number; positiveRatio: number }>):
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

function getScatterPointRadius(gameCount: number): number {
  if (gameCount >= 500) {
    return 7
  }

  if (gameCount >= 250) {
    return 6
  }

  if (gameCount >= 100) {
    return 5
  }

  if (gameCount >= 30) {
    return 4
  }

  return 3.4
}

function getPriceBandOrder(priceBand: string): number {
  const normalized = normalizeToken(priceBand)

  if (normalized.includes('free')) {
    return 0
  }

  if (normalized.includes('0 5000')) {
    return 1
  }

  if (normalized.includes('5000 15000')) {
    return 2
  }

  if (normalized.includes('15000 30000')) {
    return 3
  }

  if (normalized.includes('30000 50000')) {
    return 4
  }

  return 5
}

function formatPriceBandLabel(priceBand: string): string {
  const trimmed = priceBand.trim()
  const normalized = normalizeToken(trimmed)

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

  const normalizedGenre = normalizeToken(trimmedGenre)
  const koreanLabel = GENRE_LABEL_MAP[normalizedGenre]

  if (!koreanLabel) {
    return trimmedGenre
  }

  return `${koreanLabel} (${trimmedGenre})`
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

  if (normalized.includes('mac')) {
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

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }

  return Math.round(value).toLocaleString('ko-KR')
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

function normalizeToken(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9가-힣]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export default MarketDistributionPage
