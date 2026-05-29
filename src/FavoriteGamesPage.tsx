import { useEffect, useMemo, useState } from 'react'
import './FavoriteGamesPage.css'
import {
  FAVORITE_GAMES_UPDATED_EVENT,
  readFavoriteGames,
  removeFavoriteGame,
  type FavoriteGame,
} from './utils/favoriteGames'

type FavoriteTab = 'wishlist' | 'compare' | 'price' | 'review'

const FAVORITE_TABS: Array<{ id: FavoriteTab; label: string }> = [
  { id: 'wishlist', label: '위시리스트' },
  { id: 'compare', label: '비교' },
  { id: 'price', label: '가격 알림' },
  { id: 'review', label: '리뷰 알림' },
]

function FavoriteGamesPage() {
  const [activeTab, setActiveTab] = useState<FavoriteTab>('wishlist')
  const [favoriteGames, setFavoriteGames] = useState<FavoriteGame[]>([])

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
    const freeGameCount = favoriteGames.filter((game) => isFreePrice(game.priceLabel)).length
    const paidGameCount = favoriteGames.length - freeGameCount
    const topGenre = getTopGenre(favoriteGames)

    return {
      totalCount: favoriteGames.length,
      freeGameCount,
      paidGameCount,
      topGenre,
    }
  }, [favoriteGames])

  function handleRemoveFavorite(gameId: string | number) {
    const nextFavoriteGames = removeFavoriteGame(gameId)
    setFavoriteGames(nextFavoriteGames)
  }

  return (
    <section className="favorite-page" aria-label="관심 게임 페이지">
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
        <FavoriteStatCard label="유료 게임" value={`${summary.paidGameCount}개`} />
        <FavoriteStatCard label="무료 게임" value={`${summary.freeGameCount}개`} />
        <FavoriteStatCard label="대표 장르" value={summary.topGenre} />
      </div>

      {activeTab === 'wishlist' && (
        <div className="favorite-content-grid">
          <WishlistPanel games={favoriteGames} onRemove={handleRemoveFavorite} />
          <RecentPanel games={favoriteGames} />
        </div>
      )}

      {activeTab === 'compare' && <ComparePanel games={favoriteGames} />}

      {activeTab === 'price' && (
        <div className="favorite-content-grid">
          <PriceAlertPanel games={favoriteGames} />
          <GuidePanel
            title="가격 알림 안내"
            description="현재는 관심 게임으로 저장된 가격 표시값을 보여주는 단계입니다. 실제 가격 변동 알림은 백엔드 가격 추적 API가 연결되면 자동 계산할 수 있습니다."
          />
        </div>
      )}

      {activeTab === 'review' && (
        <div className="favorite-content-grid">
          <ReviewAlertPanel games={favoriteGames} />
          <GuidePanel
            title="리뷰 알림 안내"
            description="현재 관심 게임 데이터에는 리뷰 수와 긍정 비율이 함께 저장되어 있지 않습니다. 게임별 리뷰 분석 API가 연결되면 리뷰 변동 알림으로 확장할 수 있습니다."
          />
        </div>
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
  onRemove,
}: {
  games: FavoriteGame[]
  onRemove: (gameId: string | number) => void
}) {
  return (
    <article className="favorite-panel wishlist-panel">
      <div className="favorite-panel-header">
        <div>
          <h2>위시리스트</h2>
          <p>게임 상세 분석 페이지에서 관심 게임으로 추가한 목록입니다.</p>
        </div>
      </div>

      {games.length === 0 ? (
        <EmptyFavoriteMessage message="아직 저장된 관심 게임이 없습니다." />
      ) : (
        <div className="favorite-table-wrap">
          <table className="favorite-table">
            <thead>
              <tr>
                <th>게임</th>
                <th>장르</th>
                <th>가격</th>
                <th>상태</th>
                <th>관리</th>
              </tr>
            </thead>

            <tbody>
              {games.map((game) => (
                <tr key={String(game.gameId)}>
                  <td>
                    <FavoriteGameCell game={game} />
                  </td>
                  <td>{game.genre || '-'}</td>
                  <td>
                    <PriceLabel label={game.priceLabel} />
                  </td>
                  <td>
                    <span className="favorite-status-badge">저장됨</span>
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
      )}
    </article>
  )
}

function RecentPanel({ games }: { games: FavoriteGame[] }) {
  const recentGames = games.slice(0, 5)

  return (
    <article className="favorite-panel recent-panel">
      <div className="favorite-panel-header">
        <div>
          <h2>최근 저장</h2>
          <p>최근 관심 게임으로 추가한 목록입니다.</p>
        </div>
      </div>

      {recentGames.length === 0 ? (
        <EmptyFavoriteMessage message="최근 저장된 게임이 없습니다." />
      ) : (
        <div className="recent-favorite-list">
          {recentGames.map((game, index) => (
            <div className="recent-favorite-item" key={String(game.gameId)}>
              <div className="recent-favorite-icon">{index + 1}</div>

              <div>
                <strong>{game.name}</strong>
                <p>{game.genre || '장르 정보 없음'}</p>
              </div>

              <span>{game.priceLabel || '-'}</span>
            </div>
          ))}
        </div>
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
          <p>저장한 관심 게임의 장르와 가격 정보를 카드 형태로 비교합니다.</p>
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
                  <dt>게임 ID</dt>
                  <dd>{String(game.gameId)}</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      )}
    </article>
  )
}

function PriceAlertPanel({ games }: { games: FavoriteGame[] }) {
  return (
    <article className="favorite-panel wishlist-panel">
      <div className="favorite-panel-header">
        <div>
          <h2>가격 알림</h2>
          <p>관심 게임의 현재 저장 가격을 기준으로 보여줍니다.</p>
        </div>
      </div>

      {games.length === 0 ? (
        <EmptyFavoriteMessage message="가격 알림을 확인할 관심 게임이 없습니다." />
      ) : (
        <div className="favorite-table-wrap">
          <table className="favorite-table">
            <thead>
              <tr>
                <th>게임</th>
                <th>현재 가격</th>
                <th>알림 상태</th>
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
                    <span className="favorite-waiting-badge">연동 대기</span>
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

function ReviewAlertPanel({ games }: { games: FavoriteGame[] }) {
  return (
    <article className="favorite-panel wishlist-panel">
      <div className="favorite-panel-header">
        <div>
          <h2>리뷰 알림</h2>
          <p>리뷰 변동 알림 API가 연결되면 관심 게임별 리뷰 변화를 표시할 수 있습니다.</p>
        </div>
      </div>

      {games.length === 0 ? (
        <EmptyFavoriteMessage message="리뷰 알림을 확인할 관심 게임이 없습니다." />
      ) : (
        <div className="review-alert-list">
          {games.map((game) => (
            <div className="review-alert-item" key={String(game.gameId)}>
              <FavoriteGameCell game={game} />

              <div className="review-alert-info">
                <span className="favorite-waiting-badge">리뷰 API 연결 전</span>
                <p>게임별 감성 분석 또는 리뷰 통계 API가 연결되면 이곳에 알림을 표시합니다.</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  )
}

function GuidePanel({ title, description }: { title: string; description: string }) {
  return (
    <article className="favorite-panel guide-panel">
      <div className="favorite-panel-header">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>

      <div className="guide-box">
        <strong>현재 저장 방식</strong>
        <p>
          관심 게임은 브라우저의 localStorage에 저장됩니다. 같은 브라우저에서는 새로고침
          후에도 유지되지만, 다른 기기나 다른 브라우저와 자동 동기화되지는 않습니다.
        </p>
      </div>
    </article>
  )
}

function FavoriteGameCell({ game }: { game: FavoriteGame }) {
  return (
    <div className="favorite-game-cell">
      <FavoriteGameImage game={game} variant="small" />

      <div className="favorite-game-info">
        <strong>{game.name}</strong>
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
  if (!label) {
    return <span className="favorite-price-empty">-</span>
  }

  return (
    <span className={isFreePrice(label) ? 'favorite-price-free' : 'favorite-price-label'}>
      {label}
    </span>
  )
}

function EmptyFavoriteMessage({ message }: { message: string }) {
  return <div className="favorite-empty">{message}</div>
}

function getTopGenre(games: FavoriteGame[]) {
  if (games.length === 0) {
    return '-'
  }

  const genreCountMap = games.reduce<Record<string, number>>((acc, game) => {
    const genre = game.genre || '기타'
    acc[genre] = (acc[genre] ?? 0) + 1
    return acc
  }, {})

  return Object.entries(genreCountMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '-'
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

export default FavoriteGamesPage
