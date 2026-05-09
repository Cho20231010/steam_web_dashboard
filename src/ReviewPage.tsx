import { useEffect, useMemo, useState } from 'react'
import {
  getGameDetail,
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
  neutralRate: number
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
  const [selectedGameDetail, setSelectedGameDetail] = useState<Game | null>(null)
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
        const normalizedGames = normalizeReviewGames(safeGames)

        setGames(safeGames)
        setOverallSentiment(sentimentData)

        if (normalizedGames[0]) {
          setSelectedGameId(normalizedGames[0].id)
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

        const [detailResult, sentimentResult, topicResult] = await Promise.allSettled([
          getGameDetail(selectedGameId),
          getGameSentiment(selectedGameId),
          getGameTopics(selectedGameId),
        ])

        if (detailResult.status === 'fulfilled') {
          setSelectedGameDetail(detailResult.value)
        } else {
          setSelectedGameDetail(null)
        }

        if (sentimentResult.status === 'fulfilled') {
          setSelectedGameSentiment(sentimentResult.value)
        } else {
          setSelectedGameSentiment(null)
        }

        if (topicResult.status === 'fulfilled' && Array.isArray(topicResult.value)) {
          setSelectedGameTopics(topicResult.value)
        } else {
          setSelectedGameTopics([])
        }
      } catch (error) {
        console.error(error)
        setSelectedGameDetail(null)
        setSelectedGameSentiment(null)
        setSelectedGameTopics([])
      } finally {
        setDetailLoading(false)
      }
    }

    loadSelectedGameData()
  }, [selectedGameId])

  const reviewGames = useMemo(() => normalizeReviewGames(games), [games])

  const selectedGameFromList = useMemo(() => {
    return reviewGames.find((game) => game.id === selectedGameId) ?? reviewGames[0]
  }, [reviewGames, selectedGameId])

  const selectedGame = useMemo(() => {
    if (!selectedGameFromList) return undefined

    const detailGame = selectedGameDetail
      ? normalizeReviewGames([selectedGameDetail])[0]
      : undefined

    return {
      ...selectedGameFromList,
      ...detailGame,
      id: selectedGameFromList.id,
      steamAppId: detailGame?.steamAppId ?? selectedGameFromList.steamAppId,
      name: detailGame?.name ?? selectedGameFromList.name,
      genre: detailGame?.genre ?? selectedGameFromList.genre,
      image: detailGame?.image ?? selectedGameFromList.image,
      reviewCount:
        detailGame?.reviewCount && detailGame.reviewCount > 0
          ? detailGame.reviewCount
          : selectedGameFromList.reviewCount,
    }
  }, [selectedGameDetail, selectedGameFromList])

  const overallValues = normalizeSentiment(overallSentiment)

  const selectedValues = useMemo(() => {
    const normalized = normalizeSentiment(selectedGameSentiment)

    if (normalized.totalCount > 0) {
      return normalized
    }

    return createFallbackSentiment(selectedGame)
  }, [selectedGame, selectedGameSentiment])

  const selectedReviewCount = useMemo(() => {
    return getBestReviewCount(selectedGame, selectedValues)
  }, [selectedGame, selectedValues])

  const topicKeywords = useMemo(() => {
    return normalizeTopicKeywords(selectedGameTopics)
  }, [selectedGameTopics])

  const positiveTopGames = useMemo(() => {
    return reviewGames
      .filter((game) => game.positiveRate > 0)
      .sort((a, b) => b.positiveRate - a.positiveRate)
      .slice(0, 5)
  }, [reviewGames])

  const negativeTopGames = useMemo(() => {
    return reviewGames
      .filter((game) => game.negativeRate > 0)
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
              <strong>{formatNumber(selectedReviewCount)}</strong>
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
                  {selectedValues.positive >= 16 && '긍정'}
                </div>
                <div
                  className="stacked-neutral"
                  style={{ width: `${selectedValues.neutral}%` }}
                >
                  {selectedValues.neutral >= 10 && '중립'}
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
                  key={`${keyword.label}-${keyword.size}`}
                  className={`keyword-size-${keyword.size}`}
                >
                  {keyword.label}
                </span>
              ))}
            </div>
          ) : (
            <p className="review-empty-text">토픽 키워드 데이터가 없습니다.</p>
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
          <strong title={game.name}>{game.name}</strong>
          <em>{game[valueKey].toFixed(1)}%</em>
        </div>
      ))}
    </div>
  )
}

function normalizeReviewGames(games: Game[]): ReviewGameView[] {
  return games.map((game, index) => {
    const record = toRecord(game)

    const steamAppId = toSteamAppId(
      readFirst(record, [
        'steam_appid',
        'steamAppId',
        'app_id',
        'appId',
        'appid',
        'app_id',
        'game_id',
      ]),
    )

    const positiveRate = normalizeRatio(
      readFirst(record, [
        'positive_rate',
        'positiveRate',
        'positive_review_ratio',
        'positiveReviewRatio',
        'sentiment_positive_ratio',
        'positive_ratio',
        'score',
        'rating',
      ]),
    )

    const neutralRate = normalizeRatio(
      readFirst(record, [
        'neutral_rate',
        'neutralRate',
        'neutral_review_ratio',
        'sentiment_neutral_ratio',
        'neutral_ratio',
      ]),
    )

    const explicitNegativeRate = normalizeRatio(
      readFirst(record, [
        'negative_rate',
        'negativeRate',
        'negative_review_ratio',
        'sentiment_negative_ratio',
        'negative_ratio',
      ]),
    )

    const negativeRate =
      explicitNegativeRate > 0
        ? explicitNegativeRate
        : positiveRate > 0
          ? Math.max(0, 100 - positiveRate - neutralRate)
          : 0

    const genreValue = readFirst(record, ['genre', 'genres'])
    const genre = Array.isArray(genreValue)
      ? genreValue.join(', ')
      : String(genreValue ?? '장르 정보 없음')

    const image = String(
      readFirst(record, [
        'image_url',
        'image',
        'header_image',
        'capsule_image',
        'thumbnail',
        'thumbnail_url',
      ]) ??
        getSteamHeaderImage(steamAppId) ??
        '',
    )

    return {
      id: String(
        readFirst(record, [
          'id',
          'game_id',
          'steam_appid',
          'app_id',
          'appid',
          'steamAppId',
        ]) ?? index,
      ),
      steamAppId,
      name: String(readFirst(record, ['name', 'title']) ?? '이름 없음'),
      genre,
      positiveRate,
      neutralRate,
      negativeRate,
      reviewCount: getReviewCountFromRecord(record),
      image,
    }
  })
}

function normalizeSentiment(sentiment: SentimentAnalysis | null) {
  const record = toRecord(sentiment)

  const positiveCount = toNumber(
    readFirst(record, [
      'positive_count',
      'positive_reviews',
      'positiveReviewCount',
      'positive_review_count',
    ]),
  )
  const neutralCount = toNumber(
    readFirst(record, [
      'neutral_count',
      'neutral_reviews',
      'neutralReviewCount',
      'neutral_review_count',
    ]),
  )
  const negativeCount = toNumber(
    readFirst(record, [
      'negative_count',
      'negative_reviews',
      'negativeReviewCount',
      'negative_review_count',
    ]),
  )

  const countTotal = positiveCount + neutralCount + negativeCount

  if (countTotal > 0) {
    return {
      positive: (positiveCount / countTotal) * 100,
      neutral: (neutralCount / countTotal) * 100,
      negative: (negativeCount / countTotal) * 100,
      positiveCount,
      neutralCount,
      negativeCount,
      totalCount: countTotal,
    }
  }

  const positive = normalizeRatio(
    readFirst(record, ['positive_ratio', 'positiveRate', 'positive']),
  )
  const neutral = normalizeRatio(
    readFirst(record, ['neutral_ratio', 'neutralRate', 'neutral']),
  )
  const negative = normalizeRatio(
    readFirst(record, ['negative_ratio', 'negativeRate', 'negative']),
  )

  const ratioTotal = positive + neutral + negative

  if (ratioTotal === 0) {
    return {
      positive: 0,
      neutral: 0,
      negative: 0,
      positiveCount: 0,
      neutralCount: 0,
      negativeCount: 0,
      totalCount: 0,
    }
  }

  const normalizedPositive = (positive / ratioTotal) * 100
  const normalizedNeutral = (neutral / ratioTotal) * 100
  const normalizedNegative = (negative / ratioTotal) * 100

  const totalReviewCount = toNumber(
    readFirst(record, ['total_count', 'total_reviews', 'review_count', 'reviews']),
  )

  return {
    positive: normalizedPositive,
    neutral: normalizedNeutral,
    negative: normalizedNegative,
    positiveCount:
      totalReviewCount > 0
        ? Math.round((normalizedPositive / 100) * totalReviewCount)
        : Math.round(normalizedPositive),
    neutralCount:
      totalReviewCount > 0
        ? Math.round((normalizedNeutral / 100) * totalReviewCount)
        : Math.round(normalizedNeutral),
    negativeCount:
      totalReviewCount > 0
        ? Math.round((normalizedNegative / 100) * totalReviewCount)
        : Math.round(normalizedNegative),
    totalCount: totalReviewCount,
  }
}

function createFallbackSentiment(game?: ReviewGameView) {
  if (!game) {
    return {
      positive: 0,
      neutral: 0,
      negative: 0,
      positiveCount: 0,
      neutralCount: 0,
      negativeCount: 0,
      totalCount: 0,
    }
  }

  const neutral = game.neutralRate > 0 ? game.neutralRate : 100 - game.positiveRate - game.negativeRate

  return {
    positive: game.positiveRate,
    neutral: Math.max(0, neutral),
    negative: game.negativeRate,
    positiveCount: Math.round((game.positiveRate / 100) * game.reviewCount),
    neutralCount: Math.round((Math.max(0, neutral) / 100) * game.reviewCount),
    negativeCount: Math.round((game.negativeRate / 100) * game.reviewCount),
    totalCount: game.reviewCount,
  }
}

function normalizeTopicKeywords(topics: TopicAnalysis[]): TopicKeyword[] {
  const labels = topics
    .flatMap((topic, index) => createTopicLabels(topic, index))
    .map(convertTopicToKoreanCategory)
    .filter(Boolean)

  const uniqueLabels = Array.from(new Set(labels)).slice(0, 7)

  return uniqueLabels.map((label, index) => ({
    label,
    size: Math.max(1, 5 - Math.floor(index / 2)),
  }))
}

function createTopicLabels(topic: TopicAnalysis, index: number) {
  const record = toRecord(topic)

  const directName = pickMeaningfulText(
    readFirst(record, [
      'topic_name',
      'topicName',
      'topic_label',
      'topicLabel',
      'display_name',
      'label',
      'name',
      'keyword',
    ]),
  )

  const keywordValue = readFirst(record, [
    'keywords',
    'top_keywords',
    'topKeywords',
    'words',
    'top_words',
    'topWords',
    'terms',
  ])

  const keywordLabels = toKeywordArray(keywordValue)

  if (directName && keywordLabels.length > 0) {
    return [directName, ...keywordLabels]
  }

  if (keywordLabels.length > 0) {
    return keywordLabels
  }

  if (directName) {
    return [directName]
  }

  return [`토픽 ${index + 1}`]
}

function convertTopicToKoreanCategory(label: string) {
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

  return formatTopicText(label)
}

function calculateCompoundScore(values: {
  positive: number
  neutral: number
  negative: number
}) {
  const score = (values.positive - values.negative) / 100
  return score.toFixed(2)
}

function getBestReviewCount(
  game: ReviewGameView | undefined,
  values: { totalCount: number },
) {
  if (values.totalCount > 0) return values.totalCount
  return game?.reviewCount ?? 0
}

function getReviewCountFromRecord(record: Record<string, unknown>) {
  return toNumber(
    readFirst(record, [
      'review_count',
      'reviewCount',
      'total_reviews',
      'totalReviews',
      'reviews',
      'reviews_count',
      'num_reviews',
      'total_review_count',
      'positive_count',
      'positive_reviews',
    ]),
  )
}

function readFirst(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]

    if (value !== undefined && value !== null && value !== '') {
      return value
    }
  }

  return undefined
}

function toRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object') {
    return value as Record<string, unknown>
  }

  return {}
}

function toKeywordArray(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter((item) => item && !isInvalidText(item))
  }

  if (typeof value === 'string') {
    return value
      .split(/[,/|·\n\s]+/)
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
