import { useEffect, useMemo, useState } from 'react'
import './App.css'
import ReviewPage from './ReviewPage'
import {
  getCorrelationAnalysis,
  getDashboardSummary,
  getGames,
  getSentimentAnalysis,
  getTopicAnalysis,
  type CorrelationResult,
  type DashboardSummary,
  type Game,
  type SentimentAnalysis,
  type TopicAnalysis,
} from './api'

type PageType = 'home' | 'review'

type HomeGameView = {
  rank: number
  id: string
  name: string
  genre: string
  score: string
  image?: string
}

type TopicView = {
  label: string
  value: number
}

type InsightView = {
  item1: string
  item2: string
  correlation: number
  insight: string
}

function App() {
  const [activePage, setActivePage] = useState<PageType>('home')
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [games, setGames] = useState<Game[]>([])
  const [sentiment, setSentiment] = useState<SentimentAnalysis | null>(null)
  const [topics, setTopics] = useState<TopicAnalysis[]>([])
  const [correlations, setCorrelations] = useState<CorrelationResult[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true)
        setErrorMessage('')

        const [
          summaryResult,
          gamesResult,
          sentimentResult,
          topicsResult,
          correlationResult,
        ] = await Promise.allSettled([
          getDashboardSummary(),
          getGames(),
          getSentimentAnalysis(),
          getTopicAnalysis(),
          getCorrelationAnalysis(),
        ])

        if (summaryResult.status === 'fulfilled') {
          setSummary(summaryResult.value)
        }

        if (gamesResult.status === 'fulfilled' && Array.isArray(gamesResult.value)) {
          setGames(gamesResult.value)
        }

        if (sentimentResult.status === 'fulfilled') {
          setSentiment(sentimentResult.value)
        }

        if (topicsResult.status === 'fulfilled' && Array.isArray(topicsResult.value)) {
          setTopics(topicsResult.value)
        }

        if (
          correlationResult.status === 'fulfilled' &&
          Array.isArray(correlationResult.value)
        ) {
          setCorrelations(correlationResult.value)
        }
      } catch (error) {
        console.error(error)
        setErrorMessage('백엔드 데이터를 불러오지 못했습니다.')
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [])

  const totalGames = formatNumber(
    readNumber(summary, ['total_games', 'totalGames', 'game_count']) || games.length,
  )

  const totalReviews = formatNumber(
    readNumber(summary, ['total_reviews', 'totalReviews', 'review_count']) ||
      sumTotalReviews(games),
  )

  const positiveRate = formatPercent(
    readNumber(summary, [
      'average_positive_rate',
      'positive_rate',
      'positiveRate',
    ]) || sentiment?.positive_ratio,
  )

  const topGenre =
    readString(summary, ['top_genre', 'topGenre', 'representative_genre']) ||
    findTopGenre(games)

  const topGames = useMemo(() => {
    return normalizeHomeTopGames(games).slice(0, 5)
  }, [games])

  const sentimentValues = normalizeSentiment(sentiment)

  const topicList = useMemo(() => {
    return normalizeTopics(topics)
  }, [topics])

  const insightList = useMemo(() => {
    return normalizeCorrelations(correlations).slice(0, 5)
  }, [correlations])

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-brand large-brand">
          <img src="/hidden-coders-logo.png" alt="Hidden Coders Logo" />
        </div>

        <nav className="sidebar-nav">
          <button
            className={activePage === 'home' ? 'active' : ''}
            onClick={() => setActivePage('home')}
          >
            홈
          </button>

          <button
            className={activePage === 'review' ? 'active' : ''}
            onClick={() => setActivePage('review')}
          >
            리뷰
          </button>

          <button>게임 순위</button>
          <button>인기 그래프</button>
          <button>이용객 분포</button>
          <button>설정</button>
        </nav>
      </aside>

      <main className="main">
        {activePage === 'review' ? (
          <ReviewPage />
        ) : (
          <>
            {loading && (
              <section className="status-card">
                <strong>데이터를 불러오는 중입니다...</strong>
                <p>백엔드 API에서 대시보드 데이터를 가져오고 있습니다.</p>
              </section>
            )}

            {!loading && errorMessage && (
              <section className="status-card error">
                <strong>데이터 로드 실패</strong>
                <p>{errorMessage}</p>
              </section>
            )}

            {!loading && !errorMessage && (
              <>
                <section className="summary-grid">
                  <SummaryCard title="총 게임 수" value={totalGames} icon="🎮" />
                  <SummaryCard title="총 리뷰 수" value={totalReviews} icon="💬" />
                  <SummaryCard
                    title="평균 긍정 비율"
                    value={positiveRate}
                    icon="📈"
                  />
                  <SummaryCard title="대표 장르" value={topGenre} icon="🏆" />
                </section>

                <section className="content-grid">
                  <div className="card">
                    <h2>인기 게임 TOP 5</h2>

                    {topGames.length > 0 ? (
                      <div className="top-list">
                        {topGames.map((game) => (
                          <div className="top-item" key={game.id}>
                            <div className="top-rank">{game.rank}</div>

                            <div className="top-thumb">
                              {game.image ? (
                                <img src={game.image} alt={`${game.name} 이미지`} />
                              ) : (
                                <div className="thumb-fallback">
                                  {game.name.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                            </div>

                            <div className="top-info">
                              <strong>{game.name}</strong>
                              <span>{game.genre}</span>
                            </div>

                            <div className="top-score">{game.score}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyText text="게임 데이터가 없습니다." />
                    )}
                  </div>

                  <div className="card">
                    <h2>감성 요약</h2>

                    <div className="sentiment-wrap">
                      <div
                        className="donut-chart"
                        style={{
                          background: `conic-gradient(
                            var(--green) 0% ${sentimentValues.positive}%,
                            var(--gray) ${sentimentValues.positive}% ${
                              sentimentValues.positive + sentimentValues.neutral
                            }%,
                            var(--red) ${
                              sentimentValues.positive + sentimentValues.neutral
                            }% 100%
                          )`,
                        }}
                      >
                        <div className="donut-inner">
                          <strong>{sentimentValues.positive.toFixed(1)}%</strong>
                          <span>긍정</span>
                        </div>
                      </div>

                      <div className="legend">
                        <div>
                          <span className="dot green" />
                          <p>긍정</p>
                          <strong>{sentimentValues.positive.toFixed(1)}%</strong>
                        </div>
                        <div>
                          <span className="dot gray" />
                          <p>중립</p>
                          <strong>{sentimentValues.neutral.toFixed(1)}%</strong>
                        </div>
                        <div>
                          <span className="dot red" />
                          <p>부정</p>
                          <strong>{sentimentValues.negative.toFixed(1)}%</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <h2>주요 토픽 TOP 5</h2>

                    {topicList.length > 0 ? (
                      <div className="topic-list">
                        {topicList.map((topic) => (
                          <div className="topic-item" key={topic.label}>
                            <div className="topic-header">
                              <span>{topic.label}</span>
                              <strong>{topic.value.toFixed(1)}%</strong>
                            </div>
                            <div className="topic-bar">
                              <div
                                className="topic-fill"
                                style={{ width: `${Math.min(topic.value, 100)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyText text="토픽 데이터가 없습니다." />
                    )}
                  </div>
                </section>

                <section className="card insight-card">
                  <h2>상관관계 인사이트</h2>

                  {insightList.length > 0 ? (
                    <div className="insight-table-wrap">
                      <table className="insight-table">
                        <thead>
                          <tr>
                            <th>항목 1</th>
                            <th>항목 2</th>
                            <th>상관계수</th>
                            <th>인사이트</th>
                          </tr>
                        </thead>

                        <tbody>
                          {insightList.map((item, index) => (
                            <tr key={`${item.item1}-${item.item2}-${index}`}>
                              <td>
                                <span className="insight-label">{item.item1}</span>
                              </td>
                              <td>
                                <span className="insight-label">{item.item2}</span>
                              </td>
                              <td>
                                <span
                                  className={getCorrelationClassName(item.correlation)}
                                >
                                  {item.correlation.toFixed(2)}
                                </span>
                              </td>
                              <td>
                                <span className="insight-desc">{item.insight}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <EmptyText text="상관관계 데이터가 없습니다." />
                  )}
                </section>
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}

function SummaryCard({
  title,
  value,
  icon,
}: {
  title: string
  value: string
  icon: string
}) {
  return (
    <div className="summary-card">
      <div className="summary-head">
        <span>{title}</span>
        <em>{icon}</em>
      </div>
      <strong>{value}</strong>
    </div>
  )
}

function EmptyText({ text }: { text: string }) {
  return <p className="empty-text">{text}</p>
}

function normalizeHomeTopGames(games: Game[]): HomeGameView[] {
  return [...games]
    .filter((game) => getTotalReviews(game) > 0)
    .sort((a, b) => getTotalReviews(b) - getTotalReviews(a))
    .map((game, index) => {
      const appId = getGameId(game)
      const positiveRate = getPositiveRate(game)

      return {
        rank: index + 1,
        id: String(appId ?? index),
        name: getGameName(game),
        genre: getGameGenre(game),
        score: `${positiveRate.toFixed(1)}%`,
        image: appId
          ? `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/capsule_184x69.jpg`
          : undefined,
      }
    })
}

function normalizeSentiment(sentiment: SentimentAnalysis | null) {
  if (!sentiment) {
    return { positive: 0, neutral: 0, negative: 0 }
  }

  const positive = normalizeRatio(sentiment.positive_ratio)
  const neutral = normalizeRatio(sentiment.neutral_ratio)
  const negative = normalizeRatio(sentiment.negative_ratio)

  return { positive, neutral, negative }
}

function normalizeTopics(topics: TopicAnalysis[]): TopicView[] {
  return topics
    .map((topic) => ({
      label: getTopicKoreanLabel(topic),
      value: normalizeRatio(topic.weight_percent ?? topic.weight),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
}

function normalizeCorrelations(items: CorrelationResult[]): InsightView[] {
  return items
    .map((item) => {
      const item1 = formatMetricName(
        item.feature_x ?? item.item1 ?? item.x ?? item.variable_1,
      )
      const item2 = formatMetricName(
        item.feature_y ?? item.item2 ?? item.y ?? item.variable_2,
      )
      const correlation = toNumber(
        item.correlation_value ??
          item.correlation ??
          item.correlation_coefficient ??
          item.coefficient ??
          item.value,
      )

      return {
        item1,
        item2,
        correlation,
        insight: createCorrelationInsight(item1, item2, correlation),
      }
    })
    .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
}

function getTopicKoreanLabel(topic: TopicAnalysis) {
  const topicId = Number(topic.topic_id)

  const topicIdMap: Record<number, string> = {
    0: '스토리·전투',
    1: '상점/기타',
    2: '게임플레이',
    3: '플레이 시간',
    4: '협동/재미',
  }

  if (topicIdMap[topicId]) {
    return topicIdMap[topicId]
  }

  const keywords = Array.isArray(topic.keywords) ? topic.keywords.join(' ') : ''
  return keywords.includes('story') ? '스토리' : '게임플레이'
}

function createCorrelationInsight(
  item1: string,
  item2: string,
  correlation: number,
) {
  const strength = getCorrelationStrength(correlation)

  if (correlation > 0) {
    return `${item1}와 ${item2}는 함께 증가하는 경향이 ${strength} 수준입니다.`
  }

  if (correlation < 0) {
    return `${item1}와 ${item2}는 반대로 움직이는 경향이 ${strength} 수준입니다.`
  }

  return `${item1}와 ${item2} 사이의 뚜렷한 관계는 확인되지 않습니다.`
}

function getCorrelationStrength(correlation: number) {
  const absValue = Math.abs(correlation)

  if (absValue >= 0.8) return '매우 강함'
  if (absValue >= 0.6) return '강함'
  if (absValue >= 0.4) return '보통'
  if (absValue >= 0.2) return '약함'
  return '매우 약함'
}

function getCorrelationClassName(correlation: number) {
  if (Math.abs(correlation) < 0.1) return 'correlation-value neutral'
  return correlation > 0 ? 'correlation-value positive' : 'correlation-value negative'
}

function formatMetricName(value: unknown) {
  const raw = String(value ?? '').trim()
  const lower = raw.toLowerCase()

  const map: Record<string, string> = {
    price: '가격',
    is_free: '무료 여부',
    review_count: '리뷰 수',
    owners_value: '보유자 수',
    popularity_score: '인기도',
    popularity_rank_percent: '인기 순위 비율',
    sentiment_positive_ratio: '긍정 리뷰 비율',
    sentiment_negative_ratio: '부정 리뷰 비율',
    sentiment_neutral_ratio: '중립 리뷰 비율',
    sentiment_compound_mean: '종합 감성 점수',
  }

  if (map[lower]) return map[lower]

  if (lower.startsWith('genre::')) {
    return `${raw.replace(/^genre::/i, '')} 장르`
  }

  return raw || '항목'
}

function sumTotalReviews(games: Game[]) {
  return games.reduce((sum, game) => sum + getTotalReviews(game), 0)
}

function findTopGenre(games: Game[]) {
  const countMap = new Map<string, number>()

  games.forEach((game) => {
    const genre = getGameGenre(game)
    if (!genre || genre === '장르 정보 없음') return

    genre.split(',').forEach((item) => {
      const trimmed = item.trim()
      if (!trimmed) return
      countMap.set(trimmed, (countMap.get(trimmed) ?? 0) + 1)
    })
  })

  return [...countMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '-'
}

function getGameId(game: Game) {
  return game.game_id ?? game.id ?? game.app_id ?? game.appid ?? game.steam_appid
}

function getGameName(game: Game) {
  return String(game.name ?? game.title ?? '이름 없음')
}

function getGameGenre(game: Game) {
  if (Array.isArray(game.genres)) return game.genres.join(', ')
  return String(game.genre ?? game.genres ?? '장르 정보 없음')
}

function getTotalReviews(game: Game) {
  return toNumber(game.positive_reviews) + toNumber(game.negative_reviews)
}

function getPositiveRate(game: Game) {
  const total = getTotalReviews(game)
  if (total <= 0) return 0
  return (toNumber(game.positive_reviews) / total) * 100
}

function readNumber(value: unknown, keys: string[]) {
  if (!value || typeof value !== 'object') return 0
  const record = value as Record<string, unknown>

  for (const key of keys) {
    const number = toNumber(record[key])
    if (number > 0) return number
  }

  return 0
}

function readString(value: unknown, keys: string[]) {
  if (!value || typeof value !== 'object') return ''
  const record = value as Record<string, unknown>

  for (const key of keys) {
    const item = record[key]
    if (typeof item === 'string' && item.trim()) return item
  }

  return ''
}

function toNumber(value: unknown) {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = Number(value.replaceAll(',', '').replace('%', ''))
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function normalizeRatio(value: unknown) {
  const number = toNumber(value)
  if (number > 0 && number <= 1) return number * 100
  return number
}

function formatNumber(value: unknown) {
  const number = toNumber(value)
  if (!number) return '-'
  return number.toLocaleString()
}

function formatPercent(value: unknown) {
  const number = normalizeRatio(value)
  if (!number) return '-'
  return `${number.toFixed(1)}%`
}

export default App
