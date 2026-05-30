import { useEffect, useMemo, useRef, useState } from 'react'
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
  getGameList,
  getGameReviewInsights,
  getGameSentiment,
  getGameTopics,
  isRecord,
  type ApiRecord,
} from './api/gameDetailApi'

/**
 * 게임 상세 분석 화면에서 사용할 기간 옵션입니다.
 * 7일 데이터는 제공되지 않는 것으로 판단해서 30일, 90일만 사용합니다.
 */
type PeriodOption = 30 | 90

/**
 * 왼쪽 게임 목록과 검색 결과에서 사용하는 간단한 게임 정보 타입입니다.
 */
type GameSummary = {
  id: string
  gameId: string | number
  name: string
  genre: string
  genreSearchText: string
  genres: string[]
  image?: string
}

/**
 * 오른쪽 게임 상세 카드와 요약 카드에서 사용하는 정규화된 게임 상세 타입입니다.
 */
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

/**
 * 리뷰 감성 분석 카드와 모달에서 사용하는 데이터 타입입니다.
 */
type SentimentView = {
  positive: number
  neutral: number
  negative: number
  positiveCount: number
  neutralCount: number
  negativeCount: number
  totalCount: number
}

/**
 * 키워드 그룹 영역에서 사용하는 토픽 데이터 타입입니다.
 */
type TopicView = {
  id: string
  groupName: string
  keywords: string[]
  mentionRate: number
  positiveRate: number
  sentimentLabel: string
}

/**
 * 하단 토픽 분석 요약 카드에서 사용하는 타입입니다.
 */
type TopicSummaryView = {
  topicCount: number
  strongestTopicRate: number
  averageTopicRate: number
  mainKeywords: string
}

/**
 * 가격 변동 추이, 리뷰 수 & 긍정 비율 추이 그래프에 쓰이는 데이터 타입입니다.
 */
type TrendPoint = {
  label: string
  price: number
  positiveRate: number
  reviewCount: number
}

/**
 * 리뷰 인사이트 API 응답을 화면에 맞게 정리한 타입입니다.
 */
type ReviewInsight = {
  positiveSummary: string
  negativeSummary: string
}

/**
 * [전체] 선택 시 여러 게임 데이터를 합산/평균 처리하기 위한 타입입니다.
 */
type AggregateGameStats = {
  totalGames: number
  positiveReviews: number
  negativeReviews: number
  totalReviews: number
  positiveRate: number
  negativeRate: number
  averagePlaytime: number
  averagePrice: number
  pricedGameCount: number
  freeGameCount: number
  topGenres: Array<{
    name: string
    count: number
    ratio: number
  }>
  topGenreLabel: string
}

type OwnersRange = {
  min: number
  max: number
}

type TotalOwnersRange = {
  min: number
  max: number
  validCount: number
}

const USD_TO_KRW = 1350
const ALL_GAME_ID = '__ALL__'
const FAVORITE_GAMES_UPDATED_EVENT = 'favorite-games-updated'

function GameDetailPage() {
  const [games, setGames] = useState<ApiRecord[]>([])
  const [selectedGameId, setSelectedGameId] = useState<string>(ALL_GAME_ID)
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>(30)
  const [searchText, setSearchText] = useState('')
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [favoriteGames, setFavoriteGames] = useState<FavoriteGame[]>([])

  const [gameDetail, setGameDetail] = useState<ApiRecord | null>(null)
  const [sentimentData, setSentimentData] = useState<ApiRecord | null>(null)
  const [topicData, setTopicData] = useState<ApiRecord[]>([])
  const [overallTopicData, setOverallTopicData] = useState<ApiRecord[]>([])
  const [historyData, setHistoryData] = useState<ApiRecord[]>([])
  const [reviewTrendData, setReviewTrendData] = useState<ApiRecord[]>([])
  const [reviewInsightData, setReviewInsightData] = useState<unknown>(null)

  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isSentimentModalOpen, setIsSentimentModalOpen] = useState(false)

  /**
   * 오른쪽 상세 분석 영역의 실제 높이를 측정해서
   * 왼쪽 게임 목록 패널 높이에 적용하기 위한 ref/state입니다.
   */
  const mainAreaRef = useRef<HTMLDivElement | null>(null)
  const [resultPanelHeight, setResultPanelHeight] = useState<number | null>(null)

  const isAllSelected = selectedGameId === ALL_GAME_ID

  /**
   * 관심 게임 목록을 localStorage와 동기화합니다.
   */
  useEffect(() => {
    function syncFavoriteGames() {
      setFavoriteGames(readFavoriteGames())
    }

    syncFavoriteGames()

    window.addEventListener(FAVORITE_GAMES_UPDATED_EVENT, syncFavoriteGames)
    window.addEventListener('storage', syncFavoriteGames)

    return () => {
      window.removeEventListener(FAVORITE_GAMES_UPDATED_EVENT, syncFavoriteGames)
      window.removeEventListener('storage', syncFavoriteGames)
    }
  }, [])

  /**
   * 최초 화면 진입 시 게임 목록을 불러오고 기본 선택값을 [전체]로 설정합니다.
   */
  useEffect(() => {
    async function loadGames() {
      try {
        setLoading(true)
        setErrorMessage('')

        const gameList = await getGameList()
        setGames(gameList)
        setSelectedGameId(ALL_GAME_ID)
      } catch (error) {
        console.error(error)
        setErrorMessage('게임 목록을 불러오지 못했습니다.')
      } finally {
        setLoading(false)
      }
    }

    loadGames()
  }, [])

  /**
   * [전체] 토픽 분석에 필요한 전체 토픽 데이터를 불러옵니다.
   */
  useEffect(() => {
    async function loadOverallTopics() {
      try {
        const baseUrl = getApiBaseUrl()
        const response = await fetch(`${baseUrl}/analysis/topics`)

        if (!response.ok) {
          throw new Error('전체 토픽 분석 데이터를 불러오지 못했습니다.')
        }

        const data = await response.json()
        setOverallTopicData(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error(error)
        setOverallTopicData([])
      }
    }

    loadOverallTopics()
  }, [])

  const allGameSummary = useMemo(() => {
    return createAllGameSummary(games.length)
  }, [games.length])

  const gameSummaries = useMemo(() => {
    return games.map((game, index) => normalizeGameSummary(game, index))
  }, [games])

  /**
   * 검색창 포커스 시 보여줄 장르 추천 목록입니다.
   * 추천 게임명 목록은 표시하지 않고 장르만 보여줍니다.
   */
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
    }
  }, [gameSummaries])

  /**
   * 검색어에 따라 왼쪽 게임 목록을 필터링합니다.
   */
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

  /**
   * 왼쪽 게임 목록에는 항상 [전체] 항목이 먼저 보이도록 구성합니다.
   */
  const displayGames = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    if (!keyword) {
      return [allGameSummary, ...filteredGames]
    }

    const isAllKeywordMatched =
      allGameSummary.name.toLowerCase().includes(keyword) ||
      allGameSummary.genre.toLowerCase().includes(keyword) ||
      allGameSummary.genreSearchText.includes(keyword)

    if (isAllKeywordMatched) {
      return [allGameSummary, ...filteredGames]
    }

    return filteredGames
  }, [allGameSummary, filteredGames, searchText])

  const resultCountLabel = useMemo(() => {
    if (searchText.trim()) {
      const hasAll = displayGames.some((game) => game.gameId === ALL_GAME_ID)
      return hasAll ? `전체 + ${filteredGames.length}개` : `${filteredGames.length}개`
    }

    return `전체 + ${filteredGames.length}개`
  }, [displayGames, filteredGames.length, searchText])

  /**
   * 검색 결과에서 현재 선택된 게임이 사라지면 첫 번째 검색 결과를 자동 선택합니다.
   */
  useEffect(() => {
    const keyword = searchText.trim().toLowerCase()

    if (!keyword) {
      return
    }

    const isAllKeywordMatched =
      allGameSummary.name.toLowerCase().includes(keyword) ||
      allGameSummary.genre.toLowerCase().includes(keyword) ||
      allGameSummary.genreSearchText.includes(keyword)

    if (selectedGameId === ALL_GAME_ID && isAllKeywordMatched) {
      return
    }

    if (filteredGames.length === 0) {
      return
    }

    const selectedGameIsVisible = filteredGames.some(
      (game) => String(game.gameId) === selectedGameId,
    )

    if (!selectedGameIsVisible) {
      const nextGameId = String(filteredGames[0].gameId)

      if (nextGameId !== selectedGameId) {
        setSelectedGameId(nextGameId)
      }
    }
  }, [allGameSummary, filteredGames, searchText, selectedGameId])

  /**
   * 개별 게임 선택 시 상세/감성/토픽/가격 이력/리뷰 추이 데이터를 불러옵니다.
   * [전체] 선택 시 개별 API 호출은 하지 않고, 전체 집계 데이터로 화면을 구성합니다.
   */
  useEffect(() => {
    async function loadSelectedGame() {
      if (!selectedGameId) {
        return
      }

      if (selectedGameId === ALL_GAME_ID) {
        setDetailLoading(false)
        setGameDetail(null)
        setSentimentData(null)
        setTopicData([])
        setHistoryData([])
        setReviewTrendData([])
        setReviewInsightData(null)
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
          getGameHistoryByPeriod(selectedGameId, selectedPeriod),
          getGameReviewTrendByPeriod(selectedGameId, selectedPeriod),
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
  }, [games, selectedGameId, selectedPeriod])

  const selectedGame = useMemo(() => {
    if (selectedGameId === ALL_GAME_ID) {
      return normalizeAllGameDetail(games)
    }

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
    if (!selectedGame || selectedGame.gameId === ALL_GAME_ID) {
      return false
    }

    return favoriteGames.some((game) => String(game.gameId) === String(selectedGame.gameId))
  }, [favoriteGames, selectedGame])

  const sentiment = useMemo(() => {
    if (selectedGameId === ALL_GAME_ID) {
      return normalizeAllSentiment(games)
    }

    return normalizeSentiment(sentimentData, selectedGame)
  }, [games, selectedGame, selectedGameId, sentimentData])

  const topics = useMemo(() => {
    if (selectedGameId === ALL_GAME_ID) {
      return normalizeTopics(overallTopicData)
    }

    return normalizeTopics(topicData)
  }, [overallTopicData, selectedGameId, topicData])

  const analysisSampleSize = useMemo(() => {
    if (selectedGameId === ALL_GAME_ID) {
      return getAnalysisSampleSize(overallTopicData)
    }

    return getAnalysisSampleSize(topicData, sentimentData)
  }, [overallTopicData, selectedGameId, sentimentData, topicData])

  const topicSummary = useMemo(() => {
    return normalizeTopicSummary(topics)
  }, [topics])

  const trendPoints = useMemo(() => {
    if (selectedGameId === ALL_GAME_ID) {
      return []
    }

    return normalizeTrendPoints(historyData, reviewTrendData)
  }, [historyData, reviewTrendData, selectedGameId])

  const reviewInsight = useMemo(() => {
    return normalizeReviewInsight(reviewInsightData)
  }, [reviewInsightData])

  const quickSummaryItems = useMemo(() => {
    return createQuickSummaryItems(
      selectedGame,
      sentiment,
      topics,
      reviewInsight,
      analysisSampleSize,
    )
  }, [analysisSampleSize, selectedGame, sentiment, topics, reviewInsight])

  /**
   * 오른쪽 상세 영역 높이를 측정해서 왼쪽 게임 목록 패널 높이로 적용합니다.
   * 이렇게 해야 게임 목록 패널 높이는 오른쪽과 맞고,
   * 목록 내용은 패널 내부에서만 스크롤됩니다.
   */
  useEffect(() => {
    const mainAreaElement = mainAreaRef.current

    if (!mainAreaElement) {
      return
    }

    const updateResultPanelHeight = () => {
      const nextHeight = Math.ceil(mainAreaElement.getBoundingClientRect().height)

      if (nextHeight > 0) {
        setResultPanelHeight(nextHeight)
      }
    }

    updateResultPanelHeight()

    const resizeObserver = new ResizeObserver(updateResultPanelHeight)
    resizeObserver.observe(mainAreaElement)

    window.addEventListener('resize', updateResultPanelHeight)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateResultPanelHeight)
    }
  }, [
    selectedGameId,
    selectedPeriod,
    games.length,
    topics.length,
    trendPoints.length,
    sentiment.totalCount,
    detailLoading,
  ])

  function handleShowAllGames() {
    setSelectedGameId(ALL_GAME_ID)
    setSearchText('')
    setIsSearchFocused(false)
  }

  function handleSelectGame(gameId: string | number) {
    if (String(gameId) === ALL_GAME_ID) {
      handleShowAllGames()
      return
    }

    setSelectedGameId(String(gameId))
    setSearchText('')
  }

  function handlePeriodChange(period: PeriodOption) {
    if (isAllSelected) {
      return
    }

    setSelectedPeriod(period)
  }

  function handleGenreSuggestionClick(value: string) {
    setSearchText(value)

    const keyword = value.toLowerCase()

    const matchedGame = gameSummaries.find((game) => {
      return (
        game.genre.toLowerCase().includes(keyword) ||
        game.genreSearchText.includes(keyword) ||
        game.genres.some((genre) => genre.toLowerCase().includes(keyword))
      )
    })

    if (matchedGame) {
      setSelectedGameId(String(matchedGame.gameId))
    }

    setIsSearchFocused(true)
  }

  function handleGameSuggestionClick(gameId: string | number) {
    handleSelectGame(gameId)
    setIsSearchFocused(false)
  }

  function handleAddFavoriteGame() {
    if (!selectedGame || selectedGame.gameId === ALL_GAME_ID) {
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

  const summaryScopeLabel = isAllSelected ? '전체 게임 기준' : '선택 게임 기준'
  const keywordGroupTitle = isAllSelected ? '전체 키워드 그룹' : '게임별 키워드 그룹'
  const keywordGroupDescription = isAllSelected
    ? '전체 리뷰 샘플에서 함께 자주 등장한 키워드 묶음입니다.'
    : '선택한 게임의 리뷰에서 함께 자주 등장한 키워드 묶음입니다.'

  /**
   * 추이 그래프는 선택한 기간 전체의 모든 날짜를 자동 생성하는 방식이 아니라,
   * 백엔드 API가 실제로 제공한 날짜 데이터만 표시합니다.
   */
  const periodNote = isAllSelected
    ? '[전체] 항목은 기간별 추이를 제공하지 않습니다.'
    : `${selectedPeriod}일 범위 내 제공된 날짜 데이터만 표시됩니다.`

  return (
    <div className="game-detail-page">
      <section className="game-detail-header">
        <p className="game-detail-sample-note">
          ※ 현재 분석 화면은 50개 게임 샘플을 대상으로 하며, 각 수치는 Steam/SteamSpy
          집계 데이터를 기준으로 제공합니다.
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
            placeholder="게임명, 장르로 검색"
            type="text"
          />

          {isSearchFocused && (
            <div className="game-detail-search-dropdown">
              {searchText.trim() ? (
                <>
                  <div className="game-detail-dropdown-section-title">게임명 선택</div>

                  {displayGames.length > 0 ? (
                    displayGames.slice(0, 12).map((game) => (
                      <button
                        key={game.id}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => handleGameSuggestionClick(game.gameId)}
                        type="button"
                      >
                        <GameSummaryThumbnail
                          game={game}
                          className="game-detail-search-thumb"
                        />

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
                <div className="game-detail-dropdown-section">
                  <div className="game-detail-dropdown-section-title">검색 가능한 장르</div>

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
              )}
            </div>
          )}
        </div>
      </section>

      <section className="game-detail-top-layout">
        <aside
          className="game-detail-result-panel"
          style={resultPanelHeight ? { height: `${resultPanelHeight}px` } : undefined}
        >
          <div className="game-detail-panel-title">
            <strong>게임 목록</strong>
            <span>{resultCountLabel}</span>
          </div>

          <div className="game-detail-result-list">
            {displayGames.map((game) => (
              <button
                className={String(game.gameId) === selectedGameId ? 'active' : ''}
                key={game.id}
                onClick={() => handleSelectGame(game.gameId)}
                type="button"
              >
                <GameSummaryThumbnail game={game} className="game-detail-result-thumb" />

                <span className="game-detail-result-text">
                  <strong>{game.name}</strong>
                  <em>{game.genre}</em>
                </span>
              </button>
            ))}
          </div>
        </aside>

        <div className="game-detail-main-area" ref={mainAreaRef}>
          <section className="game-detail-hero-card">
            <div className="game-detail-cover">
              {selectedGame.image ? (
                <img src={selectedGame.image} alt={`${selectedGame.name} 이미지`} />
              ) : (
                <div>{isAllSelected ? '전체' : selectedGame.name.slice(0, 2)}</div>
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
                  value={`${getEvaluationLabel(selectedGame.positiveRate)} (${selectedGame.positiveRate.toFixed(1)}%)`}
                  positive
                />
              </div>
            </div>

            <div className="game-detail-action-card">
              <span>{isAllSelected ? '평균 가격' : '현재 가격'}</span>
              <strong>{selectedGame.priceLabel}</strong>
              <b>{selectedGame.priceKrwLabel}</b>
              <p>
                {selectedGame.priceSubLabelLine1}
                <br />
                {selectedGame.priceSubLabelLine2}
              </p>

              <button
                className={isSelectedGameFavorite ? 'secondary added' : 'secondary'}
                disabled={isAllSelected || isSelectedGameFavorite}
                onClick={handleAddFavoriteGame}
                type="button"
              >
                {isAllSelected
                  ? '전체 데이터 선택 중'
                  : isSelectedGameFavorite
                    ? '관심 게임에 추가됨'
                    : '관심 게임 추가'}
              </button>
            </div>
          </section>

          <div className={`game-detail-summary-wrap ${isAllSelected ? 'is-all' : 'is-single'}`}>
            <section className="game-detail-summary-grid">
              <SummaryCard
                title="긍정 비율"
                value={`${sentiment.positive.toFixed(1)}%`}
                description={summaryScopeLabel}
                type="positive"
              />

              {isAllSelected && (
                <SummaryCard
                  title="총 Steam 리뷰 수"
                  value={formatNumber(sentiment.totalCount || selectedGame.totalReviews)}
                  description="전체 게임의 긍정/부정 리뷰 합산"
                  type="blue"
                />
              )}

              <SummaryCard
                title="분석 샘플 리뷰 수"
                value={analysisSampleSize > 0 ? formatNumber(analysisSampleSize) : '제공 없음'}
                description="감성·토픽 분석 기준"
                type="blue"
              />

              <SummaryCard
                title="평균 플레이타임"
                value={`${formatNumber(selectedGame.averagePlaytime)}분`}
                description={isAllSelected ? '전체 평균 기준' : '제공 데이터 기준'}
                type="neutral"
              />

              <SummaryCard
                title="보유자 추정 수"
                value={selectedGame.owners}
                description={isAllSelected ? 'SteamSpy 범위 합산 기준' : 'SteamSpy 기준'}
                type="blue"
              />

              <SummaryCard
                title={isAllSelected ? '평균 가격' : '현재 가격'}
                value={selectedGame.priceLabel}
                description={selectedGame.priceKrwLabel}
                type="neutral"
              />
            </section>
          </div>

          <section className="game-detail-chart-grid">
            <article className="game-detail-card">
              <div className="game-detail-card-head chart-card-head">
                <div className="game-detail-card-title-group">
                  <h3>가격 변동 추이</h3>
                  <span
                    className={
                      isAllSelected ? 'game-detail-fixed-note disabled' : 'game-detail-fixed-note'
                    }
                  >
                    {periodNote}
                  </span>
                </div>

                <PeriodSelector
                  disabled={isAllSelected}
                  selectedPeriod={selectedPeriod}
                  onChange={handlePeriodChange}
                />
              </div>

              {trendPoints.length > 0 ? (
                <div className="game-detail-price-bar-chart">
                  {trendPoints.map((point) => (
                    <div key={point.label}>
                      <span
                        style={{
                          height: `${calculatePriceBarHeight(point.price, trendPoints)}%`,
                        }}
                        title={`${point.label} / ${formatSteamPrice(point.price)}`}
                      />
                      <em>{point.label}</em>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="game-detail-no-trend">
                  <strong>가격 변동 데이터 없음</strong>
                  <p>
                    {isAllSelected
                      ? '[전체] 항목은 기간별 가격 이력 API를 호출하지 않습니다.'
                      : `${selectedPeriod}일 범위 내 제공된 가격 변동 데이터가 없습니다.`}
                  </p>
                </div>
              )}
            </article>

            <article className="game-detail-card">
              <div className="game-detail-card-head chart-card-head">
                <div className="game-detail-card-title-group">
                  <h3>리뷰 수 & 긍정 비율 추이</h3>
                  <span
                    className={
                      isAllSelected ? 'game-detail-fixed-note disabled' : 'game-detail-fixed-note'
                    }
                  >
                    {periodNote}
                  </span>
                </div>

                <PeriodSelector
                  disabled={isAllSelected}
                  selectedPeriod={selectedPeriod}
                  onChange={handlePeriodChange}
                />
              </div>

              {trendPoints.length > 0 ? (
                <div className="game-detail-bar-chart">
                  {trendPoints.map((point) => (
                    <div key={point.label}>
                      <span
                        style={{
                          height: `${Math.max(12, Math.min(92, point.positiveRate))}%`,
                        }}
                        title={`${point.label} / 긍정 비율 ${point.positiveRate.toFixed(
                          1,
                        )}% / 리뷰 ${formatNumber(point.reviewCount)}`}
                      />
                      <em>{point.label}</em>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="game-detail-no-trend">
                  <strong>리뷰 추이 데이터 없음</strong>
                  <p>
                    {isAllSelected
                      ? '[전체] 항목은 기간별 리뷰 추이를 제공하지 않습니다.'
                      : `${selectedPeriod}일 범위 내 제공된 리뷰 추이 데이터가 없습니다.`}
                  </p>
                </div>
              )}
            </article>

            <article className="game-detail-card sentiment-card">
              <div className="game-detail-card-head">
                <h3>리뷰 감성 분석</h3>

                <button
                  className="game-detail-sentiment-more-button"
                  onClick={() => setIsSentimentModalOpen(true)}
                  type="button"
                >
                  더보기
                </button>
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
        </div>
      </section>

      <section className="game-detail-keyword-group-section">
        <article className="game-detail-card keyword-group-card">
          <div className="game-detail-card-head keyword-group-head">
            <div>
              <h3>{keywordGroupTitle}</h3>
              <p>{keywordGroupDescription}</p>
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
              {isAllSelected
                ? '전체 키워드 그룹 데이터가 없습니다.'
                : '이 게임의 키워드 그룹 데이터가 없습니다.'}
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

      {isSentimentModalOpen && (
        <div
          className="sentiment-modal-backdrop"
          onClick={() => setIsSentimentModalOpen(false)}
          role="presentation"
        >
          <section
            className="sentiment-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="리뷰 감성 분석 상세 보기"
          >
            <div className="sentiment-modal-header">
              <div>
                <h2>리뷰 감성 분석 상세 보기</h2>
                <p>
                  {isAllSelected
                    ? '전체 게임의 Steam 리뷰 감성 분포를 크게 확인합니다.'
                    : `${selectedGame.name}의 리뷰 감성 분포를 크게 확인합니다.`}
                </p>
              </div>

              <button
                className="sentiment-modal-close"
                onClick={() => setIsSentimentModalOpen(false)}
                type="button"
                aria-label="리뷰 감성 분석 상세 보기 닫기"
              >
                ×
              </button>
            </div>

            <div className="sentiment-modal-body">
              <div
                className="sentiment-modal-donut"
                style={{
                  background: `conic-gradient(
                    #42b96e 0% ${sentiment.positive}%,
                    #c8ccd5 ${sentiment.positive}% ${sentiment.positive + sentiment.neutral}%,
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

              <div className="sentiment-modal-list">
                <div className="sentiment-modal-row positive">
                  <span>
                    <i />
                    긍정
                  </span>
                  <strong>{sentiment.positive.toFixed(1)}%</strong>
                  <em>{formatNumber(sentiment.positiveCount)}</em>
                </div>

                <div className="sentiment-modal-row neutral">
                  <span>
                    <i />
                    중립
                  </span>
                  <strong>{sentiment.neutral.toFixed(1)}%</strong>
                  <em>{formatNumber(sentiment.neutralCount)}</em>
                </div>

                <div className="sentiment-modal-row negative">
                  <span>
                    <i />
                    부정
                  </span>
                  <strong>{sentiment.negative.toFixed(1)}%</strong>
                  <em>{formatNumber(sentiment.negativeCount)}</em>
                </div>
              </div>
            </div>

            <div className="sentiment-modal-summary">
              <div>
                <span>긍정 리뷰 수</span>
                <strong>{formatNumber(sentiment.positiveCount)}</strong>
              </div>

              <div>
                <span>중립 리뷰 수</span>
                <strong>{formatNumber(sentiment.neutralCount)}</strong>
              </div>

              <div>
                <span>부정 리뷰 수</span>
                <strong>{formatNumber(sentiment.negativeCount)}</strong>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

/**
 * 기간 선택 버튼 컴포넌트입니다.
 * [전체] 선택 시에는 disabled 처리됩니다.
 */
function PeriodSelector({
  selectedPeriod,
  disabled,
  onChange,
}: {
  selectedPeriod: PeriodOption
  disabled: boolean
  onChange: (period: PeriodOption) => void
}) {
  const periods: PeriodOption[] = [30, 90]

  return (
    <div className="game-detail-chart-actions">
      {periods.map((period) => (
        <button
          className={selectedPeriod === period ? 'active' : ''}
          disabled={disabled}
          key={period}
          onClick={() => onChange(period)}
          type="button"
        >
          {period}일
        </button>
      ))}
    </div>
  )
}

function GameSummaryThumbnail({
  game,
  className,
}: {
  game: GameSummary
  className: string
}) {
  if (game.gameId === ALL_GAME_ID) {
    return <span className={className}>전체</span>
  }

  return (
    <span className={className}>
      {game.image ? <img src={game.image} alt={`${game.name} 이미지`} /> : game.name.slice(0, 2)}
    </span>
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

/**
 * [전체] 항목을 게임 목록에 추가하기 위한 가상 게임 데이터입니다.
 */
function createAllGameSummary(totalGames: number): GameSummary {
  return {
    id: ALL_GAME_ID,
    gameId: ALL_GAME_ID,
    name: '[전체]',
    genre: `${formatNumber(totalGames)}개 게임 전체 데이터`,
    genreSearchText: '전체 전체게임 전체 데이터 all total aggregate',
    genres: ['전체'],
  }
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

/**
 * [전체] 선택 시 개별 게임 상세 API 없이 목록 데이터를 집계해서 화면에 보여줍니다.
 */
function normalizeAllGameDetail(games: ApiRecord[]): GameDetailView {
  const stats = calculateAggregateGameStats(games)
  const topGenres = stats.topGenres.map((genre) => genre.name)
  const displayGenres =
    topGenres.length > 0 ? ['전체 데이터', ...topGenres] : ['전체 데이터', '장르 정보 없음']

  return {
    id: ALL_GAME_ID,
    gameId: ALL_GAME_ID,
    name: '[전체]',
    genre: `${stats.totalGames}개 게임 샘플`,
    genreSearchText: '전체 전체게임 전체 데이터 all total aggregate',
    genres: displayGenres,
    priceLabel:
      stats.averagePrice > 0 ? `평균 ${formatSteamPrice(stats.averagePrice)}` : '가격 정보 없음',
    priceKrwLabel:
      stats.averagePrice > 0 ? `(${formatEstimatedKrw(stats.averagePrice)})` : '(가격 정보 없음)',
    priceSubLabelLine1: '현재 불러온 전체 목록 기준,',
    priceSubLabelLine2: '평균 가격 추정 값',
    owners: formatOwnersRange(calculateTotalOwnersRange(games)),
    positiveReviews: stats.positiveReviews,
    negativeReviews: stats.negativeReviews,
    totalReviews: stats.totalReviews,
    positiveRate: stats.positiveRate,
    negativeRate: stats.negativeRate,
    averagePlaytime: stats.averagePlaytime,
    releaseDate: '전체 데이터',
    developer: '전체 집계',
    publisher: '전체 집계',
    metacriticScore: '전체 집계',
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

  const price = normalizePrice(
    game.price ?? game.final_price ?? game.initial_price ?? game.price_usd ?? game.current_price,
  )
  const isFree =
    Boolean(game.is_free ?? game.free ?? game.isFree ?? game.free_to_play) || price <= 0
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

/**
 * [전체] 선택 시 전체 게임의 긍정/부정 리뷰 수를 합산합니다.
 * 중립 데이터는 Steam 원본 리뷰에 없기 때문에 0으로 둡니다.
 */
function normalizeAllSentiment(games: ApiRecord[]): SentimentView {
  const stats = calculateAggregateGameStats(games)

  return {
    positive: stats.positiveRate,
    neutral: 0,
    negative: stats.negativeRate,
    positiveCount: stats.positiveReviews,
    neutralCount: 0,
    negativeCount: stats.negativeReviews,
    totalCount: stats.totalReviews,
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
      ) ||
      (totalCount > 0 ? (positiveCount / totalCount) * 100 : selectedGame?.positiveRate || 0)

    const negative =
      normalizeRatio(
        sentimentData.negative_ratio ??
          sentimentData.negative_rate ??
          sentimentData.negativeRate,
      ) ||
      (totalCount > 0 ? (negativeCount / totalCount) * 100 : selectedGame?.negativeRate || 0)

    const neutral =
      normalizeRatio(
        sentimentData.neutral_ratio ?? sentimentData.neutral_rate ?? sentimentData.neutralRate,
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
    totalCount:
      selectedGame.positiveReviews + selectedGame.negativeReviews || selectedGame.totalReviews,
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

function getAnalysisSampleSize(topicData: ApiRecord[], sentimentData?: ApiRecord | null) {
  const topicSampleSize = topicData.reduce((max, topic) => {
    return Math.max(
      max,
      toNumber(
        topic.sample_size ??
          topic.sampleSize ??
          topic.review_count ??
          topic.reviewCount ??
          topic.total_reviews ??
          topic.totalReviews,
      ),
    )
  }, 0)

  const sentimentSampleSize = sentimentData
    ? toNumber(
        sentimentData.sample_size ??
          sentimentData.sampleSize ??
          sentimentData.review_count ??
          sentimentData.reviewCount ??
          sentimentData.total_reviews ??
          sentimentData.totalReviews ??
          sentimentData.total_count ??
          sentimentData.totalCount,
      )
    : 0

  return Math.max(topicSampleSize, sentimentSampleSize)
}

function normalizeTrendPoints(
  historyData: ApiRecord[],
  reviewTrendData: ApiRecord[],
): TrendPoint[] {
  const source = reviewTrendData.length > 0 ? reviewTrendData : historyData

  if (source.length === 0) {
    return []
  }

  return source.map((item, index) => {
    const label = String(
      item.period ?? item.date ?? item.month ?? item.created_at ?? item.label ?? index + 1,
    )

    return {
      label: formatTrendLabel(label),
      price: normalizePrice(item.final_price ?? item.price ?? item.price_usd ?? item.current_price),
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
  analysisSampleSize: number,
) {
  if (!selectedGame) {
    return ['선택된 게임 데이터가 없습니다.']
  }

  if (selectedGame.gameId === ALL_GAME_ID) {
    const mainTopic = topics[0]
    const mainKeywords = mainTopic?.keywords.slice(0, 3).join(', ') ?? '대표 키워드 없음'

    return [
      `현재 불러온 전체 게임 수는 ${selectedGame.genre}입니다.`,
      `총 Steam 리뷰 수는 ${formatNumber(sentiment.totalCount || selectedGame.totalReviews)}개입니다.`,
      `분석 샘플 리뷰 수는 ${
        analysisSampleSize > 0 ? formatNumber(analysisSampleSize) : '제공 없음'
      }입니다.`,
      `대표 키워드 그룹은 ${mainKeywords} 중심으로 나타납니다.`,
      `전체 평균 가격은 ${selectedGame.priceLabel} 기준입니다.`,
    ]
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
    `분석 샘플 리뷰 수는 ${
      analysisSampleSize > 0 ? formatNumber(analysisSampleSize) : '제공 없음'
    }입니다.`,
    `가장 큰 키워드 그룹은 ${mainKeywords} 중심으로 나타납니다.`,
    `보유자 추정 수는 ${selectedGame.owners}입니다.`,
    compactSentence(reviewInsight.negativeSummary),
  ]
}

async function getGameHistoryByPeriod(gameId: string, period: PeriodOption) {
  const { startDate, endDate } = getPeriodDateRange(period)
  const baseUrl = getApiBaseUrl()
  const url = `${baseUrl}/games/${gameId}/history?interval=day&start_date=${startDate}&end_date=${endDate}`

  return fetchApiRecordArray(url)
}

async function getGameReviewTrendByPeriod(gameId: string, period: PeriodOption) {
  const { startDate, endDate } = getPeriodDateRange(period)
  const baseUrl = getApiBaseUrl()
  const url = `${baseUrl}/games/${gameId}/review-trend?interval=day&start_date=${startDate}&end_date=${endDate}`

  return fetchApiRecordArray(url)
}

async function fetchApiRecordArray(url: string): Promise<ApiRecord[]> {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`API 요청 실패: ${url}`)
  }

  const data = await response.json()

  if (Array.isArray(data)) {
    return data.filter(isRecord)
  }

  if (isRecord(data)) {
    const candidates = [
      data.items,
      data.results,
      data.data,
      data.history,
      data.trends,
      data.review_trend,
      data.reviewTrend,
    ]

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate.filter(isRecord)
      }
    }

    return [data]
  }

  return []
}

function getPeriodDateRange(period: PeriodOption) {
  const end = new Date()
  const start = new Date()

  start.setDate(end.getDate() - period)

  return {
    startDate: formatDateForQuery(start),
    endDate: formatDateForQuery(end),
  }
}

function formatDateForQuery(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getApiBaseUrl() {
  return (
    import.meta.env.VITE_API_BASE_URL ??
    'https://steam-market-dashboard-production.up.railway.app'
  )
}

function compactSentence(text: string) {
  const cleaned = text.replace(/\s+/g, ' ').trim()

  if (cleaned.length <= 42) {
    return cleaned
  }

  return `${cleaned.slice(0, 42)}...`
}

function calculateAggregateGameStats(games: ApiRecord[]): AggregateGameStats {
  let positiveReviews = 0
  let negativeReviews = 0
  let totalReviews = 0
  let playtimeSum = 0
  let playtimeCount = 0
  let priceSum = 0
  let pricedGameCount = 0
  let freeGameCount = 0

  const genreCountMap = new Map<string, number>()
  const positiveRateValues: number[] = []
  const negativeRateValues: number[] = []

  games.forEach((game) => {
    const positive = toNumber(game.positive_reviews ?? game.positiveReviews)
    const negative = toNumber(game.negative_reviews ?? game.negativeReviews)
    const calculatedReviews = positive + negative
    const apiTotalReviews = toNumber(
      game.total_reviews ?? game.totalReviews ?? game.review_count ?? game.reviews,
    )
    const gameTotalReviews = calculatedReviews > 0 ? calculatedReviews : apiTotalReviews

    positiveReviews += positive
    negativeReviews += negative
    totalReviews += gameTotalReviews

    const positiveRate = getPositiveRate(game)
    const negativeRate = getNegativeRate(game)

    if (positiveRate > 0) {
      positiveRateValues.push(positiveRate)
    }

    if (negativeRate > 0) {
      negativeRateValues.push(negativeRate)
    }

    const playtime = toNumber(game.average_playtime ?? game.avg_playtime)

    if (playtime > 0) {
      playtimeSum += playtime
      playtimeCount += 1
    }

    const price = normalizePrice(
      game.price ?? game.final_price ?? game.initial_price ?? game.price_usd ?? game.current_price,
    )

    if (price > 0) {
      priceSum += price
      pricedGameCount += 1
    } else {
      freeGameCount += 1
    }

    const genres = formatGenreList(getMergedGenreSource(game))

    genres.forEach((genre) => {
      if (!genre || genre === '장르 없음') {
        return
      }

      genreCountMap.set(genre, (genreCountMap.get(genre) ?? 0) + 1)
    })
  })

  const topGenres = Array.from(genreCountMap.entries())
    .map(([name, count]) => ({
      name,
      count,
      ratio: games.length > 0 ? (count / games.length) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count)

  const positiveRate =
    totalReviews > 0 ? (positiveReviews / totalReviews) * 100 : averageNumber(positiveRateValues)

  const negativeRate =
    totalReviews > 0 ? (negativeReviews / totalReviews) * 100 : averageNumber(negativeRateValues)

  return {
    totalGames: games.length,
    positiveReviews,
    negativeReviews,
    totalReviews,
    positiveRate,
    negativeRate,
    averagePlaytime: playtimeCount > 0 ? playtimeSum / playtimeCount : 0,
    averagePrice: pricedGameCount > 0 ? priceSum / pricedGameCount : 0,
    pricedGameCount,
    freeGameCount,
    topGenres,
    topGenreLabel: topGenres.length > 0 ? topGenres[0].name : '전체 데이터',
  }
}

function calculateTotalOwnersRange(games: ApiRecord[]): TotalOwnersRange {
  let minTotal = 0
  let maxTotal = 0
  let validCount = 0

  games.forEach((game) => {
    const owners = getOwners(game)
    const range = parseOwnersRange(owners)

    if (!range) {
      return
    }

    minTotal += range.min
    maxTotal += range.max
    validCount += 1
  })

  return {
    min: minTotal,
    max: maxTotal,
    validCount,
  }
}

function parseOwnersRange(value: unknown): OwnersRange | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return {
      min: value,
      max: value,
    }
  }

  if (typeof value !== 'string') {
    return null
  }

  const cleaned = value
    .replaceAll(',', '')
    .replace(/owners/gi, '')
    .replace(/estimated/gi, '')
    .trim()

  if (!cleaned || cleaned === '정보 없음') {
    return null
  }

  const numbers = cleaned
    .split(/\.\.|~|-/)
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0)

  if (numbers.length >= 2) {
    return {
      min: Math.min(numbers[0], numbers[1]),
      max: Math.max(numbers[0], numbers[1]),
    }
  }

  if (numbers.length === 1) {
    return {
      min: numbers[0],
      max: numbers[0],
    }
  }

  return null
}

function formatOwnersRange(range: TotalOwnersRange) {
  if (range.validCount <= 0 || range.max <= 0) {
    return '정보 없음'
  }

  if (range.min === range.max) {
    return formatCompactKoreanNumber(range.min)
  }

  return `${formatCompactKoreanNumber(range.min)} ~ ${formatCompactKoreanNumber(range.max)}`
}

function formatCompactKoreanNumber(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return '0'
  }

  if (value >= 100000000) {
    return `${(value / 100000000).toFixed(1).replace('.0', '')}억`
  }

  if (value >= 10000) {
    return `${(value / 10000).toFixed(1).replace('.0', '')}만`
  }

  return formatNumber(value)
}

function averageNumber(values: number[]) {
  if (values.length === 0) {
    return 0
  }

  const total = values.reduce((sum, value) => sum + value, 0)

  return total / values.length
}

/**
 * 가격 그래프를 세로 막대 그래프로 표시하기 위해
 * 가격 값을 최대 가격 대비 높이 비율로 변환합니다.
 */
function calculatePriceBarHeight(price: number, points: TrendPoint[]) {
  const prices = points.map((point) => point.price).filter((value) => value > 0)

  if (prices.length === 0 || price <= 0) {
    return 12
  }

  const maxPrice = Math.max(...prices)

  if (maxPrice <= 0) {
    return 12
  }

  return Math.max(12, Math.min(92, (price / maxPrice) * 92))
}

function formatTrendLabel(value: string) {
  if (value.length >= 10 && value.includes('-')) {
    return value.slice(5, 10)
  }

  return value.length > 7 ? value.slice(0, 7) : value
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
  story: '스토리',
  narrative: '서사',
  character: '캐릭터',
  characters: '캐릭터',
  graphics: '그래픽',
  visual: '비주얼',
  visuals: '비주얼',
  art: '아트',
  animation: '애니메이션',
  sound: '사운드',
  music: '음악',
  combat: '전투',
  battle: '전투',
  boss: '보스전',
  bosses: '보스전',
  open: '오픈월드',
  world: '세계관',
  price: '가격',
  value: '가성비',
  worth: '가치',
  dlc: 'DLC',
  bug: '버그',
  bugs: '버그',
  crash: '충돌 오류',
  crashes: '충돌 오류',
  lag: '렉',
  optimization: '최적화',
  performance: '성능',
  server: '서버',
  online: '온라인',
  multiplayer: '멀티플레이',
  coop: '협동',
  'co op': '협동',
  friends: '친구',
  difficulty: '난이도',
  easy: '쉬움',
  hard: '어려움',
  challenge: '도전성',
  balance: '밸런스',
  tutorial: '튜토리얼',
  guide: '가이드',
  controls: '조작감',
  camera: '카메라',
  ui: 'UI',
  interface: '인터페이스',
  system: '시스템',
  mode: '모드',
  quest: '퀘스트',
  mission: '미션',
  level: '레벨',
  puzzle: '퍼즐',
  replay: '반복 플레이',
  access: '접근성',
  'early access': '얼리 액세스',
  vehicles: '차량',
  tanks: '전차',
}

const TOPIC_EN_MAP: Record<string, string> = {
  게임: 'game',
  게임플레이: 'gameplay',
  플레이: 'play',
  플레이경험: 'played',
  플레이어: 'player',
  재미: 'fun',
  긍정평가: 'good',
  호평: 'great',
  높은만족도: 'best',
  부정평가: 'bad',
  선호도: 'like',
  애정도: 'love',
  요구사항: 'want',
  플레이시간: 'time',
  스토리: 'story',
  서사: 'narrative',
  캐릭터: 'character',
  그래픽: 'graphics',
  비주얼: 'visual',
  아트: 'art',
  애니메이션: 'animation',
  사운드: 'sound',
  음악: 'music',
  전투: 'combat',
  보스전: 'boss',
  오픈월드: 'open world',
  세계관: 'world',
  가격: 'price',
  가성비: 'value',
  가치: 'worth',
  버그: 'bug',
  충돌오류: 'crash',
  렉: 'lag',
  최적화: 'optimization',
  성능: 'performance',
  서버: 'server',
  온라인: 'online',
  멀티플레이: 'multiplayer',
  협동: 'co-op',
  친구: 'friends',
  난이도: 'difficulty',
  쉬움: 'easy',
  어려움: 'hard',
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
  반복플레이: 'replay',
  접근성: 'access',
  얼리액세스: 'early access',
  차량: 'vehicles',
  전차: 'tanks',
}

function extractParenthesesText(value: string) {
  const matched = value.match(/\(([^)]+)\)/)

  if (!matched?.[1]) {
    return ''
  }

  return matched[1].trim()
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
  return String(game.name ?? game.title ?? game.game_name ?? '이름 없는 게임')
}

function getMergedGenreSource(game: ApiRecord) {
  return game.genres ?? game.genre ?? game.tags ?? game.categories ?? []
}

function getGameImage(game: ApiRecord) {
  const image =
    game.header_image ??
    game.headerImage ??
    game.capsule_image ??
    game.capsuleImage ??
    game.image_url ??
    game.imageUrl ??
    game.thumbnail ??
    game.thumbnail_url ??
    game.thumbnailUrl ??
    game.cover_image ??
    game.coverImage ??
    game.image

  if (typeof image === 'string' && image.trim()) {
    const trimmed = image.trim()

    if (trimmed.startsWith('//')) {
      return `https:${trimmed}`
    }

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed
    }
  }

  const gameId = getGameId(game)

  if (typeof gameId === 'string' || typeof gameId === 'number') {
    return `https://cdn.cloudflare.steamstatic.com/steam/apps/${gameId}/header.jpg`
  }

  return undefined
}

function getOwners(game: ApiRecord) {
  return game.owners ?? game.owner_range ?? game.estimated_owners ?? game.owners_range
}

function formatOwners(value: unknown) {
  if (typeof value === 'string' && value.trim()) {
    return value.replace(/\s*\.\.\s*/g, ' ~ ').trim()
  }

  const number = toNumber(value)

  if (number <= 0) {
    return '정보 없음'
  }

  return formatNumber(number)
}

function getPositiveRate(game: ApiRecord) {
  const positiveReviews = toNumber(game.positive_reviews ?? game.positiveReviews)
  const negativeReviews = toNumber(game.negative_reviews ?? game.negativeReviews)
  const directRate = normalizeRatio(
    game.positive_ratio ??
      game.positive_rate ??
      game.positiveRate ??
      game.positive_percent ??
      game.positivePercent,
  )

  if (directRate > 0) {
    return directRate
  }

  const totalReviews = positiveReviews + negativeReviews

  if (totalReviews <= 0) {
    return 0
  }

  return (positiveReviews / totalReviews) * 100
}

function getNegativeRate(game: ApiRecord) {
  const positiveReviews = toNumber(game.positive_reviews ?? game.positiveReviews)
  const negativeReviews = toNumber(game.negative_reviews ?? game.negativeReviews)
  const directRate = normalizeRatio(
    game.negative_ratio ??
      game.negative_rate ??
      game.negativeRate ??
      game.negative_percent ??
      game.negativePercent,
  )

  if (directRate > 0) {
    return directRate
  }

  const totalReviews = positiveReviews + negativeReviews

  if (totalReviews <= 0) {
    return 0
  }

  return (negativeReviews / totalReviews) * 100
}

function getEvaluationLabel(positiveRate: number) {
  if (positiveRate >= 85) {
    return '매우 긍정적'
  }

  if (positiveRate >= 70) {
    return '긍정적'
  }

  if (positiveRate >= 50) {
    return '복합적'
  }

  if (positiveRate > 0) {
    return '부정적'
  }

  return '정보 없음'
}

function getKeywords(topic: ApiRecord) {
  return normalizeKeywordCandidate(
    topic.keywords ??
      topic.keyword ??
      topic.words ??
      topic.terms ??
      topic.top_words ??
      topic.topWords ??
      topic.label ??
      topic.name,
  )
}

function normalizeKeywordCandidate(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string' || typeof item === 'number') {
          return String(item)
        }

        if (isRecord(item)) {
          const word = item.keyword ?? item.word ?? item.term ?? item.name ?? item.label ?? item.text

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
      // JSON 문자열이 아니면 일반 문자열로 처리합니다.
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
    const word = value.keyword ?? value.word ?? value.term ?? value.name ?? value.label ?? value.text

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
  if (!Number.isFinite(price) || price <= 0) {
    return '무료'
  }

  return `$${price.toFixed(2)}`
}

function formatEstimatedKrw(price: number) {
  if (!Number.isFinite(price) || price <= 0) {
    return '약 ₩0'
  }

  const krw = Math.round(price * USD_TO_KRW)
  return `약 ₩${krw.toLocaleString('ko-KR')}`
}

function normalizePrice(value: unknown) {
  const number = toNumber(value)

  if (!Number.isFinite(number) || number <= 0) {
    return 0
  }

  if (Number.isInteger(number) && number >= 100) {
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
      value.replaceAll(',', '').replace('%', '').replace('$', '').replace('₩', '').trim(),
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
