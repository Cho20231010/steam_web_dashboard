import { useEffect, useMemo, useState } from 'react'
import './HomePage.css'
import {
  getCorrelationAnalysis,
  getDashboardSummary,
  getGameRankings,
  getGenreStats,
  getPriceReview,
  type CorrelationResult,
  type DashboardSummary,
  type Game,
  type GenreStat,
  type PriceReviewPoint,
} from './api'

type HomeTopGame = {
  rank: number
  id: string
  name: string
  image?: string
  genre: string
  price: string
  positiveRate: number
  reviewCount: number
}

type GenreView = {
  name: string
  ratio: number
  count: number
}

type BubblePoint = {
  id: string
  name: string
  price: number
  reviewCount: number
  positiveRate: number
  size: number
  x: number
  y: number
}

type InsightView = {
  title: string
  description: string
  icon: string
  tone: 'blue' | 'green' | 'purple' | 'teal'
}

function HomePage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [rankingGames, setRankingGames] = useState<Game[]>([])
  const [genreStats, setGenreStats] = useState<GenreStat[]>([])
  const [priceReview, setPriceReview] = useState<PriceReviewPoint[]>([])
  const [correlations, setCorrelations] = useState<CorrelationResult[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function loadHomeData() {
      try {
        setLoading(true)
        setErrorMessage('')

        const [
          summaryResult,
          rankingResult,
          genreStatsResult,
          priceReviewResult,
          correlationResult,
        ] = await Promise.allSettled([
          getDashboardSummary(),
          getGameRankings(),
          getGenreStats(),
          getPriceReview(),
          getCorrelationAnalysis(),
        ])

        if (summaryResult.status === 'fulfilled') {
          setSummary(summaryResult.value)
        }

        if (rankingResult.status === 'fulfilled') {
          setRankingGames(rankingResult.value)
        }

        if (genreStatsResult.status === 'fulfilled') {
          setGenreStats(genreStatsResult.value)
        }

        if (priceReviewResult.status === 'fulfilled') {
          setPriceReview(priceReviewResult.value)
        }

        if (correlationResult.status === 'fulfilled') {
          setCorrelations(correlationResult.value)
        }
      } catch (error) {
        console.error(error)
        setErrorMessage('홈 화면 데이터를 불러오지 못했습니다.')
      } finally {
        setLoading(false)
      }
    }

    loadHomeData()
  }, [])

  const topGames = useMemo(() => {
    return normalizeTopGames(rankingGames).slice(0, 10)
  }, [rankingGames])

  const normalizedGenres = useMemo(() => {
    return normalizeGenres(genreStats, rankingGames).slice(0, 8)
  }, [genreStats, rankingGames])

  const bubblePoints = useMemo(() => {
    return normalizeBubblePoints(priceReview, rankingGames).slice(0, 35)
  }, [priceReview, rankingGames])

  const totalGames =
    readNumber(summary, ['total_games', 'game_count']) || rankingGames.length

  const totalReviews =
    readNumber(summary, ['total_reviews', 'review_count']) ||
    rankingGames.reduce((sum, game) => sum + getReliableReviewCount(game), 0)

  const averagePositiveRate =
    normalizeRatio(
      readNumber(summary, ['average_positive_rate', 'positive_rate']),
    ) || calculateAveragePositiveRate(rankingGames)

  const averagePrice =
    normalizePrice(readNumber(summary, ['average_price', 'average_price_usd'])) ||
    calculateAveragePrice(rankingGames)

  const insightList = useMemo(() => {
    return createInsightList({
      totalReviews,
      averagePositiveRate,
      averagePrice,
      genres: normalizedGenres,
      correlations,
    })
  }, [totalReviews, averagePositiveRate, averagePrice, normalizedGenres, correlations])

  if (loading) {
    return (
      <section className="status-card">
        <strong>홈 화면 데이터를 불러오는 중입니다...</strong>
        <p>백엔드 API에서 메인 트렌드 데이터를 가져오고 있습니다.</p>
      </section>
    )
  }

  if (errorMessage) {
    return (
      <section className="status-card error">
        <strong>데이터 로드 실패</strong>
        <p>{errorMessage}</p>
      </section>
    )
  }

  return (
    <div className="home-page">
      <header className="home-header">
        <div>
          <h1>메인 트렌드 대시보드</h1>
          <p>시장 전체의 핵심 지표와 주요 트렌드를 한눈에 파악할 수 있는 메인 화면</p>
        </div>

        <button className="home-export-button" type="button">
          내보내기
        </button>
      </header>

      <section className="home-summary-grid">
        <MetricCard
          title="전체 분석 게임 수"
          value={formatNumber(totalGames)}
          change="전체 게임 데이터 기준"
          icon="🎮"
          trend="up"
        />

        <MetricCard
          title="전체 리뷰 수"
          value={formatNumber(totalReviews)}
          change="긍정/부정 리뷰 합산"
          icon="💬"
          trend="up"
        />

        <MetricCard
          title="평균 긍정비율"
          value={`${averagePositiveRate.toFixed(1)}%`}
          change="게임별 긍정 비율 평균"
          icon="👍"
          trend="up"
        />

        <MetricCard
          title="평균 가격(USD)"
          value={`$${averagePrice.toFixed(2)}`}
          change="무료 게임 제외 평균"
          icon="🏷️"
          trend="down"
        />
      </section>

      <section className="home-dashboard-grid">
        <article className="home-card home-top-card">
          <div className="home-card-header">
            <div>
              <h2>인기 게임 TOP 10</h2>
              <p>리뷰 수와 긍정 비율을 기준으로 상위 게임을 확인합니다.</p>
            </div>
            <button type="button">더보기 →</button>
          </div>

          <div className="home-top-table">
            <div className="home-top-table-head">
              <span>순위</span>
              <span>게임</span>
              <span>가격</span>
              <span>긍정 비율</span>
            </div>

            {topGames.map((game) => (
              <div className="home-top-row" key={game.id}>
                <span className="home-top-rank">{game.rank}</span>

                <div className="home-top-game">
                  {game.image ? (
                    <img src={game.image} alt={`${game.name} 이미지`} />
                  ) : (
                    <div className="home-image-fallback">
                      {game.name.slice(0, 2)}
                    </div>
                  )}

                  <div>
                    <strong>{game.name}</strong>
                    <p>{game.genre}</p>
                  </div>
                </div>

                <span className="home-price">{game.price}</span>

                <div className="home-rate-cell">
                  <strong>{game.positiveRate.toFixed(1)}%</strong>
                  <div className="home-rate-bar">
                    <span style={{ width: `${Math.min(game.positiveRate, 100)}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="home-card home-genre-card">
          <div className="home-card-header">
            <div>
              <h2>장르별 비중</h2>
              <p>시장 내 주요 장르 분포를 확인합니다.</p>
            </div>
          </div>

          <div className="home-genre-content">
            <div
              className="home-genre-donut"
              style={{ background: createGenreGradient(normalizedGenres) }}
            >
              <div>
                <span>전체</span>
                <strong>{formatNumber(totalGames)}</strong>
                <em>게임</em>
              </div>
            </div>

            <div className="home-genre-list">
              {normalizedGenres.map((genre, index) => (
                <div className="home-genre-row" key={genre.name}>
                  <span className={`home-genre-dot genre-color-${index + 1}`} />
                  <p>{genre.name}</p>
                  <strong>{genre.ratio.toFixed(1)}%</strong>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="home-card home-bubble-card">
          <div className="home-card-header">
            <div>
              <h2>가격 vs 인기</h2>
              <p>가격과 리뷰 수, 긍정 비율의 관계를 비교합니다.</p>
            </div>

            <select aria-label="버블 크기 기준">
              <option>버블 크기: 리뷰 수</option>
              <option>버블 크기: 긍정 비율</option>
            </select>
          </div>

          <div className="home-bubble-chart">
            <div className="home-bubble-y-label">긍정 비율</div>

            {bubblePoints.map((point) => (
              <span
                key={point.id}
                className="home-bubble-point"
                title={`${point.name} / $${point.price.toFixed(
                  2,
                )} / ${point.positiveRate.toFixed(1)}%`}
                style={{
                  left: `${point.x}%`,
                  bottom: `${point.y}%`,
                  width: `${point.size}px`,
                  height: `${point.size}px`,
                }}
              />
            ))}

            <div className="home-bubble-grid-line line-25" />
            <div className="home-bubble-grid-line line-50" />
            <div className="home-bubble-grid-line line-75" />

            <div className="home-bubble-x-label">가격(USD)</div>
          </div>
        </article>
      </section>

      <section className="home-insight-card">
        <div className="home-card-header">
          <div>
            <h2>핵심 인사이트</h2>
            <p>현재 API 데이터에서 확인할 수 있는 주요 해석입니다.</p>
          </div>
        </div>

        <div className="home-insight-grid">
          {insightList.map((insight) => (
            <div className={`home-insight-item ${insight.tone}`} key={insight.title}>
              <div className="home-insight-icon">{insight.icon}</div>
              <div>
                <strong>{insight.title}</strong>
                <p>{insight.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function MetricCard({
  title,
  value,
  change,
  icon,
  trend,
}: {
  title: string
  value: string
  change: string
  icon: string
  trend: 'up' | 'down'
}) {
  return (
    <article className="home-metric-card">
      <div>
        <span>{title}</span>
        <strong>{value}</strong>
        <p className={trend === 'up' ? 'metric-up' : 'metric-down'}>{change}</p>
      </div>
      <em>{icon}</em>
    </article>
  )
}

function normalizeTopGames(games: Game[]): HomeTopGame[] {
  return [...games]
    .filter((game) => getReliableReviewCount(game) > 0)
    .sort((a, b) => getReliableReviewCount(b) - getReliableReviewCount(a))
    .map((game, index) => {
      const id = String(getGameId(game) ?? index)
      const price = getPrice(game)

      return {
        rank: index + 1,
        id,
        name: getGameName(game),
        image: getGameImage(game),
        genre: getPrimaryGenre(game),
        price: game.is_free || price <= 0 ? '무료' : `$${price.toFixed(2)}`,
        positiveRate: getPositiveRate(game),
        reviewCount: getReliableReviewCount(game),
      }
    })
}

function normalizeGenres(genreStats: GenreStat[], games: Game[]): GenreView[] {
  if (genreStats.length > 0) {
    const totalCount = genreStats.reduce((sum, item) => {
      return sum + toNumber(item.count ?? item.game_count)
    }, 0)

    return genreStats
      .map((item) => {
        const count = toNumber(item.count ?? item.game_count)
        const ratio =
          normalizeRatio(item.ratio ?? item.percent ?? item.percentage) ||
          (totalCount > 0 ? (count / totalCount) * 100 : 0)

        return {
          name: String(item.genre ?? item.name ?? '기타'),
          count,
          ratio,
        }
      })
      .filter((item) => item.ratio > 0)
      .sort((a, b) => b.ratio - a.ratio)
  }

  const map = new Map<string, number>()

  games.forEach((game) => {
    const genre = getPrimaryGenre(game)
    if (!genre || genre === '장르 없음') return
    map.set(genre, (map.get(genre) ?? 0) + 1)
  })

  const total = [...map.values()].reduce((sum, count) => sum + count, 0)

  return [...map.entries()]
    .map(([name, count]) => ({
      name,
      count,
      ratio: total > 0 ? (count / total) * 100 : 0,
    }))
    .sort((a, b) => b.ratio - a.ratio)
}

function normalizeBubblePoints(
  priceReview: PriceReviewPoint[],
  rankingGames: Game[],
): BubblePoint[] {
  const source =
    priceReview.length > 0
      ? priceReview.map((item) => ({
          id: String(item.game_id ?? item.name ?? item.game_name),
          name: String(item.name ?? item.game_name ?? '게임'),
          price: normalizePrice(item.price ?? item.price_usd),
          reviewCount: toNumber(item.review_count ?? item.total_reviews),
          positiveRate:
            normalizeRatio(item.positive_ratio) ||
            calculatePositiveRateFromCounts(
              item.positive_reviews,
              item.negative_reviews,
            ),
        }))
      : rankingGames.map((game) => ({
          id: String(getGameId(game)),
          name: getGameName(game),
          price: getPrice(game),
          reviewCount: getReliableReviewCount(game),
          positiveRate: getPositiveRate(game),
        }))

  const filtered = source.filter((item) => item.reviewCount > 0)

  const maxPrice = Math.max(...filtered.map((item) => item.price), 1)
  const maxReviewCount = Math.max(...filtered.map((item) => item.reviewCount), 1)

  return filtered.map((item, index) => ({
    ...item,
    x: Math.min(88, Math.max(6, (item.price / maxPrice) * 86)),
    y: Math.min(88, Math.max(8, item.positiveRate * 0.82)),
    size: Math.min(38, Math.max(10, 10 + (item.reviewCount / maxReviewCount) * 28)),
    id: item.id || String(index),
  }))
}

function createInsightList({
  totalReviews,
  averagePositiveRate,
  averagePrice,
  genres,
  correlations,
}: {
  totalReviews: number
  averagePositiveRate: number
  averagePrice: number
  genres: GenreView[]
  correlations: CorrelationResult[]
}): InsightView[] {
  const topGenre = genres[0]?.name ?? '주요 장르'
  const topGenreRatio = genres[0]?.ratio ?? 0
  const correlation = normalizeCorrelation(correlations)[0]

  return [
    {
      title: '리뷰 규모 확인',
      description: `현재 분석 리뷰 수는 약 ${formatNumber(
        totalReviews,
      )}건으로, 시장 반응을 비교하기에 충분한 규모입니다.`,
      icon: '📈',
      tone: 'blue',
    },
    {
      title: '긍정 비율 흐름',
      description: `평균 긍정 비율은 ${averagePositiveRate.toFixed(
        1,
      )}%로, 전반적인 사용자 만족도를 핵심 지표로 활용할 수 있습니다.`,
      icon: '👍',
      tone: 'green',
    },
    {
      title: `${topGenre} 장르 강세`,
      description: `${topGenre} 장르가 전체의 ${topGenreRatio.toFixed(
        1,
      )}%를 차지해 주요 분석 축으로 활용하기 좋습니다.`,
      icon: '🎮',
      tone: 'purple',
    },
    {
      title: '가격 대비 인기도',
      description: correlation
        ? `${correlation.item1}와 ${correlation.item2}의 관계를 통해 가격과 사용자 반응의 연결성을 해석할 수 있습니다.`
        : `평균 가격은 $${averagePrice.toFixed(
            2,
          )}이며, 가격대별 리뷰 반응을 비교할 수 있습니다.`,
      icon: '🏷️',
      tone: 'teal',
    },
  ]
}

function normalizeCorrelation(items: CorrelationResult[]) {
  return items
    .map((item) => {
      const item1 = formatMetricName(
        item.feature_x ?? item.item1 ?? item.x ?? item.variable_1,
      )
      const item2 = formatMetricName(
        item.feature_y ?? item.item2 ?? item.y ?? item.variable_2,
      )
      const value = toNumber(
        item.correlation ??
          item.correlation_value ??
          item.correlation_coefficient ??
          item.coefficient ??
          item.value,
      )

      return { item1, item2, value }
    })
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
}

function createGenreGradient(genres: GenreView[]) {
  if (genres.length === 0) {
    return 'conic-gradient(#e5e7eb 0% 100%)'
  }

  const colors = [
    '#536dfe',
    '#32a8e8',
    '#45c486',
    '#8b5cf6',
    '#f97316',
    '#f43f5e',
    '#94a3b8',
    '#d1d5db',
  ]

  let start = 0

  const parts = genres.map((genre, index) => {
    const end = start + genre.ratio
    const color = colors[index % colors.length]
    const part = `${color} ${start}% ${end}%`
    start = end
    return part
  })

  if (start < 100) {
    parts.push(`#e5e7eb ${start}% 100%`)
  }

  return `conic-gradient(${parts.join(', ')})`
}

function calculateAveragePositiveRate(games: Game[]) {
  const validGames = games.filter((game) => getReliableReviewCount(game) > 0)

  if (validGames.length === 0) {
    return 0
  }

  const total = validGames.reduce((sum, game) => sum + getPositiveRate(game), 0)

  return total / validGames.length
}

function calculateAveragePrice(games: Game[]) {
  const pricedGames = games.filter((game) => getPrice(game) > 0)

  if (pricedGames.length === 0) {
    return 0
  }

  const total = pricedGames.reduce((sum, game) => sum + getPrice(game), 0)

  return total / pricedGames.length
}

function calculatePositiveRateFromCounts(
  positiveValue: unknown,
  negativeValue: unknown,
) {
  const positive = toNumber(positiveValue)
  const negative = toNumber(negativeValue)
  const total = positive + negative

  if (total <= 0) {
    return 0
  }

  return (positive / total) * 100
}

function getGameId(game: Game) {
  return game.game_id ?? game.id ?? game.app_id ?? game.appid ?? game.steam_appid
}

function getGameName(game: Game) {
  return String(game.name ?? game.title ?? '이름 없음')
}

function getGameImage(game: Game) {
  if (typeof game.capsule_image === 'string' && game.capsule_image) {
    return game.capsule_image
  }

  if (typeof game.header_image === 'string' && game.header_image) {
    return game.header_image
  }

  const gameId = getGameId(game)

  if (!gameId) {
    return undefined
  }

  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${gameId}/capsule_184x69.jpg`
}

function getPrimaryGenre(game: Game) {
  const raw = Array.isArray(game.genres)
    ? game.genres.join(',')
    : String(game.genre ?? game.genres ?? '')

  if (!raw.trim()) {
    return '장르 없음'
  }

  return raw.split(',')[0].trim()
}

function getReliableReviewCount(game: Game) {
  const positive = toNumber(game.positive_reviews)
  const negative = toNumber(game.negative_reviews)
  const fallback = toNumber(game.total_reviews ?? game.review_count)

  return positive + negative || fallback
}

function getPositiveRate(game: Game) {
  const positive = toNumber(game.positive_reviews)
  const negative = toNumber(game.negative_reviews)
  const total = positive + negative

  if (total > 0) {
    return (positive / total) * 100
  }

  return normalizeRatio(game.positive_ratio)
}

function getPrice(game: Game) {
  return normalizePrice(game.price ?? game.price_usd)
}

function normalizePrice(value: unknown) {
  const number = toNumber(value)

  if (number > 1000) {
    return number / 100
  }

  return number
}

function readNumber(value: unknown, keys: string[]) {
  if (!value || typeof value !== 'object') {
    return 0
  }

  const record = value as Record<string, unknown>

  for (const key of keys) {
    const number = toNumber(record[key])

    if (number > 0) {
      return number
    }
  }

  return 0
}

function toNumber(value: unknown) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }

  if (typeof value === 'string') {
    const parsed = Number(
      value.replaceAll(',', '').replace('%', '').replace('$', '').trim(),
    )

    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

function normalizeRatio(value: unknown) {
  const number = toNumber(value)

  if (number > 0 && number <= 1) {
    return number * 100
  }

  return number
}

function formatNumber(value: number) {
  return Math.round(value).toLocaleString()
}

function formatMetricName(value: unknown) {
  const raw = String(value ?? '').trim()
  const lower = raw.toLowerCase()

  const map: Record<string, string> = {
    price: '가격',
    price_usd: '가격',
    review_count: '리뷰 수',
    total_reviews: '리뷰 수',
    owners_value: '보유자 수',
    positive_ratio: '긍정 비율',
    sentiment_positive_ratio: '긍정 리뷰 비율',
    sentiment_negative_ratio: '부정 리뷰 비율',
  }

  if (map[lower]) {
    return map[lower]
  }

  if (lower.startsWith('genre::')) {
    return `${raw.replace(/^genre::/i, '')} 장르`
  }

  return raw || '항목'
}

export default HomePage
