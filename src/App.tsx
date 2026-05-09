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

type TopGameView = {
  rank: number
  id: string
  steamAppId?: string
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
  const [activePage, setActivePage] = useState<'home' | 'review'>('home')

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
          summaryData,
          gamesData,
          sentimentData,
          topicsData,
          correlationData,
        ] = await Promise.all([
          getDashboardSummary(),
          getGames(),
          getSentimentAnalysis(),
          getTopicAnalysis(),
          getCorrelationAnalysis(),
        ])

        setSummary(summaryData)
        setGames(Array.isArray(gamesData) ? gamesData : [])
        setSentiment(sentimentData)
        setTopics(Array.isArray(topicsData) ? topicsData : [])
        setCorrelations(Array.isArray(correlationData) ? correlationData : [])
      } catch (error) {
        console.error(error)
        setErrorMessage(
          '백엔드 데이터를 불러오지 못했습니다. API 주소 또는 CORS 설정을 확인해주세요.',
        )
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [])

  const topGames = useMemo(() => {
    return normalizeTopGames(games).slice(0, 5)
  }, [games])

  const topicList = useMemo(() => {
    return normalizeTopics(topics).slice(0, 5)
  }, [topics])

  const insightList = useMemo(() => {
    return normalizeCorrelations(correlations).slice(0, 5)
  }, [correlations])

  const totalGames = formatNumber(
    summary?.total_games ??
      summary?.totalGames ??
      summary?.game_count ??
      games.length,
  )

  const totalReviews = formatNumber(
    summary?.total_reviews ??
      summary?.totalReviews ??
      summary?.review_count ??
      sumReviewCount(games),
  )

  const positiveRate = formatPercent(
    summary?.average_positive_rate ??
      summary?.positive_rate ??
      summary?.positiveRate ??
      sentiment?.positive_ratio ??
      sentiment?.positiveRate ??
      sentiment?.positive,
  )

  const topGenre =
    summary?.top_genre ??
    summary?.topGenre ??
    summary?.representative_genre ??
    findTopGenre(games)

  const sentimentValues = normalizeSentiment(sentiment)

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
              <SummaryCard title="평균 긍정 비율" value={positiveRate} icon="📈" />
              <SummaryCard title="대표 장르" value={topGenre} icon="🏆" />
            </section>

            <section className="content-grid">
              <div className="card">
                <h2>인기 게임 TOP 5</h2>

                {topGames.length > 0 ? (
                  <div className="top-list">
                    {topGames.map((game) => (
                      <div className="top-item" key={`${game.rank}-${game.id}`}>
                        <div className="top-rank">{game.rank}</div>

                        <GameThumbnail game={game} />

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
                    <colgroup>
                      <col className="col-item" />
                      <col className="col-item" />
                      <col className="col-correlation" />
                      <col className="col-insight" />
                    </colgroup>

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
                            <span className={getCorrelationClassName(item.correlation)}>
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

function GameThumbnail({ game }: { game: TopGameView }) {
  const [imageSrc, setImageSrc] = useState(game.image ?? '')
  const [isBroken, setIsBroken] = useState(!game.image)

  useEffect(() => {
    setImageSrc(game.image ?? '')
    setIsBroken(!game.image)
  }, [game.image])

  if (!imageSrc || isBroken) {
    return (
      <div className="top-thumb" aria-label={`${game.name} 이미지 없음`}>
        <div className="thumb-fallback">
          {game.name.slice(0, 2).toUpperCase()}
        </div>
      </div>
    )
  }

  return (
    <div className="top-thumb">
      <img
        src={imageSrc}
        alt={`${game.name} 썸네일`}
        loading="lazy"
        onError={() => {
          const headerImage = getSteamHeaderImage(game.steamAppId)

          if (headerImage && imageSrc !== headerImage) {
            setImageSrc(headerImage)
            return
          }

          setIsBroken(true)
        }}
      />
    </div>
  )
}

function EmptyText({ text }: { text: string }) {
  return <p className="empty-text">{text}</p>
}

function normalizeTopGames(games: Game[]): TopGameView[] {
  return [...games]
    .sort((a, b) => {
      const bScore = toNumber(b.positive_rate ?? b.positiveRate ?? b.score)
      const aScore = toNumber(a.positive_rate ?? a.positiveRate ?? a.score)
      return bScore - aScore
    })
    .map((game, index) => {
      const score = toNumber(game.positive_rate ?? game.positiveRate ?? game.score)

      const genre = Array.isArray(game.genres)
        ? game.genres.join(', ')
        : game.genre ?? game.genres ?? '장르 정보 없음'

      const steamAppId = toSteamAppId(
        game.steam_appid ??
          game.steamAppId ??
          game.app_id ??
          game.appId ??
          game.appid ??
          game.game_id,
      )

      const providedImage =
        game.image_url ??
        game.image ??
        game.capsule_image ??
        game.header_image

      return {
        rank: index + 1,
        id: String(
          game.id ??
            game.steam_appid ??
            game.app_id ??
            game.appid ??
            game.game_id ??
            index,
        ),
        steamAppId,
        name: game.name ?? game.title ?? '이름 없음',
        genre,
        score: score > 0 ? `${score.toFixed(1)}%` : '-',
        image: providedImage ?? getSteamCapsuleImage(steamAppId),
      }
    })
}

function normalizeSentiment(sentiment: SentimentAnalysis | null) {
  if (!sentiment) {
    return { positive: 0, neutral: 0, negative: 0 }
  }

  const positive = normalizeRatio(
    sentiment.positive_ratio ?? sentiment.positiveRate ?? sentiment.positive,
  )
  const neutral = normalizeRatio(
    sentiment.neutral_ratio ?? sentiment.neutralRate ?? sentiment.neutral,
  )
  const negative = normalizeRatio(
    sentiment.negative_ratio ?? sentiment.negativeRate ?? sentiment.negative,
  )

  const total = positive + neutral + negative

  if (total === 0) {
    return { positive: 0, neutral: 0, negative: 0 }
  }

  return {
    positive: (positive / total) * 100,
    neutral: (neutral / total) * 100,
    negative: (negative / total) * 100,
  }
}

function normalizeTopics(topics: TopicAnalysis[]): TopicView[] {
  const fallbackLabels = [
    '게임플레이',
    '스토리',
    '그래픽',
    '사운드',
    '성능/최적화',
    '가격/가성비',
  ]

  const usedLabels = new Set<string>()

  return topics
    .map((topic, index) => {
      const rawLabel = createTopicLabel(topic, index)

      const value = normalizeRatio(
        topic.value ??
          topic.ratio ??
          topic.weight ??
          topic.percentage ??
          topic.percent,
      )

      return {
        rawLabel,
        value,
      }
    })
    .sort((a, b) => b.value - a.value)
    .map((topic, index) => {
      let label = convertTopicToKoreanCategory(topic.rawLabel, index)

      if (usedLabels.has(label)) {
        label =
          fallbackLabels.find((fallbackLabel) => !usedLabels.has(fallbackLabel)) ??
          `${label} ${index + 1}`
      }

      usedLabels.add(label)

      return {
        label,
        value: topic.value,
      }
    })
}

function createTopicLabel(topic: TopicAnalysis, index: number) {
  const directName =
    pickMeaningfulText(
      topic.topic_name,
      topic.topicName,
      topic.topic_label,
      topic.topicLabel,
      topic.display_name,
      topic.label,
      topic.name,
      topic.keyword,
    ) ?? ''

  if (directName) {
    return formatTopicText(directName)
  }

  const topicValue =
    typeof topic.topic === 'string' || typeof topic.topic === 'number'
      ? String(topic.topic)
      : ''

  if (topicValue && !isNumericText(topicValue)) {
    return formatTopicText(topicValue)
  }

  const keywordName = createKeywordTopicName(
    topic.keywords ??
      topic.top_keywords ??
      topic.topKeywords ??
      topic.words ??
      topic.top_words ??
      topic.topWords ??
      topic.terms,
  )

  if (keywordName) {
    return keywordName
  }

  const topicId = topic.topic_id ?? topic.topicId ?? topic.topic

  if (topicId !== undefined && topicId !== null && String(topicId).trim() !== '') {
    return `토픽 ${Number(topicId) + 1 || index + 1}`
  }

  return `토픽 ${index + 1}`
}

function convertTopicToKoreanCategory(label: string, index: number) {
  const text = label.toLowerCase()

  if (
    text.includes('story') ||
    text.includes('narrative') ||
    text.includes('character') ||
    text.includes('quest') ||
    text.includes('ending')
  ) {
    return '스토리'
  }

  if (
    text.includes('graphic') ||
    text.includes('visual') ||
    text.includes('art') ||
    text.includes('design') ||
    text.includes('animation') ||
    text.includes('modeling')
  ) {
    return '그래픽'
  }

  if (
    text.includes('sound') ||
    text.includes('music') ||
    text.includes('audio') ||
    text.includes('voice') ||
    text.includes('ost')
  ) {
    return '사운드'
  }

  if (
    text.includes('bug') ||
    text.includes('error') ||
    text.includes('crash') ||
    text.includes('performance') ||
    text.includes('peak') ||
    text.includes('lag') ||
    text.includes('server') ||
    text.includes('optimization')
  ) {
    return '성능/최적화'
  }

  if (
    text.includes('price') ||
    text.includes('sale') ||
    text.includes('free') ||
    text.includes('money') ||
    text.includes('value')
  ) {
    return '가격/가성비'
  }

  if (
    text.includes('play') ||
    text.includes('gameplay') ||
    text.includes('game') ||
    text.includes('fun') ||
    text.includes('good') ||
    text.includes('control') ||
    text.includes('combat') ||
    text.includes('level')
  ) {
    return '게임플레이'
  }

  const fallbackLabels = [
    '게임플레이',
    '스토리',
    '그래픽',
    '사운드',
    '성능/최적화',
  ]

  return fallbackLabels[index] ?? `토픽 ${index + 1}`
}

function createKeywordTopicName(value: unknown) {
  const words = toKeywordArray(value)

  if (words.length === 0) {
    return ''
  }

  return words.slice(0, 3).map(formatTopicText).join(' · ')
}

function toKeywordArray(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter((item) => item && !isInvalidText(item))
  }

  if (typeof value === 'string') {
    return value
      .split(/[,/|·\n]+/)
      .map((item) => item.trim())
      .filter((item) => item && !isInvalidText(item))
  }

  return []
}

function normalizeCorrelations(items: CorrelationResult[]): InsightView[] {
  return items
    .map((item) => {
      const rawItem1 =
        item.item1 ?? item.feature_x ?? item.x ?? item.variable_1 ?? item.variable1

      const rawItem2 =
        item.item2 ?? item.feature_y ?? item.y ?? item.variable_2 ?? item.variable2

      const item1 = formatMetricName(rawItem1 ?? '항목 1')
      const item2 = formatMetricName(rawItem2 ?? '항목 2')

      const correlation = toNumber(
        item.correlation ??
          item.correlation_coefficient ??
          item.correlation_value ??
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

function createCorrelationInsight(
  item1: string,
  item2: string,
  correlation: number,
) {
  return getCorrelationRelationText(item1, item2, correlation)
}

function getCorrelationRelationText(
  item1: string,
  item2: string,
  correlation: number,
) {
  const strength = getCorrelationStrength(correlation)
  const subject = withSubjectParticle(item1)

  if (correlation > 0) {
    return `${subject} 높아질수록 ${item2}도 함께 높아지는 경향이 ${strength} 수준입니다.`
  }

  if (correlation < 0) {
    return `${subject} 높아질수록 ${item2}는 낮아지는 경향이 ${strength} 수준입니다.`
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
  if (Math.abs(correlation) < 0.1) {
    return 'correlation-value neutral'
  }

  if (correlation > 0) {
    return 'correlation-value positive'
  }

  return 'correlation-value negative'
}

function withSubjectParticle(word: string) {
  const lastChar = word[word.length - 1]
  const code = lastChar.charCodeAt(0)

  if (code < 0xac00 || code > 0xd7a3) {
    return `${word}가`
  }

  const hasBatchim = (code - 0xac00) % 28 !== 0
  return hasBatchim ? `${word}이` : `${word}가`
}

function formatMetricName(value: unknown) {
  const raw = String(value ?? '').trim()

  if (!raw) {
    return '항목'
  }

  const lower = raw.toLowerCase()

  const metricMap: Record<string, string> = {
    price: '가격',
    log_price: '가격',
    original_price: '정가',
    discount_price: '할인가',
    is_free: '무료 여부',
    free: '무료 여부',

    positive_rate: '긍정 비율',
    positive_ratio: '긍정 리뷰 비율',
    sentiment_positive_ratio: '긍정 리뷰 비율',
    sentiment_negative_ratio: '부정 리뷰 비율',
    sentiment_neutral_ratio: '중립 리뷰 비율',
    sentiment_compound_mean: '종합 감성 점수',
    sentiment_score: '감성 점수',

    review_count: '리뷰 수',
    total_reviews: '총 리뷰 수',
    reviews: '리뷰 수',

    owners: '보유자 수',
    owners_value: '보유자 수',
    estimated_owners: '예상 보유자 수',

    popularity_score: '인기도',
    popularity_rank_percent: '인기 순위 비율',
    ccu: '동시 접속자 수',
    peak_ccu: '최고 동시 접속자 수',

    average_playtime: '평균 플레이 시간',
    median_playtime: '중앙값 플레이 시간',

    genre_count: '장르 수',
    release_year: '출시 연도',
  }

  if (metricMap[lower]) {
    return metricMap[lower]
  }

  if (lower.startsWith('genre::')) {
    const genre = raw.replace(/^genre::/i, '').trim()
    return `${formatGenreName(genre)} 장르`
  }

  if (lower.startsWith('tag::')) {
    const tag = raw.replace(/^tag::/i, '').trim()
    return `${formatTopicText(tag)} 태그`
  }

  return formatTopicText(raw)
}

function formatGenreName(value: string) {
  const text = value.trim()
  const lower = text.toLowerCase()

  const genreMap: Record<string, string> = {
    action: '액션',
    adventure: '어드벤처',
    casual: '캐주얼',
    indie: '인디',
    rpg: 'RPG',
    simulation: '시뮬레이션',
    strategy: '전략',
    sports: '스포츠',
    racing: '레이싱',
    'free to play': '무료 플레이',
    'massively multiplayer': '대규모 멀티플레이어',
    'early access': '앞서 해보기',
    'animation & modeling': '애니메이션/모델링',
    'design & illustration': '디자인/일러스트',
    'photo editing': '사진 편집',
    'video production': '영상 제작',
    'audio production': '오디오 제작',
    utilities: '유틸리티',
    'software training': '소프트웨어 교육',
    violent: '폭력성',
    'game development': '게임 개발',
  }

  return genreMap[lower] ?? formatTopicText(text)
}

function formatTopicText(value: string) {
  return value
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function pickMeaningfulText(...values: unknown[]) {
  for (const value of values) {
    if (typeof value !== 'string') continue

    const text = value.trim()

    if (!text || isInvalidText(text)) continue

    return text
  }

  return undefined
}

function isInvalidText(value: string) {
  const lower = value.trim().toLowerCase()

  return (
    lower === 'none' ||
    lower === 'null' ||
    lower === 'undefined' ||
    lower === 'nan' ||
    lower === '토픽명 없음' ||
    lower === '이름 없음'
  )
}

function isNumericText(value: string) {
  return /^\d+(\.\d+)?$/.test(value.trim())
}

function sumReviewCount(games: Game[]) {
  return games.reduce((sum, game) => {
    return sum + toNumber(game.review_count ?? game.total_reviews)
  }, 0)
}

function findTopGenre(games: Game[]) {
  const genreCount = new Map<string, number>()

  games.forEach((game) => {
    const rawGenre = Array.isArray(game.genres)
      ? game.genres[0]
      : game.genre ?? game.genres

    if (!rawGenre) return

    String(rawGenre)
      .split(',')
      .map((genre) => genre.trim())
      .filter(Boolean)
      .forEach((genre) => {
        genreCount.set(genre, (genreCount.get(genre) ?? 0) + 1)
      })
  })

  const [topGenre] =
    [...genreCount.entries()].sort((a, b) => b[1] - a[1])[0] ?? []

  return topGenre ?? '-'
}

function toSteamAppId(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    return /^\d+$/.test(trimmed) ? trimmed : undefined
  }

  return undefined
}

function getSteamCapsuleImage(appId?: string) {
  if (!appId) return undefined
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/capsule_184x69.jpg`
}

function getSteamHeaderImage(appId?: string) {
  if (!appId) return undefined
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`
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

  if (number <= 1 && number > 0) {
    return number * 100
  }

  return number
}

function formatNumber(value: unknown) {
  const number = toNumber(value)

  if (!number) {
    return '-'
  }

  return number.toLocaleString()
}

function formatPercent(value: unknown) {
  const number = normalizeRatio(value)

  if (!number) {
    return '-'
  }

  return `${number.toFixed(1)}%`
}

export default App
