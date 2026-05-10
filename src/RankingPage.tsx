import { useEffect, useMemo, useState } from 'react'
import { getGames, type Game } from './api'

type SortKey = 'popularity' | 'positiveRate' | 'reviewCount' | 'playtime'
type PaymentFilter = 'all' | 'free' | 'paid'
type PriceFilter = 'all' | 'free' | 'under10000' | '10000to30000' | 'over30000'

type RankingGame = {
  id: string
  name: string
  genre: string
  isFree: boolean
  priceValue: number
  priceLabel: string
  ownersLabel: string
  ownersValue: number
  positiveReviews: number
  negativeReviews: number
  neutralReviews: number
  totalReviews: number
  positiveRate: number
  averagePlaytime: number
  popularityValue: number
}

function RankingPage() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const [genreFilter, setGenreFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all')
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('popularity')

  useEffect(() => {
    async function loadGames() {
      try {
        setLoading(true)
        setErrorMessage('')

        const result = await getGames()
        setGames(Array.isArray(result) ? result : [])
      } catch (error) {
        console.error(error)
        setErrorMessage('게임 순위 데이터를 불러오지 못했습니다.')
      } finally {
        setLoading(false)
      }
    }

    loadGames()
  }, [])

  const normalizedGames = useMemo(() => {
    return games.map((game, index) => normalizeRankingGame(game, index))
  }, [games])

  const genreOptions = useMemo(() => {
    return Array.from(
      new Set(
        normalizedGames
          .map((game) => game.genre)
          .filter((genre) => genre && genre !== '장르 없음'),
      ),
    ).sort((a, b) => a.localeCompare(b))
  }, [normalizedGames])

  const filteredGames = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase()

    return normalizedGames.filter((game) => {
      const matchesGenre =
        genreFilter === 'all' ? true : game.genre === genreFilter

      const matchesPayment =
        paymentFilter === 'all'
          ? true
          : paymentFilter === 'free'
            ? game.isFree
            : !game.isFree

      const matchesPrice = (() => {
        if (priceFilter === 'all') return true
        if (priceFilter === 'free') return game.isFree || game.priceValue === 0
        if (priceFilter === 'under10000') {
          return game.priceValue > 0 && game.priceValue < 10000
        }
        if (priceFilter === '10000to30000') {
          return game.priceValue >= 10000 && game.priceValue <= 30000
        }
        if (priceFilter === 'over30000') return game.priceValue > 30000
        return true
      })()

      const matchesKeyword = keyword
        ? game.name.toLowerCase().includes(keyword)
        : true

      return matchesGenre && matchesPayment && matchesPrice && matchesKeyword
    })
  }, [normalizedGames, genreFilter, paymentFilter, priceFilter, searchKeyword])

  const sortedGames = useMemo(() => {
    const copied = [...filteredGames]

    copied.sort((a, b) => {
      if (sortKey === 'popularity') {
        if (b.popularityValue !== a.popularityValue) {
          return b.popularityValue - a.popularityValue
        }

        return b.totalReviews - a.totalReviews
      }

      if (sortKey === 'positiveRate') {
        if (b.positiveRate !== a.positiveRate) {
          return b.positiveRate - a.positiveRate
        }

        return b.totalReviews - a.totalReviews
      }

      if (sortKey === 'reviewCount') {
        if (b.totalReviews !== a.totalReviews) {
          return b.totalReviews - a.totalReviews
        }

        return b.positiveRate - a.positiveRate
      }

      if (sortKey === 'playtime') {
        if (b.averagePlaytime !== a.averagePlaytime) {
          return b.averagePlaytime - a.averagePlaytime
        }

        return b.totalReviews - a.totalReviews
      }

      return 0
    })

    return copied
  }, [filteredGames, sortKey])

  const visibleGames = useMemo(() => {
    return sortedGames.slice(0, 10)
  }, [sortedGames])

  if (loading) {
    return (
      <section className="ranking-status-card">
        <strong>게임 순위 데이터를 불러오는 중입니다...</strong>
        <p>백엔드 API에서 게임 목록을 가져오고 있습니다.</p>
      </section>
    )
  }

  if (errorMessage) {
    return (
      <section className="ranking-status-card error">
        <strong>데이터 로드 실패</strong>
        <p>{errorMessage}</p>
      </section>
    )
  }

  return (
    <div className="ranking-page">
      <section className="ranking-filter-card">
        <div className="ranking-filter-grid">
          <div className="ranking-filter-field">
            <label>장르</label>
            <select
              value={genreFilter}
              onChange={(event) => setGenreFilter(event.target.value)}
            >
              <option value="all">전체</option>
              {genreOptions.map((genre) => (
                <option key={genre} value={genre}>
                  {genre}
                </option>
              ))}
            </select>
          </div>

          <div className="ranking-filter-field">
            <label>유료/무료</label>
            <select
              value={paymentFilter}
              onChange={(event) =>
                setPaymentFilter(event.target.value as PaymentFilter)
              }
            >
              <option value="all">전체</option>
              <option value="free">무료</option>
              <option value="paid">유료</option>
            </select>
          </div>

          <div className="ranking-filter-field">
            <label>가격대</label>
            <select
              value={priceFilter}
              onChange={(event) =>
                setPriceFilter(event.target.value as PriceFilter)
              }
            >
              <option value="all">전체</option>
              <option value="free">무료</option>
              <option value="under10000">1만원 미만</option>
              <option value="10000to30000">1만원 ~ 3만원</option>
              <option value="over30000">3만원 초과</option>
            </select>
          </div>

          <div className="ranking-filter-search">
            <label>검색</label>
            <input
              type="text"
              value={searchKeyword}
              onChange={(event) => setSearchKeyword(event.target.value)}
              placeholder="게임 검색"
            />
          </div>
        </div>

        <div className="ranking-sort-row">
          <span className="ranking-sort-label">정렬 기준</span>

          <button
            className={sortKey === 'popularity' ? 'active' : ''}
            onClick={() => setSortKey('popularity')}
            type="button"
          >
            인기순
          </button>

          <button
            className={sortKey === 'positiveRate' ? 'active' : ''}
            onClick={() => setSortKey('positiveRate')}
            type="button"
          >
            긍정률순
          </button>

          <button
            className={sortKey === 'reviewCount' ? 'active' : ''}
            onClick={() => setSortKey('reviewCount')}
            type="button"
          >
            리뷰수순
          </button>

          <button
            className={sortKey === 'playtime' ? 'active' : ''}
            onClick={() => setSortKey('playtime')}
            type="button"
          >
            플레이타임순
          </button>
        </div>
      </section>

      <section className="ranking-table-card">
        <div className="ranking-table-wrap">
          <table className="ranking-table">
            <thead>
              <tr>
                <th>순위</th>
                <th>게임명</th>
                <th>장르</th>
                <th>가격</th>
                <th>보유자 구간</th>
                <th>긍정 리뷰</th>
                <th>부정 리뷰</th>
                <th>긍정률</th>
              </tr>
            </thead>

            <tbody>
              {visibleGames.length > 0 ? (
                visibleGames.map((game, index) => (
                  <tr key={game.id}>
                    <td>{index + 1}</td>

                    <td className="ranking-game-name-cell">
                      <span className="ranking-game-name" title={game.name}>
                        {game.name}
                      </span>
                    </td>

                    <td>{game.genre}</td>
                    <td>{game.priceLabel}</td>
                    <td>{game.ownersLabel}</td>
                    <td>{formatNumber(game.positiveReviews)}</td>
                    <td>{formatNumber(game.negativeReviews)}</td>
                    <td className="ranking-positive-rate">
                      {game.positiveRate.toFixed(1)}%
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="ranking-empty-row">
                    조건에 맞는 게임이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function normalizeRankingGame(game: Game, index: number): RankingGame {
  const record = game as Record<string, unknown>

  const id = String(getGameId(record) ?? index)
  const name = getGameName(record)
  const genre = getPrimaryGenre(record)

  const positiveReviews = toNumber(
    readFirst(record, ['positive_reviews', 'positiveReviewCount', 'positive']),
  )

  const negativeReviews = toNumber(
    readFirst(record, ['negative_reviews', 'negativeReviewCount', 'negative']),
  )

  const neutralReviews = toNumber(
    readFirst(record, ['neutral_reviews', 'neutralReviewCount', 'neutral']),
  )

  const totalReviews =
    toNumber(
      readFirst(record, ['review_count', 'total_reviews', 'totalReviews', 'total']),
    ) ||
    positiveReviews + negativeReviews + neutralReviews

  const priceValue = normalizePriceValue(record)
  const isFree = getIsFree(record, priceValue)

  const priceLabel = isFree ? '무료' : `₩ ${formatNumber(priceValue)}`
  const ownersValue = extractOwnersValue(record)
  const ownersLabel = extractOwnersLabel(record)

  const positiveRate =
    totalReviews > 0 ? (positiveReviews / totalReviews) * 100 : 0

  const averagePlaytime = toNumber(
    readFirst(record, ['average_playtime', 'avg_playtime', 'playtime_forever']),
  )

  const popularityValue =
    toNumber(
      readFirst(record, ['popularity_score', 'ccu', 'concurrent_users']),
    ) ||
    ownersValue ||
    totalReviews

  return {
    id,
    name,
    genre,
    isFree,
    priceValue,
    priceLabel,
    ownersLabel,
    ownersValue,
    positiveReviews,
    negativeReviews,
    neutralReviews,
    totalReviews,
    positiveRate,
    averagePlaytime,
    popularityValue,
  }
}

function getGameId(record: Record<string, unknown>) {
  return readFirst(record, ['game_id', 'id', 'app_id', 'appid', 'steam_appid'])
}

function getGameName(record: Record<string, unknown>) {
  return String(readFirst(record, ['name', 'title']) ?? '이름 없음')
}

function getPrimaryGenre(record: Record<string, unknown>) {
  const rawGenres = record.genres
  const rawGenre = record.genre

  if (Array.isArray(rawGenres) && rawGenres.length > 0) {
    return String(rawGenres[0])
  }

  if (typeof rawGenres === 'string' && rawGenres.trim()) {
    return rawGenres.split(',')[0].trim()
  }

  if (typeof rawGenre === 'string' && rawGenre.trim()) {
    return rawGenre.split(',')[0].trim()
  }

  return '장르 없음'
}

function getIsFree(record: Record<string, unknown>, priceValue: number) {
  const raw = readFirst(record, ['is_free', 'free', 'isFree'])

  if (typeof raw === 'boolean') return raw
  if (priceValue === 0) return true

  const genre = getPrimaryGenre(record).toLowerCase()
  return genre.includes('free')
}

function normalizePriceValue(record: Record<string, unknown>) {
  const rawPrice = toNumber(
    readFirst(record, ['price', 'price_value', 'final_price', 'initial_price']),
  )

  if (rawPrice <= 0) return 0

  if (rawPrice > 0 && rawPrice < 1000) {
    return Math.round(rawPrice * 1000)
  }

  return Math.round(rawPrice)
}

function extractOwnersLabel(record: Record<string, unknown>) {
  const directText = readFirst(record, [
    'owners_text',
    'owners_range',
    'estimated_owners',
    'owners',
  ])

  if (typeof directText === 'string' && directText.trim()) {
    return normalizeOwnersText(directText)
  }

  const ownersValue = extractOwnersValue(record)
  if (ownersValue <= 0) return '-'

  if (ownersValue >= 1_000_000) {
    return `${Math.floor(ownersValue / 1_000_000)}M+`
  }

  if (ownersValue >= 1_000) {
    return `${Math.floor(ownersValue / 1_000)}K+`
  }

  return `${formatNumber(ownersValue)}+`
}

function extractOwnersValue(record: Record<string, unknown>) {
  const numericValue = toNumber(
    readFirst(record, ['owners_value', 'owners_count']),
  )

  if (numericValue > 0) return numericValue

  const textValue = readFirst(record, [
    'owners_text',
    'owners_range',
    'estimated_owners',
    'owners',
  ])

  if (typeof textValue !== 'string') return 0

  const cleaned = textValue.replace(/,/g, '').trim()

  if (cleaned.includes('..')) {
    const parts = cleaned.split('..').map((part) => Number(part.trim()))
    const last = parts[parts.length - 1]
    return Number.isFinite(last) ? last : 0
  }

  const millionMatch = cleaned.match(/(\d+)\s*M\+?/i)
  if (millionMatch) {
    return Number(millionMatch[1]) * 1_000_000
  }

  const thousandMatch = cleaned.match(/(\d+)\s*K\+?/i)
  if (thousandMatch) {
    return Number(thousandMatch[1]) * 1_000
  }

  const plain = Number(cleaned)
  return Number.isFinite(plain) ? plain : 0
}

function normalizeOwnersText(value: string) {
  const cleaned = value.trim()

  if (cleaned.includes('..')) {
    const parts = cleaned.split('..').map((part) => part.trim())
    const upper = Number(parts[parts.length - 1].replace(/,/g, ''))

    if (Number.isFinite(upper) && upper >= 1_000_000) {
      return `${Math.floor(upper / 1_000_000)}M+`
    }

    if (Number.isFinite(upper) && upper >= 1_000) {
      return `${Math.floor(upper / 1_000)}K+`
    }
  }

  return cleaned
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

function toNumber(value: unknown) {
  if (typeof value === 'number') return value

  if (typeof value === 'string') {
    const parsed = Number(value.replaceAll(',', '').replace('%', '').trim())
    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

function formatNumber(value: number) {
  return Math.round(value).toLocaleString()
}

export default RankingPage
