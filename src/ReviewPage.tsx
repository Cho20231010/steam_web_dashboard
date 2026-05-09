import { useEffect, useMemo, useState } from 'react'
import {
  getGames,
  getGameSentiment,
  getGameTopics,
  getSentimentAnalysis,
  type Game,
  type SentimentAnalysis,
  type TopicAnalysis,
} from './api'

type ReviewGameView = {
  id: string
  steamAppId?: string
  name: string
  genre: string
  positiveRate: number
  negativeRate: number
  reviewCount: number
  image?: string
}

type TopicKeyword = {
  label: string
  size: number
}

function ReviewPage() {
  const [games, setGames] = useState<Game[]>([])
  const [overallSentiment, setOverallSentiment] = useState<SentimentAnalysis | null>(
    null,
  )
  const [selectedGameId, setSelectedGameId] = useState('')
  const [selectedGameSentiment, setSelectedGameSentiment] =
    useState<SentimentAnalysis | null>(null)
  const [selectedGameTopics, setSelectedGameTopics] = useState<TopicAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function loadReviewData() {
      try {
        setLoading(true)
        setErrorMessage('')

        const [gamesData, sentimentData] = await Promise.all([
          getGames(),
          getSentimentAnalysis(),
        ])

        const safeGames = Array.isArray(gamesData) ? gamesData : []

        setGames(safeGames)
        setOverallSentiment(sentimentData)

        const firstGame = normalizeReviewGames(safeGames)[0]

        if (firstGame) {
          setSelectedGameId(firstGame.id)
        }
      } catch (error) {
        console.error(error)
        setErrorMessage('리뷰 데이터를 불러오지 못했습니다.')
      } finally {
        setLoading(false)
      }
    }

    loadReviewData()
  }, [])

  useEffect(() => {
    async function loadSelectedGameData() {
      if (!selectedGameId) return

      try {
        setDetailLoading(true)

        const [sentimentData, topicData] = await Promise.allSettled([
          getGameSentiment(selectedGameId),
          getGameTopics(selectedGameId),
        ])

        if (sentimentData.status === 'fulfilled') {
          setSelectedGameSentiment(sentimentData.value)
        } else {
          setSelectedGameSentiment(null)
        }

        if (topicData.status === 'fulfilled' && Array.isArray(topicData.value)) {
          setSelectedGameTopics(topicData.value)
        } else {
          setSelectedGameTopics([])
        }
      } catch (error) {
        console.error(error)
        setSelectedGameSentiment(null)
        setSelectedGameTopics([])
      } finally {
        setDetailLoading(false)
      }
    }

    loadSelectedGameData()
  }, [selectedGameId])

  const reviewGames = useMemo(() => normalizeReviewGames(games), [games])

  const selectedGame = useMemo(() => {
    return reviewGames.find((game) => game.id === selectedGameId) ?? reviewGames[0]
  }, [reviewGames, selectedGameId])

  const overallValues = normalizeSentiment(overallSentiment)

  const selectedValues = normalizeSentiment(
    selectedGameSentiment ?? createFallbackSentiment(selectedGame),
  )

  const topicKeywords = useMemo(() => {
    return normalizeTopicKeywords(selectedGameTopics)
  }, [selectedGameTopics])

  const positiveTopGames = useMemo(() => {
    return [...reviewGames]
      .sort((a, b) => b.positiveRate - a.positiveRate)
      .slice(0, 5)
  }, [reviewGames])

  const negativeTopGames = useMemo(() => {
    return [...reviewGames]
      .sort((a, b) => b.negativeRate - a.negativeRate)
      .slice(0, 5)
  }, [reviewGames])

  if (loading) {
    return (
      <section className="review-status-card">
        <strong>리뷰 데이터를 불러오는 중입니다...</strong>
        <p>백엔드 API에서 감성 분석 데이터를 가져오고 있습니다.</p>
      </section>
    )
  }

  if (errorMessage) {
    return (
      <section className="review-status-card error">
        <strong>데이터 로드 실패</strong>
        <p>{errorMessage}</p>
      </section>
    )
  }

  return (
    <div className="review-page">
      <section className="review-grid">
        <article className="review-card review-chart-card">
          <h2>전체 리뷰 감성 분포</h2>

          <div className="review-donut-layout">
            <div
              className="review-donut"
              style={{
                background: `conic-gradient(
                  var(--green) 0% ${overallValues.positive}%,
                  var(--gray) ${overallValues.positive}% ${
                    overallValues.positive + overallValues.neutral
                  }%,
                  var(--red) ${
                    overallValues.positive + overallValues.neutral
                  }% 100%
                )`,
              }}
            >
              <div className="review-donut-hole" />
            </div>

            <div className="review-legend">
              <ReviewLegendItem
                color="green"
                label="긍정"
                percent={overallValues.positive}
                count={overallValues.positiveCount}
              />
              <ReviewLegendItem
                color="gray"
                label="중립"
                percent={overallValues.neutral}
                count={overallValues.neutralCount}
              />
              <ReviewLegendItem
                color="red"
                label="부정"
                percent={overallValues.negative}
                count={overallValues.negativeCount}
              />
            </div>
          </div>
        </article>

        <article className="review-card selected-game-card">
          <h2>선택한 게임</h2>

          <select
            className="game-select"
            value={selectedGame?.id ?? ''}
            onChange={(event) => setSelectedGameId(event.target.value)}
          >
            {reviewGames.map((game) => (
              <option key={game.id} value={game.id}>
                {game.name}
              </option>
            ))}
          </select>

          <div className="selected-game-image">
            {selectedGame?.image ? (
              <img src={selectedGame.image} alt={`${selectedGame.name} 이미지`} />
            ) : (
              <div className="selected-game-fallback">
                {selectedGame?.name?.slice(0, 2).toUpperCase() ?? 'GM'}
              </div>
            )}
          </div>

          <div className="selected-game-meta">
            <div>
              <span>평균 Compound 점수</span>
              <strong>{calculateCompoundScore(selectedValues)}</strong>
            </div>
            <div>
              <span>리뷰 수</span>
              <strong>{formatNumber(selectedGame?.reviewCount ?? 0)}</strong>
            </div>
          </div>
        </article>

        <article className="review-card game-sentiment-card">
          <h2>게임별 감성 분포</h2>

          <div className="game-sentiment-name">
            {selectedGame?.name ?? '선택된 게임 없음'}
          </div>

          {detailLoading ? (
            <p className="review-empty-text">게임별 감성 데이터를 불러오는 중입니다.</p>
          ) : (
            <>
              <div className="stacked-bar">
                <div
                  className="stacked-positive"
                  style={{ width: `${selectedValues.positive}%` }}
                >
                  {selectedValues.positive >= 18 && '긍정'}
                </div>
                <div
                  className="stacked-neutral"
                  style={{ width: `${selectedValues.neutral}%` }}
                >
                  {selectedValues.neutral >= 12 && '중립'}
                </div>
                <div
                  className="stacked-negative"
                  style={{ width: `${selectedValues.negative}%` }}
                >
                  {selectedValues.negative >= 10 && '부정'}
                </div>
              </div>

              <div className="stacked-labels">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>

              <div className="sentiment-rate-grid">
                <div>
                  <span>긍정</span>
                  <strong>{selectedValues.positive.toFixed(1)}%</strong>
                </div>
                <div>
                  <span>중립</span>
                  <strong>{selectedValues.neutral.toFixed(1)}%</strong>
                </div>
                <div>
                  <span>부정</span>
                  <strong>{selectedValues.negative.toFixed(1)}%</strong>
                </div>
              </div>
            </>
          )}
        </article>

        <article className="review-card keyword-card">
          <h2>주요 토픽 키워드</h2>

          {topicKeywords.length > 0 ? (
            <div className="keyword-cloud">
              {topicKeywords.map((keyword) => (
                <span
                  key={keyword.label}
                  className={`keyword-size-${keyword.size}`}
                >
                  {keyword.label}
                </span>
              ))}
            </div>
          ) : (
            <div className="keyword-cloud">
              <span className="keyword-size-5">게임플레이</span>
              <span className="keyword-size-4">스토리</span>
              <span className="keyword-size-4">그래픽</span>
              <span className="keyword-size-2">사운드</span>
              <span className="keyword-size-2">난이도</span>
              <span className="keyword-size-1">보스</span>
              <span className="keyword-size-1">탐험</span>
            </div>
          )}
        </article>

        <article className="review-card ranking-card">
          <h2>긍정 리뷰가 높은 게임 TOP 5</h2>

          <ReviewRankingList
            games={positiveTopGames}
            valueKey="positiveRate"
            emptyText="긍정 리뷰 데이터가 없습니다."
          />
        </article>

        <article className="review-card ranking-card">
          <h2>부정 리뷰 비율 높은 게임 TOP 5</h2>

          <ReviewRankingList
            games={negativeTopGames}
            valueKey="negativeRate"
            emptyText="부정 리뷰 데이터가 없습니다."
          />
        </article>
      </section>
    </div>
  )
}

function ReviewLegendItem({
  color,
  label,
  percent,
  count,
}: {
  color: 'green' | 'gray' | 'red'
  label: string
  percent: number
  count: number
}) {
  return (
    <div className="review-legend-item">
      <span className={`review-dot ${color}`} />
      <div>
        <strong>{label}</strong>
        <p>
          {percent.toFixed(1)}% ({formatNumber(count)})
        </p>
      </div>
    </div>
  )
}

function ReviewRankingList({
  games,
  valueKey,
  emptyText,
}: {
  games: ReviewGameView[]
  valueKey: 'positiveRate' | 'negativeRate'
  emptyText: string
}) {
  if (games.length === 0) {
    return <p className="review-empty-text">{emptyText}</p>
  }

  return (
    <div className="review-ranking-list">
      {games.map((game, index) => (
        <div className="review-ranking-item" key={`${game.id}-${valueKey}`}>
          <span>{index + 1}</span>
          <strong>{game.name}</strong>
          <em>{game[valueKey].toFixed(1)}%</em>
        </div>
      ))}
    </div>
  )
}

function normalizeReviewGames(games: Game[]): ReviewGameView[] {
  return games.map((game, index) => {
    const steamAppId = toSteamAppId(
      game.steam_appid ??
        game.steamAppId ??
        game.app_id ??
        game.appId ??
        game.appid ??
        game.game_id,
    )

    const positiveRate = normalizeRatio(
      game.positive_rate ?? game.positiveRate ?? game.score,
    )

    const negativeRate = Math.max(0, 100 - positiveRate)

    const genre = Array.isArray(game.genres)
      ? game.genres.join(', ')
      : game.genre ?? game.genres ?? '장르 정보 없음'

    const image =
      game.image_url ??
      game.image ??
      game.header_image ??
      game.capsule_image ??
      getSteamHeaderImage(steamAppId)

    return {
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
      positiveRate,
      negativeRate,
      reviewCount: toNumber(game.review_count ?? game.total_reviews),
      image,
    }
  })
}

function normalizeSentiment(sentiment: SentimentAnalysis | null) {
  if (!sentiment) {
    return {
      positive: 0,
      neutral: 0,
      negative: 0,
      positiveCount: 0,
      neutralCount: 0,
      negativeCount: 0,
    }
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
    return {
      positive: 0,
      neutral: 0,
      negative: 0,
      positiveCount: 0,
      neutralCount: 0,
      negativeCount: 0,
    }
  }

  const normalizedPositive = (positive / total) * 100
  const normalizedNeutral = (neutral / total) * 100
  const normalizedNegative = (negative / total) * 100

  return {
    positive: normalizedPositive,
    neutral: normalizedNeutral,
    negative: normalizedNegative,
    positiveCount: Math.round(positive),
    neutralCount: Math.round(neutral),
    negativeCount: Math.round(negative),
  }
}

function createFallbackSentiment(game?: ReviewGameView) {
  if (!game) return null

  return {
    positive: game.positiveRate,
    neutral: Math.min(10, Math.max(0, 100 - game.positiveRate - game.negativeRate)),
    negative: game.negativeRate,
  }
}

function normalizeTopicKeywords(topics: TopicAnalysis[]): TopicKeyword[] {
  const labels = topics
    .map((topic, index) => createTopicLabel(topic, index))
    .filter(Boolean)
    .slice(0, 7)

  if (labels.length === 0) {
    return []
  }

  return labels.map((label, index) => ({
    label: convertTopicToKoreanCategory(label, index),
    size: Math.max(1, 5 - Math.floor(index / 2)),
  }))
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

  return `토픽 ${index + 1}`
}

function convertTopicToKoreanCategory(label: string, index: number) {
  const text = label.toLowerCase()

  if (
    text.includes('story') ||
    text.includes('narrative') ||
    text.includes('character') ||
    text.includes('quest')
  ) {
    return '스토리'
  }

  if (
    text.includes('graphic') ||
    text.includes('visual') ||
    text.includes('art') ||
    text.includes('design') ||
    text.includes('animation')
  ) {
    return '그래픽'
  }

  if (
    text.includes('sound') ||
    text.includes('music') ||
    text.includes('audio') ||
    text.includes('voice')
  ) {
    return '사운드'
  }

  if (
    text.includes('boss') ||
    text.includes('difficulty') ||
    text.includes('hard')
  ) {
    return '난이도'
  }

  if (
    text.includes('explore') ||
    text.includes('world') ||
    text.includes('map')
  ) {
    return '탐험'
  }

  if (
    text.includes('play') ||
    text.includes('gameplay') ||
    text.includes('game') ||
    text.includes('fun') ||
    text.includes('combat')
  ) {
    return '게임플레이'
  }

  const fallback = ['게임플레이', '스토리', '그래픽', '탐험', '난이도', '보스', '사운드']

  return fallback[index] ?? label
}

function calculateCompoundScore(values: {
  positive: number
  neutral: number
  negative: number
}) {
  const score = (values.positive - values.negative) / 100
  return score.toFixed(2)
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

function formatTopicText(value: string) {
  return value
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function formatNumber(value: number) {
  return value.toLocaleString()
}

export default ReviewPage
