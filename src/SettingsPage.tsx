import { useEffect, useMemo, useState } from 'react'
import './SettingsPage.css'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  'https://steam-market-dashboard-production.up.railway.app'

type ConnectionStatus = 'idle' | 'checking' | 'success' | 'error'
type ThemeMode = '라이트 모드' | '다크 모드'

function SettingsPage() {
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>('idle')
  const [lastCheckedAt, setLastCheckedAt] = useState('-')

  const [refreshCycle, setRefreshCycle] = useState('수동 갱신')
  const [defaultPage, setDefaultPage] = useState('홈')
  const [defaultSort, setDefaultSort] = useState('인기순')
  const [defaultFilter, setDefaultFilter] = useState('전체 게임')
  const [currency, setCurrency] = useState('KRW (₩)')
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const savedTheme = localStorage.getItem('steam-dashboard-theme')

    if (savedTheme === '다크 모드') {
      return '다크 모드'
    }

    return '라이트 모드'
  })

  const [notifyDataUpdate, setNotifyDataUpdate] = useState(true)
  const [notifyReviewIncrease, setNotifyReviewIncrease] = useState(true)
  const [notifyPriceChange, setNotifyPriceChange] = useState(false)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const connectionLabel = useMemo(() => {
    if (connectionStatus === 'checking') return '확인 중'
    if (connectionStatus === 'success') return '정상'
    if (connectionStatus === 'error') return '오류'
    return '대기'
  }, [connectionStatus])

  const connectionClassName = useMemo(() => {
    if (connectionStatus === 'success') return 'settings-badge success'
    if (connectionStatus === 'error') return 'settings-badge error'
    if (connectionStatus === 'checking') return 'settings-badge checking'
    return 'settings-badge idle'
  }, [connectionStatus])

  async function handleConnectionTest() {
    try {
      setConnectionStatus('checking')

      const response = await fetch(`${API_BASE_URL}/health`)

      if (!response.ok) {
        throw new Error('API 연결 실패')
      }

      setConnectionStatus('success')
      setLastCheckedAt(formatDateTime(new Date()))
    } catch (error) {
      console.error(error)
      setConnectionStatus('error')
      setLastCheckedAt(formatDateTime(new Date()))
    }
  }

  function handleThemeChange(nextTheme: ThemeMode) {
    setTheme(nextTheme)
    applyTheme(nextTheme)
  }

  function handleReset() {
    setRefreshCycle('수동 갱신')
    setDefaultPage('홈')
    setDefaultSort('인기순')
    setDefaultFilter('전체 게임')
    setCurrency('KRW (₩)')
    setTheme('라이트 모드')
    applyTheme('라이트 모드')
    setNotifyDataUpdate(true)
    setNotifyReviewIncrease(true)
    setNotifyPriceChange(false)
    setConnectionStatus('idle')
    setLastCheckedAt('-')
  }

  function handleSave() {
    localStorage.setItem('steam-dashboard-theme', theme)
    alert('설정이 저장되었습니다.')
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <div>
          <h1>설정</h1>
          <p>서비스 환경과 데이터 표시 방식을 설정하세요.</p>
        </div>
      </div>

      <div className="settings-grid">
        <section className="settings-card api-card">
          <div className="settings-card-title">
            <div className="settings-icon blue">🔗</div>
            <div>
              <h2>API 연결 상태</h2>
              <p>백엔드 API 연결 상태를 확인하고 관리합니다.</p>
            </div>
          </div>

          <div className="settings-field-group">
            <label>API 베이스 URL</label>
            <div className="settings-url-box">
              <span>{API_BASE_URL}</span>
            </div>
          </div>

          <div className="settings-status-list">
            <div className="settings-status-row">
              <span>연결 상태</span>
              <strong className={connectionClassName}>{connectionLabel}</strong>
            </div>

            <div className="settings-status-row">
              <span>최근 연결 확인</span>
              <strong>{lastCheckedAt}</strong>
            </div>

            <div className="settings-status-row">
              <span>사용 API</span>
              <strong>Steam Dashboard API</strong>
            </div>
          </div>

          <button
            className="settings-outline-button"
            onClick={handleConnectionTest}
            type="button"
            disabled={connectionStatus === 'checking'}
          >
            {connectionStatus === 'checking' ? '연결 확인 중...' : '연결 테스트'}
          </button>
        </section>

        <section className="settings-card">
          <div className="settings-card-title">
            <div className="settings-icon green">🔄</div>
            <div>
              <h2>데이터 갱신 설정</h2>
              <p>데이터를 언제, 어떤 방식으로 갱신할지 설정합니다.</p>
            </div>
          </div>

          <div className="settings-field-group">
            <label>자동 갱신 주기</label>
            <select
              value={refreshCycle}
              onChange={(event) => setRefreshCycle(event.target.value)}
            >
              <option>수동 갱신</option>
              <option>매 1시간</option>
              <option>매 6시간</option>
              <option>매 12시간</option>
              <option>매 24시간</option>
            </select>
          </div>

          <div className="settings-info-box">
            <span>마지막 데이터 업데이트</span>
            <strong>2024.05.01 10:00</strong>
          </div>

          <button className="settings-outline-button" type="button">
            데이터 새로고침
          </button>
        </section>

        <section className="settings-card">
          <div className="settings-card-title">
            <div className="settings-icon purple">📊</div>
            <div>
              <h2>대시보드 기본 설정</h2>
              <p>처음 열리는 화면과 기본 정렬 기준을 설정합니다.</p>
            </div>
          </div>

          <div className="settings-form-grid">
            <div className="settings-field-group">
              <label>기본 페이지</label>
              <select
                value={defaultPage}
                onChange={(event) => setDefaultPage(event.target.value)}
              >
                <option>홈</option>
                <option>리뷰</option>
                <option>게임 순위</option>
                <option>인기 그래프</option>
                <option>이용객 분포</option>
              </select>
            </div>

            <div className="settings-field-group">
              <label>기본 정렬 기준</label>
              <select
                value={defaultSort}
                onChange={(event) => setDefaultSort(event.target.value)}
              >
                <option>인기순</option>
                <option>긍정률순</option>
                <option>리뷰수순</option>
                <option>플레이타임순</option>
              </select>
            </div>

            <div className="settings-field-group">
              <label>기본 필터</label>
              <select
                value={defaultFilter}
                onChange={(event) => setDefaultFilter(event.target.value)}
              >
                <option>전체 게임</option>
                <option>무료 게임</option>
                <option>유료 게임</option>
                <option>상위 리뷰 게임</option>
              </select>
            </div>

            <div className="settings-field-group">
              <label>표시 단위</label>
              <select
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
              >
                <option>KRW (₩)</option>
                <option>USD ($)</option>
              </select>
            </div>
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-card-title">
            <div className="settings-icon red">🔔</div>
            <div>
              <h2>알림 및 표시 옵션</h2>
              <p>분석 결과와 데이터 변화 알림을 설정합니다.</p>
            </div>
          </div>

          <div className="settings-toggle-list">
            <ToggleRow
              title="데이터 갱신 완료 알림"
              description="데이터 갱신이 완료되면 알림을 표시합니다."
              checked={notifyDataUpdate}
              onChange={setNotifyDataUpdate}
            />

            <ToggleRow
              title="리뷰 증가 알림"
              description="특정 게임의 리뷰 수가 크게 증가하면 알림을 표시합니다."
              checked={notifyReviewIncrease}
              onChange={setNotifyReviewIncrease}
            />

            <ToggleRow
              title="가격 변동 알림"
              description="게임 가격이나 무료 여부가 변경되면 알림을 표시합니다."
              checked={notifyPriceChange}
              onChange={setNotifyPriceChange}
            />
          </div>
        </section>

        <section className="settings-card theme-card">
          <div className="settings-card-title">
            <div className="settings-icon orange">🎨</div>
            <div>
              <h2>테마 설정</h2>
              <p>화면 표시 방식을 선택합니다.</p>
            </div>
          </div>

          <div className="theme-options">
            <button
              className={theme === '라이트 모드' ? 'active' : ''}
              onClick={() => handleThemeChange('라이트 모드')}
              type="button"
            >
              라이트 모드
            </button>

            <button
              className={theme === '다크 모드' ? 'active' : ''}
              onClick={() => handleThemeChange('다크 모드')}
              type="button"
            >
              다크 모드
            </button>
          </div>
        </section>
      </div>

      <div className="settings-footer">
        <p>설정값은 화면 표시 기준에만 적용되며, 백엔드 데이터 자체는 변경되지 않습니다.</p>

        <div className="settings-footer-buttons">
          <button
            className="settings-outline-button"
            onClick={handleReset}
            type="button"
          >
            초기화
          </button>

          <button
            className="settings-primary-button"
            onClick={handleSave}
            type="button"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  )
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="settings-toggle-row">
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>

      <button
        className={checked ? 'settings-toggle active' : 'settings-toggle'}
        onClick={() => onChange(!checked)}
        type="button"
        aria-label={`${title} 설정`}
      >
        <span />
      </button>
    </div>
  )
}

function applyTheme(theme: ThemeMode) {
  const root = document.documentElement

  if (theme === '다크 모드') {
    root.classList.add('theme-dark')
  } else {
    root.classList.remove('theme-dark')
  }

  localStorage.setItem('steam-dashboard-theme', theme)
}

function formatDateTime(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  const second = String(date.getSeconds()).padStart(2, '0')

  return `${year}.${month}.${day} ${hour}:${minute}:${second}`
}

export default SettingsPage
