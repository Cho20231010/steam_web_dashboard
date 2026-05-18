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
  id: string
  rank: number
  name: string
  genre: string
  price: string
  positiveRate: number
  reviewCount: number
  image?: string
}

type GenreView = {
  name: string
  count: number
  ratio: number
}

type BubbleView = {
  id: string
  name: string
  price: number
  reviewCount: number
  positiveRate: number
  x: number
  y: number
  size: number
}

type InsightView = {
  title: string
  description: string
  icon: string
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

  const genres = useMemo(() => {
    return normalizeGenres(genreStats, rankingGames).slice(0, 8)
  }, [genreStats, rankingGames])

  const bubbles = useMemo(() => {
    return normalizeBubbles(priceReview, rankingGames).slice(0, 26)
  }, [priceReview, rankingGames])

  const totalGames =
    readNumber(summary, ['total_games', 'totalGames', 'game_count']) ||
    rankingGames.length

  const totalReviews =
    readNumber(summary, ['total_reviews', 'totalReviews', 'review_count']) ||
    rankingGames.reduce((sum, game) => sum + getReliableReviewCount(game), 0)

  const averagePositiveRate =
    normalizeRatio(
      readNumber(summary, [
        'average_positive_rate',
        'positive_rate',
        'positiveRate',
      ]),
    ) || calculateAveragePositiveRate(rankingGames)

  const averagePrice =
    normalizePrice(
      readNumber(summary, ['average_price', 'average_price_usd']),
    ) || calculateAveragePrice(rankingGames)

  const insights = useMemo(() => {
    return createInsights({
      totalReviews,
      averagePositiveRate,
      averagePrice,
      genres,
      correlations,
    })
  }, [totalReviews, averagePositiveRate, averagePrice, genres, correlations])

  if (loading) {
    return (
      <section className="status-card">
        <strong>홈 화면 데이터를 불러오는 중입니다...</strong>
        <p>백엔드 API에서 메인 대시보드 데이터를 가져오고 있습니다.</p>
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
    <div className="home-page-v2">
      <header className="home-v2-header">
        <div>
          <h1>메인 트렌드 대시보드</h1>
          <p>시장 전체의 핵심 지표와 주요 트렌드를 한눈에 파악할 수 있는 메인 화면</p>
        </div>
      </header>

      <section className="home-v2-summary-grid">
        <MetricCard
          title="전체 분석 게임 수"
          value={formatNumber(totalGames)}
          description="전체 게임 데이터 기준"
          icon="🎮"
        />

        <MetricCard
          title="전체 리뷰 수"
          value={formatNumber(totalReviews)}
          description="긍정/부정 리뷰 합산"
          icon="💬"
        />

        <MetricCard
          title="평균 긍정비율"
          value={`${averagePositiveRate.toFixed(1)}%`}
          description="게임별 긍정 비율 평균"
          icon="👍"
        />

        <MetricCard
          title="평균 가격(USD)"
          value={`$${averagePrice.toFixed(2)}`}
          description="무료 게임 제외 평균"
          icon="🏷️"
        />
      </section>

      <section className="home-v2-main-grid">
        <article className="home-v2-card top-games-card">
          <div className="home-v2-card-header">
            <div>
              <h2>인기 게임 TOP 10</h2>
              <p>리뷰 수와 긍정 비율을 기준으로 상위 게임을 확인합니다.</p>
            </div>

            <button type="button">더보기 →</button>
          </div>

          <div className="home-v2-table">
            <div className="home-v2-table-head">
              <span>순위</span>
              <span>게임</span>
              <span>가격</span>
              <span>긍정 비율</span>
            </div>

            {topGames.length > 0 ? (
              topGames.map((game) => (
                <div className="home-v2-table-row" key={game.id}>
                  <span className="home-v2-rank">{game.rank}</span>

                  <div className="home-v2-game-cell">
                    <div className="home-v2-game-thumb">
                      {game.image ? (
                        <img src={game.image} alt={`${game.name} 이미지`} />
                      ) : (
                        <span>{game.name.slice(0, 2)}</span>
                      )}
                    </div>

                    <div className="home-v2-game-text">
                      <strong>{game.name}</strong>
                      <p>{game.genre}</p>
                    </div>
                  </div>

                  <span className="home-v2-price">{game.price}</span>

                  <div className="home-v2-rate-cell">
                    <strong>{game.positiveRate.toFixed(1)}%</strong>
                    <div>
                      <span
                        style={{
                          width: `${Math.min(game.positiveRate, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="home-v2-empty">표시할 게임 데이터가 없습니다.</p>
            )}
          </div>
        </article>

        <article className="home-v2-card genre-card">
          <div className="home-v2-card-header compact">
            <div>
              <h2>장르별 비중</h2>
              <p>시장 내 주요 장르 분포를 확인합니다.</p>
            </div>
          </div>

          <div className="home-v2-genre-layout">
            <div
              className="home-v2-donut"
              style={{ background: createGenreGradient(genres) }}
            >
              <div>
                <span>전체</span>
                <strong>{formatNumber(totalGames)}</strong>
                <em>게임</em>
              </div>
            </div>

            <div className="home-v2-genre-list">
              {genres.length > 0 ? (
                genres.map((genre, index) => (
                  <div className="home-v2-genre-row" key={genre.name}>
                    <span className={`genre-dot-${index + 1}`} />
                    <p>{genre.name}</p>
                    <strong>{genre.ratio.toFixed(1)}%</strong>
                  </div>
                ))
              ) : (
                <p className="home-v2-empty">장르 데이터가 없습니다.</p>
              )}
            </div>
          </div>
        </article>

        <article className="home-v2-card bubble-card">
          <div className="home-v2-card-header">
            <div>
              <h2>가격 vs 인기</h2>
              <p>가격과 리뷰 수, 긍정 비율의 관계를 비교합니다.</p>
            </div>

            <select aria-label="버블 크기 기준">
              <option>버블 크기: 리뷰 수</option>
              <option>버블 크기: 긍정 비율</option>
            </select>
          </div>

          <div className="home-v2-bubble-chart">
            <span className="bubble-label-y">긍정 비율</span>
            <span className="bubble-label-x">가격(USD)</span>

            {bubbles.length > 0 ? (
              bubbles.map((bubble) => (
                <span
                  className="home-v2-bubble"
                  key={bubble.id}
                  title={`${bubble.name} / $${bubble.price.toFixed(
                    2,
                  )} / ${bubble.positiveRate.toFixed(1)}%`}
                  style={{
                    left: `${bubble.x}%`,
                    bottom: `${bubble.y}%`,
                    width: `${bubble.size}px`,
                    height: `${bubble.size}px`,
                  }}
                />
              ))
            ) : (
              <p className="home-v2-empty chart-empty">
                가격-리뷰 데이터가 없습니다.
              </p>
            )}
          </div>
        </article>
      </section>

      <section className="home-v2-insight-card">
        <div className="home-v2-card-header">
          <div>
            <h2>핵심 인사이트</h2>
            <p>현재 API 데이터에서 확인할 수 있는 주요 해석입니다.</p>
          </div>
        </div>

        <div className="home-v2-insight-grid">
          {insights.map((insight) => (
            <div className="home-v2-insight-item" key={insight.title}>
              <div className="home-v2-insight-icon">{insight.icon}</div>
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
  description,
  icon,
}: {
  title: string
  value: string
  description: string
  icon: string
}) {
  return (
    <article className="home-v2-metric-card">
      <div>
        <span>{title}</span>
        <strong>{value}</strong>
        <p>{description}</p>
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
        id,
        rank: index + 1,
        name: getGameName(game),
        genre: getPrimaryGenre(game),
        price: game.is_free || price <= 0 ? '무료' : `$${price.toFixed(2)}`,
        positiveRate: getPositiveRate(game),
        reviewCount: getReliableReviewCount(game),
        image: getGameImage(game),
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

    if (!genre || genre === '장르 없음') {
      return
    }

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

function normalizeBubbles(
  priceReview: PriceReviewPoint[],
  games: Game[],
): BubbleView[] {
  const source =
    priceReview.length > 0
      ? priceReview.map((item, index) => {
          const positiveRate =
            normalizeRatio(item.positive_ratio) ||
            calculatePositiveRateFromCounts(
              item.positive_reviews,
              item.negative_reviews,
            )

          return {
            id: String(item.game_id ?? item.name ?? item.game_name ?? index),
            name: String(item.name ?? item.game_name ?? '게임'),
            price: normalizePrice(item.price ?? item.price_usd),
            reviewCount: toNumber(item.review_count ?? item.total_reviews),
            positiveRate,
          }
        })
      : games.map((game) => ({
          id: String(getGameId(game)),
          name: getGameName(game),
          price: getPrice(game),
          reviewCount: getReliableReviewCount(game),
          positiveRate: getPositiveRate(game),
        }))

  const filtered = source.filter((item) => item.reviewCount > 0)
  const maxPrice = Math.max(...filtered.map((item) => item.price), 1)
  const maxReview = Math.max(...filtered.map((item) => item.reviewCount), 1)

  return filtered.map((item, index) => ({
    ...item,
    id: item.id || String(index),
    x: Math.min(92, Math.max(8, (item.price / maxPrice) * 88)),
    y: Math.min(90, Math.max(8, item.positiveRate * 0.86)),
    size: Math.min(34, Math.max(10, 10 + (item.reviewCount / maxReview) * 24)),
  }))
}

function createInsights({
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
    },
    {
      title: '긍정 비율 흐름',
      description: `평균 긍정 비율은 ${averagePositiveRate.toFixed(
        1,
      )}%로, 전반적인 사용자 만족도를 핵심 지표로 활용할 수 있습니다.`,
      icon: '👍',
    },
    {
      title: `${topGenre} 장르 강세`,
      description: `${topGenre} 장르가 전체의 ${topGenreRatio.toFixed(
        1,
      )}%를 차지해 주요 분석 축으로 활용하기 좋습니다.`,
      icon: '🎮',
    },
    {
      title: '가격 대비 인기도',
      description: correlation
        ? `${correlation.item1}와 ${correlation.item2}의 관계를 통해 가격과 사용자 반응의 연결성을 해석할 수 있습니다.`
        : `평균 가격은 $${averagePrice.toFixed(
            2,
          )}이며, 가격대별 리뷰 반응을 비교할 수 있습니다.`,
      icon: '🏷️',
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
    '#6068f6',
    '#66a9e8',
    '#6fc486',
    '#8b63e8',
    '#f28b3c',
    '#df5d69',
    '#9ca3af',
    '#d1d5db',
  ]

  let start = 0

  const parts = genres.map((genre, index) => {
    const end = start + genre.ratio
    const part = `${colors[index % colors.length]} ${start}% ${end}%`
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

function getPrimaryGenre(game: Game) {
  const rawGenre = Array.isArray(game.genres)
    ? game.genres.join(',')
    : String(game.genre ?? game.genres ?? '')

  if (!rawGenre.trim()) {
    return '장르 없음'
  }

  return rawGenre.split(',')[0].trim()
}

function getGameImage(game: Game) {
  if (typeof game.capsule_image === 'string' && game.capsule_image) {
    return game.capsule_image
  }

  if (typeof game.header_image === 'string' && game.header_image) {
    return game.header_image
  }

  if (typeof game.image === 'string' && game.image) {
    return game.image
  }

  const gameId = getGameId(game)

  if (!gameId) {
    return undefined
  }

  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${gameId}/capsule_184x69.jpg`
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

function normalizeRatio(value: unknown) {
  const number = toNumber(value)

  if (number > 0 && number <= 1) {
    return number * 100
  }

  return number
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
    sentiment_compound_mean: '종합 감성 점수',
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
