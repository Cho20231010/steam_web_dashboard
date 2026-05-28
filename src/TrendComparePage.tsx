import { useEffect, useMemo, useState } from 'react'
import './TrendComparePage.css'
import { getAnalysisTrends, getGenreTrends, getPriceTrends } from './api'

type CompareStandard = 'reviews' | 'positiveRate'
type PeriodOption = '3months' | '6months' | '12months'
type CompareMode = 'all' | 'platform' | 'price'

type MonthlyTrend = {
  month: string
  currentReviews: number | null
  previousReviews: number | null
  currentPositiveRate: number | null
  previousPositiveRate: number | null
}

type GenreTrend = {
  genre: string
  currentReviews: number
  previousReviews: number | null
}

type PriceTrend = {
  priceBand: string
  currentPositiveRate: number
  previousPositiveRate: number | null
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

type PeriodSummary = {
  period: string
  reviewCount: number
  positiveReviews: number
  negativeReviews: number
  positiveRatio: number | null
}

type PriceTrendCandidate = {
  priceBand: string
  currentPositiveRate: number
  previousPositiveRate: number | null
  currentWeight: number
  previousWeight: number | null
}

const INITIAL_TREND_DATA: TrendCompareData = {
  monthlyTrends: [],
  genreTrends: [],
  priceTrends: [],
}

function TrendComparePage() {
  const [compareStandard, setCompareStandard] = useState<CompareStandard>('reviews')
  const [period, setPeriod] = useState<PeriodOption>('6months')
  const [compareMode, setCompareMode] = useState<CompareMode>('all')
  const [trendData, setTrendData] = useState<TrendCompareData>(INITIAL_TREND_DATA)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function loadTrendCompareData() {
      try {
        setIsLoading(true)
        setErrorMessage('')

        const [trendResult, genreResult, priceResult] = await Promise.allSettled([
          getAnalysisTrends(),
          getGenreTrends(),
          getPriceTrends(),
        ])

        const trendApiData = trendResult.status === 'fulfilled' ? trendResult.value : null

        const monthlyTrends = trendApiData ? normalizeMonthlyTrends(trendApiData) : []

        const genreApiTrends =
          genreResult.status === 'fulfilled' ? normalizeGenreTrends(genreResult.value) : []

        const trendApiGenreTrends = trendApiData ? normalizeTopGenreTrends(trendApiData) : []

        const priceTrends =
          priceResult.status === 'fulfilled' ? normalizePriceTrends(priceResult.value) : []

        setTrendData({
          monthlyTrends,
          genreTrends: genreApiTrends.length > 0 ? genreApiTrends : trendApiGenreTrends,
          priceTrends,
        })

        if (
          trendResult.status === 'rejected' &&
          genreResult.status === 'rejected' &&
          priceResult.status === 'rejected'
        ) {
          setErrorMessage('트렌드 비교 데이터를 불러오지 못했습니다.')
        }
      } catch (error) {
        console.error('트렌드 비교 데이터를 불러오지 못했습니다.', error)
        setTrendData(INITIAL_TREND_DATA)
        setErrorMessage('트렌드 비교 데이터를 불러오지 못했습니다.')
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
    return trendData.genreTrends.slice(0, compareMode === 'platform' ? 4 : 5)
  }, [compareMode, trendData.genreTrends])

  const priceTrends = useMemo(() => {
    return trendData.priceTrends.slice(0, 5)
  }, [trendData.priceTrends])

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
        <div className="trend-compare-loading">트렌드 비교 데이터를 불러오는 중입니다.</div>
      )}

      {!isLoading && errorMessage && <div className="trend-compare-loading">{errorMessage}</div>}

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
        <strong>
          {compareStandard === 'reviews' ? '리뷰 수 기준 비교' : '긍정 비율 기준 비교'}
        </strong>
        <span>
          현재 기간과 이전 기간의 변화 흐름을 한 화면에서 비교해 시장 반응, 장르별 성장률,
          가격대별 긍정 비율 차이를 빠르게 확인할 수 있습니다.
        </span>
      </div>
    </section>
  )
}

function TrendCardHeader({
  title,
  hideLegend = false,
}: {
  title: string
  hideLegend?: boolean
}) {
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

function TrendLineChart({
  data,
  chartType,
}: {
  data: MonthlyTrend[]
  chartType: LineChartType
}) {
  const currentKey: TrendValueKey =
    chartType === 'reviews' ? 'currentReviews' : 'currentPositiveRate'
  const previousKey: TrendValueKey =
    chartType === 'reviews' ? 'previousReviews' : 'previousPositiveRate'

  const hasCurrentData = data.some((item) => getNumberOrNull(item[currentKey]) !== null)
  const hasPreviousData = data.some((item) => getNumberOrNull(item[previousKey]) !== null)

  if (data.length === 0 || (!hasCurrentData && !hasPreviousData)) {
    return (
      <div className="trend-compare-loading">
        표시할 {chartType === 'reviews' ? '리뷰 수' : '긍정 비율'} 추이 데이터가 없습니다.
      </div>
    )
  }

  const maxValue =
    chartType === 'positiveRate'
      ? 100
      : getRoundedMaxValue(
          Math.max(
            ...data.map((item) => getNumberOrNull(item.currentReviews) ?? 0),
            ...data.map((item) => getNumberOrNull(item.previousReviews) ?? 0),
            1,
          ),
        )

  const yAxisLabels =
    chartType === 'positiveRate'
      ? ['100%', '75%', '50%', '25%', '0%']
      : createReviewYAxisLabels(maxValue)

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

          {previousPoints.length > 0 && (
            <polyline
              className="trend-compare-line previous"
              points={convertPointsToSvg(previousPoints)}
            />
          )}

          {currentPoints.length > 0 && (
            <polyline
              className="trend-compare-line current"
              points={convertPointsToSvg(currentPoints)}
            />
          )}

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
  if (data.length === 0) {
    return <div className="trend-compare-loading">표시할 장르별 리뷰 수 데이터가 없습니다.</div>
  }

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
            <span>
              {item.previousReviews === null ? '-' : formatCompactNumber(item.previousReviews)}
            </span>
            <em className={changeRate === null ? 'up' : changeRate >= 0 ? 'up' : 'down'}>
              {changeRate === null
                ? '-'
                : `${changeRate >= 0 ? '▲' : '▼'} ${Math.abs(changeRate).toFixed(1)}%`}
            </em>
          </div>
        )
      })}
    </div>
  )
}

function PricePositiveRateBars({ data }: { data: PriceTrend[] }) {
  if (data.length === 0) {
    return <div className="trend-compare-loading">표시할 가격대별 긍정 비율 데이터가 없습니다.</div>
  }

  return (
    <div className="trend-compare-price-list">
      {data.map((item) => (
        <div className="trend-compare-price-item" key={item.priceBand}>
          <span className="trend-compare-price-label">{item.priceBand}</span>

          <div className="trend-compare-price-track">
            {item.previousPositiveRate !== null && (
              <div
                className="trend-compare-price-bar previous"
                style={{ width: `${item.previousPositiveRate}%` }}
              />
            )}

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

  return data
    .map((item, index) => {
      const rawValue = getNumberOrNull(item[valueKey])

      if (rawValue === null) {
        return null
      }

      const value = Math.max(0, Math.min(rawValue, maxValue))
      const ratio = maxValue > 0 ? value / maxValue : 0

      return {
        x: left + xGap * index,
        y: bottom - ratio * (bottom - top),
        month: item.month,
      }
    })
    .filter((point): point is LinePoint => point !== null)
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

function calculateChangeRate(currentValue: number, previousValue: number | null) {
  if (previousValue === null || previousValue <= 0) {
    return null
  }

  return ((currentValue - previousValue) / previousValue) * 100
}

function getRoundedMaxValue(value: number) {
  if (value <= 0) {
    return 1
  }

  if (value <= 1000) {
    return 1000
  }

  const exponent = Math.pow(10, Math.floor(Math.log10(value)))
  return Math.ceil(value / exponent) * exponent
}

function createReviewYAxisLabels(maxValue: number) {
  return [maxValue, maxValue * 0.75, maxValue * 0.5, maxValue * 0.25, 0].map((value) =>
    formatCompactNumber(value),
  )
}

function formatCompactNumber(value: number) {
  if (value >= 1000000) {
    const compactValue = value / 1000000
    return `${compactValue.toFixed(1)}M`
  }

  if (value >= 1000) {
    const compactValue = value / 1000
    return `${compactValue.toFixed(1)}K`
  }

  return Math.round(value).toLocaleString('ko-KR')
}

function normalizeMonthlyTrends(rawData: unknown): MonthlyTrend[] {
  const marketList = readNestedListFromUnknown(rawData, ['market'])

  if (marketList.length > 0) {
    return normalizeMarketList(marketList)
  }

  const rawList = unwrapListFromUnknown(rawData)

  return normalizeMarketList(rawList)
}

function normalizeMarketList(rawList: Record<string, unknown>[]) {
  return rawList
    .map((item, index) => {
      const month =
        formatPeriodLabel(
          readDisplayLabel(
            item,
            ['period_ko', 'month_ko', 'label_ko', 'date_ko'],
            ['period', 'month', 'label', 'date', 'year_month', 'release_month'],
          ),
        ) || `기간 ${index + 1}`

      const reviewCount = readOptionalNumber(item, [
        'review_count',
        'reviewCount',
        'reviews',
        'total_reviews',
        'totalReviews',
        'count',
        'total',
      ])

      const positiveRatio = readPositiveRatio(item)

      return {
        month,
        currentReviews: reviewCount,
        previousReviews: null,
        currentPositiveRate: positiveRatio,
        previousPositiveRate: null,
      }
    })
    .filter(
      (item) =>
        item.month.trim().length > 0 &&
        (item.currentReviews !== null || item.currentPositiveRate !== null),
    )
}

function normalizeTopGenreTrends(rawData: unknown): GenreTrend[] {
  const topGenreList = readNestedListFromUnknown(rawData, ['top_genres', 'topGenres'])

  if (topGenreList.length === 0) {
    return []
  }

  return topGenreList
    .map((item) => {
      const genre = readDisplayLabel(
        item,
        ['genre_ko', 'genre_kor', 'korean_genre', 'name_ko', 'label_ko', 'category_ko'],
        ['genre', 'name', 'label', 'category'],
      )

      const periodData = readNestedListFromUnknown(item, ['data', 'items', 'results'])
      const periodSummaries = aggregatePeriodSummaries(periodData)

      if (periodSummaries.length === 0) {
        return {
          genre,
          currentReviews: 0,
          previousReviews: null,
        }
      }

      const sortedPeriodSummaries = periodSummaries.sort((a, b) =>
        a.period.localeCompare(b.period),
      )
      const currentPeriod = sortedPeriodSummaries[sortedPeriodSummaries.length - 1]
      const previousPeriod =
        sortedPeriodSummaries.length >= 2
          ? sortedPeriodSummaries[sortedPeriodSummaries.length - 2]
          : null

      return {
        genre,
        currentReviews: currentPeriod.reviewCount,
        previousReviews: previousPeriod ? previousPeriod.reviewCount : null,
      }
    })
    .filter((item) => item.genre.trim().length > 0)
    .sort((a, b) => b.currentReviews - a.currentReviews)
}

function normalizeGenreTrends(rawData: unknown): GenreTrend[] {
  const topGenreTrends = normalizeTopGenreTrends(rawData)

  if (topGenreTrends.length > 0) {
    return topGenreTrends
  }

  const rawList = unwrapListFromUnknown(rawData)

  const normalizedList = rawList
    .map((item) => {
      const genre = readDisplayLabel(
        item,
        ['genre_ko', 'genre_kor', 'korean_genre', 'name_ko', 'label_ko', 'category_ko'],
        ['genre', 'name', 'label', 'category'],
      )

      return {
        genre,
        currentReviews:
          readOptionalNumber(item, [
            'current_reviews',
            'currentReviews',
            'current_review_count',
            'reviews_current',
            'review_count_current',
            'current_total_reviews',
            'review_count',
            'reviewCount',
            'reviews',
            'total_reviews',
            'totalReviews',
            'count',
            'total',
          ]) ?? 0,
        previousReviews: readOptionalNumber(item, [
          'previous_reviews',
          'previousReviews',
          'previous_review_count',
          'reviews_previous',
          'review_count_previous',
          'previous_total_reviews',
          'previous',
          'previous_value',
        ]),
      }
    })
    .filter((item) => item.genre.trim().length > 0)

  return aggregateGenreTrends(normalizedList)
}

function normalizePriceTrends(rawData: unknown): PriceTrend[] {
  const rawList = unwrapListFromUnknown(rawData)

  const normalizedList: PriceTrendCandidate[] = rawList
    .map((item) => {
      const priceBand = readDisplayLabel(
        item,
        ['price_band_ko', 'priceBandKo', 'label_ko', 'range_ko', 'name_ko'],
        ['price_band', 'priceBand', 'price_range', 'priceRange', 'label', 'range', 'name'],
      )

      const currentPositiveRate = readPositiveRatio(item)

      const previousPositiveRate = normalizeOptionalPercent(
        readOptionalNumber(item, [
          'previous_positive_rate',
          'previousPositiveRate',
          'positive_rate_previous',
          'previous_positive_ratio',
          'positive_ratio_previous',
          'previous',
          'previous_value',
        ]),
      )

      const currentWeight =
        readOptionalNumber(item, [
          'current_reviews',
          'currentReviews',
          'current_review_count',
          'reviews_current',
          'review_count_current',
          'review_count',
          'reviewCount',
          'reviews',
          'total_reviews',
          'totalReviews',
          'count',
          'total',
        ]) ?? 1

      const previousWeight = readOptionalNumber(item, [
        'previous_reviews',
        'previousReviews',
        'previous_review_count',
        'reviews_previous',
        'review_count_previous',
      ])

      return {
        priceBand,
        currentPositiveRate: currentPositiveRate ?? 0,
        previousPositiveRate,
        currentWeight,
        previousWeight,
      }
    })
    .filter((item) => item.priceBand.trim().length > 0)

  return aggregatePriceTrends(normalizedList)
}

function aggregateGenreTrends(data: GenreTrend[]) {
  const map = new Map<string, GenreTrend>()

  data.forEach((item) => {
    const savedItem = map.get(item.genre)

    if (!savedItem) {
      map.set(item.genre, { ...item })
      return
    }

    savedItem.currentReviews += item.currentReviews

    if (item.previousReviews !== null) {
      savedItem.previousReviews = (savedItem.previousReviews ?? 0) + item.previousReviews
    }
  })

  return Array.from(map.values()).sort((a, b) => b.currentReviews - a.currentReviews)
}

function aggregatePriceTrends(data: PriceTrendCandidate[]) {
  const map = new Map<
    string,
    {
      currentWeightedSum: number
      currentWeightSum: number
      previousWeightedSum: number
      previousWeightSum: number
    }
  >()

  data.forEach((item) => {
    const savedItem =
      map.get(item.priceBand) ??
      {
        currentWeightedSum: 0,
        currentWeightSum: 0,
        previousWeightedSum: 0,
        previousWeightSum: 0,
      }

    const currentWeight = item.currentWeight > 0 ? item.currentWeight : 1

    savedItem.currentWeightedSum += item.currentPositiveRate * currentWeight
    savedItem.currentWeightSum += currentWeight

    if (item.previousPositiveRate !== null) {
      const previousWeight =
        item.previousWeight !== null && item.previousWeight > 0 ? item.previousWeight : 1

      savedItem.previousWeightedSum += item.previousPositiveRate * previousWeight
      savedItem.previousWeightSum += previousWeight
    }

    map.set(item.priceBand, savedItem)
  })

  return Array.from(map.entries())
    .map(([priceBand, value]) => ({
      priceBand,
      currentPositiveRate:
        value.currentWeightSum > 0 ? value.currentWeightedSum / value.currentWeightSum : 0,
      previousPositiveRate:
        value.previousWeightSum > 0 ? value.previousWeightedSum / value.previousWeightSum : null,
    }))
    .sort((a, b) => b.currentPositiveRate - a.currentPositiveRate)
}

function aggregatePeriodSummaries(data: Record<string, unknown>[]) {
  const map = new Map<string, PeriodSummary>()

  data.forEach((item) => {
    const period = readString(item, ['period', 'month', 'label', 'date', 'year_month'])

    if (!period) {
      return
    }

    const savedItem =
      map.get(period) ??
      {
        period,
        reviewCount: 0,
        positiveReviews: 0,
        negativeReviews: 0,
        positiveRatio: null,
      }

    const reviewCount =
      readOptionalNumber(item, ['review_count', 'reviewCount', 'reviews', 'total_reviews']) ?? 0
    const positiveReviews =
      readOptionalNumber(item, ['positive_reviews', 'positiveReviews', 'positive_count']) ?? 0
    const negativeReviews =
      readOptionalNumber(item, ['negative_reviews', 'negativeReviews', 'negative_count']) ?? 0

    savedItem.reviewCount += reviewCount
    savedItem.positiveReviews += positiveReviews
    savedItem.negativeReviews += negativeReviews

    map.set(period, savedItem)
  })

  return Array.from(map.values()).map((item) => ({
    ...item,
    positiveRatio:
      item.reviewCount > 0 ? Math.min((item.positiveReviews / item.reviewCount) * 100, 100) : null,
  }))
}

function readPositiveRatio(item: Record<string, unknown>) {
  const directRatio = normalizeOptionalPercent(
    readOptionalNumber(item, [
      'positive_ratio',
      'positiveRatio',
      'positive_rate',
      'positiveRate',
      'rate',
      'percent',
      'percentage',
    ]),
  )

  if (directRatio !== null) {
    return directRatio
  }

  const reviewCount = readOptionalNumber(item, [
    'review_count',
    'reviewCount',
    'reviews',
    'total_reviews',
    'totalReviews',
    'count',
    'total',
  ])
  const positiveReviews = readOptionalNumber(item, [
    'positive_reviews',
    'positiveReviews',
    'positive_count',
  ])

  if (reviewCount !== null && reviewCount > 0 && positiveReviews !== null) {
    return Math.min((positiveReviews / reviewCount) * 100, 100)
  }

  return null
}

function readDisplayLabel(
  item: Record<string, unknown>,
  koreanKeys: string[],
  englishKeys: string[],
) {
  const koreanLabel = readString(item, koreanKeys)
  const englishLabel = readString(item, englishKeys)

  if (koreanLabel && englishLabel && !isSameLabel(koreanLabel, englishLabel)) {
    if (koreanLabel.includes(`(${englishLabel})`)) {
      return koreanLabel
    }

    return `${koreanLabel} (${englishLabel})`
  }

  return koreanLabel || englishLabel
}

function isSameLabel(firstLabel: string, secondLabel: string) {
  return firstLabel.trim().toLowerCase() === secondLabel.trim().toLowerCase()
}

function formatPeriodLabel(rawLabel: string) {
  const label = rawLabel.trim()

  if (!label) {
    return ''
  }

  const yearMonthMatch = label.match(/^\d{4}[-./](\d{1,2})/)

  if (yearMonthMatch) {
    const month = Number(yearMonthMatch[1])

    if (month >= 1 && month <= 12) {
      return `${month}월`
    }
  }

  return label
}

function readNestedListFromUnknown(rawData: unknown, keys: string[]) {
  if (!isRecord(rawData)) {
    return []
  }

  for (const key of keys) {
    const value = rawData[key]

    if (Array.isArray(value)) {
      return value.filter(isRecord)
    }

    if (isRecord(value)) {
      const nestedList = unwrapListFromUnknown(value)

      if (nestedList.length > 0) {
        return nestedList
      }
    }
  }

  return []
}

function unwrapListFromUnknown(rawData: unknown): Record<string, unknown>[] {
  if (Array.isArray(rawData)) {
    return rawData.filter(isRecord)
  }

  if (!isRecord(rawData)) {
    return []
  }

  const listKeys = [
    'items',
    'data',
    'results',
    'market',
    'trends',
    'monthly_trends',
    'monthlyTrends',
    'review_trends',
    'reviewTrends',
    'review_count_trends',
    'reviewCountTrends',
    'genre_trends',
    'genreTrends',
    'top_genres',
    'topGenres',
    'price_trends',
    'priceTrends',
    'genres',
    'prices',
  ]

  for (const key of listKeys) {
    const value = rawData[key]

    if (Array.isArray(value)) {
      return value.filter(isRecord)
    }

    if (isRecord(value)) {
      const nestedList = unwrapListFromUnknown(value)

      if (nestedList.length > 0) {
        return nestedList
      }
    }
  }

  return []
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readOptionalNumber(item: Record<string, unknown>, keys: string[]) {
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

  return null
}

function readString(item: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = item[key]

    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim()
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

function getNumberOrNull(value: number | null) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  return null
}

export default TrendComparePage
