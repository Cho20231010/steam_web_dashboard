import './App.css'

type FeatureCard = {
  title: string
  description: string
  status: string
  link: string
}

const featureCards: FeatureCard[] = [
  {
    title: '웹 대시보드',
    description: '홈, 리뷰 분석, 게임 순위, 인기 그래프, 이용객 분포 화면을 구성하는 프론트엔드 영역입니다.',
    status: 'Frontend',
    link: '#dashboard',
  },
  {
    title: '백엔드 API',
    description: 'Steam 데이터와 분석 결과를 프론트엔드에 전달하기 위한 API 서버 영역입니다.',
    status: 'Backend',
    link: 'https://github.com/20233530-ijs/steam-market-dashboard/tree/feature/backend-api',
  },
  {
    title: '시각화 DB / 분석',
    description: '수집 데이터, 감성분석, 토픽분석, 시각화용 데이터를 준비하는 분석 영역입니다.',
    status: 'ML / Data',
    link: 'https://github.com/20233530-ijs/steam-market-dashboard/tree/feature/ml-analysis',
  },
]

const dashboardPages = [
  '리뷰 감성 분석',
  '게임 순위',
  '인기 그래프',
  '이용객 분포',
]

function App() {
  return (
    <main className="main-page">
      <section className="hero-section">
        <header className="top-nav">
          <div className="nav-brand">
            <span className="brand-dot">HC</span>
            <div>
              <strong>Hidden Coders</strong>
              <p>Steam Market Dashboard</p>
            </div>
          </div>

          <nav className="nav-menu">
            <a href="#overview">소개</a>
            <a href="#dashboard">화면 구성</a>
            <a href="#workflow">구조</a>
            <a href="#project">프로젝트</a>
          </nav>
        </header>

        <div className="hero-grid">
          <div className="hero-text">
            <span className="eyebrow">Steam 데이터 기반 시장 분석</span>

            <h1>
              게임 시장 흐름을
              <br />
              데이터로 한눈에 보는
              <br />
              웹 대시보드
            </h1>

            <p>
              Hidden Coders는 Steam API와 SteamSpy 데이터를 기반으로 인기 게임,
              리뷰 감성, 장르별 흐름, 이용객 분포를 분석하여 게임 시장 트렌드를
              시각적으로 제공하는 대시보드 프로젝트입니다.
            </p>

            <div className="hero-actions">
              <a href="#dashboard" className="primary-button">
                대시보드 구성 보기
              </a>
              <a
                href="https://github.com/20233530-ijs/steam-market-dashboard"
                className="secondary-button"
                target="_blank"
                rel="noreferrer"
              >
                GitHub 저장소 보기
              </a>
            </div>
          </div>

          <div className="hero-visual">
            <div className="logo-card">
              <img src="/hidden-coders-logo.png" alt="Hidden Coders 로고" />
            </div>

            <div className="floating-card card-top">
              <span>평균 긍정 비율</span>
              <strong>78.4%</strong>
            </div>

            <div className="floating-card card-bottom">
              <span>대표 장르</span>
              <strong>RPG</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="metric-section" id="overview">
        <MetricCard title="총 게임 수" value="12,345" desc="분석 대상 게임 데이터" />
        <MetricCard title="총 리뷰 수" value="3,456,789" desc="리뷰 감성 분석 기반" />
        <MetricCard title="주요 분석" value="5 Pages" desc="대시보드 화면 구성" />
        <MetricCard title="프로젝트" value="Hidden Coders" desc="Steam 시장 분석" />
      </section>

      <section className="section-block" id="dashboard">
        <div className="section-title">
          <span>Dashboard Pages</span>
          <h2>메인에서 연결될 화면 구성</h2>
          <p>
            메인 페이지에서 각 분석 화면으로 이동할 수 있도록 구성하고,
            추후 백엔드 API와 분석 데이터를 연결할 수 있는 구조로 설계합니다.
          </p>
        </div>

        <div className="page-grid">
          {dashboardPages.map((page, index) => (
            <article className="page-card" key={page}>
              <div className="page-number">{String(index + 1).padStart(2, '0')}</div>
              <h3>{page}</h3>
              <p>
                {page} 데이터를 카드, 표, 그래프 형태로 시각화하여 사용자가
                빠르게 시장 흐름을 파악할 수 있도록 구성합니다.
              </p>
              <a href={`#page-${index + 1}`}>화면 이동 예정</a>
            </article>
          ))}
        </div>
      </section>

      <section className="section-block" id="workflow">
        <div className="section-title">
          <span>Project Structure</span>
          <h2>프론트엔드 · 백엔드 · 분석 브랜치 연결 구조</h2>
          <p>
            현재 프로젝트는 역할별 브랜치를 나누어 관리하고, 최종적으로는
            프론트엔드 배포 주소에서 백엔드 API와 분석 결과를 불러오는 구조로
            연결할 수 있습니다.
          </p>
        </div>

        <div className="feature-grid">
          {featureCards.map((card) => (
            <a
              className="feature-card"
              href={card.link}
              key={card.title}
              target={card.link.startsWith('http') ? '_blank' : undefined}
              rel={card.link.startsWith('http') ? 'noreferrer' : undefined}
            >
              <span>{card.status}</span>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
              <strong>자세히 보기 →</strong>
            </a>
          ))}
        </div>
      </section>

      <section className="process-section" id="project">
        <div className="process-text">
          <span className="eyebrow">Development Flow</span>
          <h2>수집부터 시각화까지 이어지는 분석 흐름</h2>
          <p>
            Steam 데이터를 수집하고, 리뷰와 게임 정보를 분석한 뒤, 사용자가
            이해하기 쉬운 대시보드 화면으로 제공하는 것을 목표로 합니다.
          </p>
        </div>

        <div className="process-list">
          <ProcessItem step="01" title="데이터 수집" desc="Steam API와 SteamSpy API 기반 게임 데이터 수집" />
          <ProcessItem step="02" title="분석 및 가공" desc="리뷰 감성분석, 장르별 통계, 이용객 분포 데이터 생성" />
          <ProcessItem step="03" title="API 제공" desc="백엔드에서 프론트엔드로 분석 결과 전달" />
          <ProcessItem step="04" title="웹 시각화" desc="React 기반 대시보드에서 표와 그래프로 결과 표현" />
        </div>
      </section>
    </main>
  )
}

function MetricCard({
  title,
  value,
  desc,
}: {
  title: string
  value: string
  desc: string
}) {
  return (
    <article className="metric-card">
      <span>{title}</span>
      <strong>{value}</strong>
      <p>{desc}</p>
    </article>
  )
}

function ProcessItem({
  step,
  title,
  desc,
}: {
  step: string
  title: string
  desc: string
}) {
  return (
    <article className="process-item">
      <span>{step}</span>
      <div>
        <h3>{title}</h3>
        <p>{desc}</p>
      </div>
    </article>
  )
}

export default App