import { useEffect, useState } from 'react'
import './MarketDistributionPage.css'

type MarketTab = 'genre' | 'price' | 'platform' | 'release'

type SummaryStat = {
  totalGames: number | null
  totalReviews: number | null
  averagePositiveRatio: number | null
  topGenre: string | null
}

type GenreStat = {
  genre: string
  label: string
  gameCount: number
  share: number
  avgPrice: number | null
  avgReviewCount: number | null
  avgPositiveRatio: number | null
}

type PriceBandStat = {
  priceBand: string
  label: string
  gameCount: number
  share: number
  avgReviewCount: number | null
  avgPositiveRatio: number | null
}

type PlatformStat = {
  platform: string
  label: string
  gameCount: number
  share: number
  avgPositiveRatio: number | null
}

type ReleaseYearStat = {
  year: number
  gameCount: number
  avgReviewCount: number | null
  avgPositiveRatio: number | null
}

type MarketDistributionData = {
  summary: SummaryStat
  genres: GenreStat[]
  priceBands: PriceBandStat[]
  platforms: PlatformStat[]
  releaseYears: ReleaseYearStat[]
}

type TrendPoint = {
  x: number
  y: number
  year: number
  value: number
}

type VerticalBarItem = {
  label: string
  value: number
  valueText: string
  subText?: string
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

const INITIAL_SUMMARY: SummaryStat = {
  totalGames: null,
  totalReviews: null,
  averagePositiveRatio: null,
  topGenre: null,
}

const INITIAL_MARKET_DATA: MarketDistributionData = {
  summary: INITIAL_SUMMARY,
  genres: [],
  priceBands: [],
  platforms: [],
  releaseYears: [],
}

const PIE_COLORS = [
  '#5d63f1',
  '#7ba7ff',
  '#74c993',
  '#8f7cf7',
  '#f2aa3b',
  '#df6f6f',
  '#94a3b8',
  '#2dd4bf',
]

const GENRE_LABEL_MAP: Record<string, string> = {
  action: '액션',
  adventure: '어드벤처',
  indie: '인디',
  rpg: 'RPG',
  simulation: '시뮬레이션',
  strategy: '전략',
  casual: '캐주얼',
  sports: '스포츠',
  racing: '레이싱',
  'free to play': '무료 플레이',
  'massively multiplayer': '대규모 멀티플레이',
  'early access': '앞서 해보기',
  utilities: '유틸리티',
  'animation modeling': '애니메이션·모델링',
  'animation & modeling': '애니메이션·모델링',
  'design illustration': '디자인·일러스트',
  'design & illustration': '디자인·일러스트',
  'video production': '영상 제작',
  'audio production': '오디오 제작',
  'game development': '게임 개발',
  'photo editing': '사진 편집',
  'software training': '소프트웨어 교육',
  violent: '폭력성',
  unknown: '알 수 없음',
}

const PLATFORM_LABEL_MAP: Record<string, string> = {
  windows: 'Windows',
  mac: 'macOS',
  macos: 'macOS',
  osx: 'macOS',
  linux: 'Linux',
}

function MarketDistributionPage() {
  const [activeTab, setActiveTab] = useState<MarketTab>('genre')
  const [marketData, setMarketData] = useState<MarketDistributionData>(INITIAL_MARKET_DATA)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function loadMarketDistributionData() {
      try {
        setIsLoading(true)
        setErrorMessage('')

        const [summaryResult, genreResult, priceResult, platformResult, releaseYearResult] =
          await Promise.allSettled([
            fetchRequiredJson('/dashboard/summary'),
            fetchRequiredJson('/analysis/genre-stats'),
            fetchRequiredJson('/analysis/price-band-stats'),
            fetchRequiredJson('/analysis/platform-stats'),
            fetchRequiredJson('/analysis/release-year-stats'),
          ])

        if (summaryResult.status === 'rejected') {
          throw summaryResult.reason
        }

        if (genreResult.status === 'rejected') {
          throw genreResult.reason
        }

        if (priceResult.status === 'rejected') {
          throw priceResult.reason
        }

        if (platformResult.status === 'rejected') {
          throw platformResult.reason
        }

        if (releaseYearResult.status === 'rejected') {
          throw releaseYearResult.reason
        }

        setMarketData({
          summary: normalizeSummaryStat(summaryResult.value),
          genres: normalizeGenreStats(genreResult.value),
          priceBands: normalizePriceBandStats(priceResult.value),
          platforms: normalizePlatformStats(platformResult.value),
          releaseYears: normalizeReleaseYearStats(releaseYearResult.value),
        })
      } catch (error) {
        console.error('시장 분포 데이터를 불러오지 못했습니다.', error)
        setMarketData(INITIAL_MARKET_DATA)
        setErrorMessage('시장 분포 데이터를 불러오지 못했습니다.')
      } finally {
        setIsLoading(false)
      }
    }

    loadMarketDistributionData()
  }, [])

  const hasAnyData =
    marketData.genres.length > 0 ||
    marketData.priceBands.length > 0 ||
    marketData.platforms.length > 0 ||
    marketData.releaseYears.length > 0

  return (
    <section className="market-distribution-page" aria-label="시장 분포 분석 화면">
      <MarketSummaryBar summary={marketData.summary} />

      <nav className="market-distribution-tabs" aria-label="시장 분포 탭">
        <button
          className={activeTab === 'genre' ? 'active' : ''}
          type="button"
          onClick={() => setActiveTab('genre')}
        >
          장르 분포
        </button>

        <button
          className={activeTab === 'price' ? 'active' : ''}
          type="button"
          onClick={() => setActiveTab('price')}
        >
          가격대 분포
        </button>

        <button
          className={activeTab === 'platform' ? 'active' : ''}
          type="button"
          onClick={() => setActiveTab('platform')}
        >
          플랫폼 분포
        </button>

        <button
          className={activeTab === 'release' ? 'active' : ''}
          type="button"
          onClick={() => setActiveTab('release')}
        >
          출시 연도 분포
        </button>
      </nav>

      {isLoading && <div className="market-empty">시장 분포 데이터를 불러오는 중입니다.</div>}

      {!isLoading && errorMessage && <div className="market-empty">{errorMessage}</div>}

      {!isLoading && !errorMessage && !hasAnyData && (
        <div className="market-empty">표시할 시장 분포 데이터가 없습니다.</div>
      )}

      {!isLoading && !errorMessage && hasAnyData && (
        <>
          {activeTab === 'genre' && <GenreDistributionView genres={marketData.genres} />}

          {activeTab === 'price' && <PriceDistributionView priceBands={marketData.priceBands} />}

          {activeTab === 'platform' && (
            <PlatformDistributionView platforms={marketData.platforms} />
          )}

          {activeTab === 'release' && (
            <ReleaseDistributionView releaseYears={marketData.releaseYears} />
          )}
        </>
      )}
    </section>
  )
}

function MarketSummaryBar({ summary }: { summary: SummaryStat }) {
  return (
    <div className="market-summary-strip" aria-label="시장 요약 지표">
      <div>
        <span>총 게임 수</span>
        <strong>
          {summary.totalGames === null ? '-' : summary.totalGames.toLocaleString('ko-KR')}
        </strong>
      </div>

      <div>
        <span>총 리뷰 수</span>
        <strong>
          {summary.totalReviews === null ? '-' : summary.totalReviews.toLocaleString('ko-KR')}
        </strong>
      </div>

      <div>
        <span>평균 긍정률</span>
        <strong>
          {summary.averagePositiveRatio === null
            ? '-'
            : `${summary.averagePositiveRatio.toFixed(1)}%`}
        </strong>
      </div>

      <div>
        <span>대표 장르</span>
        <strong>{summary.topGenre ? formatGenreLabel(summary.topGenre) : '-'}</strong>
      </div>
    </div>
  )
}

function GenreDistributionView({ genres }: { genres: GenreStat[] }) {
  const topGenres = genres.slice(0, 8)

  const positiveGenres = genres
    .filter((genre) => genre.avgPositiveRatio !== null)
    .sort((a, b) => (b.avgPositiveRatio ?? 0) - (a.avgPositiveRatio ?? 0))
    .slice(0, 8)

  const priceGenres = genres
    .filter((genre) => genre.avgPrice !== null)
    .sort((a, b) => (b.avgPrice ?? 0) - (a.avgPrice ?? 0))
    .slice(0, 8)

  return (
    <div className="market-dashboard-grid market-dashboard-grid--genre">
      <GenreDistributionCard genres={genres} />

      <VerticalBarCard
        title="대표 장르별 게임 수"
        tag="게임 수"
        description="게임 수가 많은 대표 장르를 세로 막대 그래프로 비교합니다."
        items={topGenres.map((genre) => ({
          label: getShortLabel(genre.label),
          value: genre.gameCount,
          valueText: genre.gameCount.toLocaleString('ko-KR'),
          subText: `${genre.share.toFixed(1)}%`,
        }))}
        maxValue={Math.max(...topGenres.map((genre) => genre.gameCount), 1)}
      />

      <VerticalBarCard
        title="장르별 평균 긍정률"
        tag="긍정률"
        description="평균 긍정률이 높은 장르를 세로 막대 그래프로 비교합니다."
        items={positiveGenres.map((genre) => ({
          label: getShortLabel(genre.label),
          value: genre.avgPositiveRatio ?? 0,
          valueText: `${(genre.avgPositiveRatio ?? 0).toFixed(1)}%`,
          subText: `${genre.gameCount.toLocaleString('ko-KR')}개`,
        }))}
        maxValue={100}
      />

      <VerticalBarCard
        title="장르별 평균 가격"
        tag="평균 가격"
        description="평균 가격이 높은 장르를 세로 막대 그래프로 비교합니다."
        items={priceGenres.map((genre) => ({
          label: getShortLabel(genre.label),
          value: genre.avgPrice ?? 0,
          valueText: Math.round(genre.avgPrice ?? 0).toLocaleString('ko-KR'),
          subText: `${genre.gameCount.toLocaleString('ko-KR')}개`,
        }))}
        maxValue={Math.max(...priceGenres.map((genre) => genre.avgPrice ?? 0), 1)}
      />
    </div>
  )
}

function PriceDistributionView({ priceBands }: { priceBands: PriceBandStat[] }) {
  const positivePriceBands = priceBands.filter((item) => item.avgPositiveRatio !== null)
  const reviewPriceBands = priceBands.filter((item) => item.avgReviewCount !== null)

  return (
    <div className="market-dashboard-grid market-dashboard-grid--price">
      <VerticalBarCard
        title="가격대별 게임 수 분포"
        tag="게임 수"
        description="가격대별 게임 수를 세로 막대 그래프로 비교합니다."
        items={priceBands.map((item) => ({
          label: item.label,
          value: item.gameCount,
          valueText: item.gameCount.toLocaleString('ko-KR'),
          subText: `${item.share.toFixed(1)}%`,
        }))}
        maxValue={Math.max(...priceBands.map((item) => item.gameCount), 1)}
      />

      <VerticalBarCard
        title="가격대별 평균 긍정률"
        tag="긍정률"
        description="가격대별 평균 긍정률을 비교해 가격 구간별 평가 차이를 확인합니다."
        items={positivePriceBands.map((item) => ({
          label: item.label,
          value: item.avgPositiveRatio ?? 0,
          valueText: `${(item.avgPositiveRatio ?? 0).toFixed(1)}%`,
          subText: `${item.gameCount.toLocaleString('ko-KR')}개`,
        }))}
        maxValue={100}
      />

      <VerticalBarCard
        title="가격대별 평균 리뷰 수"
        tag="리뷰 수"
        description="가격대별 평균 리뷰 수를 비교해 반응 규모를 확인합니다."
        items={reviewPriceBands.map((item) => ({
          label: item.label,
          value: item.avgReviewCount ?? 0,
          valueText: Math.round(item.avgReviewCount ?? 0).toLocaleString('ko-KR'),
          subText: `${item.gameCount.toLocaleString('ko-KR')}개`,
        }))}
        maxValue={Math.max(...reviewPriceBands.map((item) => item.avgReviewCount ?? 0), 1)}
      />
    </div>
  )
}

function PlatformDistributionView({ platforms }: { platforms: PlatformStat[] }) {
  const positivePlatforms = platforms.filter((platform) => platform.avgPositiveRatio !== null)

  return (
    <div className="market-dashboard-grid market-dashboard-grid--platform">
      <VerticalBarCard
        title="플랫폼별 게임 수"
        tag="게임 수"
        description="플랫폼 정보가 있는 게임을 기준으로 플랫폼별 게임 수를 비교합니다."
        items={platforms.map((platform) => ({
          label: platform.label,
          value: platform.gameCount,
          valueText: platform.gameCount.toLocaleString('ko-KR'),
          subText: `${platform.share.toFixed(1)}%`,
        }))}
        maxValue={Math.max(...platforms.map((platform) => platform.gameCount), 1)}
      />

      <VerticalBarCard
        title="플랫폼별 평균 긍정률"
        tag="긍정률"
        description="플랫폼별 평균 긍정률을 세로 막대 그래프로 비교합니다."
        items={positivePlatforms.map((platform) => ({
          label: platform.label,
          value: platform.avgPositiveRatio ?? 0,
          valueText: `${(platform.avgPositiveRatio ?? 0).toFixed(1)}%`,
          subText: `${platform.gameCount.toLocaleString('ko-KR')}개`,
        }))}
        maxValue={100}
      />

      <PlatformDistributionCard platforms={platforms} />
    </div>
  )
}

function ReleaseDistributionView({ releaseYears }: { releaseYears: ReleaseYearStat[] }) {
  return (
    <div className="market-dashboard-grid market-dashboard-grid--release">
      <ReleaseYearDistributionCard releaseYears={releaseYears} />

      <ReleasePositiveTrendCard releaseYears={releaseYears} />
    </div>
  )
}

function GenreDistributionCard({ genres }: { genres: GenreStat[] }) {
  const topGenres = genres.slice(0, 7)
  const pieBackground = buildPieBackground(topGenres)
  const totalGenreCount = calculateTotalCount(genres)

  return (
    <article className="market-card market-card--large">
      <div className="market-card-header">
        <h2>장르별 게임 비중</h2>
        <span>장르 비중</span>
      </div>

      {topGenres.length === 0 ? (
        <div className="market-empty inside">장르 분포 데이터가 없습니다.</div>
      ) : (
        <div className="genre-distribution-body">
          <div
            className="genre-pie-chart"
            style={{ background: pieBackground }}
            aria-label="장르별 게임 비중 차트"
          >
            <div>
              <span>장르 합계</span>
              <strong>{totalGenreCount.toLocaleString('ko-KR')}</strong>
            </div>
          </div>

          <div className="genre-legend-list">
            {topGenres.map((genre, index) => (
              <div className="genre-legend-item" key={`${genre.genre}-${index}`}>
                <i style={{ background: PIE_COLORS[index % PIE_COLORS.length] }} />
                <span>{genre.label}</span>
                <strong>{genre.share.toFixed(1)}%</strong>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  )
}

function PlatformDistributionCard({ platforms }: { platforms: PlatformStat[] }) {
  return (
    <article className="market-card">
      <div className="market-card-header">
        <h2>플랫폼별 요약</h2>
        <span>플랫폼 정보 기준</span>
      </div>

      {platforms.length === 0 ? (
        <div className="market-empty inside">플랫폼 분포 데이터가 없습니다.</div>
      ) : (
        <>
          <p className="market-card-caption">
            플랫폼 정보가 있는 게임의 수를 기준으로 비중을 계산합니다.
          </p>

          <div className="platform-grid">
            {platforms.map((platform) => (
              <div className="platform-item" key={platform.platform}>
                <div className="platform-icon">{getPlatformIcon(platform.platform)}</div>
                <strong>{platform.label}</strong>
                <span>{platform.share.toFixed(1)}%</span>
                <em>
                  {platform.avgPositiveRatio === null
                    ? '긍정률 -'
                    : `긍정률 ${platform.avgPositiveRatio.toFixed(1)}%`}
                </em>
              </div>
            ))}
          </div>
        </>
      )}
    </article>
  )
}

function ReleaseYearDistributionCard({ releaseYears }: { releaseYears: ReleaseYearStat[] }) {
  const recentYears = releaseYears.slice(-10)
  const maxCount = Math.max(...recentYears.map((item) => item.gameCount), 1)

  return (
    <article className="market-card market-card--release">
      <div className="market-card-header">
        <h2>출시 연도별 게임 수</h2>
        <span>출시 연도</span>
      </div>

      {recentYears.length === 0 ? (
        <div className="market-empty inside">출시 연도 분포 데이터가 없습니다.</div>
      ) : (
        <div className="release-year-chart">
          {recentYears.map((item) => {
            const height = Math.max((item.gameCount / maxCount) * 100, 4)

            return (
              <div className="release-year-item" key={item.year}>
                <div className="release-year-bar-wrap">
                  <div className="release-year-bar" style={{ height: `${height}%` }} />
                </div>

                <strong>{formatLargeNumber(item.gameCount)}</strong>
                <span>{item.year}</span>
              </div>
            )
          })}
        </div>
      )}
    </article>
  )
}

function ReleasePositiveTrendCard({ releaseYears }: { releaseYears: ReleaseYearStat[] }) {
  const trendData = releaseYears
    .filter((item) => item.avgPositiveRatio !== null)
    .slice(-10)
    .map((item) => ({
      year: item.year,
      value: item.avgPositiveRatio ?? 0,
    }))

  if (trendData.length === 0) {
    return (
      <article className="market-card market-card--trend">
        <div className="market-card-header">
          <h2>출시 연도별 평균 긍정 비율 변화</h2>
          <span>긍정률 추이</span>
        </div>
        <div className="market-empty inside">출시 연도별 평균 긍정 비율 데이터가 없습니다.</div>
      </article>
    )
  }

  const minValue = Math.min(...trendData.map((item) => item.value))
  const maxValue = Math.max(...trendData.map((item) => item.value))
  const chartMin = Math.max(0, Math.floor((minValue - 1.5) / 5) * 5)
  const chartMax = Math.min(100, Math.ceil((maxValue + 1.5) / 5) * 5)
  const yTicks = buildYAxisTicks(chartMin, chartMax)

  const points = createTrendPoints(trendData, {
    width: 1080,
    height: 380,
    paddingTop: 36,
    paddingRight: 42,
    paddingBottom: 54,
    paddingLeft: 56,
    minValue: chartMin,
    maxValue: chartMax,
  })

  const path = buildSmoothPath(points)
  const previousPoint = trendData.length >= 2 ? trendData[trendData.length - 2] : null
  const latestPoint = trendData[trendData.length - 1]
  const minPoint = trendData.reduce((prev, curr) => (curr.value < prev.value ? curr : prev))
  const maxPoint = trendData.reduce((prev, curr) => (curr.value > prev.value ? curr : prev))

  return (
    <article className="market-card market-card--trend">
      <div className="market-card-header">
        <div>
          <h2>출시 연도별 평균 긍정 비율 변화</h2>
          <p className="market-card-caption">
            최근 10개 출시 연도의 평균 긍정 비율 흐름입니다. 연도별 평가 변화가 한눈에
            보이도록 곡선 라인 그래프로 표현했습니다.
          </p>
        </div>
        <span>긍정률 추이</span>
      </div>

      <div className="trend-chart-wrapper">
        <div className="trend-axis-label trend-axis-label--left">평균 긍정 비율</div>
        <div className="trend-axis-label trend-axis-label--right">출시 연도</div>

        <svg
          className="trend-chart-svg"
          viewBox="0 0 1080 380"
          role="img"
          aria-label="출시 연도별 평균 긍정 비율 변화 그래프"
        >
          {yTicks.map((tick) => {
            const y = getYPosition(tick, chartMin, chartMax, 380, 36, 54)

            return (
              <g key={tick}>
                <line x1="56" y1={y} x2="1038" y2={y} className="trend-grid-line" />
                <text x="8" y={y + 6} className="trend-y-tick">
                  {tick}%
                </text>
              </g>
            )
          })}

          <line x1="56" y1="326" x2="1038" y2="326" className="trend-axis-line" />

          <path d={path} className="trend-line-path" />

          {points.map((point, index) => {
            const isLast = index === points.length - 1

            return (
              <g key={point.year}>
                <text
                  x={point.x}
                  y={point.y - (isLast ? 30 : 18)}
                  className={`trend-point-label ${isLast ? 'last' : ''}`}
                  textAnchor="middle"
                >
                  {point.value.toFixed(1)}%
                </text>

                {isLast && (
                  <circle cx={point.x} cy={point.y} r="16" className="trend-point-glow" />
                )}

                <circle
                  cx={point.x}
                  cy={point.y}
                  r={isLast ? 7 : 5}
                  className={`trend-point-dot ${isLast ? 'last' : ''}`}
                />

                <circle
                  cx={point.x}
                  cy={point.y}
                  r={isLast ? 3.4 : 2.4}
                  className="trend-point-core"
                />

                <text x={point.x} y="350" className="trend-x-tick" textAnchor="middle">
                  {point.year}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      <div className="trend-summary-row">
        <div className="trend-summary-chip">
          <strong>최저</strong>
          <span>
            {minPoint.year}년 {minPoint.value.toFixed(1)}%
          </span>
        </div>

        <div className="trend-summary-chip">
          <strong>최고</strong>
          <span>
            {maxPoint.year}년 {maxPoint.value.toFixed(1)}%
          </span>
        </div>

        <div className="trend-summary-chip">
          <strong>최근</strong>
          <span>
            {latestPoint.year}년 {latestPoint.value.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="trend-insight">
        <span className="trend-insight-icon">↗</span>
        <p>
          {previousPoint ? (
            <>
              {previousPoint.year}년 <strong>{previousPoint.value.toFixed(1)}%</strong>에서{' '}
              {latestPoint.year}년 <strong>{latestPoint.value.toFixed(1)}%</strong>로{' '}
              {latestPoint.value >= previousPoint.value ? '상승' : '하락'} 흐름이 나타납니다.
            </>
          ) : (
            <>
              {latestPoint.year}년 평균 긍정 비율은{' '}
              <strong>{latestPoint.value.toFixed(1)}%</strong>입니다.
            </>
          )}
        </p>
      </div>
    </article>
  )
}

function VerticalBarCard({
  title,
  tag,
  description,
  items,
  maxValue,
}: {
  title: string
  tag: string
  description: string
  items: VerticalBarItem[]
  maxValue: number
}) {
  return (
    <article className="market-card">
      <div className="market-card-header">
        <div>
          <h2>{title}</h2>
          <p className="market-card-caption">{description}</p>
        </div>
        <span>{tag}</span>
      </div>

      {items.length === 0 ? (
        <div className="market-empty inside">표시할 데이터가 없습니다.</div>
      ) : (
        <div className="vertical-bar-chart">
          {items.map((item) => {
            const height = maxValue <= 0 ? 0 : Math.max((item.value / maxValue) * 100, 3)

            return (
              <div className="vertical-bar-item" key={`${item.label}-${item.valueText}`}>
                <div className="vertical-bar-value">{item.valueText}</div>

                <div className="vertical-bar-track">
                  <div className="vertical-bar-fill" style={{ height: `${height}%` }} />
                </div>

                <strong title={item.label}>{item.label}</strong>

                {item.subText && <span>{item.subText}</span>}
              </div>
            )
          })}
        </div>
      )}
    </article>
  )
}

async function fetchRequiredJson(path: string): Promise<unknown> {
  const response = await fetch(`${API_BASE_URL}${path}`)

  if (!response.ok) {
    throw new Error(`${path} API error: ${response.status}`)
  }

  return response.json()
}

function normalizeSummaryStat(rawData: unknown): SummaryStat {
  if (!isRecord(rawData)) {
    return INITIAL_SUMMARY
  }

  return {
    totalGames: readOptionalNumber(rawData, ['total_games', 'totalGames']),
    totalReviews: readOptionalNumber(rawData, ['total_reviews', 'totalReviews']),
    averagePositiveRatio: readOptionalNumber(rawData, [
      'average_positive_ratio',
      'averagePositiveRatio',
      'avg_positive_ratio',
      'avgPositiveRatio',
    ]),
    topGenre: readString(rawData, ['top_genre', 'topGenre']) || null,
  }
}

function normalizeGenreStats(rawData: unknown): GenreStat[] {
  const rawList = unwrapList(rawData)

  const items = rawList
    .map((item) => {
      const genre = readString(item, ['genre', 'genres', 'category', 'name', 'label']) || 'Unknown'
      const gameCount = readOptionalNumber(item, ['game_count', 'gameCount', 'count', 'total']) ?? 0

      return {
        genre,
        label: formatGenreLabel(genre),
        gameCount,
        share: 0,
        avgPrice: readOptionalNumber(item, ['avg_price', 'avgPrice', 'average_price', 'averagePrice']),
        avgReviewCount: readOptionalNumber(item, [
          'avg_review_count',
          'avgReviewCount',
          'average_review_count',
          'averageReviewCount',
        ]),
        avgPositiveRatio: readOptionalNumber(item, [
          'avg_positive_ratio',
          'avgPositiveRatio',
          'average_positive_ratio',
          'averagePositiveRatio',
        ]),
      }
    })
    .filter((item) => item.gameCount > 0)
    .sort((a, b) => b.gameCount - a.gameCount)

  return ensureShare(items)
}

function normalizePriceBandStats(rawData: unknown): PriceBandStat[] {
  const rawList = unwrapList(rawData)

  const items = rawList
    .map((item) => {
      const priceBand =
        readString(item, ['price_band', 'priceBand', 'band', 'range', 'label', 'name']) || 'Unknown'
      const gameCount = readOptionalNumber(item, ['game_count', 'gameCount', 'count', 'total']) ?? 0

      return {
        priceBand,
        label: formatPriceBandLabel(priceBand),
        gameCount,
        share: 0,
        avgReviewCount: readOptionalNumber(item, [
          'avg_review_count',
          'avgReviewCount',
          'average_review_count',
          'averageReviewCount',
        ]),
        avgPositiveRatio: readOptionalNumber(item, [
          'avg_positive_ratio',
          'avgPositiveRatio',
          'average_positive_ratio',
          'averagePositiveRatio',
        ]),
      }
    })
    .filter((item) => item.gameCount > 0)
    .sort((a, b) => getPriceBandOrder(a.priceBand) - getPriceBandOrder(b.priceBand))

  return ensureShare(items)
}

function normalizePlatformStats(rawData: unknown): PlatformStat[] {
  const rawList = unwrapList(rawData)

  const items = rawList
    .map((item) => {
      const platform =
        readString(item, ['platform', 'platform_name', 'platformName', 'name', 'label']) || 'Unknown'
      const gameCount = readOptionalNumber(item, ['game_count', 'gameCount', 'count', 'total']) ?? 0

      return {
        platform,
        label: formatPlatformLabel(platform),
        gameCount,
        share: 0,
        avgPositiveRatio: readOptionalNumber(item, [
          'avg_positive_ratio',
          'avgPositiveRatio',
          'average_positive_ratio',
          'averagePositiveRatio',
        ]),
      }
    })
    .filter((item) => item.gameCount > 0)
    .sort((a, b) => b.gameCount - a.gameCount)

  return ensureShare(items)
}

function normalizeReleaseYearStats(rawData: unknown): ReleaseYearStat[] {
  const rawList = unwrapList(rawData)

  return rawList
    .map((item) => {
      const year =
        readOptionalNumber(item, ['release_year', 'releaseYear', 'year']) ??
        readOptionalNumber(item, ['period'])

      return {
        year: year ?? 0,
        gameCount: readOptionalNumber(item, ['game_count', 'gameCount', 'count', 'total']) ?? 0,
        avgReviewCount: readOptionalNumber(item, [
          'avg_review_count',
          'avgReviewCount',
          'average_review_count',
          'averageReviewCount',
        ]),
        avgPositiveRatio: readOptionalNumber(item, [
          'avg_positive_ratio',
          'avgPositiveRatio',
          'average_positive_ratio',
          'averagePositiveRatio',
        ]),
      }
    })
    .filter((item) => item.year > 0 && item.gameCount > 0)
    .sort((a, b) => a.year - b.year)
}

function buildPieBackground(items: GenreStat[]): string {
  if (items.length === 0) {
    return '#edf1ff'
  }

  let current = 0

  const segments = items.map((item, index) => {
    const start = current
    current += item.share

    return `${PIE_COLORS[index % PIE_COLORS.length]} ${start}% ${current}%`
  })

  if (current < 100) {
    segments.push(`#edf1ff ${current}% 100%`)
  }

  return `conic-gradient(${segments.join(', ')})`
}

function ensureShare<T extends { gameCount: number; share: number }>(items: T[]): T[] {
  const total = items.reduce((sum, item) => sum + item.gameCount, 0)

  if (total <= 0) {
    return items
  }

  return items.map((item) => ({
    ...item,
    share: (item.gameCount / total) * 100,
  }))
}

function calculateTotalCount(items: Array<{ gameCount: number }>): number {
  return items.reduce((sum, item) => sum + item.gameCount, 0)
}

function buildYAxisTicks(minValue: number, maxValue: number): number[] {
  const ticks: number[] = []
  const step = 5

  for (let value = maxValue; value >= minValue; value -= step) {
    ticks.push(value)
  }

  return ticks
}

function createTrendPoints(
  data: Array<{ year: number; value: number }>,
  options: {
    width: number
    height: number
    paddingTop: number
    paddingRight: number
    paddingBottom: number
    paddingLeft: number
    minValue: number
    maxValue: number
  },
): TrendPoint[] {
  const {
    width,
    height,
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,
    minValue,
    maxValue,
  } = options

  const chartWidth = width - paddingLeft - paddingRight
  const chartHeight = height - paddingTop - paddingBottom

  return data.map((item, index) => {
    const ratioX = data.length === 1 ? 0.5 : index / (data.length - 1)
    const ratioY = maxValue === minValue ? 0.5 : (item.value - minValue) / (maxValue - minValue)

    return {
      x: paddingLeft + chartWidth * ratioX,
      y: paddingTop + chartHeight * (1 - ratioY),
      year: item.year,
      value: item.value,
    }
  })
}

function buildSmoothPath(points: TrendPoint[]): string {
  if (points.length === 0) {
    return ''
  }

  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`
  }

  let path = `M ${points[0].x} ${points[0].y}`

  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index]
    const next = points[index + 1]
    const controlX = (current.x + next.x) / 2

    path += ` C ${controlX} ${current.y}, ${controlX} ${next.y}, ${next.x} ${next.y}`
  }

  return path
}

function getYPosition(
  value: number,
  minValue: number,
  maxValue: number,
  height: number,
  paddingTop: number,
  paddingBottom: number,
): number {
  const chartHeight = height - paddingTop - paddingBottom
  const ratio = maxValue === minValue ? 0.5 : (value - minValue) / (maxValue - minValue)

  return paddingTop + chartHeight * (1 - ratio)
}

function getPriceBandOrder(priceBand: string): number {
  const normalized = normalizeToken(priceBand)

  if (normalized.includes('free')) {
    return 0
  }

  if (normalized.includes('0 5000')) {
    return 1
  }

  if (normalized.includes('5000 15000')) {
    return 2
  }

  if (normalized.includes('15000 30000')) {
    return 3
  }

  if (normalized.includes('30000 50000')) {
    return 4
  }

  return 5
}

function formatPriceBandLabel(priceBand: string): string {
  const trimmed = priceBand.trim()
  const normalized = normalizeToken(trimmed)

  if (!trimmed) {
    return '알 수 없음'
  }

  if (normalized.includes('free')) {
    return '무료'
  }

  const matchedRange = trimmed.match(/(\d+)\s*[-~]\s*(\d+)/)

  if (matchedRange) {
    return `${Number(matchedRange[1]).toLocaleString('ko-KR')}~${Number(
      matchedRange[2],
    ).toLocaleString('ko-KR')}`
  }

  const matchedOver = trimmed.match(/(\d+)\s*\+/)

  if (matchedOver) {
    return `${Number(matchedOver[1]).toLocaleString('ko-KR')} 이상`
  }

  return trimmed
}

function formatGenreLabel(genre: string): string {
  const trimmedGenre = genre.trim()

  if (!trimmedGenre) {
    return '알 수 없음'
  }

  if (/[가-힣]/.test(trimmedGenre) && trimmedGenre.includes('(') && trimmedGenre.includes(')')) {
    return trimmedGenre
  }

  const normalizedGenre = normalizeToken(trimmedGenre)
  const koreanLabel = GENRE_LABEL_MAP[normalizedGenre]

  if (!koreanLabel) {
    return trimmedGenre
  }

  return `${koreanLabel} (${trimmedGenre})`
}

function formatPlatformLabel(platform: string): string {
  const trimmed = platform.trim()

  if (!trimmed) {
    return '알 수 없음'
  }

  const normalized = normalizeToken(trimmed)

  return PLATFORM_LABEL_MAP[normalized] ?? trimmed
}

function getPlatformIcon(platform: string): string {
  const normalized = normalizeToken(platform)

  if (normalized.includes('windows')) {
    return '▦'
  }

  if (normalized.includes('mac')) {
    return '◐'
  }

  if (normalized.includes('linux')) {
    return '◇'
  }

  return '◆'
}

function formatLargeNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }

  return value.toLocaleString('ko-KR')
}

function getShortLabel(label: string): string {
  return label.split(' (')[0].trim()
}

function unwrapList(rawData: unknown): Record<string, unknown>[] {
  if (Array.isArray(rawData)) {
    return rawData.filter(isRecord)
  }

  if (!isRecord(rawData)) {
    return []
  }

  return readNestedList(rawData, [
    'items',
    'data',
    'results',
    'stats',
    'genres',
    'platforms',
    'price_bands',
    'priceBands',
    'release_years',
    'releaseYears',
  ])
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

function readString(item: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = item[key]

    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value)
    }
  }

  return ''
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

function normalizeToken(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9가-힣]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export default MarketDistributionPage
