import './App.css'

const topGames = [
  { rank: 1, name: 'Elden Ring', genre: 'RPG', score: '95.2%' },
  { rank: 2, name: "Baldur's Gate 3", genre: 'RPG', score: '93.1%' },
  { rank: 3, name: 'Hogwarts Legacy', genre: 'RPG', score: '89.7%' },
  { rank: 4, name: 'Stardew Valley', genre: 'Simulation', score: '97.3%' },
  { rank: 5, name: 'Cyberpunk 2077', genre: 'RPG', score: '76.8%' },
]

const topics = [
  { label: '게임플레이', value: 18.7 },
  { label: '스토리', value: 15.2 },
  { label: '그래픽', value: 13.6 },
  { label: '최적화', value: 10.4 },
  { label: '사운드', value: 7.8 },
]

function App() {
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-brand logo-only">
          <img src="/hidden-coders-logo.png" alt="Hidden Coders Logo" />
          <strong>Hidden Coders</strong>
        </div>

        <nav className="sidebar-nav">
          <button className="active">홈</button>
          <button>리뷰</button>
          <button>게임 순위</button>
          <button>인기 그래프</button>
          <button>이용객 분포</button>
          <button>설정</button>
        </nav>
      </aside>

      <main className="main">
        <header className="page-header">
          <div>
            <span className="page-badge">Steam 데이터 기반 시장 분석</span>
            <h1>홈 대시보드</h1>
            <p>
              Steam 게임 시장 데이터를 기반으로 인기 게임, 리뷰 감성,
              주요 토픽, 상관관계 인사이트를 한눈에 볼 수 있는 메인 화면입니다.
            </p>
          </div>
        </header>

        <section className="summary-grid">
          <SummaryCard title="총 게임 수" value="12,345" icon="🎮" />
          <SummaryCard title="총 리뷰 수" value="3,456,789" icon="💬" />
          <SummaryCard title="평균 긍정 비율" value="78.4%" icon="📈" sub="+ 2.1%" />
          <SummaryCard title="대표 장르" value="RPG" icon="🏆" />
        </section>

        <section className="content-grid">
          <div className="card">
            <h2>인기 게임 TOP 5</h2>
            <div className="top-list">
              {topGames.map((game) => (
                <div className="top-item" key={game.rank}>
                  <div className="top-rank">{game.rank}</div>
                  <div className="top-info">
                    <strong>{game.name}</strong>
                    <span>{game.genre}</span>
                  </div>
                  <div className="top-score">{game.score}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2>감성 요약</h2>
            <div className="sentiment-wrap">
              <div className="donut-chart">
                <div className="donut-inner">
                  <strong>78.4%</strong>
                  <span>긍정</span>
                </div>
              </div>

              <div className="legend">
                <div>
                  <span className="dot green" />
                  <p>긍정</p>
                  <strong>78.4%</strong>
                </div>
                <div>
                  <span className="dot yellow" />
                  <p>중립</p>
                  <strong>14.5%</strong>
                </div>
                <div>
                  <span className="dot red" />
                  <p>부정</p>
                  <strong>7.1%</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h2>주요 토픽 TOP 5</h2>
            <div className="topic-list">
              {topics.map((topic) => (
                <div className="topic-item" key={topic.label}>
                  <div className="topic-header">
                    <span>{topic.label}</span>
                    <strong>{topic.value}%</strong>
                  </div>
                  <div className="topic-bar">
                    <div
                      className="topic-fill"
                      style={{ width: `${topic.value * 4}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="card insight-card">
          <h2>상관관계 인사이트</h2>
          <table className="insight-table">
            <thead>
              <tr>
                <th>항목 1</th>
                <th>항목 2</th>
                <th>상관계수</th>
                <th>인사이트</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>가격</td>
                <td>긍정률</td>
                <td className="negative">-0.35</td>
                <td>가격이 높아질수록 긍정률이 낮아지는 경향이 있습니다.</td>
              </tr>
              <tr>
                <td>플레이타임</td>
                <td>긍정률</td>
                <td className="positive">0.41</td>
                <td>플레이타임이 길수록 긍정률이 높아지는 경향이 있습니다.</td>
              </tr>
              <tr>
                <td>리뷰 수</td>
                <td>긍정률</td>
                <td className="positive">0.28</td>
                <td>리뷰 수가 많을수록 긍정률이 높아지는 경향이 있습니다.</td>
              </tr>
            </tbody>
          </table>
        </section>
      </main>
    </div>
  )
}

function SummaryCard({
  title,
  value,
  icon,
  sub,
}: {
  title: string
  value: string
  icon: string
  sub?: string
}) {
  return (
    <div className="summary-card">
      <div className="summary-top">
        <span>{title}</span>
        <em>{icon}</em>
      </div>
      <strong>{value}</strong>
      {sub && <p>{sub}</p>}
    </div>
  )
}

export default App