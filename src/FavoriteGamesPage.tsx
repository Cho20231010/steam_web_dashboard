import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import './FavoriteGamesPage.css'
import {
  FAVORITE_GAMES_UPDATED_EVENT,
  readFavoriteGames,
  removeFavoriteGame,
  updateFavoriteGame,
  type FavoriteGame,
} from './utils/favoriteGames'

type FavoriteTab = 'wishlist' | 'compare' | 'price' | 'review'

type GenreStatsItem = {
  genre: string
  gameCount: number | null
  averagePrice: number | null
  averagePositiveRatio: number | null
}

type FavoriteBackendInfo = {
  gameId: string
  currentPrice: number | null
  currentPriceLabel: string
  positiveRatio: number | null
  negativeRatio: number | null
  topicKeywords: string[]
  topicCategories: string[]
  genreAveragePrice: number | null
  genreAveragePositiveRatio: number | null
  hasGameDetail: boolean
  hasSentiment: boolean
  hasTopics: boolean
}

type FavoriteInsights = {
  targetSetCount: number
  priceComparableCount: number
  targetReachedCount: number
  genreComparableCount: number
  genreAbovePositiveCount: number
  positiveDominantCount: number
  negativeWarningCount: number
  topicAvailableCount: number
  topKeywords: string[]
}

type RecentAlert = {
  id: string
  gameName: string
  message: string
  timeLabel: string
  type: 'price' | 'genre' | 'review' | 'topic' | 'save'
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

const FAVORITE_TABS: Array<{ id: FavoriteTab; label: string }> = [
  { id: 'wishlist', label: '위시리스트' },
  { id: 'compare', label: '비교' },
  { id: 'price', label: '가격 알림' },
  { id: 'review', label: '리뷰 알림' },
]

function FavoriteGamesPage() {
  const [activeTab, setActiveTab] = useState<FavoriteTab>('wishlist')
  const [favoriteGames, setFavoriteGames] = useState<FavoriteGame[]>([])
  const [genreStats, setGenreStats] = useState<GenreStatsItem[]>([])
  const [backendInfoById, setBackendInfoById] = useState<Record<string, FavoriteBackendInfo>>({})
  const [isInsightLoading, setIsInsightLoading] = useState(false)
  const [insightError, setInsightError] = useState('')
  const [showAllWishlist, setShowAllWishlist] = useState(false)
  const [showAllAlerts, setShowAllAlerts] = useState(false)

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

  useEffect(() => {
    const controller = new AbortController()

    async function loadGenreStats() {
      try {
        const rawData = await safeFetchJson(
          `${API_BASE_URL}/analysis/genre-stats`,
          controller.signal,
        )

        if (controller.signal.aborted) {
          return
        }

        setGenreStats(normalizeGenreStats(rawData))
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('장르 통계 데이터를 불러오지 못했습니다.', error)
          setGenreStats([])
        }
      }
    }

    loadGenreStats()

    return () => {
      controller.abort()
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    async function loadFavoriteBackendInfo() {
      if (favoriteGames.length === 0) {
        setBackendInfoById({})
        setInsightError('')
        return
      }

      try {
        setIsInsightLoading(true)
        setInsightError('')

        const entries = await Promise.all(
          favoriteGames.map(async (game) => {
            const info = await fetchFavoriteBackendInfo(game, genreStats, controller.signal)
            return [String(game.gameId), info] as const
          }),
        )

        if (controller.signal.aborted) {
          return
        }

        setBackendInfoById(Object.fromEntries(entries))
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('관심 게임 보조 데이터를 불러오지 못했습니다.', error)
          setInsightError('일부 백엔드 보조 데이터를 불러오지 못했습니다.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsInsightLoading(false)
        }
      }
    }

    loadFavoriteBackendInfo()

    return () => {
      controller.abort()
    }
  }, [favoriteGames, genreStats])

  const summary = useMemo(() => {
    const priceAlertCount = favoriteGames.filter((game) => game.priceAlertEnabled).length
    const reviewAlertCount = favoriteGames.filter((game) => game.reviewAlertEnabled).length
    const alertActiveRatio =
      favoriteGames.length === 0
        ? 0
        : ((priceAlertCount + reviewAlertCount) / (favoriteGames.length * 2)) * 100

    return {
      totalCount: favoriteGames.length,
      alertActiveRatio,
      priceAlertCount,
      reviewAlertCount,
    }
  }, [favoriteGames])

  const favoriteInsights = useMemo(() => {
    return buildFavoriteInsights(favoriteGames, backendInfoById)
  }, [favoriteGames, backendInfoById])

  const recentAlerts = useMemo(() => {
    return buildRecentAlerts(favoriteGames, backendInfoById)
  }, [favoriteGames, backendInfoById])

  function handleRemoveFavorite(gameId: string | number) {
    const nextFavoriteGames = removeFavoriteGame(gameId)
    setFavoriteGames(nextFavoriteGames)
  }

  function handleTogglePriceAlert(game: FavoriteGame) {
    const nextFavoriteGames = updateFavoriteGame(game.gameId, {
      priceAlertEnabled: !game.priceAlertEnabled,
    })

    setFavoriteGames(nextFavoriteGames)
  }

  function handleToggleReviewAlert(game: FavoriteGame) {
    const nextFavoriteGames = updateFavoriteGame(game.gameId, {
      reviewAlertEnabled: !game.reviewAlertEnabled,
    })

    setFavoriteGames(nextFavoriteGames)
  }

  function handleTargetPriceChange(game: FavoriteGame, event: ChangeEvent<HTMLInputElement>) {
    const nextFavoriteGames = updateFavoriteGame(game.gameId, {
      targetPriceLabel: event.target.value,
    })

    setFavoriteGames(nextFavoriteGames)
  }

  return (
    <section className="favorite-page" aria-label="관심 게임 페이지">
      {isInsightLoading && <div className="favorite-loading-pill">백엔드 데이터 확인 중</div>}

      {insightError && <div className="favorite-error-notice">{insightError}</div>}

      <div className="favorite-tab-bar">
        {FAVORITE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`favorite-tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="favorite-stat-grid">
        <FavoriteStatCard label="저장된 게임 수" value={`${summary.totalCount}개`} />
        <FavoriteStatCard label="알림 활성 비율" value={`${summary.alertActiveRatio.toFixed(1)}%`} />
        <FavoriteStatCard label="가격 알림 · 활성" value={`${summary.priceAlertCount}개`} />
        <FavoriteStatCard label="리뷰 알림" value={`${summary.reviewAlertCount}개`} />
      </div>

      {activeTab === 'wishlist' && (
        <>
          <div className="favorite-main-grid">
            <WishlistPanel
              games={favoriteGames}
              backendInfoById={backendInfoById}
              showAll={showAllWishlist}
              onToggleShowAll={() => setShowAllWishlist((prev) => !prev)}
              onRemove={handleRemoveFavorite}
              onTogglePriceAlert={handleTogglePriceAlert}
              onToggleReviewAlert={handleToggleReviewAlert}
            />

            <RecentAlertsPanel
              alerts={recentAlerts}
              showAll={showAllAlerts}
              onToggleShowAll={() => setShowAllAlerts((prev) => !prev)}
            />
          </div>

          <FavoriteFeatureGrid
            insights={favoriteInsights}
            isLoading={isInsightLoading}
            onMoveTab={setActiveTab}
          />
        </>
      )}

      {activeTab === 'compare' && (
        <ComparePanel games={favoriteGames} backendInfoById={backendInfoById} />
      )}

      {activeTab === 'price' && (
        <PriceAlertPanel
          games={favoriteGames}
          backendInfoById={backendInfoById}
          onTogglePriceAlert={handleTogglePriceAlert}
          onTargetPriceChange={handleTargetPriceChange}
        />
      )}

      {activeTab === 'review' && (
        <ReviewAlertPanel
          games={favoriteGames}
          backendInfoById={backendInfoById}
          onToggleReviewAlert={handleToggleReviewAlert}
        />
      )}
    </section>
  )
}

function FavoriteStatCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="favorite-stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}

function WishlistPanel({
  games,
  backendInfoById,
  showAll,
  onToggleShowAll,
  onRemove,
  onTogglePriceAlert,
  onToggleReviewAlert,
}: {
  games: FavoriteGame[]
  backendInfoById: Record<string, FavoriteBackendInfo>
  showAll: boolean
  onToggleShowAll: () => void
  onRemove: (gameId: string | number) => void
  onTogglePriceAlert: (game: FavoriteGame) => void
  onToggleReviewAlert: (game: FavoriteGame) => void
}) {
  const visibleGames = showAll ? games : games.slice(0, 5)

  return (
    <article className="favorite-panel wishlist-panel">
      <div className="favorite-panel-header">
        <div>
          <h2>위시리스트</h2>
          <p>게임 상세 분석 페이지에서 관심 게임으로 추가한 목록입니다.</p>
        </div>
      </div>

      {games.length === 0 ? (
        <EmptyFavoriteMessage message="아직 저장된 관심 게임이 없습니다. 게임 상세 분석 페이지에서 관심 게임을 추가해보세요." />
      ) : (
        <>
          <div className="favorite-table-wrap">
            <table className="favorite-table">
              <thead>
                <tr>
                  <th>게임</th>
                  <th>저장 가격</th>
                  <th>현재 가격</th>
                  <th>리뷰 반응</th>
                  <th>알림</th>
                  <th>관리</th>
                </tr>
              </thead>

              <tbody>
                {visibleGames.map((game) => {
                  const info = getBackendInfo(game, backendInfoById)

                  return (
                    <tr key={String(game.gameId)}>
                      <td>
                        <FavoriteGameCell game={game} />
                      </td>

                      <td>
                        <PriceLabel label={game.priceLabel} />
                      </td>

                      <td>
                        <CurrentPriceCell game={game} info={info} />
                      </td>

                      <td>
                        <ReviewReactionCell info={info} />
                      </td>

                      <td>
                        <div className="favorite-alert-actions">
                          <button
                            type="button"
                            className={`favorite-icon-button ${
                              game.priceAlertEnabled ? 'active' : ''
                            }`}
                            onClick={() => onTogglePriceAlert(game)}
                            aria-label={`${game.name} 가격 알림 전환`}
                          >
                            ₩
                          </button>

                          <button
                            type="button"
                            className={`favorite-icon-button ${
                              game.reviewAlertEnabled ? 'active' : ''
                            }`}
                            onClick={() => onToggleReviewAlert(game)}
                            aria-label={`${game.name} 리뷰 알림 전환`}
                          >
                            R
                          </button>
                        </div>
                      </td>

                      <td>
                        <button
                          type="button"
                          className="favorite-remove-button"
                          onClick={() => onRemove(game.gameId)}
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {games.length > 5 && (
            <button type="button" className="favorite-more-button" onClick={onToggleShowAll}>
              {showAll ? '접기 ↑' : '모두 보기 →'}
            </button>
          )}
        </>
      )}
    </article>
  )
}

function RecentAlertsPanel({
  alerts,
  showAll,
  onToggleShowAll,
}: {
  alerts: RecentAlert[]
  showAll: boolean
  onToggleShowAll: () => void
}) {
  const visibleAlerts = showAll ? alerts : alerts.slice(0, 4)

  return (
    <article className="favorite-panel recent-alert-panel">
      <div className="favorite-panel-header">
        <div>
          <h2>최근 알림</h2>
          <p>백엔드 데이터 기준 관심 게임 상태를 요약합니다.</p>
        </div>
      </div>

      {alerts.length === 0 ? (
        <EmptyFavoriteMessage message="최근 알림이 없습니다." />
      ) : (
        <>
          <div className="recent-alert-list">
            {visibleAlerts.map((alert) => (
              <div className="recent-alert-item" key={alert.id}>
                <div className={`recent-alert-icon ${alert.type}`}>
                  {alert.type === 'price'
                    ? '₩'
                    : alert.type === 'genre'
                      ? 'G'
                      : alert.type === 'review'
                        ? 'R'
                        : alert.type === 'topic'
                          ? 'T'
                          : '✓'}
                </div>

                <div>
                  <strong>{alert.gameName}</strong>
                  <p>{alert.message}</p>
                </div>

                <span>{alert.timeLabel}</span>
              </div>
            ))}
          </div>

          {alerts.length > 4 && (
            <button type="button" className="favorite-more-button" onClick={onToggleShowAll}>
              {showAll ? '접기 ↑' : '모든 알림 보기 →'}
            </button>
          )}
        </>
      )}
    </article>
  )
}

function ComparePanel({
  games,
  backendInfoById,
}: {
  games: FavoriteGame[]
  backendInfoById: Record<string, FavoriteBackendInfo>
}) {
  return (
    <article className="favorite-panel compare-panel">
      <div className="favorite-panel-header">
        <div>
          <h2>장르 평균 비교</h2>
          <p>관심 게임의 가격과 긍정 비율을 같은 장르 평균 데이터와 비교합니다.</p>
        </div>
      </div>

      {games.length === 0 ? (
        <EmptyFavoriteMessage message="비교할 관심 게임이 없습니다." />
      ) : (
        <div className="compare-card-grid">
          {games.map((game) => {
            const info = getBackendInfo(game, backendInfoById)

            return (
              <div className="compare-card" key={String(game.gameId)}>
                <FavoriteGameImage game={game} variant="large" />

                <strong>{game.name}</strong>

                <dl>
                  <div>
                    <dt>장르</dt>
                    <dd>{game.genre || '-'}</dd>
                  </div>

                  <div>
                    <dt>현재 가격</dt>
                    <dd>{info.currentPriceLabel}</dd>
                  </div>

                  <div>
                    <dt>장르 평균 가격</dt>
                    <dd>{formatPriceLabelFromNumber(info.genreAveragePrice)}</dd>
                  </div>

                  <div>
                    <dt>긍정 비율</dt>
                    <dd>{formatRatioLabel(info.positiveRatio)}</dd>
                  </div>

                  <div>
                    <dt>장르 평균 긍정률</dt>
                    <dd>{formatRatioLabel(info.genreAveragePositiveRatio)}</dd>
                  </div>
                </dl>
              </div>
            )
          })}
        </div>
      )}
    </article>
  )
}

function PriceAlertPanel({
  games,
  backendInfoById,
  onTogglePriceAlert,
  onTargetPriceChange,
}: {
  games: FavoriteGame[]
  backendInfoById: Record<string, FavoriteBackendInfo>
  onTogglePriceAlert: (game: FavoriteGame) => void
  onTargetPriceChange: (game: FavoriteGame, event: ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <article className="favorite-panel price-alert-panel">
      <div className="favorite-panel-header">
        <div>
          <h2>가격 체크</h2>
          <p>관심 게임의 현재 가격과 목표 가격을 비교해 조건에 맞는 게임을 확인합니다.</p>
        </div>
      </div>

      {games.length === 0 ? (
        <EmptyFavoriteMessage message="가격 체크를 진행할 관심 게임이 없습니다." />
      ) : (
        <div className="favorite-table-wrap">
          <table className="favorite-table">
            <thead>
              <tr>
                <th>게임</th>
                <th>현재 가격</th>
                <th>목표 가격</th>
                <th>가격 상태</th>
                <th>알림</th>
              </tr>
            </thead>

            <tbody>
              {games.map((game) => {
                const info = getBackendInfo(game, backendInfoById)
                const priceStatus = getPriceStatus(game, info)

                return (
                  <tr key={String(game.gameId)}>
                    <td>
                      <FavoriteGameCell game={game} />
                    </td>

                    <td>
                      <PriceLabel label={info.currentPriceLabel} />
                    </td>

                    <td>
                      <input
                        className="target-price-input"
                        value={game.targetPriceLabel ?? ''}
                        placeholder="예: $19.99"
                        onChange={(event) => onTargetPriceChange(game, event)}
                      />
                    </td>

                    <td>
                      <span className={priceStatus.className}>{priceStatus.label}</span>
                    </td>

                    <td>
                      <button
                        type="button"
                        className={`favorite-toggle-button ${
                          game.priceAlertEnabled ? 'active' : ''
                        }`}
                        onClick={() => onTogglePriceAlert(game)}
                      >
                        {game.priceAlertEnabled ? '활성' : '비활성'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </article>
  )
}

function ReviewAlertPanel({
  games,
  backendInfoById,
  onToggleReviewAlert,
}: {
  games: FavoriteGame[]
  backendInfoById: Record<string, FavoriteBackendInfo>
  onToggleReviewAlert: (game: FavoriteGame) => void
}) {
  return (
    <article className="favorite-panel review-alert-panel">
      <div className="favorite-panel-header">
        <div>
          <h2>리뷰 반응 및 토픽 이슈 알림</h2>
          <p>
            게임별 감성 분석 API와 토픽 API를 기준으로 긍정 우세, 부정 주의, 주요 키워드를
            확인합니다.
          </p>
        </div>
      </div>

      {games.length === 0 ? (
        <EmptyFavoriteMessage message="리뷰 반응을 확인할 관심 게임이 없습니다." />
      ) : (
        <div className="review-alert-list">
          {games.map((game) => {
            const info = getBackendInfo(game, backendInfoById)
            const reviewStatus = getReviewStatus(info)

            return (
              <div className="review-alert-item" key={String(game.gameId)}>
                <FavoriteGameCell game={game} />

                <div className="review-alert-info">
                  <span className={reviewStatus.className}>{reviewStatus.label}</span>
                  <p>
                    긍정 {formatRatioLabel(info.positiveRatio)} · 부정{' '}
                    {formatRatioLabel(info.negativeRatio)}
                  </p>
                </div>

                <div className="review-topic-keywords">
                  {info.topicKeywords.length === 0 ? (
                    <span className="review-topic-empty">토픽 없음</span>
                  ) : (
                    info.topicKeywords.slice(0, 4).map((keyword) => (
                      <span className="review-topic-chip" key={keyword}>
                        {keyword}
                      </span>
                    ))
                  )}
                </div>

                <button
                  type="button"
                  className={`favorite-toggle-button ${game.reviewAlertEnabled ? 'active' : ''}`}
                  onClick={() => onToggleReviewAlert(game)}
                >
                  {game.reviewAlertEnabled ? '활성' : '비활성'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </article>
  )
}

function FavoriteFeatureGrid({
  insights,
  isLoading,
  onMoveTab,
}: {
  insights: FavoriteInsights
  isLoading: boolean
  onMoveTab: (tab: FavoriteTab) => void
}) {
  return (
    <div className="favorite-feature-grid">
      <FavoriteFeatureCard
        code="₩"
        title="가격 체크"
        metric={
          isLoading
            ? '확인 중'
            : `목표가 도달 ${insights.targetReachedCount}개 / 목표 설정 ${insights.targetSetCount}개`
        }
        description="관심 게임의 현재 가격과 목표 가격을 비교해 조건에 맞는 게임을 확인합니다."
        onClick={() => onMoveTab('price')}
      />

      <FavoriteFeatureCard
        code="G"
        title="장르 평균 비교"
        metric={
          isLoading
            ? '확인 중'
            : `평균 이상 ${insights.genreAbovePositiveCount}개 / 비교 가능 ${insights.genreComparableCount}개`
        }
        description="관심 게임의 가격과 긍정 비율을 같은 장르 평균 데이터와 비교합니다."
        onClick={() => onMoveTab('compare')}
      />

      <FavoriteFeatureCard
        code="R"
        title="리뷰 반응 알림"
        metric={
          isLoading
            ? '확인 중'
            : `긍정 우세 ${insights.positiveDominantCount}개 / 부정 주의 ${insights.negativeWarningCount}개`
        }
        description="게임별 감성 분석 API를 기준으로 긍정 우세 또는 부정 주의 게임을 확인합니다."
        onClick={() => onMoveTab('review')}
      />

      <FavoriteFeatureCard
        code="T"
        title="토픽 이슈 알림"
        metric={
          isLoading
            ? '확인 중'
            : `토픽 확인 ${insights.topicAvailableCount}개 · ${
                insights.topKeywords.length > 0 ? insights.topKeywords.join(', ') : '키워드 없음'
              }`
        }
        description="관심 게임 리뷰에서 자주 언급되는 토픽과 키워드를 확인합니다."
        onClick={() => onMoveTab('review')}
      />
    </div>
  )
}

function FavoriteFeatureCard({
  code,
  title,
  metric,
  description,
  onClick,
}: {
  code: string
  title: string
  metric: string
  description: string
  onClick: () => void
}) {
  return (
    <button type="button" className="favorite-feature-card" onClick={onClick}>
      <div className="favorite-feature-icon">{code}</div>
      <strong>{title}</strong>
      <span>{metric}</span>
      <p>{description}</p>
    </button>
  )
}

function FavoriteGameCell({ game }: { game: FavoriteGame }) {
  return (
    <div className="favorite-game-cell">
      <FavoriteGameImage game={game} variant="small" />

      <div className="favorite-game-info">
        <strong>{game.name}</strong>
        <span>{game.genre || '장르 정보 없음'}</span>
      </div>
    </div>
  )
}

function FavoriteGameImage({
  game,
  variant,
}: {
  game: FavoriteGame
  variant: 'small' | 'large'
}) {
  const [isFailed, setIsFailed] = useState(false)
  const imageUrl = game.image || buildSteamHeaderImageUrl(game.gameId)

  if (!imageUrl || isFailed) {
    return (
      <div className={`favorite-game-image ${variant} fallback`}>
        {game.name.slice(0, 1).toUpperCase()}
      </div>
    )
  }

  return (
    <img
      className={`favorite-game-image ${variant}`}
      src={imageUrl}
      alt={game.name}
      loading="lazy"
      onError={() => setIsFailed(true)}
    />
  )
}

function PriceLabel({ label }: { label: string }) {
  if (!label || label === '-') {
    return <span className="favorite-price-empty">-</span>
  }

  return (
    <span className={isFreePrice(label) ? 'favorite-price-free' : 'favorite-price-label'}>
      {label}
    </span>
  )
}

function CurrentPriceCell({ game, info }: { game: FavoriteGame; info: FavoriteBackendInfo }) {
  return (
    <div className="current-price-cell">
      <PriceLabel label={info.currentPriceLabel} />
      {game.targetPriceLabel && <small>목표 {game.targetPriceLabel}</small>}
    </div>
  )
}

function ReviewReactionCell({ info }: { info: FavoriteBackendInfo }) {
  const reviewStatus = getReviewStatus(info)

  return <span className={reviewStatus.className}>{reviewStatus.label}</span>
}

function EmptyFavoriteMessage({ message }: { message: string }) {
  return <div className="favorite-empty">{message}</div>
}

async function fetchFavoriteBackendInfo(
  game: FavoriteGame,
  genreStats: GenreStatsItem[],
  signal: AbortSignal,
): Promise<FavoriteBackendInfo> {
  const gameId = String(game.gameId)
  const [gameDetailRaw, sentimentRaw, topicsRaw] = await Promise.all([
    safeFetchJson(`${API_BASE_URL}/games/${encodeURIComponent(gameId)}`, signal),
    safeFetchJson(`${API_BASE_URL}/games/${encodeURIComponent(gameId)}/sentiment`, signal),
    safeFetchJson(`${API_BASE_URL}/games/${encodeURIComponent(gameId)}/topics`, signal),
  ])

  const detailRecord = unwrapRecord(gameDetailRaw)
  const sentimentInfo = extractSentimentInfo(sentimentRaw)
  const topicInfo = extractTopicInfo(topicsRaw)
  const genreAverage = findGenreStats(game.genre, genreStats)

  const detailPrice = normalizePrice(
    readOptionalNumber(detailRecord, ['price', 'final_price', 'initial_price', 'price_usd']),
  )

  const fallbackPrice = parsePriceNumber(game.priceLabel)
  const currentPrice = detailPrice ?? fallbackPrice
  const detailPositiveRatio = normalizeRatio(
    readOptionalNumber(detailRecord, [
      'positive_ratio',
      'positiveRatio',
      'avg_positive_ratio',
      'positive_percent',
      'positivePercent',
    ]),
  )

  return {
    gameId,
    currentPrice,
    currentPriceLabel: formatPriceLabelFromNumber(currentPrice, game.priceLabel),
    positiveRatio: sentimentInfo.positiveRatio ?? detailPositiveRatio,
    negativeRatio: sentimentInfo.negativeRatio,
    topicKeywords: topicInfo.keywords,
    topicCategories: topicInfo.categories,
    genreAveragePrice: genreAverage?.averagePrice ?? null,
    genreAveragePositiveRatio: genreAverage?.averagePositiveRatio ?? null,
    hasGameDetail: Object.keys(detailRecord).length > 0,
    hasSentiment: sentimentInfo.hasSentiment,
    hasTopics: topicInfo.keywords.length > 0 || topicInfo.categories.length > 0,
  }
}

async function safeFetchJson(url: string, signal: AbortSignal): Promise<unknown> {
  try {
    const response = await fetch(url, { signal })

    if (!response.ok) {
      return null
    }

    return await response.json()
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      throw error
    }

    return null
  }
}

function buildFavoriteInsights(
  games: FavoriteGame[],
  backendInfoById: Record<string, FavoriteBackendInfo>,
): FavoriteInsights {
  let targetSetCount = 0
  let priceComparableCount = 0
  let targetReachedCount = 0
  let genreComparableCount = 0
  let genreAbovePositiveCount = 0
  let positiveDominantCount = 0
  let negativeWarningCount = 0
  let topicAvailableCount = 0

  const keywordCountMap: Record<string, number> = {}

  games.forEach((game) => {
    const info = getBackendInfo(game, backendInfoById)
    const targetPrice = parsePriceNumber(game.targetPriceLabel ?? '')

    if (targetPrice !== null) {
      targetSetCount += 1
    }

    if (info.currentPrice !== null && targetPrice !== null) {
      priceComparableCount += 1

      if (info.currentPrice <= targetPrice) {
        targetReachedCount += 1
      }
    }

    if (info.positiveRatio !== null && info.genreAveragePositiveRatio !== null) {
      genreComparableCount += 1

      if (info.positiveRatio >= info.genreAveragePositiveRatio) {
        genreAbovePositiveCount += 1
      }
    }

    if (info.positiveRatio !== null && info.positiveRatio >= 70) {
      positiveDominantCount += 1
    }

    if (info.negativeRatio !== null && info.negativeRatio >= 25) {
      negativeWarningCount += 1
    }

    if (info.topicKeywords.length > 0) {
      topicAvailableCount += 1
    }

    info.topicKeywords.forEach((keyword) => {
      keywordCountMap[keyword] = (keywordCountMap[keyword] ?? 0) + 1
    })
  })

  const topKeywords = Object.entries(keywordCountMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([keyword]) => keyword)

  return {
    targetSetCount,
    priceComparableCount,
    targetReachedCount,
    genreComparableCount,
    genreAbovePositiveCount,
    positiveDominantCount,
    negativeWarningCount,
    topicAvailableCount,
    topKeywords,
  }
}

function buildRecentAlerts(
  games: FavoriteGame[],
  backendInfoById: Record<string, FavoriteBackendInfo>,
): RecentAlert[] {
  const alerts: RecentAlert[] = []

  games.forEach((game) => {
    const info = getBackendInfo(game, backendInfoById)
    const priceStatus = getPriceStatus(game, info)

    alerts.push({
      id: `${game.gameId}-save`,
      gameName: game.name,
      message: '관심 게임으로 등록했어요.',
      timeLabel: formatRelativeTime(game.savedAt),
      type: 'save',
    })

    if (priceStatus.type === 'reached') {
      alerts.push({
        id: `${game.gameId}-price`,
        gameName: game.name,
        message: '현재 가격이 목표 가격 조건을 충족했습니다.',
        timeLabel: formatRelativeTime(game.savedAt),
        type: 'price',
      })
    }

    if (info.positiveRatio !== null && info.genreAveragePositiveRatio !== null) {
      if (info.positiveRatio >= info.genreAveragePositiveRatio) {
        alerts.push({
          id: `${game.gameId}-genre`,
          gameName: game.name,
          message: '같은 장르 평균보다 긍정 비율이 높습니다.',
          timeLabel: formatRelativeTime(game.savedAt),
          type: 'genre',
        })
      }
    }

    if (info.negativeRatio !== null && info.negativeRatio >= 25) {
      alerts.push({
        id: `${game.gameId}-review-negative`,
        gameName: game.name,
        message: '부정 리뷰 비율이 높아 주의가 필요합니다.',
        timeLabel: formatRelativeTime(game.savedAt),
        type: 'review',
      })
    } else if (info.positiveRatio !== null && info.positiveRatio >= 70) {
      alerts.push({
        id: `${game.gameId}-review-positive`,
        gameName: game.name,
        message: '감성 분석 기준 긍정 반응이 우세합니다.',
        timeLabel: formatRelativeTime(game.savedAt),
        type: 'review',
      })
    }

    if (info.topicKeywords.length > 0) {
      alerts.push({
        id: `${game.gameId}-topic`,
        gameName: game.name,
        message: `주요 토픽: ${info.topicKeywords.slice(0, 3).join(', ')}`,
        timeLabel: formatRelativeTime(game.savedAt),
        type: 'topic',
      })
    }
  })

  return alerts.slice(0, 30)
}

function getBackendInfo(
  game: FavoriteGame,
  backendInfoById: Record<string, FavoriteBackendInfo>,
): FavoriteBackendInfo {
  const storedInfo = backendInfoById[String(game.gameId)]

  if (storedInfo) {
    return storedInfo
  }

  const fallbackPrice = parsePriceNumber(game.priceLabel)

  return {
    gameId: String(game.gameId),
    currentPrice: fallbackPrice,
    currentPriceLabel: formatPriceLabelFromNumber(fallbackPrice, game.priceLabel),
    positiveRatio: null,
    negativeRatio: null,
    topicKeywords: [],
    topicCategories: [],
    genreAveragePrice: null,
    genreAveragePositiveRatio: null,
    hasGameDetail: false,
    hasSentiment: false,
    hasTopics: false,
  }
}

function getPriceStatus(game: FavoriteGame, info: FavoriteBackendInfo) {
  const targetPrice = parsePriceNumber(game.targetPriceLabel ?? '')

  if (targetPrice === null) {
    return {
      label: '목표가 미설정',
      className: 'favorite-waiting-badge',
      type: 'unset',
    }
  }

  if (info.currentPrice === null) {
    return {
      label: '가격 확인 불가',
      className: 'favorite-waiting-badge',
      type: 'unknown',
    }
  }

  if (info.currentPrice <= targetPrice) {
    return {
      label: '목표 도달',
      className: 'favorite-status-badge',
      type: 'reached',
    }
  }

  return {
    label: '대기 중',
    className: 'favorite-waiting-badge',
    type: 'waiting',
  }
}

function getReviewStatus(info: FavoriteBackendInfo) {
  if (info.negativeRatio !== null && info.negativeRatio >= 25) {
    return {
      label: '부정 주의',
      className: 'favorite-danger-badge',
    }
  }

  if (info.positiveRatio !== null && info.positiveRatio >= 70) {
    return {
      label: '긍정 우세',
      className: 'favorite-status-badge',
    }
  }

  if (info.hasSentiment) {
    return {
      label: '중립/혼합',
      className: 'favorite-neutral-badge',
    }
  }

  return {
    label: '감성 데이터 없음',
    className: 'favorite-waiting-badge',
  }
}

function normalizeGenreStats(rawData: unknown): GenreStatsItem[] {
  const items = unwrapList(rawData)

  return items
    .map((item) => {
      return {
        genre: readString(item, ['genre', 'name', 'label']),
        gameCount: readOptionalNumber(item, ['game_count', 'gameCount', 'count']),
        averagePrice: normalizePrice(readOptionalNumber(item, ['avg_price', 'averagePrice'])),
        averagePositiveRatio: normalizeRatio(
          readOptionalNumber(item, [
            'avg_positive_ratio',
            'averagePositiveRatio',
            'positive_ratio',
          ]),
        ),
      }
    })
    .filter((item) => item.genre)
}

function extractSentimentInfo(rawData: unknown) {
  const record = unwrapRecord(rawData)
  const positiveRatioFromField = normalizeRatio(
    readOptionalNumber(record, ['positive_ratio', 'positiveRatio', 'positive_percent']),
  )
  const negativeRatioFromField = normalizeRatio(
    readOptionalNumber(record, ['negative_ratio', 'negativeRatio', 'negative_percent']),
  )

  const positiveCount = readOptionalNumber(record, ['positive', 'positive_count'])
  const negativeCount = readOptionalNumber(record, ['negative', 'negative_count'])
  const neutralCount = readOptionalNumber(record, ['neutral', 'neutral_count'])
  const totalCount =
    readOptionalNumber(record, ['total', 'total_count']) ??
    calculateTotalCount([positiveCount, negativeCount, neutralCount])

  const positiveRatio =
    positiveRatioFromField ??
    (positiveCount !== null && totalCount !== null && totalCount > 0
      ? (positiveCount / totalCount) * 100
      : null)

  const negativeRatio =
    negativeRatioFromField ??
    (negativeCount !== null && totalCount !== null && totalCount > 0
      ? (negativeCount / totalCount) * 100
      : null)

  return {
    positiveRatio,
    negativeRatio,
    hasSentiment: positiveRatio !== null || negativeRatio !== null,
  }
}

function extractTopicInfo(rawData: unknown) {
  const items = unwrapList(rawData)
  const keywords = new Set<string>()
  const categories = new Set<string>()

  items.forEach((item) => {
    const category = readString(item, ['category', 'topic', 'topic_name', 'label', 'name'])

    if (category) {
      categories.add(category)
    }

    readStringArray(item, ['keywords', 'terms', 'words']).forEach((keyword) => {
      keywords.add(keyword)
    })
  })

  if (keywords.size === 0 && isRecord(rawData)) {
    readStringArray(rawData, ['keywords', 'terms', 'words']).forEach((keyword) => {
      keywords.add(keyword)
    })
  }

  return {
    keywords: Array.from(keywords).slice(0, 12),
    categories: Array.from(categories).slice(0, 8),
  }
}

function findGenreStats(genre: string, genreStats: GenreStatsItem[]) {
  const targetGenre = normalizeGenreForCompare(genre)

  if (!targetGenre) {
    return null
  }

  return (
    genreStats.find((item) => normalizeGenreForCompare(item.genre) === targetGenre) ??
    genreStats.find((item) => {
      const comparedGenre = normalizeGenreForCompare(item.genre)
      return targetGenre.includes(comparedGenre) || comparedGenre.includes(targetGenre)
    }) ??
    null
  )
}

function normalizeGenreForCompare(genre: string) {
  const normalized = genre
    .trim()
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-z가-힣\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  const genreMap: Record<string, string> = {
    액션: 'action',
    어드벤처: 'adventure',
    인디: 'indie',
    시뮬레이션: 'simulation',
    전략: 'strategy',
    캐주얼: 'casual',
    스포츠: 'sports',
    레이싱: 'racing',
    '무료 플레이': 'free to play',
    무료플레이: 'free to play',
    '대규모 멀티플레이': 'massively multiplayer',
    '앞서 해보기': 'early access',
  }

  return genreMap[normalized] ?? normalized
}

function parsePriceNumber(priceLabel: string): number | null {
  const normalized = priceLabel.trim().toLowerCase()

  if (!normalized || normalized === '-') {
    return null
  }

  if (isFreePrice(priceLabel)) {
    return 0
  }

  const dollarMatch = priceLabel.match(/\$\s*([0-9]+(?:\.[0-9]+)?)/)

  if (dollarMatch) {
    return Number(dollarMatch[1])
  }

  const wonMatch = priceLabel.match(/₩\s*([0-9,]+)/)

  if (wonMatch) {
    const wonPrice = Number(wonMatch[1].replace(/,/g, ''))

    if (Number.isFinite(wonPrice)) {
      return wonPrice / 1350
    }
  }

  const numberMatch = priceLabel.match(/([0-9]+(?:\.[0-9]+)?)/)

  if (!numberMatch) {
    return null
  }

  const parsed = Number(numberMatch[1])

  return Number.isFinite(parsed) ? parsed : null
}

function normalizePrice(value: number | null): number | null {
  if (value === null || !Number.isFinite(value)) {
    return null
  }

  if (value === 0) {
    return 0
  }

  if (Number.isInteger(value) && value >= 100) {
    return value / 100
  }

  return value
}

function normalizeRatio(value: number | null): number | null {
  if (value === null || !Number.isFinite(value)) {
    return null
  }

  if (value <= 1) {
    return value * 100
  }

  if (value > 100) {
    return 100
  }

  return value
}

function formatPriceLabelFromNumber(value: number | null, fallback = '-') {
  if (value === null || !Number.isFinite(value)) {
    return fallback || '-'
  }

  if (value <= 0) {
    return '무료'
  }

  return `$${value.toFixed(2)}`
}

function formatRatioLabel(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return '-'
  }

  return `${value.toFixed(1)}%`
}

function formatRelativeTime(dateText?: string) {
  if (!dateText) {
    return '방금 전'
  }

  const date = new Date(dateText)

  if (Number.isNaN(date.getTime())) {
    return '방금 전'
  }

  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 1000 / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMinutes < 1) {
    return '방금 전'
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}분 전`
  }

  if (diffHours < 24) {
    return `${diffHours}시간 전`
  }

  return `${diffDays}일 전`
}

function calculateTotalCount(values: Array<number | null>) {
  const validValues = values.filter((value): value is number => value !== null)

  if (validValues.length === 0) {
    return null
  }

  return validValues.reduce((sum, value) => sum + value, 0)
}

function isFreePrice(priceLabel: string) {
  const normalized = priceLabel.trim().toLowerCase()

  return (
    normalized.includes('무료') ||
    normalized.includes('free') ||
    normalized === '$0' ||
    normalized === '$0.00' ||
    normalized === '₩0'
  )
}

function buildSteamHeaderImageUrl(gameId: string | number): string {
  const normalizedGameId = String(gameId).trim()

  if (!/^\d+$/.test(normalizedGameId)) {
    return ''
  }

  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${normalizedGameId}/header.jpg`
}

function unwrapList(rawData: unknown): Record<string, unknown>[] {
  if (Array.isArray(rawData)) {
    return rawData.filter(isRecord)
  }

  if (!isRecord(rawData)) {
    return []
  }

  const nestedKeys = ['items', 'results', 'data', 'topics', 'games']

  for (const key of nestedKeys) {
    const value = rawData[key]

    if (Array.isArray(value)) {
      return value.filter(isRecord)
    }
  }

  return []
}

function unwrapRecord(rawData: unknown): Record<string, unknown> {
  if (!isRecord(rawData)) {
    return {}
  }

  const nestedKeys = ['item', 'data', 'game', 'result']

  for (const key of nestedKeys) {
    const value = rawData[key]

    if (isRecord(value)) {
      return value
    }
  }

  return rawData
}

function readString(item: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = item[key]

    if (typeof value === 'string' && value.trim()) {
      return value.trim()
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

    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value.replace(/,/g, ''))

      if (Number.isFinite(parsed)) {
        return parsed
      }
    }
  }

  return null
}

function readStringArray(item: Record<string, unknown>, keys: string[]): string[] {
  for (const key of keys) {
    const value = item[key]

    if (Array.isArray(value)) {
      return value
        .map((entry) => {
          if (typeof entry === 'string') {
            return entry.trim()
          }

          if (isRecord(entry)) {
            return readString(entry, ['keyword', 'word', 'name', 'label', 'topic'])
          }

          return ''
        })
        .filter(Boolean)
    }

    if (typeof value === 'string' && value.trim()) {
      return value
        .split(/[|,/]/)
        .map((entry) => entry.trim())
        .filter(Boolean)
    }
  }

  return []
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export default FavoriteGamesPage
