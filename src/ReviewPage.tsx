import { useEffect, useMemo, useState } from 'react'
import {
  getDashboardSummary,
  getGameDetail,
  getGameSentiment,
  getGames,
  getSentimentAnalysis,
  getTopicAnalysis,
  type DashboardSummary,
  type Game,
  type SentimentAnalysis,
  type TopicAnalysis,
} from './api'

type ReviewGameView = {
  id: string
  gameId?: number
  name: string
  genre: string
  positiveReviews: number
  neutralReviews: number
  negativeReviews: number
  totalReviews: number
  positiveRate: number
  neutralRate: number
  negativeRate: number
  image?: string
}

type TopicKeyword = {
  label: string
  size: number
  percent: number
}

type NormalizedSentiment = {
  positive: number
  neutral: number
  negative: number
  positiveCount: number
  neutralCount: number
  negativeCount: number
  totalCount: number
}

const MIN_REVIEW_COUNT_FOR_TOP = 1000

function ReviewPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [games, setGames] = useState<Game[]>([])
  const [overallSentiment, setOverallSentiment] = useState<SentimentAnalysis | null>(
    null,
  )
  const [globalTopics, setGlobalTopics] = useState<TopicAnalysis[]>([])
  const [selectedGameId, setSelectedGameId] = useState('')
  const [gameSearchKeyword, setGameSearchKeyword] = useState('')
  const [selectedGameDetail, setSelectedGameDetail] = useState<Game | null>(null)
  const [selectedGameSentiment, setSelectedGameSentiment] =
    useState<SentimentAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function loadReviewData() {
      try {
        setLoading(true)
        setErrorMessage('')

        const [summaryResult, gamesResult, sentimentResult, topicResult] =
          await Promise.allSettled([
            getDashboardSummary(),
            getGames(),
            getSentimentAnalysis(),
            getTopicAnalysis(),
          ])

        if (summaryResult.status === 'fulfilled') {
          setSummary(summaryResult.value)
        }

        if (gamesResult.status === 'fulfilled' && Array.isArray(gamesResult.value)) {
          const safeGames = gamesResult.value
          const normalizedGames = normalizeReviewGames(safeGames)

          setGames(safeGames)

          if (normalizedGames[0]) {
            setSelectedGameId(normalizedGames[0].id)
          }
        }

        if (sentimentResult.status === 'fulfilled') {
          setOverallSentiment(sentimentResult.value)
        }

        if (topicResult.status === 'fulfilled' && Array.isArray(topicResult.value)) {
          setGlobalTopics(topicResult.value)
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

  const reviewGames = useMemo(() => normalizeReviewGames(games), [games])

  const filteredReviewGames = useMemo(() => {
    const keyword = gameSearchKeyword.trim().toLowerCase()

    if (!keyword) {
      return reviewGames
    }

    return reviewGames.filter((game) =>
      game.name.toLowerCase().includes(keyword),
    )
  }, [gameSearchKeyword, reviewGames])

  useEffect(() => {
    const keyword = gameSearchKeyword.trim()

    if (!keyword) return
    if (filteredReviewGames.length === 0) return

    const selectedExists = filteredReviewGames.some(
      (game) => game.id === selectedGameId,
    )

    if (!selectedExists) {
      setSelectedGameId(filteredReviewGames[0].id)
    }
  }, [filteredReviewGames, gameSearchKeyword, selectedGameId])

  useEffect(() => {
    async function loadSelectedGameData() {
      if (!selectedGameId) return

      try {
        setDetailLoading(true)

        const [detailResult, sentimentResult] = await Promise.allSettled([
          getGameDetail(selectedGameId),
          getGameSentiment(selectedGameId),
        ])

        setSelectedGameDetail(
          detailResult.status === 'fulfilled' ? detailResult.value : null,
        )

        setSelectedGameSentiment(
          sentimentResult.status === 'fulfilled' ? sentimentResult.value : null,
        )
      } catch (error) {
        console.error(error)
        setSelectedGameDetail(null)
        setSelectedGameSentiment(null)
      } finally {
        setDetailLoading(false)
      }
    }

    loadSelectedGameData()
  }, [selectedGameId])

  const selectedGameFromList = useMemo(() => {
    return reviewGames.find((game) => game.id === selectedGameId) ?? reviewGames[0]
  }, [reviewGames, selectedGameId])

  const selectedGame = useMemo(() => {
    if (!selectedGameFromList) return undefined

    const detailGame = selectedGameDetail
      ? normalizeReviewGames([selectedGameDetail])[0]
      : undefined

    if (!detailGame) {
      return selectedGameFromList
    }

    return detailGame.totalReviews > 0 ? detailGame : selectedGameFromList
  }, [selectedGameDetail, selectedGameFromList])

  const overallReviewCount = toNumber(
    readFirst(toRecord(summary), [
      'total_reviews',
      'totalReviews',
      'review_count',
      'reviewCount',
      'total',
    ]),
  )

  const overallValues = useMemo(() => {
    return normalizeSentiment(overallSentiment, overallReviewCount)
  }, [overallSentiment, overallReviewCount])

  const selectedValues = useMemo(() => {
    const apiSentiment = normalizeSentiment(
      selectedGameSentiment,
      selectedGame?.totalReviews ?? 0,
    )

    if (apiSentiment.totalCount > 0) {
      return apiSentiment
    }

    return createGameSentiment(selectedGame)
  }, [selectedGame, selectedGameSentiment])

  const topicKeywords = useMemo(() => {
    return normalizeTopicKeywords(globalTopics)
  }, [globalTopics])

  const positiveTopGames = useMemo(() => {
    return [...reviewGames]
      .filter((game) => game.totalReviews >= MIN_REVIEW_COUNT_FOR_TOP)
      .sort((a, b) => {
        if (b.positiveRate !== a.positiveRate) {
          return b.positiveRate - a.positiveRate
        }

        return b.totalReviews - a.totalReviews
      })
      .slice(0, 5)
  }, [reviewGames])

  const negativeTopGames = useMemo(() => {
    return [...reviewGames]
      .filter((game) => game.totalReviews >= MIN_REVIEW_COUNT_FOR_TOP)
      .sort((a, b) => {
        if (b.negativeRate !== a.negativeRate) {
          return b.negativeRate - a.negativeRate
        }

        return b.totalReviews - a.totalReviews
      })
      .slice(0, 5)
  }, [reviewGames])

  const selectedOptionValue = filteredReviewGames.some(
    (game) => game.id === selectedGame?.id,
  )
    ? selectedGame?.id ?? ''
    : ''

  if (loading) {
    return (
      <section className="review-status-card">
        <strong>리뷰 데이터를 불러오는 중입니다...</strong>
        <p>백엔드 API에서 리뷰 데이터를 가져오고 있습니다.</p>
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

          <input
            className="game-search-input"
            type="text"
            value={gameSearchKeyword}
            onChange={(event) => setGameSearchKeyword(event.target.value)}
            placeholder="게임 이름 검색"
          />

          <select
            className="game-select"
            value={selectedOptionValue}
            onChange={(event) => setSelectedGameId(event.target.value)}
          >
            {filteredReviewGames.length > 0 ? (
              filteredReviewGames.map((game) => (
                <option key={game.id} value={game.id}>
                  {game.name}
                </option>
              ))
            ) : (
              <option value="">검색 결과가 없습니다.</option>
            )}
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
              <span>긍정 리뷰 비율</span>
              <strong>{selectedValues.positive.toFixed(1)}%</strong>
            </div>
            <div>
              <span>리뷰 수</span>
              <strong>{formatNumber(selectedValues.totalCount)}</strong>
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
                  {selectedValues.neutral >= 8 && '중립'}
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

          <div className="keyword-cloud">
            {topicKeywords.map((keyword) => (
              <span
                key={`${keyword.label}-${keyword.percent}`}
                className={`keyword-size-${keyword.size}`}
                title={`${keyword.percent.toFixed(1)}%`}
              >
                {keyword.label}
              </span>
            ))}
          </div>
        </article>

        <article className="review-card ranking-card positive-ranking-card">
          <h2>긍정 리뷰가 높은 게임 TOP 5</h2>
          <ReviewRankingList games={positiveTopGames} valueKey="positiveRate" />
        </article>

        <article className="review-card ranking-card negative-ranking-card">
          <h2>부정 리뷰 비율 높은 게임 TOP 5</h2>
          <ReviewRankingList games={negativeTopGames} valueKey="negativeRate" />
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
}: {
  games: ReviewGameView[]
  valueKey: 'positiveRate' | 'negativeRate'
}) {
  if (games.length === 0) {
    return <p className="review-empty-text">표시할 게임 데이터가 없습니다.</p>
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
    const gameId = getGameId(game)

    const positiveReviews = toNumber(game.positive_reviews)
    const neutralReviews = toNumber(game.neutral_reviews)
    const negativeReviews = toNumber(game.negative_reviews)

    const totalReviewsFromCounts =
      positiveReviews + neutralReviews + negativeReviews

    const fallbackTotal = positiveReviews + negativeReviews

    const totalReviews =
      totalReviewsFromCounts > 0 ? totalReviewsFromCounts : fallbackTotal

    const positiveRate =
      totalReviews > 0 ? (positiveReviews / totalReviews) * 100 : 0

    const neutralRate =
      totalReviews > 0 ? (neutralReviews / totalReviews) * 100 : 0

    const negativeRate =
      totalReviews > 0 ? (negativeReviews / totalReviews) * 100 : 0

    return {
      id: String(gameId ?? index),
      gameId,
      name: getGameName(game),
      genre: getGameGenre(game),
      positiveReviews,
      neutralReviews,
      negativeReviews,
      totalReviews,
      positiveRate,
      neutralRate,
      negativeRate,
      image: gameId
        ? `https://cdn.cloudflare.steamstatic.com/steam/apps/${gameId}/header.jpg`
        : undefined,
    }
  })
}

function normalizeSentiment(
  sentiment: SentimentAnalysis | null,
  fallbackTotalCount = 0,
): NormalizedSentiment {
  if (!sentiment) {
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

  const record = toRecord(sentiment)

  const positiveCount = toNumber(
    readFirst(record, [
      'positive',
      'positive_count',
      'positive_reviews',
      'positiveReviewCount',
    ]),
  )

  const neutralCount = toNumber(
    readFirst(record, [
      'neutral',
      'neutral_count',
      'neutral_reviews',
      'neutralReviewCount',
    ]),
  )

  const negativeCount = toNumber(
    readFirst(record, [
      'negative',
      'negative_count',
      'negative_reviews',
      'negativeReviewCount',
    ]),
  )

  const totalFromCount = positiveCount + neutralCount + negativeCount

  if (totalFromCount > 0) {
    const positive = (positiveCount / totalFromCount) * 100
    const neutral = (neutralCount / totalFromCount) * 100
    const negative = (negativeCount / totalFromCount) * 100

    const displayTotal = toNumber(sentiment.total) || fallbackTotalCount || totalFromCount

    return {
      positive,
      neutral,
      negative,
      positiveCount: Math.round((positive / 100) * displayTotal),
      neutralCount: Math.round((neutral / 100) * displayTotal),
      negativeCount: Math.round((negative / 100) * displayTotal),
      totalCount: displayTotal,
    }
  }

  const positiveRatio = normalizeRatio(
    readFirst(record, [
      'positive_ratio',
      'positiveRate',
      'positive_rate',
      'sentiment_positive_ratio',
    ]),
  )

  const neutralRatio = normalizeRatio(
    readFirst(record, [
      'neutral_ratio',
      'neutralRate',
      'neutral_rate',
      'sentiment_neutral_ratio',
    ]),
  )

  const negativeRatio = normalizeRatio(
    readFirst(record, [
      'negative_ratio',
      'negativeRate',
      'negative_rate',
      'sentiment_negative_ratio',
    ]),
  )

  const ratioTotal = positiveRatio + neutralRatio + negativeRatio

  if (ratioTotal <= 0) {
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

  const positive = (positiveRatio / ratioTotal) * 100
  const neutral = (neutralRatio / ratioTotal) * 100
  const negative = (negativeRatio / ratioTotal) * 100
  const totalCount = toNumber(sentiment.total) || fallbackTotalCount

  return {
    positive,
    neutral,
    negative,
    positiveCount: Math.round((positive / 100) * totalCount),
    neutralCount: Math.round((neutral / 100) * totalCount),
    negativeCount: Math.round((negative / 100) * totalCount),
    totalCount,
  }
}

function createGameSentiment(game?: ReviewGameView): NormalizedSentiment {
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

  return {
    positive: game.positiveRate,
    neutral: game.neutralRate,
    negative: game.negativeRate,
    positiveCount: game.positiveReviews,
    neutralCount: game.neutralReviews,
    negativeCount: game.negativeReviews,
    totalCount: game.totalReviews,
  }
}

function normalizeTopicKeywords(topics: TopicAnalysis[]): TopicKeyword[] {
  if (!topics.length) {
    return [
      { label: '게임플레이', size: 5, percent: 0 },
      { label: '플레이 시간', size: 4, percent: 0 },
      { label: '스토리·전투', size: 4, percent: 0 },
      { label: '협동/재미', size: 3, percent: 0 },
      { label: '상점/기타', size: 2, percent: 0 },
    ]
  }

  return [...topics]
    .sort(
      (a, b) =>
        normalizeRatio(b.weight_percent ?? b.weight) -
        normalizeRatio(a.weight_percent ?? a.weight),
    )
    .slice(0, 5)
    .map((topic, index) => ({
      label: getTopicKoreanLabel(topic),
      size: getKeywordSize(index),
      percent: normalizeRatio(topic.weight_percent ?? topic.weight),
    }))
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

  if (topicIdMap[topicId]) return topicIdMap[topicId]

  const keywords = Array.isArray(topic.keywords) ? topic.keywords : []
  const keywordText = keywords.join(' ').toLowerCase()

  if (keywordText.includes('story') || keywordText.includes('combat')) {
    return '스토리·전투'
  }

  if (keywordText.includes('friend') || keywordText.includes('fun')) {
    return '협동/재미'
  }

  if (keywordText.includes('time')) {
    return '플레이 시간'
  }

  if (keywordText.includes('shop')) {
    return '상점/기타'
  }

  return '게임플레이'
}

function getKeywordSize(index: number) {
  if (index === 0) return 5
  if (index <= 2) return 4
  if (index === 3) return 3
  return 2
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

  if (number > 0 && number <= 1) {
    return number * 100
  }

  return number
}

function formatNumber(value: number) {
  return value.toLocaleString()
}

export default ReviewPage
