import { useEffect, useMemo, useState } from 'react'
import './GameDetailPage.css'

type ApiRecord = Record<string, unknown>

type GameSummary = {
  id: string
  gameId: string | number
  name: string
  genre: string
  image?: string
}

type GameDetailView = {
  id: string
  gameId: string | number
  name: string
  genre: string
  genres: string[]
  price: number
  priceLabel: string
  owners: string
  positiveReviews: number
  negativeReviews: number
  totalReviews: number
  positiveRate: number
  negativeRate: number
  averagePlaytime: number
  releaseDate: string
  developer: string
  publisher: string
  metacriticScore: string
  platforms: string[]
  image?: string
}

type SentimentView = {
  positive: number
  neutral: number
  negative: number
  positiveCount: number
  neutralCount: number
  negativeCount: number
  totalCount: number
}

type TopicView = {
  id: string
  title: string
  keywords: string[]
  mentionRate: number
  positiveRate: number
  sentimentLabel: string
}

type TrendPoint = {
  label: string
  price: number
  positiveRate: number
  reviewCount: number
}

type ReviewInsight = {
  positiveSummary: string
  negativeSummary: string
  quickFacts: {
    label: string
    value: string
  }[]
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'https://steam-market-dashboard-production.up.railway.app'

function GameDetailPage() {
  const [games, setGames] = useState<ApiRecord[]>([])
  const [selectedGameId, setSelectedGameId] = useState<string>('')
  const [searchText, setSearchText] = useState('')
  const [selectedTab, setSelectedTab] = useState<
    'overview' | 'price' | 'sentiment' | 'topic'
  >('overview')

  const [gameDetail, setGameDetail] = useState<ApiRecord | null>(null)
  const [sentimentData, setSentimentData] = useState<ApiRecord | null>(null)
  const [topicData, setTopicData] = useState<ApiRecord[]>([])
  const [historyData, setHistoryData] = useState<ApiRecord[]>([])
  const [reviewTrendData, setReviewTrendData] = useState<ApiRecord[]>([])
  const [reviewInsightData, setReviewInsightData] = useState<unknown>(null)

  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function loadGames() {
      try {
        setLoading(true)
        setErrorMessage('')

        const data = await requestApi('/games')
        const gameList = extractArray(data)

        setGames(gameList)

        const firstGame = gameList.find((game) => getGameId(game) !== undefined)

        if (firstGame) {
          setSelectedGameId(String(toSafeGameId(getGameId(firstGame), 0)))
        }
      } catch (error) {
        console.error(error)
        setErrorMessage('게임 목록을 불러오지 못했습니다.')
      } finally {
        setLoading(false)
      }
    }

    loadGames()
  }, [])

  useEffect(() => {
    async function loadSelectedGame() {
      if (!selectedGameId) {
        return
      }

      try {
        setDetailLoading(true)

        const [
          detailResult,
          sentimentResult,
          topicResult,
          historyResult,
          reviewTrendResult,
          reviewInsightResult,
        ] = await Promise.allSettled([
          requestApi(`/games/${selectedGameId}`),
          requestApi(`/games/${selectedGameId}/sentiment`),
          requestApi(`/games/${selectedGameId}/topics`),
          requestApi(`/games/${selectedGameId}/history`),
          requestApi(`/games/${selectedGameId}/review-trend`),
          requestApi(`/games/${selectedGameId}/reviews/insights`),
        ])

        if (detailResult.status === 'fulfilled') {
          setGameDetail(extractObject(detailResult.value))
        } else {
          const fallback = games.find((game, index) => {
            const gameId = toSafeGameId(getGameId(game), index)
            return String(gameId) === selectedGameId
          })

          setGameDetail(fallback ?? null)
        }

        if (sentimentResult.status === 'fulfilled') {
          setSentimentData(extractObject(sentimentResult.value))
        } else {
          setSentimentData(null)
        }

        if (topicResult.status === 'fulfilled') {
          setTopicData(extractArray(topicResult.value))
        } else {
          setTopicData([])
        }

        if (historyResult.status === 'fulfilled') {
          setHistoryData(extractArray(historyResult.value))
        } else {
          setHistoryData([])
        }

        if (reviewTrendResult.status === 'fulfilled') {
          setReviewTrendData(extractArray(reviewTrendResult.value))
        } else {
          setReviewTrendData([])
        }

        if (reviewInsightResult.status === 'fulfilled') {
          setReviewInsightData(reviewInsightResult.value)
        } else {
          setReviewInsightData(null)
        }
      } catch (error) {
        console.error(error)
      } finally {
        setDetailLoading(false)
      }
    }

    loadSelectedGame()
  }, [games, selectedGameId])

  const gameSummaries = useMemo(() => {
    return games.map((game, index) => normalizeGameSummary(game, index))
  }, [games])

  const filteredGames = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    if (!keyword) {
      return gameSummaries.slice(0, 8)
    }

    return gameSummaries
      .filter((game) => {
        return (
          game.name.toLowerCase().includes(keyword) ||
          game.genre.toLowerCase().includes(keyword)
        )
      })
      .slice(0, 8)
  }, [gameSummaries, searchText])

  const selectedGame = useMemo(() => {
    const fallback = games.find((game, index) => {
      const gameId = toSafeGameId(getGameId(game), index)
      return String(gameId) === selectedGameId
    })

    const targetGame = gameDetail ?? fallback

    if (!targetGame) {
      return null
    }

    return normalizeGameDetail(targetGame)
  }, [gameDetail, games, selectedGameId])

  const sentiment = useMemo(() => {
    return normalizeSentiment(sentimentData, selectedGame)
  }, [sentimentData, selectedGame])

  const topics = useMemo(() => {
    return normalizeTopics(topicData).slice(0, 5)
  }, [topicData])

  const trendPoints = useMemo(() => {
    return normalizeTrendPoints(historyData, reviewTrendData, selectedGame)
  }, [historyData, reviewTrendData, selectedGame])

  const reviewInsight = useMemo(() => {
    return normalizeReviewInsight(reviewInsightData, selectedGame, sentiment, topics)
  }, [reviewInsightData, selectedGame, sentiment, topics])

  function handleSelectGame(gameId: string | number) {
    setSelectedGameId(String(gameId))
    setSearchText('')
    setSelectedTab('overview')
  }

  if (loading) {
    return (
      <section className="status-card">
        <strong>게임 상세 데이터를 불러오는 중입니다...</strong>
        <p>백엔드 API에서 게임 목록을 가져오고 있습니다.</p>
      </section>
    )
  }

  if (errorMessage) {
    return (
      <section className="status-card error">
        <strong>게임 상세 데이터 로드 실패</strong>
        <p>{errorMessage}</p>
      </section>
    )
  }

  if (!selectedGame) {
    return (
      <section className="status-card">
        <strong>표시할 게임이 없습니다.</strong>
        <p>게임 목록 API에서 유효한 게임 데이터를 찾지 못했습니다.</p>
      </section>
    )
  }

  return (
    <div className="game-detail-page">
      <section className="game-detail-header">
        <div>
          <h1>게임 상세 분석</h1>
          <p>게임을 검색하고 선택하면 해당 게임의 분석 결과가 자동으로 변경됩니다.</p>
        </div>

        <div className="game-detail-search-box">
          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="게임명, 장르로 검색"
            type="text"
          />

          {searchText.trim() && (
            <div className="game-detail-search-dropdown">
              {filteredGames.length > 0 ? (
                filteredGames.map((game) => (
                  <button
                    key={game.id}
                    onClick={() => handleSelectGame(game.gameId)}
                    type="button"
                  >
                    <span className="game-detail-search-thumb">
                      {game.image ? (
                        <img src={game.image} alt={`${game.name} 이미지`} />
                      ) : (
                        game.name.slice(0, 2)
                      )}
                    </span>

                    <span>
                      <strong>{game.name}</strong>
                      <em>{game.genre}</em>
                    </span>
                  </button>
                ))
              ) : (
                <p>검색 결과가 없습니다.</p>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="game-detail-layout">
        <aside className="game-detail-result-panel">
          <div className="game-detail-panel-title">
            <strong>검색 결과</strong>
            <span>{filteredGames.length}개 표시</span>
          </div>

          <div className="game-detail-result-list">
            {filteredGames.map((game) => (
              <button
                className={String(game.gameId) === selectedGameId ? 'active' : ''}
                key={game.id}
                onClick={() => handleSelectGame(game.gameId)}
                type="button"
              >
                <span className="game-detail-result-thumb">
                  {game.image ? (
                    <img src={game.image} alt={`${game.name} 이미지`} />
                  ) : (
                    game.name.slice(0, 2)
                  )}
                </span>

                <span className="game-detail-result-text">
                  <strong>{game.name}</strong>
                  <em>{game.genre}</em>
                </span>
              </button>
            ))}
          </div>
        </aside>

        <div className="game-detail-main-area">
          <section className="game-detail-hero-card">
            <div className="game-detail-cover">
              {selectedGame.image ? (
                <img src={selectedGame.image} alt={`${selectedGame.name} 이미지`} />
              ) : (
                <div>{selectedGame.name.slice(0, 2)}</div>
              )}
            </div>

            <div className="game-detail-hero-info">
              <div className="game-detail-title-row">
                <div>
                  <h2>{selectedGame.name}</h2>
                  <div className="game-detail-tags">
                    {selectedGame.genres.slice(0, 5).map((genre) => (
                      <span key={genre}>{genre}</span>
                    ))}
                  </div>
                </div>

                {detailLoading && <em>분석 데이터 업데이트 중...</em>}
              </div>

              <div className="game-detail-meta-grid">
                <MetaItem label="개발사" value={selectedGame.developer} />
                <MetaItem label="배급사" value={selectedGame.publisher} />
                <MetaItem label="출시일" value={selectedGame.releaseDate} />
                <MetaItem label="메타스코어" value={selectedGame.metacriticScore} />
                <MetaItem
                  label="평가"
                  value={`매우 긍정적 (${selectedGame.positiveRate.toFixed(1)}%)`}
                  positive
                />
              </div>
            </div>

            <div className="game-detail-action-card">
              <span>현재 가격</span>
              <strong>{selectedGame.priceLabel}</strong>
              <button type="button">Steam 상점 이동</button>
              <button className="secondary" type="button">
                관심 게임 추가
              </button>
            </div>
          </section>

          <section className="game-detail-tab-card">
            <button
              className={selectedTab === 'overview' ? 'active' : ''}
              onClick={() => setSelectedTab('overview')}
              type="button"
            >
              개요
            </button>
            <button
              className={selectedTab === 'price' ? 'active' : ''}
              onClick={() => setSelectedTab('price')}
              type="button"
            >
              가격 & 리뷰 추이
            </button>
            <button
              className={selectedTab === 'sentiment' ? 'active' : ''}
              onClick={() => setSelectedTab('sentiment')}
              type="button"
            >
              리뷰 감성 분석
            </button>
            <button
              className={selectedTab === 'topic' ? 'active' : ''}
              onClick={() => setSelectedTab('topic')}
              type="button"
            >
              토픽 분석
            </button>
          </section>

          <section className="game-detail-summary-grid">
            <SummaryCard
              title="긍정 비율"
              value={`${sentiment.positive.toFixed(1)}%`}
              description="선택 게임 기준"
              type="positive"
            />
            <SummaryCard
              title="총 리뷰 수"
              value={formatNumber(sentiment.totalCount || selectedGame.totalReviews)}
              description="긍정/중립/부정 합산"
              type="blue"
            />
            <SummaryCard
              title="평균 플레이타임"
              value={`${formatNumber(selectedGame.averagePlaytime)}분`}
              description="제공 데이터 기준"
              type="neutral"
            />
            <SummaryCard
              title="보유자 추정"
              value={selectedGame.owners}
              description="SteamSpy 기준"
              type="blue"
            />
            <SummaryCard
              title="현재 가격"
              value={selectedGame.priceLabel}
              description="Steam 가격 기준"
              type="neutral"
            />
          </section>

          <section className="game-detail-chart-grid">
            <article className="game-detail-card">
              <div className="game-detail-card-head">
                <h3>가격 변동 추이</h3>
                <div>
                  <button type="button">7일</button>
                  <button className="active" type="button">
                    30일
                  </button>
                  <button type="button">90일</button>
                </div>
              </div>

              <div className="game-detail-line-chart">
                {trendPoints.map((point, index) => (
                  <span
                    key={`${point.label}-${index}`}
                    style={{
                      left: `${(index / Math.max(trendPoints.length - 1, 1)) * 100}%`,
                      bottom: `${Math.max(8, Math.min(90, point.price * 1.3))}%`,
                    }}
                    title={`${point.label} / $${point.price.toFixed(2)}`}
                  />
                ))}

                <div className="game-detail-chart-labels">
                  {trendPoints.map((point) => (
                    <em key={point.label}>{point.label}</em>
                  ))}
                </div>
              </div>
            </article>

            <article className="game-detail-card">
              <div className="game-detail-card-head">
                <h3>리뷰 수 & 긍정 비율 추이</h3>
                <div>
                  <button type="button">7일</button>
                  <button className="active" type="button">
                    30일
                  </button>
                  <button type="button">90일</button>
                </div>
              </div>

              <div className="game-detail-bar-chart">
                {trendPoints.map((point) => (
                  <div key={point.label}>
                    <span
                      style={{
                        height: `${Math.max(12, Math.min(92, point.positiveRate))}%`,
                      }}
                    />
                    <em>{point.label}</em>
                  </div>
                ))}
              </div>
            </article>

            <article className="game-detail-card sentiment-card">
              <div className="game-detail-card-head">
                <h3>리뷰 감성 분석</h3>
              </div>

              <div className="game-detail-sentiment-content">
                <div
                  className="game-detail-donut"
                  style={{
                    background: `conic-gradient(
                      #42b96e 0% ${sentiment.positive}%,
                      #c8ccd5 ${sentiment.positive}% ${
                        sentiment.positive + sentiment.neutral
                      }%,
                      #ef5b5b ${sentiment.positive + sentiment.neutral}% 100%
                    )`,
                  }}
                >
                  <div>
                    <span>총 리뷰</span>
                    <strong>
                      {formatNumber(sentiment.totalCount || selectedGame.totalReviews)}
                    </strong>
                  </div>
                </div>

                <div className="game-detail-sentiment-list">
                  <SentimentRow
                    label="긍정"
                    rate={sentiment.positive}
                    count={sentiment.positiveCount}
                    color="green"
                  />
                  <SentimentRow
                    label="중립"
                    rate={sentiment.neutral}
                    count={sentiment.neutralCount}
                    color="gray"
                  />
                  <SentimentRow
                    label="부정"
                    rate={sentiment.negative}
                    count={sentiment.negativeCount}
                    color="red"
                  />
                </div>
              </div>
            </article>
          </section>

          <section className="game-detail-bottom-grid">
            <article className="game-detail-card">
              <div className="game-detail-card-head">
                <h3>주요 토픽 TOP 5</h3>
              </div>

              {topics.length > 0 ? (
                <div className="game-detail-topic-list">
                  {topics.map((topic, index) => (
                    <div className="game-detail-topic-row" key={topic.id}>
                      <span>{index + 1}</span>
                      <strong>{topic.title}</strong>
                      <em>{topic.mentionRate.toFixed(1)}%</em>
                      <small>{topic.sentimentLabel}</small>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="game-detail-empty">토픽 데이터가 없습니다.</p>
              )}
            </article>

            <article className="game-detail-card keyword-card positive">
              <div className="game-detail-card-head">
                <h3>긍정 리뷰 키워드</h3>
              </div>

              <div className="game-detail-keyword-cloud">
                {getPositiveKeywords(topics).map((keyword) => (
                  <span key={keyword}>{keyword}</span>
                ))}
              </div>
            </article>

            <article className="game-detail-card keyword-card negative">
              <div className="game-detail-card-head">
                <h3>부정 리뷰 키워드</h3>
              </div>

              <div className="game-detail-keyword-cloud">
                {getNegativeKeywords().map((keyword) => (
                  <span key={keyword}>{keyword}</span>
                ))}
              </div>
            </article>

            <article className="game-detail-card quick-summary-card">
              <div className="game-detail-card-head">
                <h3>빠른 요약</h3>
              </div>

              <ul>
                <li>{reviewInsight.positiveSummary}</li>
                <li>{reviewInsight.negativeSummary}</li>
                <li>
                  {selectedGame.name}의 현재 긍정 비율은{' '}
                  {sentiment.positive.toFixed(1)}%입니다.
                </li>
                <li>선택 게임 기준으로 분석 결과가 동적으로 변경됩니다.</li>
              </ul>
            </article>
          </section>
        </div>
      </section>
    </div>
  )
}

function MetaItem({
  label,
  value,
  positive = false,
}: {
  label: string
  value: string
  positive?: boolean
}) {
  return (
    <div className="game-detail-meta-item">
      <span>{label}</span>
      <strong className={positive ? 'positive' : ''}>{value}</strong>
    </div>
  )
}

function SummaryCard({
  title,
  value,
  description,
  type,
}: {
  title: string
  value: string
  description: string
  type: 'positive' | 'blue' | 'neutral'
}) {
  return (
    <article className={`game-detail-summary-card ${type}`}>
      <span>{title}</span>
      <strong>{value}</strong>
      <p>{description}</p>
    </article>
  )
}

function SentimentRow({
  label,
  rate,
  count,
  color,
}: {
  label: string
  rate: number
  count: number
  color: 'green' | 'gray' | 'red'
}) {
  return (
    <div className="game-detail-sentiment-row">
      <i className={color} />
      <span>{label}</span>
      <strong>{rate.toFixed(1)}%</strong>
      <em>{formatNumber(count)}</em>
    </div>
  )
}

async function requestApi(path: string) {
  const response = await fetch(`${API_BASE_URL}${path}`)

  if (!response.ok) {
    throw new Error(`${path} API 요청 실패: ${response.status}`)
  }

  return response.json()
}

function extractArray(data: unknown): ApiRecord[] {
  if (Array.isArray(data)) {
    return data.filter(isRecord)
  }

  if (isRecord(data)) {
    const candidates = [
      data.items,
      data.data,
      data.results,
      data.games,
      data.rankings,
      data.topics,
      data.history,
      data.trend,
      data.review_trend,
    ]

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate.filter(isRecord)
      }
    }
  }

  return []
}

function extractObject(data: unknown): ApiRecord | null {
  if (isRecord(data)) {
    const candidates = [data.data, data.game, data.result, data.detail]

    for (const candidate of candidates) {
      if (isRecord(candidate)) {
        return candidate
      }
    }

    return data
  }

  return null
}

function isRecord(value: unknown): value is ApiRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeGameSummary(game: ApiRecord, index: number): GameSummary {
  const gameId = toSafeGameId(getGameId(game), index)
  const genre = getGenres(game)[0] ?? '장르 없음'

  return {
    id: String(gameId),
    gameId,
    name: getGameName(game),
    genre,
    image: getGameImage(game),
  }
}

function normalizeGameDetail(game: ApiRecord): GameDetailView {
  const gameId = toSafeGameId(getGameId(game), 'unknown')
  const positiveReviews = toNumber(game.positive_reviews ?? game.positiveReviews)
  const negativeReviews = toNumber(game.negative_reviews ?? game.negativeReviews)
  const totalReviews =
    positiveReviews + negativeReviews ||
    toNumber(game.total_reviews ?? game.totalReviews ?? game.review_count)

  const price = normalizePrice(game.price ?? game.price_usd ?? game.current_price)
  const isFree = Boolean(game.is_free ?? game.free ?? game.isFree) || price <= 0
  const genres = getGenres(game)

  return {
    id: String(gameId),
    gameId,
    name: getGameName(game),
    genre: genres[0] ?? '장르 없음',
    genres,
    price,
    priceLabel: isFree ? '무료' : `$${price.toFixed(2)}`,
    owners: getOwners(game),
    positiveReviews,
    negativeReviews,
    totalReviews,
    positiveRate: getPositiveRate(game),
    negativeRate: getNegativeRate(game),
    averagePlaytime: toNumber(game.average_playtime ?? game.avg_playtime),
    releaseDate: formatDate(game.release_date ?? game.releaseDate),
    developer: String(game.developer ?? game.developers ?? '정보 없음'),
    publisher: String(game.publisher ?? game.publishers ?? '정보 없음'),
    metacriticScore:
      game.metacritic_score === null || game.metacritic_score === undefined
        ? '정보 없음'
        : String(game.metacritic_score),
    platforms: getPlatforms(game),
    image: getGameImage(game),
  }
}

function normalizeSentiment(
  sentimentData: ApiRecord | null,
  selectedGame: GameDetailView | null,
): SentimentView {
  if (sentimentData) {
    const positive =
      normalizeRatio(
        sentimentData.positive_ratio ??
          sentimentData.positive_rate ??
          sentimentData.positiveRate,
      ) ||
      selectedGame?.positiveRate ||
      0

    const negative =
      normalizeRatio(
        sentimentData.negative_ratio ??
          sentimentData.negative_rate ??
          sentimentData.negativeRate,
      ) ||
      selectedGame?.negativeRate ||
      0

    const neutral =
      normalizeRatio(
        sentimentData.neutral_ratio ??
          sentimentData.neutral_rate ??
          sentimentData.neutralRate,
      ) || Math.max(0, 100 - positive - negative)

    return {
      positive,
      neutral,
      negative,
      positiveCount: toNumber(
        sentimentData.positive ??
          sentimentData.positive_reviews ??
          selectedGame?.positiveReviews,
      ),
      neutralCount: toNumber(sentimentData.neutral ?? sentimentData.neutral_reviews),
      negativeCount: toNumber(
        sentimentData.negative ??
          sentimentData.negative_reviews ??
          selectedGame?.negativeReviews,
      ),
      totalCount: toNumber(sentimentData.total ?? selectedGame?.totalReviews),
    }
  }

  if (!selectedGame) {
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
    positive: selectedGame.positiveRate,
    negative: selectedGame.negativeRate,
    neutral: Math.max(0, 100 - selectedGame.positiveRate - selectedGame.negativeRate),
    positiveCount: selectedGame.positiveReviews,
    negativeCount: selectedGame.negativeReviews,
    neutralCount: 0,
    totalCount: selectedGame.totalReviews,
  }
}

function normalizeTopics(topicData: ApiRecord[]): TopicView[] {
  return topicData.map((topic, index) => {
    const keywords = getKeywords(topic).map((keyword) => translateKeyword(keyword))

    const mentionRate =
      normalizeRatio(
        topic.mention_rate ??
          topic.weight_percent ??
          topic.percentage ??
          topic.percent ??
          topic.ratio ??
          topic.weight,
      ) || Math.max(8, 28 - index * 4)

    const positiveRate = normalizeRatio(topic.positive_ratio ?? topic.positive_rate)

    return {
      id: String(topic.topic_id ?? topic.id ?? index),
      title: String(topic.topic ?? topic.name ?? keywords[0] ?? `토픽 ${index + 1}`),
      keywords: keywords.length > 0 ? keywords : ['키워드 없음'],
      mentionRate,
      positiveRate,
      sentimentLabel:
        positiveRate >= 70
          ? '매우 긍정'
          : positiveRate >= 50
            ? '긍정'
            : positiveRate > 0
              ? '혼합'
              : '분석 중',
    }
  })
}

function normalizeTrendPoints(
  historyData: ApiRecord[],
  reviewTrendData: ApiRecord[],
  selectedGame: GameDetailView | null,
): TrendPoint[] {
  const source = reviewTrendData.length > 0 ? reviewTrendData : historyData

  if (source.length > 0) {
    return source.slice(-6).map((item, index) => {
      const label = String(item.date ?? item.month ?? item.period ?? item.label ?? index + 1)

      return {
        label: label.length > 7 ? label.slice(5, 10) : label,
        price: normalizePrice(item.price ?? item.price_usd ?? item.current_price),
        positiveRate:
          normalizeRatio(item.positive_ratio ?? item.positive_rate) ||
          selectedGame?.positiveRate ||
          0,
        reviewCount: toNumber(item.review_count ?? item.total_reviews ?? item.reviews),
      }
    })
  }

  const baseRate = selectedGame?.positiveRate ?? 0
  const basePrice = selectedGame?.price ?? 0
  const baseReviews = selectedGame?.totalReviews ?? 0

  return ['05.16', '05.21', '05.26', '05.31', '06.05', '06.10'].map(
    (label, index) => ({
      label,
      price: Math.max(0, basePrice - index * 0.7),
      positiveRate: Math.max(0, Math.min(100, baseRate - 4 + index * 1.2)),
      reviewCount: Math.round(baseReviews * (0.62 + index * 0.07)),
    }),
  )
}

function normalizeReviewInsight(
  reviewInsightData: unknown,
  selectedGame: GameDetailView | null,
  sentiment: SentimentView,
  topics: TopicView[],
): ReviewInsight {
  const record = isRecord(reviewInsightData) ? reviewInsightData : {}

  const positiveSummary = String(
    record.positive_summary ??
      record.positiveSummary ??
      record.positive_review ??
      '뛰어난 게임성, 몰입감, 전투 경험, 세계관에 대한 만족도가 높게 나타납니다.',
  )

  const negativeSummary = String(
    record.negative_summary ??
      record.negativeSummary ??
      record.negative_review ??
      '난이도, 최적화, 가격, 반복 콘텐츠와 관련된 불만 요소가 일부 나타날 수 있습니다.',
  )

  return {
    positiveSummary,
    negativeSummary,
    quickFacts: [
      {
        label: '긍정 비율',
        value: `${sentiment.positive.toFixed(1)}%`,
      },
      {
        label: '대표 토픽',
        value: topics[0]?.title ?? '토픽 없음',
      },
      {
        label: '리뷰 규모',
        value: formatNumber(selectedGame?.totalReviews ?? 0),
      },
      {
        label: '가격',
        value: selectedGame?.priceLabel ?? '정보 없음',
      },
    ],
  }
}

function getGameId(game: ApiRecord) {
  return game.game_id ?? game.id ?? game.app_id ?? game.appid ?? game.steam_appid
}

function toSafeGameId(value: unknown, fallback: string | number): string | number {
  if (typeof value === 'string' || typeof value === 'number') {
    return value
  }

  return fallback
}

function getGameName(game: ApiRecord) {
  return String(game.name ?? game.title ?? '이름 없음')
}

function getGenres(game: ApiRecord) {
  if (Array.isArray(game.genres)) {
    return game.genres.map((genre) => String(genre).trim()).filter(Boolean)
  }

  const raw = String(game.genre ?? game.genres ?? '')

  const result = raw
    .split(',')
    .map((genre) => genre.trim())
    .filter(Boolean)

  return result.length > 0 ? result : ['장르 없음']
}

function getOwners(game: ApiRecord) {
  return String(
    game.owners ??
      game.estimated_owners ??
      game.owners_text ??
      game.owners_range ??
      game.owners_value ??
      '정보 없음',
  )
}

function getPlatforms(game: ApiRecord) {
  const platforms = []

  if (game.is_windows || game.windows) {
    platforms.push('Windows')
  }

  if (game.is_mac || game.mac) {
    platforms.push('Mac')
  }

  if (game.is_linux || game.linux) {
    platforms.push('Linux')
  }

  return platforms.length > 0 ? platforms : ['플랫폼 정보 없음']
}

function getGameImage(game: ApiRecord) {
  if (typeof game.header_image === 'string' && game.header_image) {
    return game.header_image
  }

  if (typeof game.capsule_image === 'string' && game.capsule_image) {
    return game.capsule_image
  }

  if (typeof game.image === 'string' && game.image) {
    return game.image
  }

  const gameId = toSafeGameId(getGameId(game), '')

  if (!gameId) {
    return undefined
  }

  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${gameId}/header.jpg`
}

function getPositiveRate(game: ApiRecord) {
  const positive = toNumber(game.positive_reviews ?? game.positiveReviews)
  const negative = toNumber(game.negative_reviews ?? game.negativeReviews)
  const total = positive + negative

  if (total > 0) {
    return (positive / total) * 100
  }

  return normalizeRatio(game.positive_ratio ?? game.positive_rate)
}

function getNegativeRate(game: ApiRecord) {
  const positive = toNumber(game.positive_reviews ?? game.positiveReviews)
  const negative = toNumber(game.negative_reviews ?? game.negativeReviews)
  const total = positive + negative

  if (total > 0) {
    return (negative / total) * 100
  }

  return normalizeRatio(game.negative_ratio ?? game.negative_rate)
}

function getKeywords(topic: ApiRecord) {
  const candidates = [
    topic.keywords,
    topic.top_keywords,
    topic.topKeywords,
    topic.words,
    topic.terms,
  ]

  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length > 0) {
      return candidate.map((keyword) => String(keyword))
    }
  }

  return []
}

function getPositiveKeywords(topics: TopicView[]) {
  const keywords = topics.flatMap((topic) => topic.keywords)

  if (keywords.length > 0) {
    return keywords.slice(0, 12)
  }

  return ['재미있다', '그래픽', '탐험', '몰입감', '전투', '스토리', '자유도']
}

function getNegativeKeywords() {
  return ['어렵다', '버그', '불편하다', '난이도', '반복적', '카메라', '가이드 부족']
}

function translateKeyword(keyword: string) {
  const normalized = keyword.toLowerCase().trim()

  const dictionary: Record<string, string> = {
    game: '게임',
    gameplay: '게임플레이',
    story: '스토리',
    graphic: '그래픽',
    graphics: '그래픽',
    combat: '전투',
    boss: '보스전',
    open: '오픈월드',
    world: '세계관',
    sound: '사운드',
    music: '음악',
    price: '가격',
    dlc: 'DLC',
    bug: '버그',
    bugs: '버그',
    server: '서버',
    optimization: '최적화',
    performance: '성능',
    difficulty: '난이도',
    character: '캐릭터',
    fun: '재미',
    coop: '협동',
    friends: '협동',
  }

  return dictionary[normalized] ?? keyword
}

function normalizePrice(value: unknown) {
  const number = toNumber(value)

  if (number > 1000) {
    return number / 100
  }

  return number
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

function formatDate(value: unknown) {
  if (!value) {
    return '정보 없음'
  }

  const raw = String(value)

  if (raw.length >= 10) {
    return raw.slice(0, 10)
  }

  return raw
}

export default GameDetailPage
