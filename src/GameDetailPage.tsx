import { useEffect, useMemo, useState } from 'react'
import './GameDetailPage.css'
import { formatGenreDisplay, formatGenreList, getGenreSearchText } from './utils/genre'
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
  genreSearchText: string
  genres: string[]
  image?: string
}

type GameDetailView = {
  id: string
  gameId: string | number
  name: string
  genre: string
  genreSearchText: string
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
  groupName: string
  keywords: string[]
  mentionRate: number
  positiveRate: number
  sentimentLabel: string
}

type TopicSummaryView = {
  topicCount: number
  strongestTopicRate: number
  averageTopicRate: number
  mainKeywords: string
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

  const gameSummaries = useMemo(() => {
    return games.map((game, index) => normalizeGameSummary(game, index))
  }, [games])

  const filteredGames = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    if (!keyword) {
      return gameSummaries
    }

    return gameSummaries.filter((game) => {
      return (
        game.name.toLowerCase().includes(keyword) ||
        game.genre.toLowerCase().includes(keyword) ||
        game.genreSearchText.includes(keyword) ||
        game.genres.some((genre) => genre.toLowerCase().includes(keyword))
      )
    })
  }, [gameSummaries, searchText])

  const searchGameOptions = useMemo(() => {
    return filteredGames.slice(0, 12)
  }, [filteredGames])

  useEffect(() => {
    const keyword = searchText.trim()

    if (!keyword || filteredGames.length === 0) {
      return
    }

    const selectedGameIsVisible = filteredGames.some(
      (game) => String(game.gameId) === selectedGameId,
    )

    if (!selectedGameIsVisible) {
      setSelectedGameId(String(filteredGames[0].gameId))
    }
  }, [filteredGames, searchText, selectedGameId])

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
    return normalizeTopics(topicData)
  }, [topicData])

  const topicSummary = useMemo(() => {
    return normalizeTopicSummary(topics)
  }, [topics])

  const trendPoints = useMemo(() => {
    return normalizeTrendPoints(historyData, reviewTrendData)
  }, [historyData, reviewTrendData])

  const reviewInsight = useMemo(() => {
    return normalizeReviewInsight(reviewInsightData)
  }, [reviewInsightData])

  const quickSummaryItems = useMemo(() => {
    return createQuickSummaryItems(selectedGame, sentiment, topics, reviewInsight)
  }, [selectedGame, sentiment, topics, reviewInsight])

  function handleSelectGame(gameId: string | number, gameName?: string) {
    setSelectedGameId(String(gameId))

    if (gameName) {
      setSearchText(gameName)
    }
  }

  function handleGameSuggestionClick(game: GameSummary) {
    handleSelectGame(game.gameId, game.name)
    setIsSearchFocused(false)
  }

  function handleShowAllGames() {
    setSearchText('')
    setIsSearchFocused(false)

    if (!selectedGameId && gameSummaries.length > 0) {
      setSelectedGameId(String(gameSummaries[0].gameId))
    }
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
        <p className="game-detail-sample-note">
          ※ 현재 분석 화면은 샘플 데이터 기준 50개 게임을 대상으로 제공합니다.
        </p>

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
            placeholder="게임명으로 검색"
            type="text"
          />

          {isSearchFocused && (
            <div className="game-detail-search-dropdown">
              <div className="game-detail-dropdown-section-title">게임명 선택</div>

              <button
                onMouseDown={(event) => event.preventDefault()}
                onClick={handleShowAllGames}
                type="button"
              >
                <span className="game-detail-search-thumb">전체</span>

                <span>
                  <strong>전체</strong>
                  <em>샘플 데이터 {gameSummaries.length}개 전체 보기</em>
                </span>
              </button>

              {searchGameOptions.length > 0 ? (
                searchGameOptions.map((game) => (
                  <button
                    key={game.id}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleGameSuggestionClick(game)}
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
            <strong>게임 목록</strong>
            <span>
              {searchText.trim()
                ? `${filteredGames.length}개 · 전체 ${gameSummaries.length}개`
                : `${gameSummaries.length}개`}
            </span>
          </div>

          <div className="game-detail-result-list">
            <button
              className={!searchText.trim() ? 'active' : ''}
              onClick={handleShowAllGames}
              type="button"
            >
              <span className="game-detail-result-thumb">전체</span>

              <span className="game-detail-result-text">
                <strong>전체</strong>
                <em>샘플 데이터 {gameSummaries.length}개 전체 보기</em>
              </span>
            </button>

            {filteredGames.map((game) => (
              <button
                className={String(game.gameId) === selectedGameId ? 'active' : ''}
                key={game.id}
                onClick={() => handleSelectGame(game.gameId, game.name)}
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
                    {selectedGame.genres.slice(0, 6).map((genre) => (
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
              description="긍정/중립/부정 합산 우선"
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

          <section className="game-detail-keyword-group-section">
            <article className="game-detail-card keyword-group-card">
              <div className="game-detail-card-head keyword-group-head">
                <div>
                  <h3>게임별 키워드 그룹</h3>
                  <p>선택한 게임의 리뷰에서 함께 자주 등장한 키워드 묶음입니다.</p>
                </div>

                <span>{topics.length}개 그룹</span>
              </div>

              {topics.length > 0 ? (
                <div className="game-detail-keyword-group-list">
                  {topics.map((topic) => (
                    <div className="game-detail-keyword-group-item" key={topic.id}>
                      <div className="game-detail-keyword-group-title">
                        <strong>{topic.groupName}</strong>
                        <em>{topic.mentionRate.toFixed(1)}%</em>
                      </div>

                      <div className="game-detail-topic-chip-list">
                        {topic.keywords.map((keyword) => (
                          <span key={`${topic.id}-${keyword}`}>{keyword}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="game-detail-empty">
                  이 게임의 키워드 그룹 데이터가 없습니다.
                </p>
              )}
            </article>
          </section>

          <section className="game-detail-bottom-grid-fixed">
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

            <TopicSummaryCard topicSummary={topicSummary} />

            <SentimentSummaryCard sentiment={sentiment} />
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

function TopicSummaryCard({ topicSummary }: { topicSummary: TopicSummaryView }) {
  return (
    <article className="game-detail-card topic-summary-card">
      <div className="game-detail-card-head">
        <h3>토픽 분석 요약</h3>
      </div>

      <div className="topic-summary-list">
        <InfoRow label="그룹 수" value={`${topicSummary.topicCount}개`} />
        <InfoRow
          label="대표 그룹 비중"
          value={
            topicSummary.strongestTopicRate > 0
              ? `${topicSummary.strongestTopicRate.toFixed(1)}%`
              : '제공 없음'
          }
          highlight
        />
        <InfoRow
          label="평균 그룹 비중"
          value={
            topicSummary.averageTopicRate > 0
              ? `${topicSummary.averageTopicRate.toFixed(1)}%`
              : '제공 없음'
          }
        />
        <InfoRow label="대표 키워드" value={topicSummary.mainKeywords} />
      </div>
    </article>
  )
}

function SentimentSummaryCard({ sentiment }: { sentiment: SentimentView }) {
  return (
    <article className="game-detail-card sentiment-summary-card">
      <div className="game-detail-card-head">
        <h3>감성 비율 요약</h3>
      </div>

      <div className="sentiment-summary-list">
        <SentimentSummaryRow label="긍정" value={sentiment.positive} type="positive" />
        <SentimentSummaryRow label="중립" value={sentiment.neutral} type="neutral" />
        <SentimentSummaryRow label="부정" value={sentiment.negative} type="negative" />
      </div>

      <div className="sentiment-summary-total">
        <span>총 리뷰</span>
        <strong>{formatNumber(sentiment.totalCount)}</strong>
      </div>
    </article>
  )
}

function InfoRow({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="info-row">
      <span>{label}</span>
      <strong className={highlight ? 'highlight' : ''}>{value}</strong>
    </div>
  )
}

function SentimentSummaryRow({
  label,
  value,
  type,
}: {
  label: string
  value: number
  type: 'positive' | 'neutral' | 'negative'
}) {
  return (
    <div className={`sentiment-summary-row ${type}`}>
      <div>
        <span>{label}</span>
        <strong>{value.toFixed(1)}%</strong>
      </div>

      <div className="sentiment-summary-track">
        <i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  )
}

function normalizeGameSummary(game: ApiRecord, index: number): GameSummary {
  const gameId = toSafeGameId(getGameId(game), index)
  const genreSource = getMergedGenreSource(game)
  const genres = formatGenreList(genreSource)
  const genre = formatGenreDisplay(genreSource)

  return {
    id: String(gameId),
    gameId,
    name: getGameName(game),
    genre,
    genreSearchText: getGenreSearchText(genreSource),
    genres,
    image: getGameImage(game),
  }
}

function normalizeGameDetail(game: ApiRecord): GameDetailView {
  const gameId = toSafeGameId(getGameId(game), 'unknown')
  const positiveReviews = toNumber(game.positive_reviews ?? game.positiveReviews)
  const negativeReviews = toNumber(game.negative_reviews ?? game.negativeReviews)
  const calculatedTotalReviews = positiveReviews + negativeReviews
  const apiTotalReviews = toNumber(
    game.total_reviews ?? game.totalReviews ?? game.review_count ?? game.reviews,
  )
  const totalReviews = calculatedTotalReviews > 0 ? calculatedTotalReviews : apiTotalReviews

  const price = normalizePrice(game.price ?? game.price_usd ?? game.current_price)
  const isFree = Boolean(game.is_free ?? game.free ?? game.isFree) || price <= 0
  const genreSource = getMergedGenreSource(game)
  const genres = formatGenreList(genreSource)

  return {
    id: String(gameId),
    gameId,
    name: getGameName(game),
    genre: formatGenreDisplay(genreSource),
    genreSearchText: getGenreSearchText(genreSource),
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
    const positiveCount = toNumber(
      sentimentData.positive_count ??
        sentimentData.positive_reviews ??
        sentimentData.positive ??
        selectedGame?.positiveReviews,
    )

    const neutralCount = toNumber(
      sentimentData.neutral_count ?? sentimentData.neutral_reviews ?? sentimentData.neutral,
    )

    const negativeCount = toNumber(
      sentimentData.negative_count ??
        sentimentData.negative_reviews ??
        sentimentData.negative ??
        selectedGame?.negativeReviews,
    )

    const calculatedTotal = positiveCount + neutralCount + negativeCount
    const apiTotal = toNumber(
      sentimentData.total_reviews ??
        sentimentData.review_count ??
        sentimentData.total_count ??
        sentimentData.total,
    )

    const totalCount =
      calculatedTotal > 0 ? calculatedTotal : apiTotal || selectedGame?.totalReviews || 0

    const positive =
      normalizeRatio(
        sentimentData.positive_ratio ??
          sentimentData.positive_rate ??
          sentimentData.positiveRate,
      ) || (totalCount > 0 ? (positiveCount / totalCount) * 100 : selectedGame?.positiveRate || 0)

    const negative =
      normalizeRatio(
        sentimentData.negative_ratio ??
          sentimentData.negative_rate ??
          sentimentData.negativeRate,
      ) || (totalCount > 0 ? (negativeCount / totalCount) * 100 : selectedGame?.negativeRate || 0)

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
      positiveCount,
      neutralCount,
      negativeCount,
      totalCount,
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
    totalCount: selectedGame.positiveReviews + selectedGame.negativeReviews || selectedGame.totalReviews,
  }
}

function normalizeTopics(topicData: ApiRecord[]): TopicView[] {
  return topicData
    .map((topic, index) => {
      const rawKeywords = getUniqueStringList(getKeywords(topic))
      const formattedKeywords =
        rawKeywords.length > 0
          ? rawKeywords.map((keyword) => formatTopicLabel(keyword))
          : ['키워드 없음']

      const mentionRate =
        normalizeRatio(
          topic.mention_rate ??
            topic.weight_percent ??
            topic.percentage ??
            topic.percent ??
            topic.ratio ??
            topic.weight ??
            topic.probability ??
            topic.score,
        ) || Math.max(8, 28 - index * 4)

      const positiveRate = normalizeRatio(
        topic.positive_ratio ??
          topic.positive_rate ??
          topic.positiveRate ??
          topic.sentiment_score,
      )

      return {
        id: String(topic.topic_id ?? topic.id ?? topic.topic_no ?? index),
        groupName: `키워드 그룹 ${index + 1}`,
        keywords: formattedKeywords,
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
    .filter((topic) => topic.keywords.length > 0)
}

function normalizeTopicSummary(topics: TopicView[]): TopicSummaryView {
  if (topics.length === 0) {
    return {
      topicCount: 0,
      strongestTopicRate: 0,
      averageTopicRate: 0,
      mainKeywords: '제공 없음',
    }
  }

  const strongestTopic = topics.reduce((maxTopic, currentTopic) => {
    return currentTopic.mentionRate > maxTopic.mentionRate ? currentTopic : maxTopic
  }, topics[0])

  const totalRate = topics.reduce((sum, topic) => sum + topic.mentionRate, 0)
  const averageTopicRate = totalRate / topics.length

  return {
    topicCount: topics.length,
    strongestTopicRate: strongestTopic.mentionRate,
    averageTopicRate,
    mainKeywords: strongestTopic.keywords.slice(0, 3).join(', '),
  }
}

function formatTopicLabel(value: string) {
  const original = value.trim()

  if (!original) {
    return ''
  }

  const englishFromParentheses = extractParenthesesText(original)
  const normalizedEnglish = normalizeTopicEnglishKey(englishFromParentheses || original)
  const koreanFromOriginal = normalizeTopicKoreanKey(original)

  const koreanName =
    TOPIC_KO_MAP[normalizedEnglish] ??
    TOPIC_KO_MAP[koreanFromOriginal] ??
    getKoreanTopicNameFromOriginal(original)

  const englishName =
    TOPIC_EN_MAP[normalizedEnglish] ??
    TOPIC_EN_MAP[koreanFromOriginal] ??
    englishFromParentheses ??
    getEnglishTopicNameFromOriginal(original)

  if (koreanName && englishName) {
    return `${koreanName} (${englishName})`
  }

  if (koreanName && normalizedEnglish && /^[a-z0-9\s-]+$/.test(normalizedEnglish)) {
    return `${koreanName} (${normalizedEnglish})`
  }

  if (koreanName) {
    return koreanName
  }

  if (/^[a-z0-9\s-]+$/i.test(original)) {
    return original
  }

  if (englishName && englishName !== original) {
    return `${original} (${englishName})`
  }

  return original
}

const TOPIC_KO_MAP: Record<string, string> = {
  game: '게임',
  games: '게임',
  gameplay: '게임플레이',
  play: '플레이',
  playing: '플레이',
  played: '플레이 경험',
  player: '플레이어',
  players: '플레이어',
  fun: '재미',
  enjoyable: '재미',
  good: '긍정 평가',
  great: '호평',
  best: '높은 만족도',
  bad: '부정 평가',
  like: '선호도',
  love: '애정도',
  want: '요구사항',
  time: '플레이 시간',
  hours: '플레이 시간',
  way: '방식',
  new: '신규 콘텐츠',
  data: '데이터',
  story: '스토리',
  narrative: '스토리',
  lore: '세계관',
  world: '세계관',
  worlds: '월드',
  character: '캐릭터',
  characters: '캐릭터',
  feel: '몰입감',
  atmosphere: '분위기',
  immersion: '몰입감',
  find: '탐색',
  finding: '탐색',
  search: '탐색',
  got: '획득',
  spawn: '스폰',
  explore: '탐험',
  exploration: '탐험',
  map: '맵',
  location: '위치',
  locations: '위치',
  open: '오픈월드',
  'open world': '오픈월드',
  survival: '생존',
  survive: '생존',
  survivor: '생존자',
  survivors: '생존자',
  die: '사망',
  zombie: '좀비',
  zombies: '좀비',
  infected: '감염자',
  disease: '질병',
  hunger: '허기',
  thirst: '갈증',
  health: '체력',
  medical: '의료',
  medicine: '약품',
  loot: '아이템 파밍',
  looting: '아이템 파밍',
  item: '아이템',
  items: '아이템',
  inventory: '인벤토리',
  gear: '장비',
  weapon: '무기',
  weapons: '무기',
  gun: '총기',
  guns: '총기',
  ammo: '탄약',
  armor: '방어구',
  base: '거점',
  building: '건설',
  builder: '건설',
  craft: '제작',
  crafting: '제작',
  combat: '전투',
  battle: '전투',
  fight: '전투',
  fighting: '전투',
  kill: '킬',
  killer: '살인마',
  boss: '보스전',
  enemy: '적',
  enemies: '적',
  war: '전쟁',
  raid: '레이드',
  pvp: 'PvP',
  pve: 'PvE',
  fps: 'FPS',
  shooting: '슈팅',
  shooter: '슈팅',
  aim: '조준',
  aiming: '조준',
  graphic: '그래픽',
  graphics: '그래픽',
  visual: '비주얼',
  visuals: '비주얼',
  design: '디자인',
  animation: '애니메이션',
  sound: '사운드',
  music: '음악',
  voice: '음성',
  audio: '오디오',
  price: '가격',
  value: '가격 만족도',
  sale: '할인',
  discount: '할인',
  dlc: 'DLC',
  content: '콘텐츠',
  update: '업데이트',
  updates: '업데이트',
  patch: '패치',
  patches: '패치',
  bug: '버그',
  bugs: '버그',
  glitch: '오류',
  glitches: '오류',
  crash: '충돌 오류',
  crashes: '충돌 오류',
  crashing: '충돌 오류',
  lag: '렉',
  optimization: '최적화',
  performance: '성능',
  server: '서버',
  servers: '서버',
  connection: '접속',
  online: '온라인',
  multiplayer: '멀티플레이',
  coop: '협동',
  'co-op': '협동',
  friends: '친구',
  people: '사람들',
  difficulty: '난이도',
  hard: '난이도',
  easy: '쉬움',
  challenge: '도전성',
  balance: '밸런스',
  tutorial: '튜토리얼',
  guide: '가이드',
  guides: '가이드',
  control: '조작감',
  controls: '조작감',
  camera: '카메라',
  ui: 'UI',
  interface: '인터페이스',
  system: '시스템',
  mode: '모드',
  modes: '모드',
  quest: '퀘스트',
  quests: '퀘스트',
  mission: '미션',
  missions: '미션',
  level: '레벨',
  puzzle: '퍼즐',
  puzzles: '퍼즐',
  pieces: '조각',
  piece: '조각',
  replay: '반복 플레이',
  grinding: '반복 플레이',
  access: '접근성',
  early: '얼리 액세스',
  'early access': '얼리 액세스',
  vehicles: '차량',
  gaijin: '가이진',
  tanks: '전차',
  snail: '스네일',
  salt: '솔트',
  russia: '러시아',
}

const TOPIC_EN_MAP: Record<string, string> = {
  게임: 'game',
  게임플레이: 'gameplay',
  플레이: 'play',
  플레이경험: 'played',
  플레이어: 'players',
  재미: 'fun',
  긍정평가: 'good',
  호평: 'great',
  높은만족도: 'best',
  부정평가: 'bad',
  선호도: 'like',
  애정도: 'love',
  요구사항: 'want',
  플레이시간: 'time',
  방식: 'way',
  신규콘텐츠: 'new',
  데이터: 'data',
  스토리: 'story',
  세계관: 'world',
  월드: 'worlds',
  캐릭터: 'character',
  몰입감: 'feel',
  분위기: 'atmosphere',
  탐색: 'find',
  획득: 'got',
  스폰: 'spawn',
  탐험: 'exploration',
  맵: 'map',
  위치: 'location',
  오픈월드: 'open world',
  생존: 'survival',
  생존자: 'survivor',
  사망: 'die',
  좀비: 'zombie',
  감염자: 'infected',
  질병: 'disease',
  허기: 'hunger',
  갈증: 'thirst',
  체력: 'health',
  의료: 'medical',
  약품: 'medicine',
  아이템파밍: 'loot',
  아이템: 'item',
  인벤토리: 'inventory',
  장비: 'gear',
  무기: 'weapon',
  총기: 'gun',
  탄약: 'ammo',
  방어구: 'armor',
  거점: 'base',
  건설: 'building',
  제작: 'crafting',
  전투: 'combat',
  킬: 'kill',
  살인마: 'killer',
  보스전: 'boss',
  적: 'enemy',
  전쟁: 'war',
  레이드: 'raid',
  pvp: 'pvp',
  pve: 'pve',
  fps: 'fps',
  슈팅: 'shooter',
  조준: 'aim',
  그래픽: 'graphics',
  비주얼: 'visuals',
  디자인: 'design',
  애니메이션: 'animation',
  사운드: 'sound',
  음악: 'music',
  음성: 'voice',
  오디오: 'audio',
  가격: 'price',
  가격만족도: 'value',
  할인: 'sale',
  dlc: 'dlc',
  콘텐츠: 'content',
  업데이트: 'update',
  패치: 'patch',
  버그: 'bug',
  오류: 'glitch',
  충돌오류: 'crash',
  렉: 'lag',
  최적화: 'optimization',
  성능: 'performance',
  서버: 'server',
  접속: 'connection',
  온라인: 'online',
  멀티플레이: 'multiplayer',
  협동: 'co-op',
  친구: 'friends',
  사람들: 'people',
  난이도: 'difficulty',
  쉬움: 'easy',
  도전성: 'challenge',
  밸런스: 'balance',
  튜토리얼: 'tutorial',
  가이드: 'guide',
  조작감: 'controls',
  카메라: 'camera',
  ui: 'ui',
  인터페이스: 'interface',
  시스템: 'system',
  모드: 'mode',
  퀘스트: 'quest',
  미션: 'mission',
  레벨: 'level',
  퍼즐: 'puzzle',
  조각: 'piece',
  반복플레이: 'replay',
  접근성: 'access',
  얼리액세스: 'early access',
  차량: 'vehicles',
  가이진: 'gaijin',
  전차: 'tanks',
  스네일: 'snail',
  솔트: 'salt',
  러시아: 'russia',
}

function extractParenthesesText(value: string) {
  const matched = value.match(/\(([^)]+)\)/)
  return matched?.[1]?.trim() ?? ''
}

function normalizeTopicEnglishKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[_-]/g, ' ')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeTopicKoreanKey(value: string) {
  return value
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-z가-힣0-9]/g, '')
    .trim()
}

function getKoreanTopicNameFromOriginal(value: string) {
  const koreanOnly = value
    .replace(/\([^)]*\)/g, '')
    .replace(/[^가-힣A-Za-z0-9\s]/g, '')
    .trim()

  if (!koreanOnly) {
    return ''
  }

  const compacted = koreanOnly.replace(/\s+/g, '')

  if (TOPIC_EN_MAP[compacted.toLowerCase()]) {
    return koreanOnly
  }

  return ''
}

function getEnglishTopicNameFromOriginal(value: string) {
  const normalized = normalizeTopicEnglishKey(value)

  if (TOPIC_KO_MAP[normalized]) {
    return normalized
  }

  return ''
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

  const mainGroup = topics[0]
  const mainKeywords = mainGroup?.keywords.slice(0, 3).join(', ') ?? '키워드 그룹 없음'
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
    `총 리뷰 수는 ${formatNumber(sentiment.totalCount || selectedGame.totalReviews)}개입니다.`,
    `가장 큰 키워드 그룹은 ${mainKeywords} 중심으로 나타납니다.`,
    compactSentence(reviewInsight.negativeSummary),
    `현재 가격은 ${selectedGame.priceLabel} 기준입니다.`,
  ]
}

function compactSentence(text: string) {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  return cleaned.length <= 42 ? cleaned : `${cleaned.slice(0, 42)}...`
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

function getMergedGenreSource(game: ApiRecord) {
  return [game.genre, game.genres]
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
    topic.keyword_list,
    topic.keywordList,
    topic.representative_words,
    topic.representativeWords,
    topic.topic_words,
    topic.topicWords,
  ]

  for (const candidate of candidates) {
    const keywords = normalizeKeywordCandidate(candidate)

    if (keywords.length > 0) {
      return keywords
    }
  }

  return []
}

function normalizeKeywordCandidate(value: unknown): string[] {
  if (value === null || value === undefined) {
    return []
  }

  if (Array.isArray(value)) {
    return value
      .flatMap((item) => {
        if (typeof item === 'string' || typeof item === 'number') {
          return String(item)
        }

        if (isRecord(item)) {
          const word =
            item.keyword ??
            item.word ??
            item.term ??
            item.name ??
            item.label ??
            item.text

          if (word !== null && word !== undefined) {
            return String(word)
          }
        }

        return ''
      })
      .map((keyword) => keyword.trim())
      .filter(Boolean)
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()

    if (!trimmed) {
      return []
    }

    try {
      const parsed = JSON.parse(trimmed)
      const parsedKeywords = normalizeKeywordCandidate(parsed)

      if (parsedKeywords.length > 0) {
        return parsedKeywords
      }
    } catch {
      // JSON 문자열이 아니면 일반 문자열로 처리
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

  if (typeof value === 'number') {
    return [String(value)]
  }

  if (isRecord(value)) {
    const word =
      value.keyword ??
      value.word ??
      value.term ??
      value.name ??
      value.label ??
      value.text

    if (word !== null && word !== undefined) {
      return [String(word).trim()].filter(Boolean)
    }
  }

  return []
}

function getUniqueStringList(values: string[]) {
  const seen = new Set<string>()
  const result: string[] = []

  values.forEach((value) => {
    const normalized = value.trim()

    if (!normalized) {
      return
    }

    const key = normalized.toLowerCase().replace(/\s+/g, '')

    if (seen.has(key)) {
      return
    }

    seen.add(key)
    result.push(normalized)
  })

  return result
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
