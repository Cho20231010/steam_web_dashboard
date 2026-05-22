import { useEffect, useMemo, useState } from 'react'
import './GameDetailPage.css'
import { formatGenreList } from './utils/genre'
import {
  isFavoriteGame,
  readFavoriteGames,
  saveFavoriteGame,
  type FavoriteGame,
} from './utils/favoriteGames'
import {
  getGameDetail,
  getGameHistory,
  getGameList,
  getGameReviewInsights,
  getGameReviewTrend,
  getGameSentiment,
  getGameTopics,
  isRecord,
  type ApiRecord,
} from './api/gameDetailApi'

type GameSummary = {
  id: string
  gameId: string | number
  name: string
  genre: string
  genres: string[]
  image?: string
}

type GameDetailView = {
  id: string
  gameId: string | number
  name: string
  genre: string
  genres: string[]
  priceLabel: string
  priceKrwLabel: string
  priceSubLabelLine1: string
  priceSubLabelLine2: string
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
}

const USD_TO_KRW = 1350

function GameDetailPage() {
  const [games, setGames] = useState<ApiRecord[]>([])
  const [selectedGameId, setSelectedGameId] = useState<string>('')
  const [searchText, setSearchText] = useState('')
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [favoriteGames, setFavoriteGames] = useState<FavoriteGame[]>([])
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
    setFavoriteGames(readFavoriteGames())
  }, [])

  useEffect(() => {
    async function loadGames() {
      try {
        setLoading(true)
        setErrorMessage('')

        const gameList = await getGameList()
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

        setGameDetail(null)
        setSentimentData(null)
        setTopicData([])
        setHistoryData([])
        setReviewTrendData([])
        setReviewInsightData(null)

        const [
          detailResult,
          sentimentResult,
          topicResult,
          historyResult,
          reviewTrendResult,
          reviewInsightResult,
        ] = await Promise.allSettled([
          getGameDetail(selectedGameId),
          getGameSentiment(selectedGameId),
          getGameTopics(selectedGameId),
          getGameHistory(selectedGameId),
          getGameReviewTrend(selectedGameId),
          getGameReviewInsights(selectedGameId),
        ])

        if (detailResult.status === 'fulfilled') {
          setGameDetail(detailResult.value)
        } else {
          const fallback = games.find((game, index) => {
            const gameId = toSafeGameId(getGameId(game), index)
            return String(gameId) === selectedGameId
          })

          setGameDetail(fallback ?? null)
        }

        if (sentimentResult.status === 'fulfilled') {
          setSentimentData(sentimentResult.value)
        }

        if (topicResult.status === 'fulfilled') {
          setTopicData(topicResult.value)
        }

        if (historyResult.status === 'fulfilled') {
          setHistoryData(historyResult.value)
        }

        if (reviewTrendResult.status === 'fulfilled') {
          setReviewTrendData(reviewTrendResult.value)
        }

        if (reviewInsightResult.status === 'fulfilled') {
          setReviewInsightData(reviewInsightResult.value)
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

  const searchSuggestions = useMemo(() => {
    const genreSet = new Set<string>()

    gameSummaries.forEach((game) => {
      game.genres.forEach((genre) => {
        if (genre && genre !== '장르 없음') {
          genreSet.add(genre)
        }
      })
    })

    return {
      genres: Array.from(genreSet).sort((a, b) => a.localeCompare(b)),
      games: gameSummaries.slice(0, 12),
    }
  }, [gameSummaries])

  const filteredGames = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    if (!keyword) {
      return gameSummaries.slice(0, 8)
    }

    return gameSummaries
      .filter((game) => {
        return (
          game.name.toLowerCase().includes(keyword) ||
          game.genre.toLowerCase().includes(keyword) ||
          game.genres.some((genre) => genre.toLowerCase().includes(keyword))
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

  const isSelectedGameFavorite = useMemo(() => {
    if (!selectedGame) {
      return false
    }

    return favoriteGames.some((game) => String(game.gameId) === String(selectedGame.gameId))
  }, [favoriteGames, selectedGame])

  const sentiment = useMemo(() => {
    return normalizeSentiment(sentimentData, selectedGame)
  }, [sentimentData, selectedGame])

  const topics = useMemo(() => {
    return normalizeTopics(topicData).slice(0, 5)
  }, [topicData])

  const trendPoints = useMemo(() => {
    return normalizeTrendPoints(historyData, reviewTrendData)
  }, [historyData, reviewTrendData])

  const reviewInsight = useMemo(() => {
    return normalizeReviewInsight(reviewInsightData)
  }, [reviewInsightData])

  const quickSummaryItems = useMemo(() => {
    return createQuickSummaryItems(selectedGame, sentiment, topics, reviewInsight)
  }, [selectedGame, sentiment, topics, reviewInsight])

  function handleSelectGame(gameId: string | number) {
    setSelectedGameId(String(gameId))
    setSearchText('')
    setSelectedTab('overview')
  }

  function handleGenreSuggestionClick(value: string) {
    setSearchText(value)
    setIsSearchFocused(true)
  }

  function handleGameSuggestionClick(gameId: string | number) {
    handleSelectGame(gameId)
    setIsSearchFocused(false)
  }

  function handleAddFavoriteGame() {
    if (!selectedGame) {
      return
    }

    if (isFavoriteGame(selectedGame.gameId)) {
      setFavoriteGames(readFavoriteGames())
      return
    }

    const nextFavoriteGames = saveFavoriteGame({
      gameId: selectedGame.gameId,
      name: selectedGame.name,
      genre: selectedGame.genre,
      priceLabel: selectedGame.priceLabel,
      image: selectedGame.image,
    })

    setFavoriteGames(nextFavoriteGames)
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
        <div className="game-detail-search-box">
          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => {
              window.setTimeout(() => {
                setIsSearchFocused(false)
              }, 150)
            }}
            placeholder="게임명, 장르로 검색"
            type="text"
          />

          {isSearchFocused && (
            <div className="game-detail-search-dropdown">
              {searchText.trim() ? (
                <>
                  <div className="game-detail-dropdown-section-title">검색 결과</div>

                  {filteredGames.length > 0 ? (
                    filteredGames.map((game) => (
                      <button
                        key={game.id}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => handleGameSuggestionClick(game.gameId)}
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
                </>
              ) : (
                <>
                  <div className="game-detail-dropdown-section">
                    <div className="game-detail-dropdown-section-title">
                      검색 가능한 장르
                    </div>

                    <div className="game-detail-dropdown-chip-list">
                      {searchSuggestions.genres.map((genre) => (
                        <button
                          className="chip-button"
                          key={genre}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => handleGenreSuggestionClick(genre)}
                          type="button"
                        >
                          {genre}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="game-detail-dropdown-section">
                    <div className="game-detail-dropdown-section-title">
                      추천 게임명
                    </div>

                    <div className="game-detail-dropdown-game-list">
                      {searchSuggestions.games.map((game) => (
                        <button
                          key={game.id}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => handleGameSuggestionClick(game.gameId)}
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
                      ))}
                    </div>
                  </div>
                </>
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
              <b>{selectedGame.priceKrwLabel}</b>
              <p>
                {selectedGame.priceSubLabelLine1}
                <br />
                {selectedGame.priceSubLabelLine2}
              </p>

              <button
                className={isSelectedGameFavorite ? 'secondary added' : 'secondary'}
                disabled={isSelectedGameFavorite}
                onClick={handleAddFavoriteGame}
                type="button"
              >
                {isSelectedGameFavorite ? '관심 게임에 추가됨' : '관심 게임 추가'}
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
              description={selectedGame.priceKrwLabel}
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

              {trendPoints.length > 0 ? (
                <div className="game-detail-line-chart">
                  {trendPoints.map((point, index) => (
                    <span
                      key={`${point.label}-${index}`}
                      style={{
                        left: `${(index / Math.max(trendPoints.length - 1, 1)) * 100}%`,
                        bottom: `${Math.max(8, Math.min(90, point.price * 1.3))}%`,
                      }}
                      title={`${point.label} / ${formatSteamPrice(point.price)}`}
                    />
                  ))}

                  <div className="game-detail-chart-labels">
                    {trendPoints.map((point) => (
                      <em key={point.label}>{point.label}</em>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="game-detail-no-trend">
                  <strong>가격 변동 데이터 없음</strong>
                  <p>
                    현재 API에서 이 게임의 가격 이력 데이터를 제공하지 않아 추이 그래프를
                    표시하지 않습니다.
                  </p>
                </div>
              )}
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

              {trendPoints.length > 0 ? (
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
              ) : (
                <div className="game-detail-no-trend">
                  <strong>리뷰 추이 데이터 없음</strong>
                  <p>
                    현재 API에서 이 게임의 기간별 리뷰 수 또는 긍정 비율 변화를 제공하지
                    않습니다.
                  </p>
                </div>
              )}
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

          <section className="game-detail-bottom-grid-fixed">
            <article className="game-detail-card topic-card">
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
                    </div>
                  ))}
                </div>
              ) : (
                <p className="game-detail-empty">토픽 데이터가 없습니다.</p>
              )}
            </article>

            <article className="game-detail-card quick-summary-card">
              <div className="game-detail-card-head">
                <h3>빠른 요약</h3>
              </div>

              <ul>
                {quickSummaryItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
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

function normalizeGameSummary(game: ApiRecord, index: number): GameSummary {
  const gameId = toSafeGameId(getGameId(game), index)
  const genres = getGenres(game)
  const genre = genres[0] ?? '장르 없음'

  return {
    id: String(gameId),
    gameId,
    name: getGameName(game),
    genre,
    genres,
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
    priceLabel: isFree ? '무료' : formatSteamPrice(price),
    priceKrwLabel: isFree ? '(약 ₩0)' : `(${formatEstimatedKrw(price)})`,
    priceSubLabelLine1: 'Steam 기준 금액,',
    priceSubLabelLine2: '원화 환산 추정 값',
    owners: formatOwners(getOwners(game)),
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
    const rawKeywords = getKeywords(topic)
    const translatedKeywords = rawKeywords.map((keyword) => translateKeyword(keyword))
    const backendTitle = getBackendTopicTitle(topic)

    const title =
      backendTitle && !isGenericTopicName(backendTitle)
        ? translateTopicTitle(backendTitle)
        : createTopicTitle(translatedKeywords, backendTitle, index)

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
      title,
      keywords: translatedKeywords.length > 0 ? translatedKeywords : ['키워드 없음'],
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

function getBackendTopicTitle(topic: ApiRecord) {
  return String(
    topic.title ??
      topic.topic_title ??
      topic.topic_name ??
      topic.topic ??
      topic.name ??
      '',
  ).trim()
}

function isGenericTopicName(value: string) {
  const normalized = value.toLowerCase().trim()

  return (
    normalized === '' ||
    normalized === 'topic' ||
    normalized.startsWith('topic_') ||
    normalized.startsWith('topic ') ||
    normalized.startsWith('토픽 ')
  )
}

function translateTopicTitle(value: string) {
  const normalized = value.toLowerCase().trim()

  const map: Record<string, string> = {
    gameplay: '게임플레이',
    combat: '전투',
    story: '스토리',
    graphics: '그래픽',
    graphic: '그래픽',
    sound: '사운드',
    music: '음악',
    optimization: '최적화',
    performance: '성능',
    price: '가격',
    content: '콘텐츠',
    difficulty: '난이도',
    multiplayer: '멀티플레이',
    coop: '협동',
  }

  return map[normalized] ?? value
}

function createTopicTitle(keywords: string[], backendTitle: string, index: number) {
  const source = `${keywords.join(' ')} ${backendTitle}`.toLowerCase()

  if (source.includes('전투') || source.includes('combat') || source.includes('boss')) {
    return '게임플레이/전투'
  }

  if (
    source.includes('스토리') ||
    source.includes('story') ||
    source.includes('세계관') ||
    source.includes('world') ||
    source.includes('캐릭터') ||
    source.includes('character')
  ) {
    return '스토리/세계관'
  }

  if (
    source.includes('그래픽') ||
    source.includes('graphic') ||
    source.includes('사운드') ||
    source.includes('sound') ||
    source.includes('음악') ||
    source.includes('music')
  ) {
    return '그래픽/사운드'
  }

  if (
    source.includes('최적화') ||
    source.includes('optimization') ||
    source.includes('성능') ||
    source.includes('performance') ||
    source.includes('버그') ||
    source.includes('bug') ||
    source.includes('server')
  ) {
    return '최적화/성능'
  }

  if (
    source.includes('가격') ||
    source.includes('price') ||
    source.includes('dlc') ||
    source.includes('콘텐츠') ||
    source.includes('content')
  ) {
    return '가격/콘텐츠'
  }

  if (
    source.includes('난이도') ||
    source.includes('difficulty') ||
    source.includes('challenge')
  ) {
    return '난이도/도전성'
  }

  if (
    source.includes('멀티') ||
    source.includes('협동') ||
    source.includes('coop') ||
    source.includes('friends')
  ) {
    return '멀티플레이/협동'
  }

  if (keywords.length > 0 && keywords[0] !== '키워드 없음') {
    return `${keywords[0]} 관련 반응`
  }

  return `리뷰 토픽 ${index + 1}`
}

function normalizeTrendPoints(
  historyData: ApiRecord[],
  reviewTrendData: ApiRecord[],
): TrendPoint[] {
  const source = reviewTrendData.length > 0 ? reviewTrendData : historyData

  if (source.length === 0) {
    return []
  }

  return source.slice(-6).map((item, index) => {
    const label = String(item.date ?? item.month ?? item.period ?? item.label ?? index + 1)

    return {
      label: label.length > 7 ? label.slice(5, 10) : label,
      price: normalizePrice(item.price ?? item.price_usd ?? item.current_price),
      positiveRate: normalizeRatio(item.positive_ratio ?? item.positive_rate),
      reviewCount: toNumber(item.review_count ?? item.total_reviews ?? item.reviews),
    }
  })
}

function normalizeReviewInsight(reviewInsightData: unknown): ReviewInsight {
  const record = isRecord(reviewInsightData) ? reviewInsightData : {}

  const positiveSummary = String(
    record.positive_summary ??
      record.positiveSummary ??
      record.positive_review ??
      '긍정 리뷰에서는 게임성, 몰입감, 전투 경험에 대한 만족이 나타납니다.',
  )

  const negativeSummary = String(
    record.negative_summary ??
      record.negativeSummary ??
      record.negative_review ??
      '부정 리뷰에서는 난이도, 최적화, 가격 관련 불만이 나타날 수 있습니다.',
  )

  return {
    positiveSummary,
    negativeSummary,
  }
}

function createQuickSummaryItems(
  selectedGame: GameDetailView | null,
  sentiment: SentimentView,
  topics: TopicView[],
  reviewInsight: ReviewInsight,
) {
  if (!selectedGame) {
    return ['선택된 게임 데이터가 없습니다.']
  }

  const mainTopic = topics[0]?.title ?? '주요 토픽 없음'
  const satisfaction =
    sentiment.positive >= 85
      ? '매우 긍정적인 평가 흐름입니다.'
      : sentiment.positive >= 70
        ? '전반적으로 긍정적인 평가입니다.'
        : sentiment.positive >= 50
          ? '긍정과 부정 반응이 함께 나타납니다.'
          : '개선 이슈가 비교적 크게 나타납니다.'

  return [
    `긍정 비율은 ${sentiment.positive.toFixed(1)}%로 ${satisfaction}`,
    `주요 토픽은 ${mainTopic} 중심으로 나타납니다.`,
    compactSentence(reviewInsight.negativeSummary),
    `현재 가격은 ${selectedGame.priceLabel} 기준입니다.`,
  ]
}

function compactSentence(text: string) {
  const cleaned = text.replace(/\s+/g, ' ').trim()

  if (cleaned.length <= 42) {
    return cleaned
  }

  return `${cleaned.slice(0, 42)}...`
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
  return formatGenreList(game.genres ?? game.genre)
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

function formatOwners(value: string) {
  return value
    .replace(/\s*\.\.\s*/g, ' ~ ')
    .replace(/\s*-\s*/g, ' ~ ')
    .trim()
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
    content: '콘텐츠',
    challenge: '도전성',
  }

  return dictionary[normalized] ?? keyword
}

function formatSteamPrice(price: number) {
  return `$${price.toFixed(2)}`
}

function formatEstimatedKrw(price: number) {
  const krw = Math.round(price * USD_TO_KRW)
  return `약 ₩${krw.toLocaleString('ko-KR')}`
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
