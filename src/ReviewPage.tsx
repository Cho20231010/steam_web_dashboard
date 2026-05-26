import { useEffect, useMemo, useState } from 'react'
import './ReviewPage.css'

type GameOption = {
  id: number
  name: string
  positiveReviews: number
  negativeReviews: number
  reviewCount: number
}

type SentimentSummary = {
  positiveRate: number
  negativeRate: number
  neutralRate: number
  positiveCount: number
  negativeCount: number
  neutralCount: number
  totalReviews: number
  sentimentScore: number
}

type TopicItem = {
  topicId?: number
  label: string
  keywords: string[]
  percentage: number
}

type InsightTexts = {
  positive: string
  negative: string
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

const PERIOD_OPTIONS = [
  { value: 'all', label: '전체 기간' },
  { value: '30d', label: '최근 30일' },
  { value: '90d', label: '최근 90일' },
]

const INITIAL_SUMMARY: SentimentSummary = {
  positiveRate: 0,
  negativeRate: 0,
  neutralRate: 0,
  positiveCount: 0,
  negativeCount: 0,
  neutralCount: 0,
  totalReviews: 0,
  sentimentScore: 0,
}

const REVIEW_KEYWORD_KO: Record<string, string> = {
  game: '게임',
  games: '게임',
  gameplay: '게임플레이',
  play: '플레이',
  playing: '플레이',
  player: '플레이어',
  players: '플레이어',
  fun: '재미',
  good: '긍정 평가',
  great: '호평',
  like: '선호도',
  story: '스토리',
  combat: '전투',
  world: '세계관',
  graphics: '그래픽',
  graphic: '그래픽',
  visual: '비주얼',
  visuals: '비주얼',
  music: '음악',
  sound: '사운드',
  bug: '버그',
  bugs: '버그',
  performance: '성능',
  optimization: '최적화',
  difficult: '난이도',
  difficulty: '난이도',
  hard: '어려움',
  easy: '쉬움',
  server: '서버',
  servers: '서버',
  online: '온라인',
  multiplayer: '멀티플레이',
  fps: 'FPS',
  bad: '부정 평가',
  price: '가격',
  content: '콘텐츠',
  update: '업데이트',
  dlc: 'DLC',
  war: '전쟁',
  tank: '탱크',
  tanks: '전차',
  vehicle: '차량',
  vehicles: '차량',
  gaijin: '가이진',
  data: '데이터',
  find: '탐색',
  access: '접근성',
  early: '얼리 액세스',
  time: '시간',
  hours: '플레이 시간',
  don: '의견',
  nt: '표현',
  feel: '느낌',
}

function ReviewPage() {
  const [games, setGames] = useState<GameOption[]>([])
  const [selectedTarget, setSelectedTarget] = useState<string>('all')
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all')
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')

  const [summary, setSummary] = useState<SentimentSummary>(INITIAL_SUMMARY)
  const [topics, setTopics] = useState<TopicItem[]>([])
  const [insightTexts, setInsightTexts] = useState<InsightTexts>({
    positive: '',
    negative: '',
  })

  useEffect(() => {
    let cancelled = false

    async function loadGames() {
      try {
        const raw = await fetchJson('/games')
        const parsed = parseGameOptions(raw)

        if (!cancelled) {
          setGames(parsed)
        }
      } catch (err) {
        console.error('게임 목록 로드 실패:', err)
      }
    }

    loadGames()

    return () => {
      cancelled = true
    }
  }, [])

  const allGamesReviewFallback = useMemo(() => {
    const positiveReviews = games.reduce((sum, game) => sum + game.positiveReviews, 0)
    const negativeReviews = games.reduce((sum, game) => sum + game.negativeReviews, 0)

    return {
      positive_reviews: positiveReviews,
      negative_reviews: negativeReviews,
    }
  }, [games])

  useEffect(() => {
    let cancelled = false

    async function loadReviewInsights() {
      setLoading(true)
      setError('')

      try {
        const [sentimentRaw, topicsRaw, insightsRaw, detailRaw] =
          selectedTarget === 'all'
            ? await Promise.all([
                fetchJson('/analysis/sentiment'),
                fetchJson('/analysis/topics'),
                Promise.resolve(null),
                Promise.resolve(allGamesReviewFallback),
              ])
            : await Promise.all([
                fetchJson(`/games/${selectedTarget}/sentiment`),
                fetchJson(`/games/${selectedTarget}/topics`),
                fetchJson(`/games/${selectedTarget}/reviews/insights`).catch(() => null),
                fetchJson(`/games/${selectedTarget}`).catch(() => {
                  const fallbackGame = games.find((game) => String(game.id) === selectedTarget)

                  if (!fallbackGame) {
                    return null
                  }

                  return {
                    positive_reviews: fallbackGame.positiveReviews,
                    negative_reviews: fallbackGame.negativeReviews,
                  }
                }),
              ])

        if (cancelled) {
          return
        }

        const parsedSummary = parseSentimentSummary(sentimentRaw, detailRaw)
        const parsedTopics = parseTopics(topicsRaw).slice(0, 5)
        const parsedInsights = parseInsightTexts(insightsRaw, parsedSummary, parsedTopics)

        setSummary(parsedSummary)
        setTopics(parsedTopics)
        setInsightTexts(parsedInsights)
      } catch (err) {
        console.error('리뷰 인사이트 로드 실패:', err)

        if (!cancelled) {
          setError('리뷰 인사이트 데이터를 불러오지 못했습니다.')
          setSummary(INITIAL_SUMMARY)
          setTopics([])
          setInsightTexts({
            positive: '리뷰 인사이트 데이터를 불러오지 못했습니다.',
            negative: '리뷰 인사이트 데이터를 불러오지 못했습니다.',
          })
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadReviewInsights()

    return () => {
      cancelled = true
    }
  }, [selectedTarget, selectedPeriod, allGamesReviewFallback, games])

  const selectedGameName = useMemo(() => {
    if (selectedTarget === 'all') {
      return '전체 리뷰'
    }

    return games.find((game) => String(game.id) === selectedTarget)?.name ?? '선택 게임'
  }, [games, selectedTarget])

  const sentimentScoreText = useMemo(() => {
    const rounded = Math.round(summary.sentimentScore)
    return rounded > 0 ? `+${rounded}` : `${rounded}`
  }, [summary.sentimentScore])

  const donutStyle = useMemo(() => {
    const positive = clamp(summary.positiveRate, 0, 100)
    const neutral = clamp(summary.neutralRate, 0, 100)

    const positiveEnd = positive
    const neutralEnd = positive + neutral

    return {
      background: `conic-gradient(
        #69b36d 0% ${positiveEnd}%,
        #cfd4de ${positiveEnd}% ${neutralEnd}%,
        #e05a5a ${neutralEnd}% 100%
      )`,
    }
  }, [summary.positiveRate, summary.neutralRate])

  const periodHelperText =
    selectedPeriod !== 'all'
      ? '현재 API 기준으로 기간 필터는 동일 기준 데이터가 표시될 수 있습니다.'
      : ''

  return (
    <div className="review-page">
      <section className="review-toolbar review-card">
        <div className="review-toolbar-meta">
          <span className="review-toolbar-current-target">{selectedGameName}</span>
          {periodHelperText && <small>{periodHelperText}</small>}
        </div>

        <div className="review-toolbar-controls">
          <label className="review-toolbar-field">
            <span>분석 대상</span>
            <select
              value={selectedTarget}
              onChange={(event) => setSelectedTarget(event.target.value)}
            >
              <option value="all">전체 리뷰</option>
              {games.map((game) => (
                <option key={game.id} value={game.id}>
                  {game.name}
                </option>
              ))}
            </select>
          </label>

          <label className="review-toolbar-field">
            <span>분석 기간</span>
            <select
              value={selectedPeriod}
              onChange={(event) => setSelectedPeriod(event.target.value)}
            >
              {PERIOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {error && <div className="review-error review-card">{error}</div>}

      <section className="review-summary-grid">
        <article className="review-summary-card review-card">
          <p className="review-summary-label">긍정 비율</p>
          <strong className="review-summary-value positive">
            {loading ? '-' : formatPercent(summary.positiveRate)}
          </strong>
          <span className="review-summary-sub">Steam 긍정 리뷰 비중</span>
        </article>

        <article className="review-summary-card review-card">
          <p className="review-summary-label">부정 비율</p>
          <strong className="review-summary-value negative">
            {loading ? '-' : formatPercent(summary.negativeRate)}
          </strong>
          <span className="review-summary-sub">Steam 부정 리뷰 비중</span>
        </article>

        <article className="review-summary-card review-card">
          <p className="review-summary-label">전체 리뷰 수</p>
          <strong className="review-summary-value">
            {loading ? '-' : formatNumber(summary.totalReviews)}
          </strong>
          <span className="review-summary-sub">positive_reviews + negative_reviews</span>
        </article>

        <article className="review-summary-card review-card">
          <p className="review-summary-label">감성 점수</p>
          <strong className="review-summary-value score">
            {loading ? '-' : sentimentScoreText}
          </strong>
          <span className="review-summary-sub">긍정-부정 기반 점수</span>
        </article>
      </section>

      <section className="review-main-grid">
        <article className="review-card review-distribution-card">
          <div className="review-card-header">
            <h3>감성 분포</h3>
          </div>

          <div className="review-distribution-content">
            <div className="review-donut" style={donutStyle}>
              <div className="review-donut-center">
                <span>총 리뷰</span>
                <strong>{loading ? '-' : formatNumber(summary.totalReviews)}</strong>
              </div>
            </div>

            <div className="review-sentiment-list">
              <div className="review-sentiment-row">
                <span className="review-dot positive" />
                <span className="review-sentiment-name">긍정</span>
                <strong>{loading ? '-' : formatPercent(summary.positiveRate)}</strong>
                <span>{loading ? '-' : formatNumber(summary.positiveCount)}</span>
              </div>

              <div className="review-sentiment-row">
                <span className="review-dot neutral" />
                <span className="review-sentiment-name">중립</span>
                <strong>{loading ? '-' : formatPercent(summary.neutralRate)}</strong>
                <span>{loading ? '-' : formatNumber(summary.neutralCount)}</span>
              </div>

              <div className="review-sentiment-row">
                <span className="review-dot negative" />
                <span className="review-sentiment-name">부정</span>
                <strong>{loading ? '-' : formatPercent(summary.negativeRate)}</strong>
                <span>{loading ? '-' : formatNumber(summary.negativeCount)}</span>
              </div>
            </div>
          </div>
        </article>

        <article className="review-card review-factors-card">
          <div className="review-card-header">
            <h3>주요 리뷰 요소 TOP 5</h3>
          </div>

          <div className="review-factors-list">
            {loading ? (
              <div className="review-empty">데이터를 불러오는 중입니다.</div>
            ) : topics.length === 0 ? (
              <div className="review-empty">토픽 데이터가 없습니다.</div>
            ) : (
              topics.map((topic, index) => (
                <div className="review-factor-row" key={`${topic.topicId ?? index}-${index}`}>
                  <div className="review-factor-top">
                    <div className="review-factor-title-wrap">
                      <span className="review-factor-rank">{index + 1}</span>
                      <div className="review-factor-texts">
                        <strong>{makeTopicTitle(topic)}</strong>
                        <p>{topic.keywords.map(formatKeywordLabel).join(' · ')}</p>
                      </div>
                    </div>

                    <span className="review-factor-value">
                      {formatPercent(topic.percentage)}
                    </span>
                  </div>

                  <div className="review-factor-bar">
                    <span style={{ width: `${clamp(topic.percentage, 0, 100)}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="review-bottom-grid">
        <article className="review-card review-insight-card positive-card">
          <div className="review-insight-icon positive">👍</div>
          <div className="review-insight-content">
            <h3>긍정적인 리뷰</h3>
            <p>{loading ? '데이터를 불러오는 중입니다.' : insightTexts.positive}</p>
          </div>
        </article>

        <article className="review-card review-insight-card negative-card">
          <div className="review-insight-icon negative">👎</div>
          <div className="review-insight-content">
            <h3>부정적인 리뷰</h3>
            <p>{loading ? '데이터를 불러오는 중입니다.' : insightTexts.negative}</p>
          </div>
        </article>
      </section>
    </div>
  )
}

async function fetchJson(path: string) {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL 이 설정되어 있지 않습니다.')
  }

  const response = await fetch(`${API_BASE_URL}${path}`)

  if (!response.ok) {
    throw new Error(`API 요청 실패: ${path} (${response.status})`)
  }

  return response.json()
}

function parseGameOptions(raw: unknown): GameOption[] {
  const items = extractArray(raw)

  return items
    .map((item) => {
      const record = isRecord(item) ? item : {}
      const id = toNumber(record.game_id ?? record.id ?? record.app_id ?? record.appid)
      const name = toStringValue(record.name ?? record.title ?? record.game_name)

      const positiveReviews = toNumber(record.positive_reviews ?? record.positiveReviews)
      const negativeReviews = toNumber(record.negative_reviews ?? record.negativeReviews)
      const calculatedReviews = positiveReviews + negativeReviews
      const apiReviewCount = toNumber(
        record.review_count ?? record.total_reviews ?? record.totalReviews ?? record.reviews,
      )

      return {
        id,
        name,
        positiveReviews,
        negativeReviews,
        reviewCount: calculatedReviews > 0 ? calculatedReviews : apiReviewCount,
      }
    })
    .filter((item) => item.id > 0 && item.name)
    .sort((a, b) => b.reviewCount - a.reviewCount)
    .slice(0, 200)
}

function parseSentimentSummary(raw: unknown, fallbackRaw: unknown = null): SentimentSummary {
  const source = extractObject(raw)
  const fallback = extractObject(fallbackRaw)

  const fallbackPositive = toNumber(fallback.positive_reviews ?? fallback.positiveReviews)
  const fallbackNegative = toNumber(fallback.negative_reviews ?? fallback.negativeReviews)
  const fallbackTotal = fallbackPositive + fallbackNegative

  if (fallbackTotal > 0) {
    return {
      positiveRate: (fallbackPositive / fallbackTotal) * 100,
      negativeRate: (fallbackNegative / fallbackTotal) * 100,
      neutralRate: 0,
      positiveCount: fallbackPositive,
      negativeCount: fallbackNegative,
      neutralCount: 0,
      totalReviews: fallbackTotal,
      sentimentScore: ((fallbackPositive - fallbackNegative) / fallbackTotal) * 100,
    }
  }

  const positiveCount = toNumber(
    source.positive_count ??
      source.positive_reviews ??
      source.positive ??
      source.pos_count,
  )

  const negativeCount = toNumber(
    source.negative_count ??
      source.negative_reviews ??
      source.negative ??
      source.neg_count,
  )

  const neutralCount = toNumber(
    source.neutral_count ?? source.neutral_reviews ?? source.neutral,
  )

  const calculatedTotal = positiveCount + negativeCount + neutralCount
  const apiTotalReviews = toNumber(
    source.total_reviews ?? source.review_count ?? source.total_count ?? source.total,
  )

  const totalReviews = calculatedTotal > 0 ? calculatedTotal : apiTotalReviews

  const positiveRate =
    normalizePercent(
      source.positive_rate ?? source.positive_ratio ?? source.positive_percent,
    ) || (totalReviews > 0 ? (positiveCount / totalReviews) * 100 : 0)

  const negativeRate =
    normalizePercent(
      source.negative_rate ?? source.negative_ratio ?? source.negative_percent,
    ) || (totalReviews > 0 ? (negativeCount / totalReviews) * 100 : 0)

  const neutralRate =
    normalizePercent(
      source.neutral_rate ?? source.neutral_ratio ?? source.neutral_percent,
    ) || Math.max(0, 100 - positiveRate - negativeRate)

  let sentimentScore = toNumber(
    source.sentiment_score ?? source.compound_mean ?? source.average_score ?? source.score,
  )

  if (sentimentScore >= -1 && sentimentScore <= 1 && sentimentScore !== 0) {
    sentimentScore *= 100
  }

  if (!sentimentScore) {
    sentimentScore = positiveRate - negativeRate
  }

  return {
    positiveRate,
    negativeRate,
    neutralRate,
    positiveCount,
    negativeCount,
    neutralCount,
    totalReviews,
    sentimentScore,
  }
}

function parseTopics(raw: unknown): TopicItem[] {
  const items = extractArray(raw)

  return items
    .map((item, index) => {
      const record = isRecord(item) ? item : {}

      const keywords = extractStringArray(
        record.keywords ??
          record.top_keywords ??
          record.topKeywords ??
          record.words ??
          record.terms,
      )

      const label =
        toStringValue(record.label ?? record.name ?? record.topic_name ?? record.topic) ||
        `토픽 ${index + 1}`

      const percentage = normalizePercent(
        record.weight_percent ??
          record.weight ??
          record.percentage ??
          record.percent ??
          record.share,
      )

      const topicId = toNumber(record.topic_id ?? record.id)

      return {
        topicId: topicId || index,
        label,
        keywords,
        percentage,
      }
    })
    .filter((topic) => topic.keywords.length > 0 || topic.percentage > 0)
    .sort((a, b) => b.percentage - a.percentage)
}

function parseInsightTexts(
  raw: unknown,
  summary: SentimentSummary,
  topics: TopicItem[],
): InsightTexts {
  const source = extractObject(raw)

  const positive =
    pickFirstText([
      source.positive_summary,
      source.positiveSummary,
      source.positive_review,
      source.positive_insight,
      source.pros,
      source.summary_positive,
    ]) || buildPositiveFallback(summary, topics)

  const negative =
    pickFirstText([
      source.negative_summary,
      source.negativeSummary,
      source.negative_review,
      source.negative_insight,
      source.cons,
      source.summary_negative,
    ]) || buildNegativeFallback(summary, topics)

  return {
    positive,
    negative,
  }
}

function buildPositiveFallback(summary: SentimentSummary, topics: TopicItem[]) {
  const topTopic = topics[0] ? makeTopicTitle(topics[0]) : '핵심 요소'

  return `긍정 비율이 ${formatPercent(
    summary.positiveRate,
  )}로 나타나 전반적으로 좋은 평가 흐름을 보입니다. 특히 ${topTopic} 관련 언급이 상위권에 나타납니다.`
}

function buildNegativeFallback(summary: SentimentSummary, topics: TopicItem[]) {
  const secondTopic = topics[1] ? makeTopicTitle(topics[1]) : '일부 요소'

  return `부정 비율은 ${formatPercent(
    summary.negativeRate,
  )}이며, 일부 리뷰에서는 ${secondTopic} 관련 아쉬움이 함께 언급되고 있습니다.`
}

function makeTopicTitle(topic: TopicItem) {
  const cleanLabel = topic.label.trim()

  if (
    cleanLabel &&
    !/^topic\s*\d+$/i.test(cleanLabel) &&
    !/^토픽\s*\d+$/i.test(cleanLabel)
  ) {
    return formatKeywordLabel(cleanLabel)
  }

  if (topic.keywords.length === 0) {
    return '토픽'
  }

  return topic.keywords.slice(0, 2).map(formatKeywordLabel).join(' / ')
}

function formatKeywordLabel(keyword: string) {
  const original = keyword.trim()

  if (!original) {
    return ''
  }

  const lower = original.toLowerCase()
  const ko = REVIEW_KEYWORD_KO[lower]

  if (ko) {
    return `${ko} (${original})`
  }

  return original
}

function extractArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) {
    return raw
  }

  if (!isRecord(raw)) {
    return []
  }

  if (Array.isArray(raw.data)) {
    return raw.data
  }

  if (Array.isArray(raw.items)) {
    return raw.items
  }

  if (Array.isArray(raw.results)) {
    return raw.results
  }

  if (Array.isArray(raw.games)) {
    return raw.games
  }

  if (Array.isArray(raw.topics)) {
    return raw.topics
  }

  if (isRecord(raw.data)) {
    const nested = raw.data

    if (Array.isArray(nested.items)) {
      return nested.items
    }

    if (Array.isArray(nested.results)) {
      return nested.results
    }

    if (Array.isArray(nested.topics)) {
      return nested.topics
    }
  }

  return []
}

function extractObject(raw: unknown): Record<string, unknown> {
  if (isRecord(raw)) {
    if (isRecord(raw.data)) {
      return raw.data
    }

    return raw
  }

  return {}
}

function extractStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => toStringValue(item)).filter(Boolean)
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()

    if (!trimmed) {
      return []
    }

    try {
      const parsed = JSON.parse(trimmed)

      if (Array.isArray(parsed)) {
        return parsed.map((item) => toStringValue(item)).filter(Boolean)
      }
    } catch {
      // JSON 배열 문자열이 아니면 쉼표 기준으로 분리
    }

    return trimmed
      .replace(/^\[|\]$/g, '')
      .split(/[,|/]/)
      .map((keyword) =>
        keyword
          .replace(/^['"]|['"]$/g, '')
          .replace(/^\(|\)$/g, '')
          .trim(),
      )
      .filter(Boolean)
  }

  return []
}

function pickFirstText(values: unknown[]) {
  for (const value of values) {
    const text = toStringValue(value)

    if (text) {
      return text
    }
  }

  return ''
}

function normalizePercent(value: unknown) {
  const number = toNumber(value)

  if (!number) {
    return 0
  }

  return number <= 1 ? number * 100 : number
}

function toNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number(value.replace(/,/g, '').replace('%', '').trim())
    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

function toStringValue(value: unknown) {
  if (typeof value === 'string') {
    return value.trim()
  }

  if (typeof value === 'number') {
    return String(value)
  }

  return ''
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('ko-KR').format(Math.round(value))
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export default ReviewPage
