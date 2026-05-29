import { useState } from 'react'
import './App.css'
import HomePage from './HomePage'
import GameDetailPage from './GameDetailPage'
import ReviewPage from './ReviewPage'
import RankingPage from './RankingPage'
import SettingsPage from './SettingsPage'
import TrendComparePage from './TrendComparePage'
import TopicAnalysisPage from './TopicAnalysisPage'
import MarketDistributionPage from './MarketDistributionPage'
import FavoriteGamesPage from './FavoriteGamesPage'

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
        <div className="large-brand">
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

        {activePage === 'gameDetail' && <GameDetailPage />}

        {activePage === 'reviewInsight' && <ReviewPage />}

        {activePage === 'trendCompare' && <TrendComparePage />}

        {activePage === 'topicAnalysis' && <TopicAnalysisPage />}

        {activePage === 'marketDistribution' && <MarketDistributionPage />}

        {activePage === 'search' && <RankingPage />}

        {activePage === 'wishlist' && <FavoriteGamesPage />}

        {activePage === 'settings' && <SettingsPage />}
      </main>
    </div>
  )
}

export default App
