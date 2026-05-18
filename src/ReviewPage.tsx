import { useEffect, useMemo, useState } from 'react'
import {
  getGameSentiment,
  getGameTopics,
  getGames,
  getSentimentAnalysis,
  getTopicAnalysis,
  type Game,
  type SentimentAnalysis,
  type TopicAnalysis,
} from './api'

type ReviewGameView = {
  id: string
  gameId?: string | number
  name: string
  genre: string
  positiveReviews: number
  neutralReviews: number
  negativeReviews: number
  totalReviews: number
  positiveRate: number
  neutralRate: number
  negativeRate: number
  averagePlaytime: number
  image?: string
}

type KeywordView = {
  label: string
  sizeClassName: string
}

type RankingView = {
  id: string
  rank: number
  name: string
  percent: number
  reviewCount: number
}

function ReviewPage() {
  const [games, setGames] = useState<Game[]>([])
  const [overallSentiment, setOverallSentiment] =
    useState<SentimentAnalysis | null>(null)
  const [overallTopics, setOverallTopics] = useState<TopicAnalysis[]>([])
  const [selectedGameId, setSelectedGameId] = useState<string>('')
  const [searchText, setSearchText] = useState('')
  const [selectedGameSentiment, setSelectedGameSentiment] =
    useState<SentimentAnalysis | null>(null)
  const [selectedGameTopics, setSelectedGameTopics] = useState<TopicAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const [gameLoading, setGameLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function loadReviewData() {
      try {
        setLoading(true)
        setErrorMessage('')

        const [gamesResult, sentimentResult, topicsResult] =
          await Promise.allSettled([
            getGames(),
            getSentimentAnalysis(),
            getTopicAnalysis(),
          ])

        if (gamesResult.status === 'fulfilled') {
          const gameList = Array.isArray(gamesResult.value) ? gamesResult.value : []
          setGames(gameList)

          const firstGame = gameList.find((game) => getGameId(game) !== undefined)

          if (firstGame) {
            setSelectedGameId(String(getGameId(firstGame)))
          }
        }

        if (sentimentResult.status === 'fulfilled') {
          setOverallSentiment(sentimentResult.value)
        }

        if (topicsResult.status === 'fulfilled') {
          setOverallTopics(topicsResult.value)
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

  const reviewGames = useMemo(() => {
    return normalizeReviewGames(games)
  }, [games])

  const selectedGame = useMemo(() => {
    return (
      reviewGames.find((game) => String(game.gameId) === selectedGameId) ??
      reviewGames[0]
    )
  }, [reviewGames, selectedGameId])

  useEffect(() => {
    async function loadSelectedGameData() {
      if (!selectedGame?.gameId) {
        return
      }

      try {
        setGameLoading(true)

        const [sentimentResult, topicsResult] = await Promise.allSettled([
          getGameSentiment(selectedGame.gameId),
          getGameTopics(selectedGame.gameId),
        ])

        if (sentimentResult.status === 'fulfilled') {
          setSelectedGameSentiment(sentimentResult.value)
        } else {
          setSelectedGameSentiment(null)
        }

        if (topicsResult.status === 'fulfilled') {
          setSelectedGameTopics(topicsResult.value)
        } else {
          setSelectedGameTopics([])
        }
      } catch (error) {
        console.error(error)
        setSelectedGameSentiment(null)
        setSelectedGameTopics([])
      } finally {
        setGameLoading(false)
      }
    }

    loadSelectedGameData()
  }, [selectedGame?.gameId])

  const filteredGames = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    if (!keyword) {
      return reviewGames
    }

    return reviewGames.filter((game) => {
      return game.name.toLowerCase().includes(keyword)
    })
  }, [reviewGames, searchText])

  const selectedSentiment = useMemo(() => {
    if (selectedGameSentiment) {
      return normalizeSentimentFromApi(selectedGameSentiment)
    }

    if (selectedGame) {
      return {
        positive: selectedGame.positiveRate,
        neutral: selectedGame.neutralRate,
        negative: selectedGame.negativeRate,
        positiveCount: selectedGame.positiveReviews,
        neutralCount: selectedGame.neutralReviews,
        negativeCount: selectedGame.negativeReviews,
        totalCount: selectedGame.totalReviews,
      }
    }

    return {
      positive: 0,
      neutral: 0,
      negative: 0,
      positiveCount: 0,
      neutralCount: 0,
      negativeCount: 0,
      totalCount: 0,
    }
  }, [selectedGame, selectedGameSentiment])

  const overallSentimentView = useMemo(() => {
    return normalizeSentimentFromApi(overallSentiment)
  }, [overallSentiment])

  const keywords = useMemo(() => {
    const sourceTopics =
      selectedGameTopics.length > 0 ? selectedGameTopics : overallTopics

    return normalizeKeywords(sourceTopics)
  }, [overallTopics, selectedGameTopics])

  const positiveTopGames = useMemo(() => {
    return [...reviewGames]
      .filter((game) => game.totalReviews >= 10000)
      .sort((a, b) => b.positiveRate - a.positiveRate)
      .slice(0, 5)
      .map((game, index) => ({
        id: `${game.id}-positive`,
        rank: index + 1,
        name: game.name,
        percent: game.positiveRate,
        reviewCount: game.positiveReviews,
      }))
  }, [reviewGames])

  const negativeTopGames = useMemo(() => {
    return [...reviewGames]
      .filter((game) => game.totalReviews >= 10000)
      .sort((a, b) => b.negativeRate - a.negativeRate)
      .slice(0, 5)
      .map((game, index) => ({
        id: `${game.id}-negative`,
        rank: index + 1,
        name: game.name,
        percent: game.negativeRate,
        reviewCount: game.negativeReviews,
      }))
  }, [reviewGames])

  function handleSearchSelect(game: ReviewGameView) {
    if (!game.gameId) {
      return
    }

    setSelectedGameId(String(game.gameId))
    setSearchText('')
  }

  if (loading) {
    return (
      <section className="review-status-card">
        <strong>리뷰 데이터를 불러오는 중입니다...</strong>
        <p>백엔드 API에서 전체 리뷰, 게임 목록, 토픽 데이터를 가져오고 있습니다.</p>
      </section>
    )
  }

  if (errorMessage) {
    return (
      <section className="review-status-card error">
        <strong>리뷰 데이터 로드 실패</strong>
        <p>{errorMessage}</p>
      </section>
    )
  }

  return (
    <div className="review-page">
      <section className="review-card overall-sentiment-card">
        <h2>전체 리뷰 감성 분포</h2>

        <div className="review-donut-layout">
          <div
            className="review-donut"
            style={{
              background: `conic-gradient(
                var(--green) 0% ${overallSentimentView.positive}%,
                var(--gray) ${overallSentimentView.positive}% ${
                  overallSentimentView.positive + overallSentimentView.neutral
                }%,
                var(--red) ${
                  overallSentimentView.positive + overallSentimentView.neutral
                }% 100%
              )`,
            }}
          >
            <div className="review-donut-hole" />
          </div>

          <div className="review-legend">
            <LegendItem
              colorClassName="green"
              label="긍정"
              percent={overallSentimentView.positive}
              count={overallSentimentView.positiveCount}
            />
            <LegendItem
              colorClassName="gray"
              label="중립"
              percent={overallSentimentView.neutral}
              count={overallSentimentView.neutralCount}
            />
            <LegendItem
              colorClassName="red"
              label="부정"
              percent={overallSentimentView.negative}
              count={overallSentimentView.negativeCount}
            />
          </div>
        </div>
      </section>

      <section className="review-card selected-game-card">
        <h2>선택한 게임</h2>

        <div className="game-search-area">
          <input
            className="game-search-input"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="게임 이름 검색"
            type="text"
          />

          {searchText.trim() && (
            <div className="game-search-list">
              {filteredGames.slice(0, 8).map((game) => (
                <button
                  key={game.id}
                  onClick={() => handleSearchSelect(game)}
                  type="button"
                >
                  {game.name}
                </button>
              ))}

              {filteredGames.length === 0 && (
                <p className="review-empty-text">검색 결과가 없습니다.</p>
              )}
            </div>
          )}
        </div>

        <select
          className="game-select"
          value={selectedGameId}
          onChange={(event) => setSelectedGameId(event.target.value)}
        >
          {reviewGames.map((game) => (
            <option key={game.id} value={String(game.gameId)}>
              {game.name}
            </option>
          ))}
        </select>

        {selectedGame ? (
          <>
            <div className="selected-game-image">
              {selectedGame.image ? (
                <img src={selectedGame.image} alt={`${selectedGame.name} 이미지`} />
              ) : (
                <div className="selected-game-fallback">
                  {selectedGame.name.slice(0, 2)}
                </div>
              )}
            </div>

            <div className="selected-game-meta">
              <div>
                <span>긍정 리뷰 비율</span>
                <strong>{selectedGame.positiveRate.toFixed(1)}%</strong>
              </div>

              <div>
                <span>리뷰 수</span>
                <strong>{formatNumber(selectedGame.totalReviews)}</strong>
              </div>
            </div>
          </>
        ) : (
          <p className="review-empty-text">선택된 게임이 없습니다.</p>
        )}
      </section>

      <section className="review-card game-sentiment-card">
        <div className="review-card-title-row">
          <h2>게임별 감성 분포</h2>
          {gameLoading && <span>불러오는 중...</span>}
        </div>

        {selectedGame ? (
          <>
            <h3 className="game-sentiment-name">{selectedGame.name}</h3>

            <div className="stacked-bar">
              <div
                className="stacked-positive"
                style={{ width: `${selectedSentiment.positive}%` }}
              >
                긍정
              </div>
              <div
                className="stacked-neutral"
                style={{ width: `${selectedSentiment.neutral}%` }}
              >
                중립
              </div>
              <div
                className="stacked-negative"
                style={{ width: `${selectedSentiment.negative}%` }}
              >
                부정
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
                <strong>{selectedSentiment.positive.toFixed(1)}%</strong>
              </div>

              <div>
                <span>중립</span>
                <strong>{selectedSentiment.neutral.toFixed(1)}%</strong>
              </div>

              <div>
                <span>부정</span>
                <strong>{selectedSentiment.negative.toFixed(1)}%</strong>
              </div>
            </div>
          </>
        ) : (
          <p className="review-empty-text">게임을 선택해주세요.</p>
        )}
      </section>

      <section className="review-card keyword-card">
        <h2>주요 토픽 키워드</h2>

        {keywords.length > 0 ? (
          <div className="keyword-cloud">
            {keywords.map((keyword, index) => (
              <span
                className={keyword.sizeClassName}
                key={`${keyword.label}-${index}`}
              >
                {keyword.label}
              </span>
            ))}
          </div>
        ) : (
          <p className="review-empty-text">토픽 키워드가 없습니다.</p>
        )}
      </section>

      <section className="review-card review-ranking-card positive-ranking-card">
        <h2>긍정 반응이 높은 게임 TOP 5</h2>
        <RankingList items={positiveTopGames} />
      </section>

      <section className="review-card review-ranking-card negative-ranking-card">
        <h2>부정 반응이 높은 게임 TOP 5</h2>
        <RankingList items={negativeTopGames} />
      </section>
    </div>
  )
}

function LegendItem({
  colorClassName,
  label,
  percent,
  count,
}: {
  colorClassName: string
  label: string
  percent: number
  count: number
}) {
  return (
    <div className="review-legend-item">
      <span className={`dot ${colorClassName}`} />
      <div>
        <strong>{label}</strong>
        <p>
          {percent.toFixed(1)}% ({formatNumber(count)})
        </p>
      </div>
    </div>
  )
}

function RankingList({ items }: { items: RankingView[] }) {
  if (items.length === 0) {
    return <p className="review-empty-text">표시할 데이터가 없습니다.</p>
  }

  return (
    <div className="review-ranking-list">
      {items.map((item) => (
        <div className="review-ranking-item" key={item.id}>
          <span>{item.rank}</span>
          <strong title={item.name}>{item.name}</strong>
          <em>{item.percent.toFixed(1)}%</em>
        </div>
      ))}
    </div>
  )
}

function normalizeReviewGames(games: Game[]): ReviewGameView[] {
  return games.map((game, index) => {
    const positiveReviews = toNumber(game.positive_reviews)
    const neutralReviews = toNumber(game.neutral_reviews)
    const negativeReviews = toNumber(game.negative_reviews)
    const fallbackTotal = toNumber(game.total_reviews ?? game.review_count)
    const totalReviews =
      positiveReviews + neutralReviews + negativeReviews || fallbackTotal
    const positiveRate =
      totalReviews > 0
        ? (positiveReviews / totalReviews) * 100
        : normalizeRatio(game.positive_ratio)
    const neutralRate =
      totalReviews > 0
        ? (neutralReviews / totalReviews) * 100
        : normalizeRatio(game.neutral_ratio)
    const negativeRate =
      totalReviews > 0
        ? (negativeReviews / totalReviews) * 100
        : normalizeRatio(game.negative_ratio)
    const gameId = getGameId(game)

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
      averagePlaytime: toNumber(game.average_playtime ?? game.avg_playtime),
      image: getGameImage(game),
    }
  })
}

function normalizeSentimentFromApi(sentiment: SentimentAnalysis | null) {
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

  return {
    positive: normalizeRatio(sentiment.positive_ratio),
    neutral: normalizeRatio(sentiment.neutral_ratio),
    negative: normalizeRatio(sentiment.negative_ratio),
    positiveCount: toNumber(sentiment.positive),
    neutralCount: toNumber(sentiment.neutral),
    negativeCount: toNumber(sentiment.negative),
    totalCount: toNumber(sentiment.total),
  }
}

function normalizeKeywords(topics: TopicAnalysis[]): KeywordView[] {
  const keywordCountMap = new Map<string, number>()

  topics.forEach((topic) => {
    const words = getTopicKeywords(topic)

    words.forEach((word) => {
      const translated = translateKeyword(word)

      if (!translated) {
        return
      }

      keywordCountMap.set(translated, (keywordCountMap.get(translated) ?? 0) + 1)
    })
  })

  return [...keywordCountMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([label], index) => ({
      label,
      sizeClassName: `keyword-size-${Math.max(1, 5 - Math.floor(index / 3))}`,
    }))
}

function getTopicKeywords(topic: TopicAnalysis) {
  const candidates = [
    topic.keywords,
    topic.top_keywords,
    topic.topKeywords,
    topic.words,
    topic.terms,
  ]

  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length > 0) {
      return candidate.map((item) => String(item))
    }
  }

  return []
}

function translateKeyword(keyword: string) {
  const normalized = keyword.toLowerCase().trim()

  const dictionary: Record<string, string> = {
    game: '게임',
    gameplay: '게임플레이',
    play: '플레이',
    games: '게임',
    story: '스토리',
    combat: '전투',
    graphic: '그래픽',
    graphics: '그래픽',
    visual: '그래픽',
    visuals: '그래픽',
    fun: '재미',
    good: '긍정',
    great: '긍정',
    like: '호감',
    love: '호감',
    time: '플레이 시간',
    friends: '협동',
    friend: '협동',
    coop: '협동',
    co: '협동',
    bug: '버그',
    bugs: '버그',
    server: '서버',
    price: '가격',
    money: '가격',
    shop: '상점/과금',
    dlc: 'DLC',
    difficulty: '난이도',
    hard: '난이도',
    boss: '보스전',
    sound: '사운드',
    music: '음악',
    optimization: '최적화',
    performance: '성능',
    crash: '오류',
    error: '오류',
    map: '맵',
    world: '세계관',
    character: '캐릭터',
  }

  if (dictionary[normalized]) {
    return dictionary[normalized]
  }

  if (normalized.length <= 1) {
    return ''
  }

  return keyword
}

function getGameId(game: Game) {
  return game.game_id ?? game.id ?? game.app_id ?? game.appid ?? game.steam_appid
}

function getGameName(game: Game) {
  return String(game.name ?? game.title ?? '이름 없음')
}

function getGameGenre(game: Game) {
  if (Array.isArray(game.genres)) {
    return game.genres.join(', ')
  }

  return String(game.genre ?? game.genres ?? '장르 정보 없음')
}

function getGameImage(game: Game) {
  if (typeof game.capsule_image === 'string' && game.capsule_image) {
    return game.capsule_image
  }

  if (typeof game.header_image === 'string' && game.header_image) {
    return game.header_image
  }

  if (typeof game.image === 'string' && game.image) {
    return game.image
  }

  const gameId = getGameId(game)

  if (!gameId) {
    return undefined
  }

  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${gameId}/capsule_184x69.jpg`
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

function normalizeRatio(value: unknown) {
  const number = toNumber(value)

  if (number > 0 && number <= 1) {
    return number * 100
  }

  return number
}

function formatNumber(value: number) {
  return Math.round(value).toLocaleString()
}

export default ReviewPage
