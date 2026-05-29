import { useEffect, useMemo, useState } from 'react'
import './TopicAnalysisPage.css'

type TopicTab = 'cluster' | 'sentiment' | 'trend' | 'genre'

type SentimentType = 'positive' | 'mixed' | 'negative' | 'neutral'

type RepresentativeTopic = {
  id: string
  topicId: number | null
  name: string
  keywords: string[]
  weight: number | null
  weightPercent: number | null
  sampleSize: number | null
  minSampleSize: number | null
  reliability: string
  warning: string | null
}

type TopicClusterNode = {
  id: string
  label: string
  displayLabel: string
  type: string
  value: number | null
}

type TopicClusterLink = {
  source: string
  target: string
  value: number | null
}

type TopicClusterData = {
  nodes: TopicClusterNode[]
  links: TopicClusterLink[]
}

type TopicSentimentCategory = {
  category: string
  label: string
  keywords: string[]
  positiveCount: number
  neutralCount: number
  negativeCount: number
  totalCount: number
  positiveRatio: number
  neutralRatio: number
  negativeRatio: number
  sentimentType: SentimentType
  sentimentLabel: string
}

type GenreTopicItem = {
  genre: string
  topicId: number | null
  name: string
  keywords: string[]
  weight: number | null
  gameCount: number | null
}

type TopicPageData = {
  representativeTopics: RepresentativeTopic[]
  clusterData: TopicClusterData
  sentimentCategories: TopicSentimentCategory[]
  genreTopics: GenreTopicItem[]
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

const INITIAL_TOPIC_PAGE_DATA: TopicPageData = {
  representativeTopics: [],
  clusterData: {
    nodes: [],
    links: [],
  },
  sentimentCategories: [],
  genreTopics: [],
}

const KEYWORD_LABEL_MAP: Record<string, string> = {
  gameplay: '게임플레이',
  mechanic: '게임 시스템',
  mechanics: '게임 시스템',
  game: '게임',
  games: '게임',
  play: '플레이',
  playing: '플레이',
  fun: '재미',
  good: '긍정',
  great: '훌륭함',
  bad: '부정',
  like: '선호',
  likes: '선호',
  don: '부정 표현',
  time: '플레이 시간',
  story: '스토리',
  narrative: '서사',
  dialogue: '대사',
  ending: '엔딩',
  feel: '몰입감',
  feeling: '몰입감',
  combat: '전투',
  graphic: '그래픽',
  graphics: '그래픽',
  visual: '비주얼',
  visuals: '비주얼',
  art: '아트',
  animation: '애니메이션',
  beautiful: '아름다움',
  design: '디자인',
  sound: '사운드',
  music: '음악',
  bug: '버그',
  bugs: '버그',
  crash: '크래시',
  glitch: '오류',
  broken: '고장',
  error: '에러',
  performance: '성능',
  optimization: '최적화',
  stutter: '끊김',
  lag: '렉',
  fps: 'FPS',
  price: '가격',
  value: '가치',
  worth: '가성비',
  expensive: '비쌈',
  cheap: '저렴함',
  payment: '과금',
  paid: '유료',
  free: '무료',
  dlc: 'DLC',
  content: '콘텐츠',
  update: '업데이트',
  multiplayer: '멀티플레이',
  coop: '협동 플레이',
  online: '온라인',
  server: '서버',
  matchmaking: '매칭',
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
  nt: '기타',
  de: '기타',
  doi: '기타',
}

const COMPACT_KEYWORD_LABEL_MAP: Record<string, string> = {
  gameplay: '게임플레이',
  mechanic: '게임 시스템',
  mechanics: '게임 시스템',
  play: '플레이',
  playing: '플레이',
  fun: '재미',
  good: '긍정',
  great: '긍정',
  bad: '부정',
  like: '선호',
  likes: '선호',
  time: '플레이 시간',
  story: '스토리',
  narrative: '스토리',
  dialogue: '대사',
  ending: '엔딩',
  feel: '몰입',
  feeling: '몰입',
  combat: '전투',
  graphic: '그래픽',
  graphics: '그래픽',
  visual: '비주얼',
  visuals: '비주얼',
  art: '아트',
  animation: '애니메이션',
  beautiful: '비주얼',
  design: '디자인',
  sound: '사운드',
  music: '음악',
  bug: '버그',
  bugs: '버그',
  crash: '크래시',
  glitch: '오류',
  broken: '오류',
  error: '에러',
  performance: '성능',
  optimization: '최적화',
  stutter: '끊김',
  lag: '렉',
  fps: 'FPS 성능',
  price: '가격',
  value: '가치',
  worth: '가성비',
  expensive: '비쌈',
  cheap: '저렴함',
  multiplayer: '멀티플레이',
  coop: '협동',
  online: '온라인',
  server: '서버',
  matchmaking: '매칭',
  players: '플레이어',
  player: '플레이어',
  access: '접근성',
  war: '전쟁',
  quest: '퀘스트',
  character: '캐릭터',
  characters: '캐릭터',
}

const TITLE_EXCLUDED_KEYWORDS = new Set([
  'game',
  'games',
  'nt',
  'de',
  'doi',
  'don',
  'review',
  'reviews',
  'steam',
])

const CATEGORY_LABEL_MAP: Record<string, string> = {
  gameplay: '게임플레이',
  graphics: '그래픽',
  story: '스토리',
  price: '가격',
  bugs: '버그',
  multiplayer: '멀티플레이',
  performance: '성능',
}

function TopicAnalysisPage() {
  const [activeTab, setActiveTab] = useState<TopicTab>('cluster')
  const [topicPageData, setTopicPageData] = useState<TopicPageData>(INITIAL_TOPIC_PAGE_DATA)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function loadTopicAnalysisData() {
      try {
        setIsLoading(true)
        setErrorMessage('')

        const [topicsResult, clustersResult, sentimentResult, genreResult] =
          await Promise.allSettled([
            fetchRequiredJson('/analysis/topics'),
            fetchOptionalJson('/analysis/topics/clusters'),
            fetchOptionalJson('/analysis/topics/sentiment'),
            fetchOptionalJson('/analysis/topics/by-genre'),
          ])

        if (topicsResult.status === 'rejected') {
          throw topicsResult.reason
        }

        setTopicPageData({
          representativeTopics: normalizeRepresentativeTopics(topicsResult.value),
          clusterData:
            clustersResult.status === 'fulfilled' && clustersResult.value
              ? normalizeTopicClusterData(clustersResult.value)
              : {
                  nodes: [],
                  links: [],
                },
          sentimentCategories:
            sentimentResult.status === 'fulfilled' && sentimentResult.value
              ? normalizeTopicSentimentCategories(sentimentResult.value)
              : [],
          genreTopics:
            genreResult.status === 'fulfilled' && genreResult.value
              ? normalizeGenreTopicItems(genreResult.value)
              : [],
        })
      } catch (error) {
        console.error('토픽 분석 데이터를 불러오지 못했습니다.', error)
        setTopicPageData(INITIAL_TOPIC_PAGE_DATA)
        setErrorMessage('토픽 분석 데이터를 불러오지 못했습니다.')
      } finally {
        setIsLoading(false)
      }
    }

    loadTopicAnalysisData()
  }, [])

  const hasAnyTopicData =
    topicPageData.representativeTopics.length > 0 ||
    topicPageData.sentimentCategories.length > 0 ||
    topicPageData.genreTopics.length > 0

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

      {!isLoading && !errorMessage && !hasAnyTopicData && (
        <div className="topic-analysis-empty">표시할 토픽 분석 데이터가 없습니다.</div>
      )}

      {!isLoading && !errorMessage && hasAnyTopicData && (
        <>
          {activeTab === 'cluster' && (
            <TopicClusterView
              representativeTopics={topicPageData.representativeTopics}
              clusterData={topicPageData.clusterData}
            />
          )}

          {activeTab === 'sentiment' && (
            <TopicSentimentCategoryView
              sentimentCategories={topicPageData.sentimentCategories}
            />
          )}

          {activeTab === 'trend' && (
            <TopicWeightCompareView
              representativeTopics={topicPageData.representativeTopics}
            />
          )}

          {activeTab === 'genre' && (
            <GenreTopicDistributionView genreTopics={topicPageData.genreTopics} />
          )}
        </>
      )}
    </section>
  )
}

function TopicClusterView({
  representativeTopics,
  clusterData,
}: {
  representativeTopics: RepresentativeTopic[]
  clusterData: TopicClusterData
}) {
  const totalSampleSize = representativeTopics[0]?.sampleSize ?? null

  return (
    <div className="topic-analysis-content">
      <article className="topic-analysis-card topic-analysis-card--wide topic-overview-card">
        <div className="topic-overview-header">
          <div>
            <h2>대표 토픽 5개 분석</h2>
            <p>
              전체 리뷰 토픽 모델링 결과를 대표 토픽 단위로 요약한 화면입니다. 현재 백엔드는
              대표 토픽 5개를 제공합니다.
            </p>
          </div>

          <span>대표 토픽 기준</span>
        </div>

        <div className="topic-overview-metrics">
          <div>
            <span>대표 토픽 수</span>
            <strong>{representativeTopics.length}개</strong>
          </div>

          <div>
            <span>분석 샘플 수</span>
            <strong>
              {totalSampleSize === null ? '-' : totalSampleSize.toLocaleString('ko-KR')}
            </strong>
          </div>

          <div>
            <span>토픽·키워드 노드</span>
            <strong>{clusterData.nodes.length}개</strong>
          </div>

          <div>
            <span>토픽-키워드 연결</span>
            <strong>{clusterData.links.length}개</strong>
          </div>
        </div>
      </article>

      <div className="topic-analysis-main-grid">
        <article className="topic-analysis-card">
          <h2>대표 토픽 목록</h2>
          <RepresentativeTopicList topics={representativeTopics} />
        </article>

        <article className="topic-analysis-card">
          <h2>토픽-키워드 연결 구조</h2>
          <p className="topic-card-caption">
            노드는 토픽과 키워드를 각각 하나의 항목으로 표현한 것이며, 연결은 특정 토픽과
            해당 토픽을 구성하는 키워드 사이의 관계를 의미합니다.
          </p>

          <TopicClusterConnectionView
            clusterData={clusterData}
            representativeTopics={representativeTopics}
          />
        </article>
      </div>

      <article className="topic-analysis-card topic-analysis-card--wide">
        <h2>대표 토픽 하이라이트</h2>
        <div className="topic-highlight-grid">
          {representativeTopics.map((topic) => (
            <RepresentativeTopicHighlightCard key={topic.id} topic={topic} />
          ))}
        </div>
      </article>
    </div>
  )
}

function RepresentativeTopicList({ topics }: { topics: RepresentativeTopic[] }) {
  if (topics.length === 0) {
    return <div className="topic-analysis-empty inside">대표 토픽 데이터가 없습니다.</div>
  }

  return (
    <div className="representative-topic-list">
      {topics.map((topic, index) => (
        <div className="representative-topic-item" key={topic.id}>
          <div className="representative-topic-rank">{index + 1}</div>

          <div className="representative-topic-body">
            <div className="representative-topic-title">
              <strong>{topic.name}</strong>
              <span>
                {topic.weightPercent === null ? '-' : `${topic.weightPercent.toFixed(1)}%`}
              </span>
            </div>

            <p>{formatKeywordList(topic.keywords)}</p>

            <div className="representative-topic-meta">
              <em>{topic.reliability || '신뢰도 정보 없음'}</em>
              <span>
                샘플 {topic.sampleSize === null ? '-' : topic.sampleSize.toLocaleString('ko-KR')}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function TopicClusterConnectionView({
  clusterData,
  representativeTopics,
}: {
  clusterData: TopicClusterData
  representativeTopics: RepresentativeTopic[]
}) {
  const nodeLabelMap = useMemo(() => {
    const representativeTopicLabelMap = createRepresentativeTopicLabelMap(representativeTopics)
    const map = new Map<string, string>()

    clusterData.nodes.forEach((node) => {
      map.set(node.id, createClusterNodeDisplayLabel(node, representativeTopicLabelMap))
    })

    return map
  }, [clusterData.nodes, representativeTopics])

  if (clusterData.nodes.length === 0 && clusterData.links.length === 0) {
    return <div className="topic-analysis-empty inside">토픽 클러스터 연결 데이터가 없습니다.</div>
  }

  return (
    <div className="topic-cluster-connection">
      <div className="topic-cluster-connection-stats">
        <div>
          <span>토픽·키워드 노드</span>
          <strong>{clusterData.nodes.length}</strong>
        </div>

        <div>
          <span>토픽-키워드 연결</span>
          <strong>{clusterData.links.length}</strong>
        </div>
      </div>

      {clusterData.links.length > 0 ? (
        <div className="topic-cluster-link-list">
          {clusterData.links.slice(0, 10).map((link, index) => (
            <div className="topic-cluster-link-item" key={`${link.source}-${link.target}-${index}`}>
              <span>{nodeLabelMap.get(link.source) ?? link.source}</span>
              <i />
              <span>{nodeLabelMap.get(link.target) ?? link.target}</span>
              <em>{link.value === null ? '' : link.value.toFixed(2)}</em>
            </div>
          ))}
        </div>
      ) : (
        <div className="topic-cluster-node-list">
          {clusterData.nodes.slice(0, 10).map((node) => (
            <span key={node.id}>{nodeLabelMap.get(node.id) ?? node.displayLabel}</span>
          ))}
        </div>
      )}
    </div>
  )
}

function RepresentativeTopicHighlightCard({ topic }: { topic: RepresentativeTopic }) {
  return (
    <div className="topic-highlight-card neutral">
      <div className="topic-highlight-title">
        <span className="topic-highlight-dot" aria-hidden="true" />
        <strong>{topic.name}</strong>
      </div>

      <p>
        {formatKeywordList(topic.keywords.slice(0, 3))} 키워드가 함께 나타나는 대표 토픽입니다.
        {topic.weightPercent === null
          ? ''
          : ` 전체 토픽 비중은 ${topic.weightPercent.toFixed(1)}%입니다.`}
      </p>
    </div>
  )
}

function TopicSentimentCategoryView({
  sentimentCategories,
}: {
  sentimentCategories: TopicSentimentCategory[]
}) {
  const summary = createSentimentCategorySummary(sentimentCategories)

  return (
    <div className="topic-analysis-content">
      <article className="topic-analysis-card topic-analysis-card--wide topic-overview-card">
        <div className="topic-overview-header">
          <div>
            <h2>키워드 카테고리별 감성 분석</h2>
            <p>
              이 화면은 대표 토픽 5개의 실제 감성이 아니라, 키워드 카테고리 매칭 기반의 감성
              분석 결과를 보여줍니다.
            </p>
          </div>

          <span>category fallback</span>
        </div>

        <div className="topic-overview-metrics">
          <div>
            <span>가장 긍정적인 카테고리</span>
            <strong>{summary.topPositiveCategory}</strong>
          </div>

          <div>
            <span>개선 필요 카테고리</span>
            <strong>{summary.topNegativeCategory}</strong>
          </div>

          <div>
            <span>전체 평균 긍정률</span>
            <strong>
              {summary.averagePositiveRatio === null
                ? '-'
                : `${summary.averagePositiveRatio.toFixed(1)}%`}
            </strong>
          </div>

          <div>
            <span>총 분석 건수</span>
            <strong>{summary.totalCount.toLocaleString('ko-KR')}</strong>
          </div>
        </div>
      </article>

      <article className="topic-analysis-card topic-analysis-card--wide">
        <h2>카테고리별 긍정·중립·부정 비율</h2>
        <SentimentCategoryBars categories={sentimentCategories} />
      </article>

      <article className="topic-analysis-card topic-analysis-card--wide">
        <h2>카테고리별 감성 상세</h2>
        <SentimentCategoryTable categories={sentimentCategories} />
      </article>
    </div>
  )
}

function SentimentCategoryBars({ categories }: { categories: TopicSentimentCategory[] }) {
  if (categories.length === 0) {
    return <div className="topic-analysis-empty inside">카테고리별 감성 데이터가 없습니다.</div>
  }

  return (
    <div className="sentiment-category-bar-list">
      {categories.map((category) => (
        <div className="sentiment-category-bar-item" key={category.category}>
          <div className="sentiment-category-bar-title">
            <strong>{category.label}</strong>
            <span>{category.totalCount.toLocaleString('ko-KR')}건</span>
          </div>

          <div className="sentiment-stacked-bar">
            <div
              className="positive"
              style={{
                width: `${category.positiveRatio}%`,
              }}
            />
            <div
              className="neutral"
              style={{
                width: `${category.neutralRatio}%`,
              }}
            />
            <div
              className="negative"
              style={{
                width: `${category.negativeRatio}%`,
              }}
            />
          </div>

          <div className="sentiment-category-bar-values">
            <span className="positive">긍정 {category.positiveRatio.toFixed(1)}%</span>
            <span className="neutral">중립 {category.neutralRatio.toFixed(1)}%</span>
            <span className="negative">부정 {category.negativeRatio.toFixed(1)}%</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function SentimentCategoryTable({ categories }: { categories: TopicSentimentCategory[] }) {
  if (categories.length === 0) {
    return <div className="topic-analysis-empty inside">카테고리별 감성 데이터가 없습니다.</div>
  }

  return (
    <div className="topic-sentiment-table sentiment-category-table">
      <div className="topic-sentiment-head">
        <span>카테고리</span>
        <span>긍정 비율</span>
        <span>부정 비율</span>
        <span>감성 경향</span>
      </div>

      {categories.map((category) => (
        <div className="topic-sentiment-row" key={category.category}>
          <strong>{category.label}</strong>
          <span>{category.positiveRatio.toFixed(1)}%</span>
          <span>{category.negativeRatio.toFixed(1)}%</span>
          <em className={category.sentimentType}>
            <i />
            {category.sentimentLabel}
          </em>
        </div>
      ))}
    </div>
  )
}

function TopicWeightCompareView({
  representativeTopics,
}: {
  representativeTopics: RepresentativeTopic[]
}) {
  const maxWeightPercent = Math.max(
    ...representativeTopics.map((topic) => topic.weightPercent ?? 0),
    1,
  )

  return (
    <div className="topic-analysis-content">
      <article className="topic-analysis-card topic-analysis-card--wide topic-overview-card">
        <div className="topic-overview-header">
          <div>
            <h2>대표 토픽 비중 비교</h2>
            <p>
              현재 API에는 월별 토픽 변화 데이터가 없기 때문에, 이 탭에서는 대표 토픽 5개의
              현재 비중을 비교합니다.
            </p>
          </div>

          <span>weight 기준</span>
        </div>
      </article>

      <article className="topic-analysis-card topic-analysis-card--wide">
        <h2>대표 토픽별 비중</h2>

        {representativeTopics.length === 0 ? (
          <div className="topic-analysis-empty inside">대표 토픽 데이터가 없습니다.</div>
        ) : (
          <div className="topic-weight-list">
            {representativeTopics.map((topic) => {
              const width =
                topic.weightPercent === null ? 0 : (topic.weightPercent / maxWeightPercent) * 100

              return (
                <div className="topic-weight-item" key={topic.id}>
                  <div className="topic-weight-title">
                    <strong>{topic.name}</strong>
                    <span>
                      {topic.weightPercent === null ? '-' : `${topic.weightPercent.toFixed(1)}%`}
                    </span>
                  </div>

                  <div className="topic-weight-track">
                    <div
                      style={{
                        width: `${width}%`,
                      }}
                    />
                  </div>

                  <p>{formatKeywordList(topic.keywords)}</p>
                </div>
              )
            })}
          </div>
        )}
      </article>
    </div>
  )
}

function GenreTopicDistributionView({ genreTopics }: { genreTopics: GenreTopicItem[] }) {
  const genres = useMemo(() => {
    return Array.from(new Set(genreTopics.map((item) => item.genre))).sort()
  }, [genreTopics])

  const [selectedGenre, setSelectedGenre] = useState('all')

  const currentGenre = selectedGenre === 'all' || genres.includes(selectedGenre) ? selectedGenre : 'all'

  const filteredGenreTopics = useMemo(() => {
    const filteredItems =
      currentGenre === 'all' ? genreTopics : genreTopics.filter((item) => item.genre === currentGenre)

    return [...filteredItems].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))
  }, [currentGenre, genreTopics])

  return (
    <div className="topic-analysis-content">
      <article className="topic-analysis-card topic-analysis-card--wide topic-overview-card">
        <div className="topic-overview-header">
          <div>
            <h2>장르별 토픽 분포</h2>
            <p>
              장르별 토픽 가중치와 게임 수를 기준으로 어떤 주제가 특정 장르에서 두드러지는지
              확인합니다.
            </p>
          </div>

          <div className="topic-genre-filter">
            <label htmlFor="topic-genre-select">장르 선택</label>
            <select
              id="topic-genre-select"
              value={currentGenre}
              onChange={(event) => setSelectedGenre(event.target.value)}
            >
              <option value="all">전체 장르</option>
              {genres.map((genre) => (
                <option key={genre} value={genre}>
                  {genre}
                </option>
              ))}
            </select>
          </div>
        </div>
      </article>

      <article className="topic-analysis-card topic-analysis-card--wide">
        <h2>{currentGenre === 'all' ? '전체 장르 토픽 목록' : `${currentGenre} 토픽 목록`}</h2>

        {filteredGenreTopics.length === 0 ? (
          <div className="topic-analysis-empty inside">장르별 토픽 데이터가 없습니다.</div>
        ) : (
          <div className="genre-topic-list">
            {filteredGenreTopics.slice(0, 20).map((item, index) => (
              <div className="genre-topic-item" key={`${item.genre}-${item.topicId}-${index}`}>
                <div className="genre-topic-title">
                  <strong>{item.genre}</strong>
                  <span>Topic {item.topicId ?? '-'}</span>
                </div>

                <h3>{item.name}</h3>
                <p>{formatKeywordList(item.keywords)}</p>

                <div className="genre-topic-meta">
                  <span>weight {item.weight === null ? '-' : item.weight.toFixed(3)}</span>
                  <span>
                    game count{' '}
                    {item.gameCount === null ? '-' : item.gameCount.toLocaleString('ko-KR')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </article>
    </div>
  )
}

async function fetchRequiredJson(path: string): Promise<unknown> {
  const response = await fetch(`${API_BASE_URL}${path}`)

  if (!response.ok) {
    throw new Error(`${path} API error: ${response.status}`)
  }

  return response.json()
}

async function fetchOptionalJson(path: string): Promise<unknown | null> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`)

    if (!response.ok) {
      return null
    }

    return response.json()
  } catch {
    return null
  }
}

function normalizeRepresentativeTopics(rawData: unknown): RepresentativeTopic[] {
  const rawList = unwrapList(rawData)

  return rawList
    .map((item, index) => {
      const keywords = readStringList(item, ['keywords', 'keyword', 'terms', 'words'])
      const topicId = readOptionalNumber(item, ['topic_id', 'topicId', 'id'])
      const weight = readOptionalNumber(item, ['weight', 'score', 'value'])
      const rawWeightPercent = readOptionalNumber(item, [
        'weight_percent',
        'weightPercent',
        'ratio',
        'percentage',
      ])
      const weightPercent = normalizeOptionalPercent(rawWeightPercent ?? weight)

      return {
        id: topicId === null ? `topic-${index + 1}` : `topic-${topicId}`,
        topicId,
        name: createTopicTitleFromKeywords(keywords, topicId),
        keywords,
        weight,
        weightPercent,
        sampleSize: readOptionalNumber(item, ['sample_size', 'sampleSize']),
        minSampleSize: readOptionalNumber(item, ['min_sample_size', 'minSampleSize']),
        reliability: readString(item, ['reliability', 'confidence', 'quality']) || '정보 없음',
        warning: readString(item, ['warning', 'message']) || null,
      }
    })
    .filter((item) => item.keywords.length > 0 || item.topicId !== null)
    .sort((a, b) => (b.weightPercent ?? 0) - (a.weightPercent ?? 0))
}

function normalizeTopicClusterData(rawData: unknown): TopicClusterData {
  if (!isRecord(rawData)) {
    return {
      nodes: [],
      links: [],
    }
  }

  const nodes = readNestedList(rawData, ['nodes', 'vertices']).map((item, index) => {
    const id = readString(item, ['id', 'node_id', 'nodeId']) || `node-${index + 1}`
    const rawLabel = readString(item, ['label', 'name', 'keyword', 'topic', 'category']) || id
    const type = readString(item, ['type', 'group', 'kind']) || 'node'

    return {
      id,
      label: rawLabel,
      displayLabel: formatClusterNodeLabel(rawLabel, type),
      type,
      value: readOptionalNumber(item, ['value', 'weight', 'score']),
    }
  })

  const links = readNestedList(rawData, ['links', 'edges']).map((item) => ({
    source: readNodeReference(item.source),
    target: readNodeReference(item.target),
    value: readOptionalNumber(item, ['value', 'weight', 'score']),
  }))

  return {
    nodes,
    links: links.filter((link) => link.source && link.target),
  }
}

function normalizeTopicSentimentCategories(rawData: unknown): TopicSentimentCategory[] {
  const rawList = readNestedListFromUnknown(rawData, ['items', 'data', 'results'])

  return rawList
    .map((item) => {
      const category = readString(item, ['category', 'topic', 'name', 'label'])
      const positiveCount = readOptionalNumber(item, ['positive_count', 'positiveCount']) ?? 0
      const neutralCount = readOptionalNumber(item, ['neutral_count', 'neutralCount']) ?? 0
      const negativeCount = readOptionalNumber(item, ['negative_count', 'negativeCount']) ?? 0
      const totalCount =
        readOptionalNumber(item, ['total_count', 'totalCount', 'count']) ??
        positiveCount + neutralCount + negativeCount

      const positiveRatio =
        normalizeOptionalPercent(readOptionalNumber(item, ['positive_ratio', 'positiveRatio'])) ??
        calculateRatio(positiveCount, totalCount)
      const neutralRatio =
        normalizeOptionalPercent(readOptionalNumber(item, ['neutral_ratio', 'neutralRatio'])) ??
        calculateRatio(neutralCount, totalCount)
      const negativeRatio =
        normalizeOptionalPercent(readOptionalNumber(item, ['negative_ratio', 'negativeRatio'])) ??
        calculateRatio(negativeCount, totalCount)

      const sentiment = getSentimentInfo(positiveRatio, negativeRatio)

      return {
        category,
        label: formatCategoryName(category),
        keywords: readStringList(item, ['keywords', 'keyword', 'terms', 'words']),
        positiveCount,
        neutralCount,
        negativeCount,
        totalCount,
        positiveRatio,
        neutralRatio,
        negativeRatio,
        sentimentType: sentiment.type,
        sentimentLabel: sentiment.label,
      }
    })
    .filter((item) => item.category)
    .sort((a, b) => b.totalCount - a.totalCount)
}

function normalizeGenreTopicItems(rawData: unknown): GenreTopicItem[] {
  const rawList = readNestedListFromUnknown(rawData, ['items', 'data', 'results'])

  return rawList
    .map((item) => {
      const keywords = readStringList(item, ['keywords', 'keyword', 'terms', 'words'])
      const topicId = readOptionalNumber(item, ['topic_id', 'topicId', 'id'])

      return {
        genre: readString(item, ['genre', 'genres', 'category']) || 'Unknown',
        topicId,
        name: createTopicTitleFromKeywords(keywords, topicId),
        keywords,
        weight: readOptionalNumber(item, ['weight', 'score', 'value']),
        gameCount: readOptionalNumber(item, ['game_count', 'gameCount', 'count']),
      }
    })
    .filter((item) => item.genre && item.keywords.length > 0)
}

function createSentimentCategorySummary(categories: TopicSentimentCategory[]) {
  const totalCount = categories.reduce((sum, item) => sum + item.totalCount, 0)
  const totalPositiveCount = categories.reduce((sum, item) => sum + item.positiveCount, 0)
  const averagePositiveRatio = totalCount > 0 ? (totalPositiveCount / totalCount) * 100 : null

  const topPositiveCategory =
    [...categories].sort((a, b) => b.positiveRatio - a.positiveRatio)[0]?.label ?? '-'
  const topNegativeCategory =
    [...categories].sort((a, b) => b.negativeRatio - a.negativeRatio)[0]?.label ?? '-'

  return {
    totalCount,
    averagePositiveRatio,
    topPositiveCategory,
    topNegativeCategory,
  }
}

function getSentimentInfo(
  positiveRatio: number | null,
  negativeRatio: number | null,
): {
  type: SentimentType
  label: string
} {
  if (positiveRatio === null) {
    return {
      type: 'neutral',
      label: '데이터 없음',
    }
  }

  if (positiveRatio >= 80) {
    return {
      type: 'positive',
      label: '매우 긍정적',
    }
  }

  if (positiveRatio >= 70) {
    return {
      type: 'positive',
      label: '긍정 경향',
    }
  }

  if (negativeRatio !== null && negativeRatio >= 25) {
    return {
      type: 'negative',
      label: '개선 필요',
    }
  }

  return {
    type: 'mixed',
    label: '혼합 반응',
  }
}

function createTopicTitleFromKeywords(keywords: string[], topicId: number | null): string {
  const normalizedKeywords = keywords.map((keyword) => normalizeToken(keyword))

  if (hasKeyword(normalizedKeywords, ['story', 'feel', 'combat'])) {
    return '스토리·몰입·전투'
  }

  if (hasKeyword(normalizedKeywords, ['fps', 'bad', 'performance', 'lag', 'optimization'])) {
    return 'FPS 성능·긍부정 반응'
  }

  if (hasKeyword(normalizedKeywords, ['players', 'access'])) {
    return '플레이어 접근성·전쟁'
  }

  if (hasKeyword(normalizedKeywords, ['fun', 'good', 'great'])) {
    return '재미·긍정 플레이'
  }

  if (hasKeyword(normalizedKeywords, ['like', 'time'])) {
    return '선호·플레이 시간'
  }

  const meaningfulKeywords = normalizedKeywords
    .filter((keyword) => keyword && !TITLE_EXCLUDED_KEYWORDS.has(keyword))
    .map((keyword) => getCompactKeywordLabel(keyword))
    .filter(Boolean)

  const uniqueLabels = Array.from(new Set(meaningfulKeywords)).slice(0, 3)

  if (uniqueLabels.length > 0) {
    return uniqueLabels.join('·')
  }

  return topicId === null ? '대표 토픽' : `Topic ${topicId}`
}

function hasKeyword(keywords: string[], candidates: string[]): boolean {
  return candidates.some((candidate) => keywords.includes(candidate))
}

function getCompactKeywordLabel(keyword: string): string {
  const normalizedKeyword = normalizeToken(keyword)

  if (!normalizedKeyword || TITLE_EXCLUDED_KEYWORDS.has(normalizedKeyword)) {
    return ''
  }

  return COMPACT_KEYWORD_LABEL_MAP[normalizedKeyword] ?? getKoreanKeywordLabel(normalizedKeyword)
}

function createRepresentativeTopicLabelMap(topics: RepresentativeTopic[]): Map<number, string> {
  const map = new Map<number, string>()

  topics.forEach((topic) => {
    if (topic.topicId !== null) {
      map.set(topic.topicId, topic.name)
    }
  })

  return map
}

function createClusterNodeDisplayLabel(
  node: TopicClusterNode,
  representativeTopicLabelMap: Map<number, string>,
): string {
  const topicId = extractTopicIdFromLabel(node.label)
  const normalizedType = normalizeToken(node.type)

  if (topicId !== null) {
    const topicName = representativeTopicLabelMap.get(topicId)

    if (topicName) {
      return `Topic ${topicId} · ${topicName}`
    }

    return `Topic ${topicId}`
  }

  if (normalizedType.includes('keyword')) {
    return formatKeyword(node.label)
  }

  return node.displayLabel
}

function extractTopicIdFromLabel(label: string): number | null {
  const matched = label.match(/topic[\s_-]*(\d+)/i)

  if (!matched) {
    return null
  }

  const parsedValue = Number(matched[1])

  return Number.isFinite(parsedValue) ? parsedValue : null
}

function isTopicLabel(label: string): boolean {
  return /topic[\s_-]*\d+/i.test(label)
}

function formatCategoryName(category: string): string {
  const trimmedCategory = category.trim()

  if (!trimmedCategory) {
    return '카테고리 없음'
  }

  const normalizedCategory = normalizeToken(trimmedCategory)
  const koreanLabel = CATEGORY_LABEL_MAP[normalizedCategory] ?? getKoreanKeywordLabel(normalizedCategory)

  return `${koreanLabel} (${trimmedCategory})`
}

function formatClusterNodeLabel(label: string, type: string): string {
  const normalizedType = normalizeToken(type)

  if (normalizedType.includes('keyword')) {
    return formatKeyword(label)
  }

  if (normalizedType.includes('topic')) {
    return label
  }

  if (isTopicLabel(label)) {
    return label
  }

  if (/^[a-zA-Z0-9\s,/|_-]+$/.test(label)) {
    return formatEnglishPhraseByToken(label)
  }

  return label
}

function formatKeywordList(keywords: string[]): string {
  return keywords
    .map((keyword) => formatKeyword(keyword))
    .filter(Boolean)
    .join(', ')
}

function formatKeyword(keyword: string): string {
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

function formatEnglishPhraseByToken(text: string): string {
  const tokens = splitEnglishTokens(text)

  if (tokens.length === 0) {
    return `기타 (${text})`
  }

  return tokens.map((token) => formatKeyword(token)).join(' / ')
}

function getKoreanKeywordLabel(keyword: string): string {
  const normalizedKeyword = normalizeToken(keyword)

  if (!normalizedKeyword) {
    return '기타'
  }

  return KEYWORD_LABEL_MAP[normalizedKeyword] ?? '기타'
}

function splitEnglishTokens(text: string): string[] {
  return text
    .split(/[,/|]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0)
}

function normalizeToken(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function calculateRatio(count: number, total: number): number {
  if (total <= 0) {
    return 0
  }

  return (count / total) * 100
}

function normalizeOptionalPercent(value: number | null): number | null {
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

function unwrapList(rawData: unknown): Record<string, unknown>[] {
  if (Array.isArray(rawData)) {
    return rawData.filter(isRecord)
  }

  if (!isRecord(rawData)) {
    return []
  }

  return readNestedListFromUnknown(rawData, [
    'items',
    'topics',
    'data',
    'results',
    'clusters',
    'top_topics',
    'topTopics',
  ])
}

function readNestedListFromUnknown(rawData: unknown, keys: string[]): Record<string, unknown>[] {
  if (!isRecord(rawData)) {
    return []
  }

  return readNestedList(rawData, keys)
}

function readNestedList(item: Record<string, unknown>, keys: string[]): Record<string, unknown>[] {
  for (const key of keys) {
    const value = item[key]

    if (Array.isArray(value)) {
      return value.filter(isRecord)
    }

    if (isRecord(value)) {
      const nestedList = unwrapList(value)

      if (nestedList.length > 0) {
        return nestedList
      }
    }
  }

  return []
}

function readNodeReference(value: unknown): string {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }

  if (isRecord(value)) {
    return readString(value, ['id', 'node_id', 'nodeId', 'label', 'name'])
  }

  return ''
}

function readString(item: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = item[key]

    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value)
    }

    if (Array.isArray(value)) {
      const textList: string[] = value
        .map((entry): string => {
          if (typeof entry === 'string' || typeof entry === 'number') {
            return String(entry).trim()
          }

          if (isRecord(entry)) {
            return readString(entry, ['label', 'name', 'keyword', 'id'])
          }

          return ''
        })
        .filter((entry) => entry.length > 0)

      if (textList.length > 0) {
        return textList.join(', ')
      }
    }
  }

  return ''
}

function readStringList(item: Record<string, unknown>, keys: string[]): string[] {
  for (const key of keys) {
    const value = item[key]

    if (Array.isArray(value)) {
      return value
        .map((entry): string => {
          if (typeof entry === 'string' || typeof entry === 'number') {
            return String(entry).trim()
          }

          if (isRecord(entry)) {
            return readString(entry, ['keyword', 'label', 'name', 'term', 'word'])
          }

          return ''
        })
        .filter((entry) => entry.length > 0)
        .slice(0, 10)
    }

    if (typeof value === 'string' && value.trim()) {
      return value
        .split(/[,/|]/)
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
        .slice(0, 10)
    }
  }

  return []
}

function readOptionalNumber(item: Record<string, unknown>, keys: string[]): number | null {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export default TopicAnalysisPage
