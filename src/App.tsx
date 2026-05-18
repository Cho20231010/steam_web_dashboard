import { useState } from 'react'
import './App.css'
import HomePage from './HomePage'
import ReviewPage from './ReviewPage'
import RankingPage from './RankingPage'
import SettingsPage from './SettingsPage'

type PageType =
  | 'home'
  | 'gameDetail'
  | 'reviewInsight'
  | 'trendCompare'
  | 'topicAnalysis'
  | 'marketDistribution'
  | 'search'
  | 'wishlist'
  | 'settings'

function App() {
  const [activePage, setActivePage] = useState<PageType>('home')

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-brand large-brand">
          <img src="/hidden-coders-logo.png" alt="Hidden Coders Logo" />
        </div>

        <nav className="sidebar-nav">
          <button
            className={activePage === 'home' ? 'active' : ''}
            onClick={() => setActivePage('home')}
            type="button"
          >
            홈
          </button>

          <button
            className={activePage === 'gameDetail' ? 'active' : ''}
            onClick={() => setActivePage('gameDetail')}
            type="button"
          >
            게임 상세 분석
          </button>

          <button
            className={activePage === 'reviewInsight' ? 'active' : ''}
            onClick={() => setActivePage('reviewInsight')}
            type="button"
          >
            리뷰 인사이트
          </button>

          <button
            className={activePage === 'trendCompare' ? 'active' : ''}
            onClick={() => setActivePage('trendCompare')}
            type="button"
          >
            트렌드 비교
          </button>

          <button
            className={activePage === 'topicAnalysis' ? 'active' : ''}
            onClick={() => setActivePage('topicAnalysis')}
            type="button"
          >
            토픽 분석
          </button>

          <button
            className={activePage === 'marketDistribution' ? 'active' : ''}
            onClick={() => setActivePage('marketDistribution')}
            type="button"
          >
            시장 분포
          </button>

          <button
            className={activePage === 'search' ? 'active' : ''}
            onClick={() => setActivePage('search')}
            type="button"
          >
            검색
          </button>

          <button
            className={activePage === 'wishlist' ? 'active' : ''}
            onClick={() => setActivePage('wishlist')}
            type="button"
          >
            관심 게임
          </button>

          <button
            className={activePage === 'settings' ? 'active' : ''}
            onClick={() => setActivePage('settings')}
            type="button"
          >
            설정
          </button>
        </nav>
      </aside>

      <main className="main">
        {activePage === 'home' && <HomePage />}

        {activePage === 'gameDetail' && (
          <section className="status-card">
            <strong>게임 상세 분석 화면 준비 중</strong>
            <p>
              다음 단계에서 /games/{'{game_id}'}, /games/{'{game_id}'}/history,
              /games/{'{game_id}'}/review-trend, /games/{'{game_id}'}/topics API를
              연결해서 구현할 예정입니다.
            </p>
          </section>
        )}

        {activePage === 'reviewInsight' && <ReviewPage />}

        {activePage === 'trendCompare' && (
          <section className="status-card">
            <strong>트렌드 비교 화면 준비 중</strong>
            <p>
              /analysis/trends, /analysis/genre-trends, /analysis/price-trends API를
              연결해서 기간별 비교 화면으로 구성할 수 있습니다.
            </p>
          </section>
        )}

        {activePage === 'topicAnalysis' && (
          <section className="status-card">
            <strong>토픽 분석 화면 준비 중</strong>
            <p>
              /analysis/topics, /analysis/topics/clusters, /analysis/topics/sentiment
              API를 연결해서 토픽별 감성 경향을 보여줄 수 있습니다.
            </p>
          </section>
        )}

        {activePage === 'marketDistribution' && (
          <section className="status-card">
            <strong>시장 분포 화면 준비 중</strong>
            <p>
              /analysis/genre-stats, /analysis/price-band-stats,
              /analysis/platform-stats, /analysis/release-year-stats API를 연결해서
              시장 분포 화면으로 구성할 수 있습니다.
            </p>
          </section>
        )}

        {activePage === 'search' && <RankingPage />}

        {activePage === 'wishlist' && (
          <section className="status-card">
            <strong>관심 게임 화면 준비 중</strong>
            <p>
              /users/me/wishlist, /users/me/wishlist/compare,
              /users/me/notifications API를 X-Client-Id 헤더와 함께 연결하면 실제 관심
              게임과 알림을 반영할 수 있습니다.
            </p>
          </section>
        )}

        {activePage === 'settings' && <SettingsPage />}
      </main>
    </div>
  )
}

export default App
