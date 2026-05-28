import { useEffect, useMemo, useState } from 'react'
import './TrendComparePage.css'
import { getAnalysisTrends, getGenreTrends, getPriceTrends } from './api'

type CompareStandard = 'reviews' | 'positiveRate'
type PeriodOption = '3months' | '6months' | '12months'
type CompareMode = 'all' | 'platform' | 'price'

type MonthlyTrend = {
  month: string
  currentReviews: number
  previousReviews: number
  currentPositiveRate: number
  previousPositiveRate: number
}

type GenreTrend = {
  genre: string
  currentReviews: number
  previousReviews: number
}

type PriceTrend = {
  priceBand: string
  currentPositiveRate: number
  previousPositiveRate: number
}

type TrendCompareData = {
  monthlyTrends: MonthlyTrend[]
  genreTrends: GenreTrend[]
  priceTrends: PriceTrend[]
}

type LineChartType = 'reviews' | 'positiveRate'
type TrendValueKey = keyof Pick<
  MonthlyTrend,
  'currentReviews' | 'previousReviews' | 'currentPositiveRate' | 'previousPositiveRate'
>

type LinePoint = {
  x: number
  y: number
  month: string
}

const DEFAULT_MONTHLY_TRENDS: MonthlyTrend[] = [
  {
    month: '11월',
    currentReviews: 2200000,
    previousReviews: 1450000,
    currentPositiveRate: 84,
    previousPositiveRate: 36,
  },
  {
    month: '12월',
    currentReviews: 2850000,
    previousReviews: 1720000,
    currentPositiveRate: 88,
    previousPositiveRate: 34,
  },
  {
    month: '1월',
    currentReviews: 2050000,
    previousReviews: 1380000,
    currentPositiveRate: 78,
    previousPositiveRate: 31,
  },
  {
    month: '2월',
    currentReviews: 2460000,
    previousReviews: 1620000,
    currentPositiveRate: 82,
    previousPositiveRate: 33,
  },
  {
    month: '3월',
    currentReviews: 2920000,
    previousReviews: 2080000,
    currentPositiveRate: 85,
    previousPositiveRate: 32,
  },
  {
    month: '4월',
    currentReviews: 3240000,
    previousReviews: 2320000,
    currentPositiveRate: 86,
    previousPositiveRate: 36,
  },
]

const DEFAULT_GENRE_TRENDS: GenreTrend[] = [
  {
    genre: 'RPG',
    currentReviews: 24200000,
    previousReviews: 20100000,
  },
  {
    genre: '액션',
    currentReviews: 18700000,
    previousReviews: 15900000,
  },
  {
    genre: '어드벤처',
    currentReviews: 9400000,
    previousReviews: 8700000,
  },
  {
    genre: '전략',
    currentReviews: 4200000,
    previousReviews: 3600000,
  },
  {
    genre: '시뮬레이션',
    currentReviews: 3700000,
    previousReviews: 3100000,
  },
]

const DEFAULT_PRICE_TRENDS: PriceTrend[] = [
  {
    priceBand: '$0 - $10',
    currentPositiveRate: 78,
    previousPositiveRate: 72,
  },
  {
    priceBand: '$10 - $20',
    currentPositiveRate: 73,
    previousPositiveRate: 68,
  },
  {
    priceBand: '$20 - $30',
    currentPositiveRate: 69,
    previousPositiveRate: 64,
  },
  {
    priceBand: '$30 - $50',
    currentPositiveRate: 62,
    previousPositiveRate: 58,
  },
  {
    priceBand: '$50 이상',
    currentPositiveRate: 64,
    previousPositiveRate: 60,
  },
]

const INITIAL_TREND_DATA: TrendCompareData = {
  monthlyTrends: DEFAULT_MONTHLY_TRENDS,
  genreTrends: DEFAULT_GENRE_TRENDS,
  priceTrends: DEFAULT_PRICE_TRENDS,
}

function TrendComparePage() {
  const [compareStandard, setCompareStandard] = useState<CompareStandard>('reviews')
  const [period, setPeriod] = useState<PeriodOption>('6months')
  const [compareMode, setCompareMode] = useState<CompareMode>('all')
  const [trendData, setTrendData] = useState<TrendCompareData>(INITIAL_TREND_DATA)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    async function loadTrendCompareData() {
      try {
        setIsLoading(true)

        const [monthlyResult, genreResult, priceResult] = await Promise.allSettled([
          getAnalysisTrends(),
          getGenreTrends(),
          getPriceTrends(),
        ])

        setTrendData({
          monthlyTrends:
            monthlyResult.status === 'fulfilled'
              ? normalizeMonthlyTrends(monthlyResult.value)
              : DEFAULT_MONTHLY_TRENDS,
          genreTrends:
            genreResult.status === 'fulfilled'
              ? normalizeGenreTrends(genreResult.value)
              : DEFAULT_GENRE_TRENDS,
          priceTrends:
            priceResult.status === 'fulfilled'
              ? normalizePriceTrends(priceResult.value)
              : DEFAULT_PRICE_TRENDS,
        })
      } catch (error) {
        console.error('트렌드 비교 데이터를 불러오지 못했습니다.', error)
        setTrendData(INITIAL_TREND_DATA)
      } finally {
        setIsLoading(false)
      }
    }

    loadTrendCompareData()
  }, [])

  const monthlyTrends = useMemo(() => {
    return getPeriodLimitedMonthlyTrends(trendData.monthlyTrends, period)
  }, [period, trendData.monthlyTrends])

  const genreTrends = useMemo(() => {
    if (compareMode === 'platform') {
      return trendData.genreTrends.slice(0, 4)
    }

    return trendData.genreTrends.slice(0, 5)
  }, [compareMode, trendData.genreTrends])

  const priceTrends = useMemo(() => {
    if (compareMode === 'price') {
      return trendData.priceTrends.slice(0, 5)
    }

    return trendData.priceTrends.slice(0, 5)
  }, [compareMode, trendData.priceTrends])

  return (
    <section className="trend-compare-page" aria-label="트렌드 비교 화면">
      <div className="trend-compare-filter-card">
        <div className="trend-compare-filter-item">
          <label htmlFor="trend-compare-standard">비교 기준</label>
          <select
            id="trend-compare-standard"
            value={compareStandard}
            onChange={(event) => setCompareStandard(event.target.value as CompareStandard)}
          >
            <option value="reviews">리뷰 수</option>
            <option value="positiveRate">긍정 비율</option>
          </select>
        </div>

        <div className="trend-compare-filter-item">
          <label htmlFor="trend-compare-period">기간 선택</label>
          <select
            id="trend-compare-period"
            value={period}
            onChange={(event) => setPeriod(event.target.value as PeriodOption)}
          >
            <option value="3months">3개월</option>
            <option value="6months">6개월</option>
            <option value="12months">12개월</option>
          </select>
        </div>

        <strong className="trend-compare-vs">VS</strong>

        <div className="trend-compare-filter-item">
          <label htmlFor="trend-compare-previous-period">이전 기간</label>
          <select id="trend-compare-previous-period" value="previous" disabled>
            <option value="previous">이전 6개월</option>
          </select>
        </div>

        <div className="trend-compare-tabs" aria-label="트렌드 비교 유형">
          <button
            className={compareMode === 'all' ? 'active' : ''}
            type="button"
            onClick={() => setCompareMode('all')}
          >
            전체
          </button>
          <button
            className={compareMode === 'platform' ? 'active' : ''}
            type="button"
            onClick={() => setCompareMode('platform')}
          >
            플랫폼
          </button>
          <button
            className={compareMode === 'price' ? 'active' : ''}
            type="button"
            onClick={() => setCompareMode('price')}
          >
            가격대 비교
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="trend-compare-loading">
          트렌드 비교 데이터를 불러오는 중입니다. API 응답이 없으면 기본 예시 데이터로 표시됩니다.
        </div>
      )}

      <div className="trend-compare-grid">
        <article className="trend-compare-card">
          <TrendCardHeader title="리뷰 수 추이 비교" />
          <TrendLineChart data={monthlyTrends} chartType="reviews" />
        </article>

        <article className="trend-compare-card">
          <TrendCardHeader title="긍정 비율 추이 비교" />
          <TrendLineChart data={monthlyTrends} chartType="positiveRate" />
        </article>

        <article className="trend-compare-card">
          <TrendCardHeader title="장르별 리뷰 수 변화" hideLegend />
          <GenreReviewChangeTable data={genreTrends} />
        </article>

        <article className="trend-compare-card">
          <TrendCardHeader title="가격대별 긍정 비율 변화" />
          <PricePositiveRateBars data={priceTrends} />
        </article>
      </div>

      <div className="trend-compare-bottom-note">
        <strong>{compareStandard === 'reviews' ? '리뷰 수' : '긍정 비율'} 기준 비교</strong>
        <span>
          현재 기간과 이전 기간의 변화 흐름을 한 화면에서 비교해 시장 반응, 장르별 성장률,
          가격대별 긍정 비율 차이를 빠르게 확인할 수 있습니다.
        </span>
      </div>
    </section>
  )
}

function TrendCardHeader({ title, hideLegend = false }: { title: string; hideLegend?: boolean }) {
  return (
    <div className="trend-compare-card-header">
      <h2>{title}</h2>

      {!hideLegend && (
        <div className="trend-compare-legend">
          <span>
            <i className="current" /> 현재 기간
          </span>
          <span>
            <i className="previous" /> 이전 기간
          </span>
        </div>
      )}
    </div>
  )
}

function TrendLineChart({ data, chartType }: { data: MonthlyTrend[]; chartType: LineChartType }) {
  const currentKey: TrendValueKey =
    chartType === 'reviews' ? 'currentReviews' : 'currentPositiveRate'
  const previousKey: TrendValueKey =
    chartType === 'reviews' ? 'previousReviews' : 'previousPositiveRate'
  const maxValue = chartType === 'reviews' ? 4000000 : 100
  const yAxisLabels =
    chartType === 'reviews' ? ['4M', '3M', '2M', '1M', '0'] : ['100%', '75%', '50%', '25%', '0%']

  const currentPoints = createLinePoints(data, currentKey, maxValue)
  const previousPoints = createLinePoints(data, previousKey, maxValue)

  return (
    <div className="trend-compare-line-chart">
      <div className="trend-compare-y-axis">
        {yAxisLabels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="trend-compare-chart-body">
        <svg viewBox="0 0 520 210" role="img" aria-label="기간별 추이 비교 그래프">
          <g className="trend-compare-grid-lines">
            {[22, 62, 102, 142, 182].map((y) => (
              <line key={y} x1="16" x2="506" y1={y} y2={y} />
            ))}
          </g>

          <polyline className="trend-compare-line previous" points={convertPointsToSvg(previousPoints)} />
          <polyline className="trend-compare-line current" points={convertPointsToSvg(currentPoints)} />

          {previousPoints.map((point) => (
            <circle
              className="trend-compare-dot previous"
              cx={point.x}
              cy={point.y}
              key={`previous-${point.month}`}
              r="4"
            />
          ))}

          {currentPoints.map((point) => (
            <circle
              className="trend-compare-dot current"
              cx={point.x}
              cy={point.y}
              key={`current-${point.month}`}
              r="4"
            />
          ))}
        </svg>

        <div
          className="trend-compare-x-axis"
          style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}
        >
          {data.map((item) => (
            <span key={item.month}>{item.month}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

function GenreReviewChangeTable({ data }: { data: GenreTrend[] }) {
  return (
    <div className="trend-compare-genre-table">
      <div className="trend-compare-genre-head">
        <span>장르</span>
        <span>현재 기간</span>
        <span>이전 기간</span>
        <span>변화율</span>
      </div>

      {data.map((item) => {
        const changeRate = calculateChangeRate(item.currentReviews, item.previousReviews)

        return (
          <div className="trend-compare-genre-row" key={item.genre}>
            <strong>{item.genre}</strong>
            <span>{formatCompactNumber(item.currentReviews)}</span>
            <span>{formatCompactNumber(item.previousReviews)}</span>
            <em className={changeRate >= 0 ? 'up' : 'down'}>
              {changeRate >= 0 ? '▲' : '▼'} {Math.abs(changeRate).toFixed(1)}%
            </em>
          </div>
        )
      })}
    </div>
  )
}

function PricePositiveRateBars({ data }: { data: PriceTrend[] }) {
  return (
    <div className="trend-compare-price-list">
      {data.map((item) => (
        <div className="trend-compare-price-item" key={item.priceBand}>
          <span className="trend-compare-price-label">{item.priceBand}</span>

          <div className="trend-compare-price-track">
            <div
              className="trend-compare-price-bar previous"
              style={{ width: `${item.previousPositiveRate}%` }}
            />
            <div
              className="trend-compare-price-bar current"
              style={{ width: `${item.currentPositiveRate}%` }}
            />
          </div>

          <strong>{Math.round(item.currentPositiveRate)}%</strong>
        </div>
      ))}
    </div>
  )
}

function createLinePoints(
  data: MonthlyTrend[],
  valueKey: TrendValueKey,
  maxValue: number,
): LinePoint[] {
  const left = 24
  const right = 496
  const top = 20
  const bottom = 184
  const xGap = data.length > 1 ? (right - left) / (data.length - 1) : 0

  return data.map((item, index) => {
    const value = Math.max(0, Math.min(Number(item[valueKey]), maxValue))
    const ratio = maxValue > 0 ? value / maxValue : 0

    return {
      x: left + xGap * index,
      y: bottom - ratio * (bottom - top),
      month: item.month,
    }
  })
}

function convertPointsToSvg(points: LinePoint[]) {
  return points.map((point) => `${point.x},${point.y}`).join(' ')
}

function getPeriodLimitedMonthlyTrends(data: MonthlyTrend[], period: PeriodOption) {
  const limitMap: Record<PeriodOption, number> = {
    '3months': 3,
    '6months': 6,
    '12months': 12,
  }

  return data.slice(-limitMap[period])
}

function calculateChangeRate(currentValue: number, previousValue: number) {
  if (previousValue <= 0) {
    return 0
  }

  return ((currentValue - previousValue) / previousValue) * 100
}

function formatCompactNumber(value: number) {
  if (value >= 1000000) {
    const compactValue = value / 1000000
    return `${compactValue.toFixed(compactValue >= 10 ? 1 : 1)}M`
  }

  if (value >= 1000) {
    const compactValue = value / 1000
    return `${compactValue.toFixed(compactValue >= 10 ? 1 : 1)}K`
  }

  return value.toLocaleString('ko-KR')
}

function normalizeMonthlyTrends(rawData: unknown): MonthlyTrend[] {
  const rawList = unwrapListFromUnknown(rawData)
  const normalizedList = rawList
    .map((item, index) => {
      const currentReviews = readNumber(item, [
        'current_reviews',
        'currentReviews',
        'reviews_current',
        'current_review_count',
        'review_count',
        'total_reviews',
      ])
      const previousReviews = readNumber(item, [
        'previous_reviews',
        'previousReviews',
        'reviews_previous',
        'previous_review_count',
      ])
      const currentPositiveRate = normalizePercent(
        readNumber(item, [
          'current_positive_rate',
          'currentPositiveRate',
          'positive_rate_current',
          'current_positive_ratio',
          'positive_ratio',
        ]),
      )
      const previousPositiveRate = normalizePercent(
        readNumber(item, [
          'previous_positive_rate',
          'previousPositiveRate',
          'positive_rate_previous',
          'previous_positive_ratio',
        ]),
      )

      return {
        month:
          readString(item, ['month', 'label', 'period', 'date']) ||
          DEFAULT_MONTHLY_TRENDS[index]?.month ||
          `${index + 1}월`,
        currentReviews: currentReviews || DEFAULT_MONTHLY_TRENDS[index]?.currentReviews || 0,
        previousReviews: previousReviews || DEFAULT_MONTHLY_TRENDS[index]?.previousReviews || 0,
        currentPositiveRate:
          currentPositiveRate || DEFAULT_MONTHLY_TRENDS[index]?.currentPositiveRate || 0,
        previousPositiveRate:
          previousPositiveRate || DEFAULT_MONTHLY_TRENDS[index]?.previousPositiveRate || 0,
      }
    })
    .filter((item) => item.currentReviews > 0 || item.currentPositiveRate > 0)

  return normalizedList.length > 0 ? normalizedList : DEFAULT_MONTHLY_TRENDS
}

function normalizeGenreTrends(rawData: unknown): GenreTrend[] {
  const rawList = unwrapListFromUnknown(rawData)
  const normalizedList = rawList
    .map((item, index) => {
      const currentReviews = readNumber(item, [
        'current_reviews',
        'currentReviews',
        'reviews_current',
        'review_count',
        'total_reviews',
      ])
      const previousReviews = readNumber(item, [
        'previous_reviews',
        'previousReviews',
        'reviews_previous',
      ])

      return {
        genre:
          readString(item, ['genre', 'name', 'label', 'category']) ||
          DEFAULT_GENRE_TRENDS[index]?.genre ||
          '기타',
        currentReviews: currentReviews || DEFAULT_GENRE_TRENDS[index]?.currentReviews || 0,
        previousReviews:
          previousReviews ||
          DEFAULT_GENRE_TRENDS[index]?.previousReviews ||
          Math.round(currentReviews * 0.85),
      }
    })
    .filter((item) => item.currentReviews > 0)

  return normalizedList.length > 0 ? normalizedList : DEFAULT_GENRE_TRENDS
}

function normalizePriceTrends(rawData: unknown): PriceTrend[] {
  const rawList = unwrapListFromUnknown(rawData)
  const normalizedList = rawList
    .map((item, index) => {
      const currentPositiveRate = normalizePercent(
        readNumber(item, [
          'current_positive_rate',
          'currentPositiveRate',
          'positive_rate_current',
          'current_positive_ratio',
          'positive_ratio',
        ]),
      )
      const previousPositiveRate = normalizePercent(
        readNumber(item, [
          'previous_positive_rate',
          'previousPositiveRate',
          'positive_rate_previous',
          'previous_positive_ratio',
        ]),
      )

      return {
        priceBand:
          readString(item, ['price_band', 'priceBand', 'label', 'range', 'name']) ||
          DEFAULT_PRICE_TRENDS[index]?.priceBand ||
          '기타',
        currentPositiveRate:
          currentPositiveRate || DEFAULT_PRICE_TRENDS[index]?.currentPositiveRate || 0,
        previousPositiveRate:
          previousPositiveRate || DEFAULT_PRICE_TRENDS[index]?.previousPositiveRate || 0,
      }
    })
    .filter((item) => item.currentPositiveRate > 0)

  return normalizedList.length > 0 ? normalizedList : DEFAULT_PRICE_TRENDS
}

function unwrapListFromUnknown(rawData: unknown): Record<string, unknown>[] {
  if (Array.isArray(rawData)) {
    return rawData.filter(isRecord)
  }

  if (!isRecord(rawData)) {
    return []
  }

  const listKeys = ['items', 'data', 'results', 'trends', 'genres', 'prices']

  for (const key of listKeys) {
    const value = rawData[key]

    if (Array.isArray(value)) {
      return value.filter(isRecord)
    }
  }

  return []
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readNumber(item: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = item[key]

    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }

    if (typeof value === 'string') {
      const numericText = value.replace(/[^0-9.-]/g, '')
      const parsedValue = Number(numericText)

      if (Number.isFinite(parsedValue)) {
        return parsedValue
      }
    }
  }

  return 0
}

function readString(item: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = item[key]

    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim()
    }
  }

  return ''
}

function normalizePercent(value: number) {
  if (value <= 0) {
    return 0
  }

  if (value <= 1) {
    return value * 100
  }

  return Math.min(value, 100)
}

export default TrendComparePage
