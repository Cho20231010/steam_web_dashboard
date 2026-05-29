import { useEffect, useMemo, useState } from 'react'
import './TopicAnalysisPage.css'

type TopicTab = 'cluster' | 'sentiment' | 'trend' | 'genre'

type TopicSentimentType = 'positive' | 'mixed' | 'negative' | 'neutral'

type TopicItem = {
  id: string
  name: string
  keywords: string[]
  share: number | null
  positiveRate: number | null
  negativeRate: number | null
  neutralRate: number | null
  mentionCount: number | null
  sentimentType: TopicSentimentType
  sentimentLabel: string
  highlight: string
  genre: string
}

type BubbleLayout = {
  x: number
  y: number
  size: number
  tone: 'blue' | 'purple' | 'red' | 'orange' | 'indigo' | 'sky'
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

const TOPIC_LABEL_MAP: Record<string, string> = {
  gameplay: '게임플레이',
  game: '게임플레이',
  play: '게임플레이',
  fun: '재미 요소',
  story: '스토리',
  narrative: '스토리',
  feel: '몰입감',
  graphic: '그래픽',
  graphics: '그래픽',
  art: '아트',
  design: '디자인',
  sound: '사운드',
  music: '음악',
  bug: '버그/성능',
  bugs: '버그/성능',
  performance: '성능',
  optimization: '최적화',
  fps: 'FPS/성능',
  price: '가격/과금',
  payment: '가격/과금',
  dlc: 'DLC',
  content: '콘텐츠',
  update: '업데이트',
  multiplayer: '멀티플레이',
  online: '온라인',
  server: '서버',
  community: '커뮤니티',
  control: '조작감',
  controls: '조작감',
  ui: 'UI/UX',
  ux: 'UI/UX',
  players: '플레이어 접근성',
  player: '플레이어',
  access: '접근성',
  war: '전쟁',
  quest: '퀘스트',
  quests: '퀘스트',
  character: '캐릭터',
  characters: '캐릭터',
  weapon: '무기',
  weapons: '무기',
  map: '맵',
  mode: '모드',
  system: '시스템',
  difficulty: '난이도',
  level: '레벨',
}

const KEYWORD_LABEL_MAP: Record<string, string> = {
  gameplay: '게임플레이',
  game: '게임',
  games: '게임',
  play: '플레이',
  playing: '플레이',
  fun: '재미',
  good: '긍정',
  great: '훌륭함',
  like: '선호',
  likes: '선호',
  don: '부정 표현',
  story: '스토리',
  narrative: '서사',
  feel: '몰입감',
  feeling: '몰입감',
  graphic: '그래픽',
  graphics: '그래픽',
  art: '아트',
  design: '디자인',
  sound: '사운드',
  music: '음악',
  bug: '버그',
  bugs: '버그',
  performance: '성능',
  optimization: '최적화',
  fps: 'FPS',
  price: '가격',
  payment: '과금',
  paid: '유료',
  free: '무료',
  dlc: 'DLC',
  content: '콘텐츠',
  update: '업데이트',
  multiplayer: '멀티플레이',
  online: '온라인',
  server: '서버',
  community: '커뮤니티',
  control: '조작감',
  controls: '조작감',
  ui: 'UI',
  ux: 'UX',
  players: '플레이어',
  player: '플레이어',
  access: '접근성',
  war: '전쟁',
  quest: '퀘스트',
  quests: '퀘스트',
  character: '캐릭터',
  characters: '캐릭터',
  weapon: '무기',
  weapons: '무기',
  map: '맵',
  mode: '모드',
  system: '시스템',
  difficulty: '난이도',
  level: '레벨',
  review: '리뷰',
  reviews: '리뷰',
  steam: '스팀',
}

const BUBBLE_LAYOUTS: BubbleLayout[] = [
  { x: 42, y: 39, size: 106, tone: 'blue' },
  { x: 70, y: 55, size: 88, tone: 'purple' },
  { x: 30, y: 68, size: 76, tone: 'red' },
  { x: 55, y: 78, size: 72, tone: 'indigo' },
  { x: 76, y: 78, size: 66, tone: 'orange' },
  { x: 50, y: 58, size: 58, tone: 'sky' },
]

function TopicAnalysisPage() {
  const [activeTab, setActiveTab] = useState<TopicTab>('cluster')
  const [topics, setTopics] = useState<TopicItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function loadTopicAnalysis() {
      try {
        setIsLoading(true)
        setErrorMessage('')

        const response = await fetch(`${API_BASE_URL}/analysis/topics`)

        if (!response.ok) {
          throw new Error(`Topic API error: ${response.status}`)
        }

        const rawData = await response.json()
        const normalizedTopics = normalizeTopicData(rawData)

        setTopics(normalizedTopics)
      } catch (error) {
        console.error('토픽 분석 데이터를 불러오지 못했습니다.', error)
        setTopics([])
        setErrorMessage('토픽 분석 데이터를 불러오지 못했습니다.')
      } finally {
        setIsLoading(false)
      }
    }

    loadTopicAnalysis()
  }, [])

  const representativeTopics = useMemo(() => {
    return topics.slice(0, 6)
  }, [topics])

  const sentimentSummary = useMemo(() => {
    return createSentimentSummary(topics)
  }, [topics])

  const genreSummary = useMemo(() => {
    return createGenreSummary(topics)
  }, [topics])

  return (
    <section className="topic-analysis-page" aria-label="토픽 분석 화면">
      <nav className="topic-analysis-tabs" aria-label="토픽 분석 탭">
        <button
          className={activeTab === 'cluster' ? 'active' : ''}
          type="button"
          onClick={() => setActiveTab('cluster')}
        >
          토픽 클러스터
        </button>

        <button
          className={activeTab === 'sentiment' ? 'active' : ''}
          type="button"
          onClick={() => setActiveTab('sentiment')}
        >
          토픽 감성 분석
        </button>

        <button
          className={activeTab === 'trend' ? 'active' : ''}
          type="button"
          onClick={() => setActiveTab('trend')}
        >
          토픽별 트렌드
        </button>

        <button
          className={activeTab === 'genre' ? 'active' : ''}
          type="button"
          onClick={() => setActiveTab('genre')}
        >
          장르별 토픽 분포
        </button>
      </nav>

      {isLoading && <div className="topic-analysis-empty">토픽 분석 데이터를 불러오는 중입니다.</div>}

      {!isLoading && errorMessage && <div className="topic-analysis-empty">{errorMessage}</div>}

      {!isLoading && !errorMessage && topics.length === 0 && (
        <div className="topic-analysis-empty">표시할 토픽 분석 데이터가 없습니다.</div>
      )}

      {!isLoading && !errorMessage && topics.length > 0 && (
        <>
          {activeTab === 'cluster' && (
            <TopicClusterView topics={representativeTopics} allTopics={topics} />
          )}

          {activeTab === 'sentiment' && (
            <TopicSentimentView topics={topics} sentimentSummary={sentimentSummary} />
          )}

          {activeTab === 'trend' && <TopicTrendView topics={topics} />}

          {activeTab === 'genre' && <TopicGenreView genreSummary={genreSummary} />}
        </>
      )}
    </section>
  )
}

function TopicClusterView({
  topics,
  allTopics,
}: {
  topics: TopicItem[]
  allTopics: TopicItem[]
}) {
  return (
    <div className="topic-analysis-content">
      <div className="topic-analysis-main-grid">
        <article className="topic-analysis-card topic-analysis-card--cluster">
          <h2>주요 토픽 클러스터</h2>
          <TopicBubbleCluster topics={topics} />
        </article>

        <article className="topic-analysis-card">
          <h2>토픽별 감성 경향</h2>
          <TopicSentimentTable topics={allTopics.slice(0, 7)} />
        </article>
      </div>

      <article className="topic-analysis-card topic-analysis-card--wide">
        <h2>토픽 하이라이트</h2>
        <div className="topic-highlight-grid">
          {allTopics.slice(0, 4).map((topic) => (
            <TopicHighlightCard key={topic.id} topic={topic} />
          ))}
        </div>
      </article>
    </div>
  )
}

function TopicSentimentView({
  topics,
  sentimentSummary,
}: {
  topics: TopicItem[]
  sentimentSummary: Array<{
    label: string
    count: number
    type: TopicSentimentType
  }>
}) {
  return (
    <div className="topic-analysis-content">
      <div className="topic-analysis-main-grid">
        <article className="topic-analysis-card">
          <h2>감성 경향 요약</h2>
          <div className="topic-summary-list">
            {sentimentSummary.map((item) => (
              <div className="topic-summary-item" key={item.label}>
                <span className={`topic-status-dot ${item.type}`} />
                <strong>{item.label}</strong>
                <em>{item.count}개 토픽</em>
              </div>
            ))}
          </div>
        </article>

        <article className="topic-analysis-card">
          <h2>토픽별 긍정 비율 순위</h2>
          <TopicPositiveRanking topics={topics} />
        </article>
      </div>

      <article className="topic-analysis-card topic-analysis-card--wide">
        <h2>토픽 감성 상세</h2>
        <TopicSentimentTable topics={topics} />
      </article>
    </div>
  )
}

function TopicTrendView({ topics }: { topics: TopicItem[] }) {
  return (
    <div className="topic-analysis-content">
      <article className="topic-analysis-card topic-analysis-card--wide">
        <h2>토픽별 언급 비중</h2>
        <div className="topic-trend-list">
          {topics.slice(0, 8).map((topic) => (
            <div className="topic-trend-item" key={topic.id}>
              <div className="topic-trend-title">
                <strong>{topic.name}</strong>
                <span>{formatKeywordList(topic.keywords.slice(0, 4)) || '키워드 없음'}</span>
              </div>

              <div className="topic-trend-track">
                <div
                  className={`topic-trend-bar ${topic.sentimentType}`}
                  style={{ width: `${topic.share ?? 8}%` }}
                />
              </div>

              <em>{topic.share === null ? '-' : `${topic.share.toFixed(1)}%`}</em>
            </div>
          ))}
        </div>
      </article>

      <article className="topic-analysis-card topic-analysis-card--wide">
        <h2>해석</h2>
        <p className="topic-analysis-description">
          현재 백엔드 응답에 기간별 토픽 변화 데이터가 포함되어 있지 않은 경우, 이 영역은
          토픽별 현재 언급 비중을 기준으로 표시됩니다. 월별 토픽 추이를 별도로 보여주려면
          백엔드에서 period, topic, ratio 또는 count 형태의 기간별 데이터가 추가로 필요합니다.
        </p>
      </article>
    </div>
  )
}

function TopicGenreView({
  genreSummary,
}: {
  genreSummary: Array<{
    genre: string
    topics: TopicItem[]
  }>
}) {
  return (
    <div className="topic-analysis-content">
      <article className="topic-analysis-card topic-analysis-card--wide">
        <h2>장르별 토픽 분포</h2>

        {genreSummary.length === 0 ? (
          <div className="topic-analysis-empty inside">
            장르 정보가 포함된 토픽 데이터가 없습니다.
          </div>
        ) : (
          <div className="topic-genre-list">
            {genreSummary.map((genreGroup) => (
              <div className="topic-genre-item" key={genreGroup.genre}>
                <h3>{genreGroup.genre}</h3>

                <div className="topic-genre-tags">
                  {genreGroup.topics.slice(0, 5).map((topic) => (
                    <span key={topic.id}>{topic.name}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </article>
    </div>
  )
}

function TopicBubbleCluster({ topics }: { topics: TopicItem[] }) {
  const maxShare = Math.max(...topics.map((topic) => topic.share ?? 0), 1)

  return (
    <div className="topic-cluster-layout">
      <div className="topic-bubble-stage" aria-label="토픽 클러스터 버블 차트">
        {topics.map((topic, index) => {
          const layout = BUBBLE_LAYOUTS[index] ?? BUBBLE_LAYOUTS[BUBBLE_LAYOUTS.length - 1]
          const share = topic.share ?? 0
          const sizeRatio = topic.share === null ? 0.74 : Math.max(0.68, share / maxShare)
          const size = Math.max(58, Math.round(layout.size * sizeRatio))

          return (
            <div
              className={`topic-bubble ${layout.tone}`}
              key={topic.id}
              style={{
                left: `${layout.x}%`,
                top: `${layout.y}%`,
                width: `${size}px`,
                height: `${size}px`,
              }}
              title={`${topic.name} ${topic.share === null ? '' : `${topic.share.toFixed(1)}%`}`}
            >
              <strong>{index + 1}</strong>
              <span>{topic.share === null ? '-' : `${topic.share.toFixed(1)}%`}</span>
            </div>
          )
        })}
      </div>

      <div className="topic-cluster-info-list" aria-label="토픽 클러스터 설명">
        {topics.map((topic, index) => {
          const layout = BUBBLE_LAYOUTS[index] ?? BUBBLE_LAYOUTS[BUBBLE_LAYOUTS.length - 1]

          return (
            <div className={`topic-cluster-info-item ${layout.tone}`} key={topic.id}>
              <div className="topic-cluster-info-index">{index + 1}</div>

              <div className="topic-cluster-info-body">
                <div className="topic-cluster-info-title">
                  <strong>{topic.name}</strong>
                  <span>{topic.share === null ? '비중 없음' : `${topic.share.toFixed(1)}%`}</span>
                </div>

                <p>{formatKeywordList(topic.keywords.slice(0, 4)) || '키워드 데이터 없음'}</p>

                {topic.positiveRate !== null && (
                  <em className={topic.sentimentType}>{topic.sentimentLabel}</em>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TopicSentimentTable({ topics }: { topics: TopicItem[] }) {
  return (
    <div className="topic-sentiment-table">
      <div className="topic-sentiment-head">
        <span>토픽</span>
        <span>비중</span>
        <span>긍정 비율</span>
        <span>감성 경향</span>
      </div>

      {topics.map((topic) => {
        const hasSentimentData = topic.positiveRate !== null

        return (
          <div className="topic-sentiment-row" key={topic.id}>
            <strong>{topic.name}</strong>
            <span>{topic.share === null ? '-' : `${topic.share.toFixed(1)}%`}</span>
            <span>{hasSentimentData ? `${topic.positiveRate?.toFixed(0)}%` : '-'}</span>
            <em className={hasSentimentData ? topic.sentimentType : 'neutral'}>
              <i />
              {hasSentimentData ? topic.sentimentLabel : '-'}
            </em>
          </div>
        )
      })}
    </div>
  )
}

function TopicPositiveRanking({ topics }: { topics: TopicItem[] }) {
  const sortedTopics = [...topics]
    .filter((topic) => topic.positiveRate !== null)
    .sort((a, b) => (b.positiveRate ?? 0) - (a.positiveRate ?? 0))
    .slice(0, 6)

  if (sortedTopics.length === 0) {
    return <div className="topic-analysis-empty inside">긍정 비율 데이터가 없습니다.</div>
  }

  return (
    <div className="topic-positive-ranking">
      {sortedTopics.map((topic) => (
        <div className="topic-positive-item" key={topic.id}>
          <div>
            <strong>{topic.name}</strong>
            <span>{formatKeywordList(topic.keywords.slice(0, 3))}</span>
          </div>

          <em>{topic.positiveRate?.toFixed(0)}%</em>
        </div>
      ))}
    </div>
  )
}

function TopicHighlightCard({ topic }: { topic: TopicItem }) {
  return (
    <div className={`topic-highlight-card ${topic.sentimentType}`}>
      <div className="topic-highlight-title">
        <span>{getTopicIcon(topic.sentimentType)}</span>
        <strong>{topic.name}</strong>
      </div>

      <p>{topic.highlight}</p>
    </div>
  )
}

function normalizeTopicData(rawData: unknown): TopicItem[] {
  const rawList = unwrapTopicList(rawData)

  return rawList
    .map((item, index) => normalizeTopicItem(item, index))
    .filter((topic): topic is TopicItem => topic !== null)
    .sort((a, b) => (b.share ?? 0) - (a.share ?? 0))
}

function normalizeTopicItem(item: Record<string, unknown>, index: number): TopicItem | null {
  const keywords = readStringList(item, [
    'keywords',
    'keyword',
    'terms',
    'words',
    'top_words',
    'topWords',
    'topic_words',
    'topicWords',
  ])

  const rawName =
    readString(item, [
      'topic',
      'topic_name',
      'topicName',
      'name',
      'label',
      'cluster',
      'cluster_name',
      'title',
      'category',
    ]) || keywords.slice(0, 2).join(' / ')

  const name = formatTopicName(rawName, keywords)

  if (!name) {
    return null
  }

  const share = normalizeOptionalPercent(
    readOptionalNumber(item, [
      'share',
      'ratio',
      'weight',
      'probability',
      'percentage',
      'percent',
      'topic_ratio',
      'topicRatio',
      'topic_share',
      'topicShare',
      'prevalence',
      'weight_percent',
    ]),
  )

  const positiveRate = normalizeOptionalPercent(
    readOptionalNumber(item, [
      'positive_ratio',
      'positiveRatio',
      'positive_rate',
      'positiveRate',
      'positive',
      'positive_percent',
      'positivePercent',
    ]),
  )

  const negativeRate = normalizeOptionalPercent(
    readOptionalNumber(item, [
      'negative_ratio',
      'negativeRatio',
      'negative_rate',
      'negativeRate',
      'negative',
      'negative_percent',
      'negativePercent',
    ]),
  )

  const neutralRate = calculateNeutralRate(positiveRate, negativeRate)
  const mentionCount = readOptionalNumber(item, [
    'review_count',
    'reviewCount',
    'count',
    'mentions',
    'mention_count',
    'frequency',
    'freq',
  ])

  const sentiment = getSentimentInfo(positiveRate, negativeRate)

  const highlight =
    readString(item, ['highlight', 'summary', 'description', 'insight', 'comment']) ||
    createHighlightText(name, keywords, positiveRate === null ? '' : sentiment.label)

  const genre = readString(item, ['genre', 'genres', 'main_genre', 'mainGenre']) || '미분류'

  return {
    id: readString(item, ['id', 'topic_id', 'topicId']) || `topic-${index + 1}`,
    name,
    keywords,
    share,
    positiveRate,
    negativeRate,
    neutralRate,
    mentionCount,
    sentimentType: sentiment.type,
    sentimentLabel: sentiment.label,
    highlight,
    genre,
  }
}

function unwrapTopicList(rawData: unknown): Record<string, unknown>[] {
  if (Array.isArray(rawData)) {
    return rawData.filter(isRecord)
  }

  if (!isRecord(rawData)) {
    return []
  }

  const listKeys = [
    'items',
    'topics',
    'data',
    'results',
    'topic_clusters',
    'topicClusters',
    'clusters',
    'top_topics',
    'topTopics',
  ]

  for (const key of listKeys) {
    const value = rawData[key]

    if (Array.isArray(value)) {
      return value.filter(isRecord)
    }

    if (isRecord(value)) {
      const nestedList = unwrapTopicList(value)

      if (nestedList.length > 0) {
        return nestedList
      }
    }
  }

  return []
}

function createSentimentSummary(topics: TopicItem[]) {
  const summaryMap = new Map<
    TopicSentimentType,
    {
      label: string
      count: number
      type: TopicSentimentType
    }
  >([
    ['positive', { label: '긍정 경향', count: 0, type: 'positive' }],
    ['mixed', { label: '혼합 반응', count: 0, type: 'mixed' }],
    ['negative', { label: '부정 경향', count: 0, type: 'negative' }],
    ['neutral', { label: '감성 데이터 없음', count: 0, type: 'neutral' }],
  ])

  topics.forEach((topic) => {
    const savedItem = summaryMap.get(topic.sentimentType)

    if (savedItem) {
      savedItem.count += 1
    }
  })

  return Array.from(summaryMap.values())
}

function createGenreSummary(topics: TopicItem[]) {
  const map = new Map<string, TopicItem[]>()

  topics.forEach((topic) => {
    if (!topic.genre || topic.genre === '미분류') {
      return
    }

    const savedList = map.get(topic.genre) ?? []
    savedList.push(topic)
    map.set(topic.genre, savedList)
  })

  return Array.from(map.entries()).map(([genre, topicList]) => ({
    genre,
    topics: topicList,
  }))
}

function formatTopicName(rawName: string, keywords: string[]) {
  const name = rawName.trim()

  if (!name) {
    return formatKeyword(keywords[0] ?? '')
  }

  if (/[가-힣]/.test(name) && name.includes('(') && name.includes(')')) {
    return name
  }

  if (/[가-힣]/.test(name)) {
    return name
  }

  const lowerName = normalizeToken(name)
  const matchedKoreanLabel = findTopicKoreanLabel(lowerName, keywords)

  if (matchedKoreanLabel) {
    return `${matchedKoreanLabel} (${name})`
  }

  return translateEnglishPhrase(name)
}

function findTopicKoreanLabel(lowerName: string, keywords: string[]) {
  for (const [english, korean] of Object.entries(TOPIC_LABEL_MAP)) {
    if (lowerName.includes(english)) {
      return korean
    }
  }

  const keywordText = keywords.map((keyword) => normalizeToken(keyword)).join(' ')

  for (const [english, korean] of Object.entries(TOPIC_LABEL_MAP)) {
    if (keywordText.includes(english)) {
      return korean
    }
  }

  return ''
}

function translateEnglishPhrase(text: string) {
  const trimmedText = text.trim()

  if (!trimmedText) {
    return ''
  }

  if (/[가-힣]/.test(trimmedText)) {
    return trimmedText
  }

  const tokens = splitEnglishTokens(trimmedText)

  if (tokens.length === 0) {
    return `기타 (${trimmedText})`
  }

  const translatedTokens = tokens.map((token) => getKoreanKeywordLabel(token))
  const koreanText = translatedTokens.join(', ')

  return `${koreanText} (${trimmedText})`
}

function formatKeywordList(keywords: string[]) {
  return keywords
    .map((keyword) => formatKeyword(keyword))
    .filter(Boolean)
    .join(', ')
}

function formatKeyword(keyword: string) {
  const trimmedKeyword = keyword.trim()

  if (!trimmedKeyword) {
    return ''
  }

  if (/[가-힣]/.test(trimmedKeyword) && trimmedKeyword.includes('(') && trimmedKeyword.includes(')')) {
    return trimmedKeyword
  }

  if (/[가-힣]/.test(trimmedKeyword)) {
    return trimmedKeyword
  }

  const koreanLabel = getKoreanKeywordLabel(trimmedKeyword)

  return `${koreanLabel} (${trimmedKeyword})`
}

function getKoreanKeywordLabel(keyword: string) {
  const normalizedKeyword = normalizeToken(keyword)

  if (!normalizedKeyword) {
    return '기타'
  }

  if (KEYWORD_LABEL_MAP[normalizedKeyword]) {
    return KEYWORD_LABEL_MAP[normalizedKeyword]
  }

  for (const [english, korean] of Object.entries(KEYWORD_LABEL_MAP)) {
    if (normalizedKeyword.includes(english)) {
      return korean
    }
  }

  return '기타'
}

function splitEnglishTokens(text: string) {
  return text
    .split(/[,/|]+/)
    .map((token) => token.trim())
    .filter(Boolean)
}

function normalizeToken(text: string) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getSentimentInfo(
  positiveRate: number | null,
  negativeRate: number | null,
): {
  type: TopicSentimentType
  label: string
} {
  if (positiveRate === null) {
    return {
      type: 'neutral',
      label: '감성 데이터 없음',
    }
  }

  if (positiveRate >= 70) {
    return {
      type: 'positive',
      label: '매우 긍정적',
    }
  }

  if (positiveRate >= 55) {
    return {
      type: 'positive',
      label: '긍정 경향',
    }
  }

  if (positiveRate >= 40 && (negativeRate === null || negativeRate < 45)) {
    return {
      type: 'mixed',
      label: '혼합 반응',
    }
  }

  return {
    type: 'negative',
    label: '부정적',
  }
}

function calculateNeutralRate(positiveRate: number | null, negativeRate: number | null) {
  if (positiveRate === null || negativeRate === null) {
    return null
  }

  return Math.max(0, 100 - positiveRate - negativeRate)
}

function createHighlightText(name: string, keywords: string[], sentimentLabel: string) {
  const keywordText = formatKeywordList(keywords.slice(0, 3))

  if (keywordText && sentimentLabel) {
    return `${keywordText} 키워드가 함께 언급되며, 전체적으로 ${sentimentLabel}으로 분류됩니다.`
  }

  if (keywordText) {
    return `${keywordText} 키워드가 함께 언급되는 주요 토픽입니다.`
  }

  return `${name} 관련 리뷰가 반복적으로 언급되고 있습니다.`
}

function getTopicIcon(type: TopicSentimentType) {
  if (type === 'positive') {
    return '👍'
  }

  if (type === 'negative') {
    return '👎'
  }

  if (type === 'mixed') {
    return '⚠️'
  }

  return '●'
}

function readString(item: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = item[key]

    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value)
    }

    if (Array.isArray(value)) {
      const textList = value
        .filter((entry): entry is string => typeof entry === 'string')
        .map((entry) => entry.trim())
        .filter(Boolean)

      if (textList.length > 0) {
        return textList.join(', ')
      }
    }
  }

  return ''
}

function readStringList(item: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = item[key]

    if (Array.isArray(value)) {
      return value
        .map((entry) => String(entry).trim())
        .filter(Boolean)
        .slice(0, 8)
    }

    if (typeof value === 'string' && value.trim()) {
      return value
        .split(/[,/|]/)
        .map((entry) => entry.trim())
        .filter(Boolean)
        .slice(0, 8)
    }
  }

  return []
}

function readOptionalNumber(item: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = item[key]

    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }

    if (typeof value === 'string') {
      const parsedValue = Number(value.replace(/[^0-9.-]/g, ''))

      if (Number.isFinite(parsedValue)) {
        return parsedValue
      }
    }
  }

  return null
}

function normalizeOptionalPercent(value: number | null) {
  if (value === null) {
    return null
  }

  if (value <= 0) {
    return 0
  }

  if (value <= 1) {
    return value * 100
  }

  return Math.min(value, 100)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export default TopicAnalysisPage
