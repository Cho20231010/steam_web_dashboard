import { useEffect, useMemo, useState } from 'react'
import {
  getDashboardSummary,
  getGameDetail,
  getGameSentiment,
  getGameTopics,
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
  averagePlaytime: number
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
  const [selectedGameTopics, setSelectedGameTopics] = useState<TopicAnalysis[]>([])
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

        const [detailResult, sentimentResult, topicResult] = await Promise.allSettled([
          getGameDetail(selectedGameId),
          getGameSentiment(selectedGameId),
          getGameTopics(selectedGameId),
        ])

        setSelectedGameDetail(
          detailResult.status === 'fulfilled' ? detailResult.value : null,
        )

        setSelectedGameSentiment(
          sentimentResult.status === 'fulfilled' ? sentimentResult.value : null,
        )

        setSelectedGameTopics(
          topicResult.status === 'fulfilled' && Array.isArray(topicResult.value)
            ? topicResult.value
            : [],
        )
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
    const targetTopics =
      selectedGameTopics.length > 0 ? selectedGameTopics : globalTopics

    return normalizeTopicKeywords(targetTopics, selectedGame, selectedValues)
  }, [selectedGameTopics, globalTopics, selectedGame, selectedValues])

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
            {topicKeywords.map((keyword, index) => (
              <span
                key={`${keyword.label}-${keyword.percent}-${index}`}
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
      averagePlaytime: toNumber(game.average_playtime),
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

function normalizeTopicKeywords(
  topics: TopicAnalysis[],
  selectedGame?: ReviewGameView,
  selectedSentiment?: NormalizedSentiment,
): TopicKeyword[] {
  const keywordMap = new Map<string, number>()

  function addKeyword(label: string, score: number) {
    if (!label) return
    keywordMap.set(label, (keywordMap.get(label) ?? 0) + score)
  }

  if (selectedGame) {
    addGameBasedKeywords(selectedGame, selectedSentiment, addKeyword)
  }

  topics.forEach((topic) => {
    const topicWeight = getTopicWeightPercent(topic)
    const keywords = extractTopicKeywords(topic)

    keywords.forEach((keyword, keywordIndex) => {
      const koreanKeyword = convertKeywordToKorean(keyword)

      if (!koreanKeyword) return

      const score = Math.max(topicWeight - keywordIndex * 0.8, 1)
      addKeyword(koreanKeyword, score)
    })
  })

  const normalizedKeywords = Array.from(keywordMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 14)
    .map(([label, score], index) => ({
      label,
      size: getKeywordSize(index),
      percent: score,
    }))

  if (normalizedKeywords.length > 0) {
    return normalizedKeywords
  }

  return [
    { label: '게임플레이', size: 5, percent: 0 },
    { label: '플레이', size: 4, percent: 0 },
    { label: '게임', size: 4, percent: 0 },
    { label: '스토리', size: 3, percent: 0 },
    { label: '전투', size: 3, percent: 0 },
    { label: '재미', size: 2, percent: 0 },
    { label: '협동', size: 2, percent: 0 },
  ]
}

function addGameBasedKeywords(
  game: ReviewGameView,
  sentiment: NormalizedSentiment | undefined,
  addKeyword: (label: string, score: number) => void,
) {
  const genreLabels = convertGenreTextToKoreanKeywords(game.genre)

  genreLabels.forEach((label, index) => {
    addKeyword(label, 95 - index * 5)
  })

  if (game.totalReviews >= 100000) {
    addKeyword('리뷰 많음', 88)
  } else if (game.totalReviews >= 10000) {
    addKeyword('리뷰 활발', 78)
  }

  if (game.averagePlaytime >= 3000) {
    addKeyword('장기 플레이', 86)
  } else if (game.averagePlaytime >= 1000) {
    addKeyword('플레이 시간', 76)
  }

  const positive = sentiment?.positive ?? game.positiveRate
  const neutral = sentiment?.neutral ?? game.neutralRate
  const negative = sentiment?.negative ?? game.negativeRate

  if (positive >= 85) {
    addKeyword('호평', 84)
    addKeyword('높은 만족도', 76)
  } else if (positive >= 70) {
    addKeyword('긍정 평가', 74)
  }

  if (neutral >= 12) {
    addKeyword('중립 반응', 72)
  }

  if (negative >= 30) {
    addKeyword('부정 이슈', 84)
    addKeyword('개선 필요', 74)
  } else if (negative >= 15) {
    addKeyword('불만 요소', 68)
  }
}

function convertGenreTextToKoreanKeywords(genre: string) {
  const lower = genre.toLowerCase()

  const genreKeywordMap: Array<[string, string]> = [
    ['action', '액션'],
    ['adventure', '어드벤처'],
    ['rpg', 'RPG'],
    ['role-playing', 'RPG'],
    ['strategy', '전략'],
    ['simulation', '시뮬레이션'],
    ['indie', '인디'],
    ['casual', '캐주얼'],
    ['sports', '스포츠'],
    ['racing', '레이싱'],
    ['free to play', '무료 플레이'],
    ['massively multiplayer', '멀티플레이'],
    ['multiplayer', '멀티플레이'],
    ['early access', '앞서 해보기'],
    ['horror', '공포'],
    ['survival', '생존'],
    ['shooter', '슈팅'],
    ['puzzle', '퍼즐'],
    ['platformer', '플랫폼'],
    ['fighting', '격투'],
  ]

  const labels = genreKeywordMap
    .filter(([keyword]) => lower.includes(keyword))
    .map(([, label]) => label)

  return Array.from(new Set(labels))
}

function convertKeywordToKorean(keyword: string) {
  const text = keyword.trim().toLowerCase()

  const ignoredKeywords = new Set([
    'don',
    'dont',
    'de',
    'doi',
    'que',
    'just',
    'really',
    'one',
    'get',
    'make',
    'nt',
  ])

  if (!text || ignoredKeywords.has(text)) {
    return ''
  }

  const keywordMap: Record<string, string> = {
    game: '게임',
    games: '게임',
    gameplay: '게임플레이',
    play: '플레이',
    playing: '플레이',
    player: '플레이어',
    players: '플레이어',

    great: '호평',
    good: '긍정 평가',
    like: '선호',
    love: '높은 만족도',
    fun: '재미',

    story: '스토리',
    narrative: '서사',
    character: '캐릭터',
    characters: '캐릭터',
    quest: '퀘스트',
    lore: '세계관',

    combat: '전투',
    battle: '전투',
    boss: '보스전',
    weapon: '무기',
    weapons: '무기',
    skill: '스킬',

    friends: '협동',
    friend: '협동',
    coop: '협동',
    multiplayer: '멀티플레이',

    time: '플레이 시간',
    hours: '플레이 시간',
    hour: '플레이 시간',
    long: '장기 플레이',

    graphic: '그래픽',
    graphics: '그래픽',
    visual: '비주얼',
    visuals: '비주얼',
    art: '아트',
    design: '디자인',

    sound: '사운드',
    music: '음악',
    audio: '오디오',
    voice: '음성',

    shop: '상점',
    price: '가격',
    money: '가격',
    item: '아이템',
    items: '아이템',
    dlc: 'DLC',

    bug: '버그',
    server: '서버',
    lag: '렉',
    crash: '오류',
    performance: '성능',
    optimization: '최적화',

    peak: '동시 접속',
  }

  return keywordMap[text] ?? ''
}

function extractTopicKeywords(topic: TopicAnalysis) {
  const values = [
    topic.keywords,
    topic.top_keywords,
    topic.topKeywords,
    topic.words,
    topic.terms,
  ]

  for (const value of values) {
    if (Array.isArray(value)) {
      return value.map((item) => String(item))
    }
  }

  return []
}

function getTopicWeightPercent(topic: TopicAnalysis) {
  return normalizeRatio(
    topic.weight_percent ??
      topic.weight ??
      topic.percentage ??
      topic.percent,
  )
}

function getKeywordSize(index: number) {
  if (index === 0) return 5
  if (index <= 2) return 4
  if (index <= 5) return 3
  if (index <= 9) return 2
  return 1
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