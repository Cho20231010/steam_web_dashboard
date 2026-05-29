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

type RecentAlert = {
  id: string
  gameName: string
  message: string
  timeLabel: string
  type: 'price' | 'review' | 'save'
}

const FAVORITE_TABS: Array<{ id: FavoriteTab; label: string }> = [
  { id: 'wishlist', label: '위시리스트' },
  { id: 'compare', label: '비교' },
  { id: 'price', label: '가격 알림' },
  { id: 'review', label: '리뷰 알림' },
]

function FavoriteGamesPage() {
  const [activeTab, setActiveTab] = useState<FavoriteTab>('wishlist')
  const [favoriteGames, setFavoriteGames] = useState<FavoriteGame[]>([])
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

  const summary = useMemo(() => {
    const priceAlertCount = favoriteGames.filter((game) => game.priceAlertEnabled).length
    const reviewAlertCount = favoriteGames.filter((game) => game.reviewAlertEnabled).length
    const alertActiveRatio =
      favoriteGames.length === 0 ? 0 : ((priceAlertCount + reviewAlertCount) / (favoriteGames.length * 2)) * 100

    return {
      totalCount: favoriteGames.length,
      alertActiveRatio,
      priceAlertCount,
      reviewAlertCount,
    }
  }, [favoriteGames])

  const recentAlerts = useMemo(() => {
    return buildRecentAlerts(favoriteGames)
  }, [favoriteGames])

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
      <div className="favorite-title-row">
        <div>
          <span>8. 관심 게임</span>
          <h1>관심 게임 (위시리스트 & 알림)</h1>
        </div>
      </div>

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

          <FavoriteFeatureGrid />
        </>
      )}

      {activeTab === 'compare' && <ComparePanel games={favoriteGames} />}

      {activeTab === 'price' && (
        <PriceAlertPanel
          games={favoriteGames}
          onTogglePriceAlert={handleTogglePriceAlert}
          onTargetPriceChange={handleTargetPriceChange}
        />
      )}

      {activeTab === 'review' && (
        <ReviewAlertPanel games={favoriteGames} onToggleReviewAlert={handleToggleReviewAlert} />
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
  showAll,
  onToggleShowAll,
  onRemove,
  onTogglePriceAlert,
  onToggleReviewAlert,
}: {
  games: FavoriteGame[]
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
                  <th>가격</th>
                  <th>현재 가격</th>
                  <th>마지막 변경</th>
                  <th>알림</th>
                  <th>관리</th>
                </tr>
              </thead>

              <tbody>
                {visibleGames.map((game) => (
                  <tr key={String(game.gameId)}>
                    <td>
                      <FavoriteGameCell game={game} />
                    </td>

                    <td>
                      <PriceLabel label={game.priceLabel} />
                    </td>

                    <td>
                      <CurrentPriceCell game={game} />
                    </td>

                    <td>{formatDateLabel(game.savedAt)}</td>

                    <td>
                      <div className="favorite-alert-actions">
                        <button
                          type="button"
                          className={`favorite-icon-button ${game.priceAlertEnabled ? 'active' : ''}`}
                          onClick={() => onTogglePriceAlert(game)}
                          aria-label={`${game.name} 가격 알림 전환`}
                        >
                          ₩
                        </button>

                        <button
                          type="button"
                          className={`favorite-icon-button ${game.reviewAlertEnabled ? 'active' : ''}`}
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
                ))}
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
          <p>관심 게임 저장과 알림 설정 내역을 보여줍니다.</p>
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
                  {alert.type === 'price' ? '₩' : alert.type === 'review' ? 'R' : '✓'}
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

function ComparePanel({ games }: { games: FavoriteGame[] }) {
  return (
    <article className="favorite-panel compare-panel">
      <div className="favorite-panel-header">
        <div>
          <h2>관심 게임 비교</h2>
          <p>저장한 관심 게임의 장르, 가격, 알림 상태를 카드 형태로 비교합니다.</p>
        </div>
      </div>

      {games.length === 0 ? (
        <EmptyFavoriteMessage message="비교할 관심 게임이 없습니다." />
      ) : (
        <div className="compare-card-grid">
          {games.map((game) => (
            <div className="compare-card" key={String(game.gameId)}>
              <FavoriteGameImage game={game} variant="large" />

              <strong>{game.name}</strong>

              <dl>
                <div>
                  <dt>장르</dt>
                  <dd>{game.genre || '-'}</dd>
                </div>

                <div>
                  <dt>가격</dt>
                  <dd>{game.priceLabel || '-'}</dd>
                </div>

                <div>
                  <dt>가격 알림</dt>
                  <dd>{game.priceAlertEnabled ? 'ON' : 'OFF'}</dd>
                </div>

                <div>
                  <dt>리뷰 알림</dt>
                  <dd>{game.reviewAlertEnabled ? 'ON' : 'OFF'}</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      )}
    </article>
  )
}

function PriceAlertPanel({
  games,
  onTogglePriceAlert,
  onTargetPriceChange,
}: {
  games: FavoriteGame[]
  onTogglePriceAlert: (game: FavoriteGame) => void
  onTargetPriceChange: (game: FavoriteGame, event: ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <article className="favorite-panel price-alert-panel">
      <div className="favorite-panel-header">
        <div>
          <h2>가격 알림</h2>
          <p>관심 게임별 목표 가격을 입력하고 가격 알림 활성 여부를 관리합니다.</p>
        </div>
      </div>

      {games.length === 0 ? (
        <EmptyFavoriteMessage message="가격 알림을 설정할 관심 게임이 없습니다." />
      ) : (
        <div className="favorite-table-wrap">
          <table className="favorite-table">
            <thead>
              <tr>
                <th>게임</th>
                <th>현재 가격</th>
                <th>목표 가격</th>
                <th>알림</th>
              </tr>
            </thead>

            <tbody>
              {games.map((game) => (
                <tr key={String(game.gameId)}>
                  <td>
                    <FavoriteGameCell game={game} />
                  </td>

                  <td>
                    <PriceLabel label={game.priceLabel} />
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
                    <button
                      type="button"
                      className={`favorite-toggle-button ${game.priceAlertEnabled ? 'active' : ''}`}
                      onClick={() => onTogglePriceAlert(game)}
                    >
                      {game.priceAlertEnabled ? '활성' : '비활성'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  )
}

function ReviewAlertPanel({
  games,
  onToggleReviewAlert,
}: {
  games: FavoriteGame[]
  onToggleReviewAlert: (game: FavoriteGame) => void
}) {
  return (
    <article className="favorite-panel review-alert-panel">
      <div className="favorite-panel-header">
        <div>
          <h2>리뷰 알림</h2>
          <p>관심 게임별 리뷰 알림 활성 여부를 관리합니다.</p>
        </div>
      </div>

      {games.length === 0 ? (
        <EmptyFavoriteMessage message="리뷰 알림을 설정할 관심 게임이 없습니다." />
      ) : (
        <div className="review-alert-list">
          {games.map((game) => (
            <div className="review-alert-item" key={String(game.gameId)}>
              <FavoriteGameCell game={game} />

              <div className="review-alert-info">
                <span className={game.reviewAlertEnabled ? 'favorite-status-badge' : 'favorite-waiting-badge'}>
                  {game.reviewAlertEnabled ? '리뷰 알림 활성' : '리뷰 알림 비활성'}
                </span>
                <p>
                  게임별 감성 분석 API가 연결되면 신규 리뷰, 긍정률 변화, 부정 리뷰 증가
                  등을 알림으로 확장할 수 있습니다.
                </p>
              </div>

              <button
                type="button"
                className={`favorite-toggle-button ${game.reviewAlertEnabled ? 'active' : ''}`}
                onClick={() => onToggleReviewAlert(game)}
              >
                {game.reviewAlertEnabled ? '활성' : '비활성'}
              </button>
            </div>
          ))}
        </div>
      )}
    </article>
  )
}

function FavoriteFeatureGrid() {
  return (
    <div className="favorite-feature-grid">
      <FavoriteFeatureCard
        icon="🏷"
        title="가격 알림"
        description="원하는 가격에 도달하면 관심 게임 목록에서 바로 확인할 수 있어요."
      />

      <FavoriteFeatureCard
        icon="👤"
        title="스포트라이트"
        description="관심 게임을 모아 가격, 장르, 알림 상태를 한눈에 비교해요."
      />

      <FavoriteFeatureCard
        icon="%"
        title="세일 / 핫딜"
        description="할인, 최저가, 시즌 세일 정보를 추적할 수 있도록 확장할 수 있어요."
      />

      <FavoriteFeatureCard
        icon="↗"
        title="가격 / 재고"
        description="가격, DLC, 재고, 가성비 관련 요소를 함께 관리할 수 있어요."
      />
    </div>
  )
}

function FavoriteFeatureCard({
  icon,
  title,
  description,
}: {
  icon: string
  title: string
  description: string
}) {
  return (
    <article className="favorite-feature-card">
      <div className="favorite-feature-icon">{icon}</div>
      <strong>{title}</strong>
      <p>{description}</p>
    </article>
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

function CurrentPriceCell({ game }: { game: FavoriteGame }) {
  if (!game.priceLabel || game.priceLabel === '-') {
    return <span className="favorite-price-empty">-</span>
  }

  return (
    <div className="current-price-cell">
      <PriceLabel label={game.priceLabel} />
      {game.targetPriceLabel && game.targetPriceLabel !== game.priceLabel && (
        <small>목표 {game.targetPriceLabel}</small>
      )}
    </div>
  )
}

function EmptyFavoriteMessage({ message }: { message: string }) {
  return <div className="favorite-empty">{message}</div>
}

function buildRecentAlerts(games: FavoriteGame[]): RecentAlert[] {
  const alerts: RecentAlert[] = []

  games.forEach((game) => {
    alerts.push({
      id: `${game.gameId}-save`,
      gameName: game.name,
      message: '관심 게임으로 등록했어요.',
      timeLabel: formatRelativeTime(game.savedAt),
      type: 'save',
    })

    if (game.priceAlertEnabled) {
      alerts.push({
        id: `${game.gameId}-price`,
        gameName: game.name,
        message: `${game.priceLabel || '-'} 기준 가격 알림이 활성화되어 있어요.`,
        timeLabel: formatRelativeTime(game.savedAt),
        type: 'price',
      })
    }

    if (game.reviewAlertEnabled) {
      alerts.push({
        id: `${game.gameId}-review`,
        gameName: game.name,
        message: '리뷰 변동 알림이 활성화되어 있어요.',
        timeLabel: formatRelativeTime(game.savedAt),
        type: 'review',
      })
    }
  })

  return alerts.slice(0, 24)
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

function formatDateLabel(dateText?: string) {
  if (!dateText) {
    return '-'
  }

  const date = new Date(dateText)

  if (Number.isNaN(date.getTime())) {
    return dateText
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}.${month}.${day}`
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

function buildSteamHeaderImageUrl(gameId: string | number): string {
  const normalizedGameId = String(gameId).trim()

  if (!/^\d+$/.test(normalizedGameId)) {
    return ''
  }

  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${normalizedGameId}/header.jpg`
}

export default FavoriteGamesPage
