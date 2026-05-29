import { useEffect, useMemo, useState } from 'react'
import './TrendComparePage.css'
import { getAnalysisTrends, getGenreTrends, getPriceTrends } from './api'

type CompareStandard = 'reviews' | 'positiveRate'
type CompareMode = 'all' | 'platform' | 'price'

type MonthlyTrend = {
  period: string
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

type TrendPeriodItem = {
  period: string
  reviewCount: number
  positiveReviews: number
  negativeReviews: number
  positiveRatio: number | null
}

type GenrePeriodGroup = {
  genre: string
  periods: TrendPeriodItem[]
}

type PricePeriodGroup = {
  priceBand: string
  periods: TrendPeriodItem[]
}

const INITIAL_TREND_DATA: TrendCompareData = {
  monthlyTrends: [],
  genreTrends: [],
  priceTrends: [],
}

function TrendComparePage() {
  const [compareStandard, setCompareStandard] = useState<CompareStandard>('reviews')
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

        const genreTrends =
          genreResult.status === 'fulfilled'
            ? normalizeGenreTrends(genreResult.value)
            : trendApiData
              ? normalizeTopGenreTrends(trendApiData)
              : []

        const priceTrends =
          priceResult.status === 'fulfilled' ? normalizePriceTrends(priceResult.value) : []

        setTrendData({
          monthlyTrends,
          genreTrends,
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
    return getLatestTwoMonthlyTrends(trendData.monthlyTrends)
  }, [trendData.monthlyTrends])

  const genreTrends = useMemo(() => {
    return trendData.genreTrends.slice(0, compareMode === 'platform' ? 4 : 5)
  }, [compareMode, trendData.genreTrends])

  const priceTrends = useMemo(() => {
    return trendData.priceTrends.slice(0, 5)
  }, [trendData.priceTrends])

  const periodMeta = useMemo(() => {
    return getPeriodMeta(monthlyTrends)
  }, [monthlyTrends])

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
          <label htmlFor="trend-current-period">현재 기간</label>
          <select id="trend-current-period" value="current" disabled>
            <option value="current">{periodMeta.currentPeriodLabel}</option>
          </select>
        </div>

        <strong className="trend-compare-vs">VS</strong>

        <div className="trend-compare-filter-item">
          <label htmlFor="trend-previous-period">이전 기간</label>
          <select id="trend-previous-period" value="previous" disabled>
            <option value="previous">{periodMeta.previousPeriodLabel}</option>
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
          <TrendCardHeader title="리뷰 수 추이 비교" hideLegend />
          <TrendLineChart data={monthlyTrends} chartType="reviews" />
        </article>

        <article className="trend-compare-card">
          <TrendCardHeader title="긍정 비율 추이 비교" hideLegend />
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
          최근 2개월 기준 비교
          {periodMeta.periodRangeLabel ? ` (${periodMeta.periodRangeLabel})` : ''}
        </strong>
        <span>
          현재 백엔드 데이터에 포함된 최신 2개월을 기준으로 리뷰 수, 긍정 비율, 장르별 리뷰 수,
          가격대별 긍정 비율 변화를 비교합니다.
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

  const hasCurrentData = data.some((item) => getNumberOrNull(item[currentKey]) !== null)

  if (data.length === 0 || !hasCurrentData) {
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
          Math.max(...data.map((item) => getNumberOrNull(item.currentReviews) ?? 0), 1),
        )

  const yAxisLabels =
    chartType === 'positiveRate'
      ? ['100%', '75%', '50%', '25%', '0%']
      : createReviewYAxisLabels(maxValue)

  const currentPoints = createLinePoints(data, currentKey, maxValue)

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

          {currentPoints.length > 0 && (
            <polyline
              className="trend-compare-line current"
              points={convertPointsToSvg(currentPoints)}
            />
          )}

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
            <span key={item.period}>{item.month}</span>
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

function getLatestTwoMonthlyTrends(data: MonthlyTrend[]) {
  return sortMonthlyTrends(data).slice(-2)
}

function getPeriodMeta(data: MonthlyTrend[]) {
  const sortedData = sortMonthlyTrends(data)
  const previousPeriod = sortedData.length >= 2 ? sortedData[sortedData.length - 2] : null
  const currentPeriod = sortedData.length >= 1 ? sortedData[sortedData.length - 1] : null

  return {
    previousPeriodLabel: previousPeriod ? previousPeriod.month : '-',
    currentPeriodLabel: currentPeriod ? currentPeriod.month : '-',
    periodRangeLabel:
      previousPeriod && currentPeriod ? `${previousPeriod.month} ~ ${currentPeriod.month}` : '',
  }
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
      const rawPeriod =
        readString(item, ['period', 'month', 'label', 'date', 'year_month', 'release_month']) ||
        `period-${index + 1}`

      return {
        period: rawPeriod,
        month: formatPeriodLabel(rawPeriod),
        currentReviews: readOptionalNumber(item, [
          'review_count',
          'reviewCount',
          'reviews',
          'total_reviews',
          'totalReviews',
          'count',
          'total',
        ]),
        previousReviews: null,
        currentPositiveRate: readPositiveRatio(item),
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
      const genre = readString(item, ['genre', 'name', 'label', 'category'])
      const periodData = readNestedListFromUnknown(item, ['data', 'items', 'results'])
      const periodSummaries = aggregatePeriodSummaries(periodData)

      if (periodSummaries.length === 0) {
        return {
          genre,
          currentReviews: 0,
          previousReviews: null,
        }
      }

      const sortedPeriodSummaries = sortTrendPeriodItems(periodSummaries)
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
  const itemList = readNestedListFromUnknown(rawData, ['items'])

  if (itemList.length === 0) {
    return normalizeTopGenreTrends(rawData)
  }

  const groupMap = new Map<string, GenrePeriodGroup>()

  itemList.forEach((item) => {
    const genre = readString(item, ['genre', 'name', 'label', 'category'])

    if (!genre) {
      return
    }

    const periodItem = normalizeTrendPeriodItem(item)

    if (!periodItem) {
      return
    }

    const savedGroup = groupMap.get(genre) ?? {
      genre,
      periods: [],
    }

    savedGroup.periods.push(periodItem)
    groupMap.set(genre, savedGroup)
  })

  return Array.from(groupMap.values())
    .map((group) => {
      const periodSummaries = aggregateTrendPeriodItems(group.periods)
      const sortedPeriodSummaries = sortTrendPeriodItems(periodSummaries)
      const currentPeriod = sortedPeriodSummaries[sortedPeriodSummaries.length - 1]
      const previousPeriod =
        sortedPeriodSummaries.length >= 2
          ? sortedPeriodSummaries[sortedPeriodSummaries.length - 2]
          : null

      return {
        genre: group.genre,
        currentReviews: currentPeriod ? currentPeriod.reviewCount : 0,
        previousReviews: previousPeriod ? previousPeriod.reviewCount : null,
      }
    })
    .filter((item) => item.genre.trim().length > 0)
    .sort((a, b) => b.currentReviews - a.currentReviews)
}

function normalizePriceTrends(rawData: unknown): PriceTrend[] {
  const itemList = readNestedListFromUnknown(rawData, ['items'])
  const rawList = itemList.length > 0 ? itemList : unwrapListFromUnknown(rawData)

  const groupMap = new Map<string, PricePeriodGroup>()

  rawList.forEach((item) => {
    const priceBand = readString(item, [
      'price_band',
      'priceBand',
      'price_range',
      'priceRange',
      'label',
      'range',
      'name',
    ])

    if (!priceBand) {
      return
    }

    const periodItem = normalizeTrendPeriodItem(item)

    if (!periodItem) {
      return
    }

    const savedGroup = groupMap.get(priceBand) ?? {
      priceBand,
      periods: [],
    }

    savedGroup.periods.push(periodItem)
    groupMap.set(priceBand, savedGroup)
  })

  return Array.from(groupMap.values())
    .map((group) => {
      const periodSummaries = aggregateTrendPeriodItems(group.periods)
      const sortedPeriodSummaries = sortTrendPeriodItems(periodSummaries)
      const currentPeriod = sortedPeriodSummaries[sortedPeriodSummaries.length - 1]
      const previousPeriod =
        sortedPeriodSummaries.length >= 2
          ? sortedPeriodSummaries[sortedPeriodSummaries.length - 2]
          : null

      return {
        priceBand: group.priceBand,
        currentPositiveRate: currentPeriod?.positiveRatio ?? 0,
        previousPositiveRate: previousPeriod?.positiveRatio ?? null,
      }
    })
    .filter((item) => item.priceBand.trim().length > 0)
    .sort((a, b) => b.currentPositiveRate - a.currentPositiveRate)
}

function normalizeTrendPeriodItem(item: Record<string, unknown>) {
  const period = readString(item, ['period', 'month', 'label', 'date', 'year_month'])

  if (!period) {
    return null
  }

  return {
    period,
    reviewCount:
      readOptionalNumber(item, ['review_count', 'reviewCount', 'reviews', 'total_reviews']) ?? 0,
    positiveReviews:
      readOptionalNumber(item, ['positive_reviews', 'positiveReviews', 'positive_count']) ?? 0,
    negativeReviews:
      readOptionalNumber(item, ['negative_reviews', 'negativeReviews', 'negative_count']) ?? 0,
    positiveRatio: readPositiveRatio(item),
  }
}

function aggregatePeriodSummaries(data: Record<string, unknown>[]) {
  const items = data
    .map((item) => normalizeTrendPeriodItem(item))
    .filter((item): item is TrendPeriodItem => item !== null)

  return aggregateTrendPeriodItems(items)
}

function aggregateTrendPeriodItems(data: TrendPeriodItem[]) {
  const map = new Map<string, TrendPeriodItem>()

  data.forEach((item) => {
    const savedItem =
      map.get(item.period) ??
      {
        period: item.period,
        reviewCount: 0,
        positiveReviews: 0,
        negativeReviews: 0,
        positiveRatio: null,
      }

    savedItem.reviewCount += item.reviewCount
    savedItem.positiveReviews += item.positiveReviews
    savedItem.negativeReviews += item.negativeReviews

    map.set(item.period, savedItem)
  })

  return Array.from(map.values()).map((item) => ({
    ...item,
    positiveRatio:
      item.reviewCount > 0 ? Math.min((item.positiveReviews / item.reviewCount) * 100, 100) : null,
  }))
}

function sortTrendPeriodItems(data: TrendPeriodItem[]) {
  return [...data].sort((a, b) => getPeriodSortTime(a.period) - getPeriodSortTime(b.period))
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

function sortMonthlyTrends(data: MonthlyTrend[]) {
  return [...data].sort((a, b) => getPeriodSortTime(a.period) - getPeriodSortTime(b.period))
}

function getPeriodSortTime(period: string) {
  const date = parseYearMonthToDate(period)

  if (date) {
    return date.getTime()
  }

  return 0
}

function parseYearMonthToDate(period: string) {
  const periodKey = normalizeYearMonthKey(period)

  if (!periodKey) {
    return null
  }

  const [year, month] = periodKey.split('-').map(Number)

  if (!year || !month) {
    return null
  }

  return new Date(year, month - 1, 1)
}

function normalizeYearMonthKey(period: string) {
  const trimmedPeriod = period.trim()
  const yearMonthMatch = trimmedPeriod.match(/^(\d{4})[-./](\d{1,2})/)

  if (!yearMonthMatch) {
    return ''
  }

  const year = Number(yearMonthMatch[1])
  const month = Number(yearMonthMatch[2])

  if (!year || month < 1 || month > 12) {
    return ''
  }

  return `${year}-${String(month).padStart(2, '0')}`
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
