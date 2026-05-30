import { useEffect, useMemo, useState, type ReactNode } from 'react'
import './SettingsPage.css'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  'https://steam-market-dashboard-production.up.railway.app'

const SETTINGS_STORAGE_KEY = 'steam-dashboard-settings'
const THEME_STORAGE_KEY = 'steam-dashboard-theme'

type ConnectionStatus = 'idle' | 'checking' | 'success' | 'error'
type ThemeMode = '라이트 모드' | '다크 모드'
type SettingsTab = 'general' | 'notification' | 'display' | 'etc'

type DashboardSettings = {
  language: string
  currency: string
  timezone: string
  defaultPage: string
  priceChangeAlert: boolean
  reviewIncreaseAlert: boolean
  newGameAlert: boolean
  wishlistChangeAlert: boolean
  darkMode: boolean
  animationEffect: boolean
  lastDataUpdatedAt: string
}

const DEFAULT_SETTINGS: DashboardSettings = {
  language: '한국어',
  currency: 'USD (달러)',
  timezone: '(UTC+09:00) 서울',
  defaultPage: '대시보드',
  priceChangeAlert: true,
  reviewIncreaseAlert: true,
  newGameAlert: true,
  wishlistChangeAlert: true,
  darkMode: false,
  animationEffect: true,
  lastDataUpdatedAt: '2024.06.01 10:00:00',
}

const SETTINGS_TABS: Array<{ id: SettingsTab; label: string }> = [
  { id: 'general', label: '일반 설정' },
  { id: 'notification', label: '알림 설정' },
  { id: 'display', label: '표시 설정' },
  { id: 'etc', label: '기타' },
]

function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general')
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle')
  const [lastCheckedAt, setLastCheckedAt] = useState('-')
  const [saveMessage, setSaveMessage] = useState('')
  const [settings, setSettings] = useState<DashboardSettings>(() => readStoredSettings())

  useEffect(() => {
    applyTheme(settings.darkMode ? '다크 모드' : '라이트 모드')
  }, [settings.darkMode])

  const connectionLabel = useMemo(() => {
    if (connectionStatus === 'checking') return '확인 중'
    if (connectionStatus === 'success') return '연결됨'
    if (connectionStatus === 'error') return '오류'
    return '대기'
  }, [connectionStatus])

  const connectionClassName = useMemo(() => {
    return `settings-badge ${connectionStatus}`
  }, [connectionStatus])

  function updateSetting<K extends keyof DashboardSettings>(
    key: K,
    value: DashboardSettings[K],
  ) {
    setSettings((prevSettings) => ({
      ...prevSettings,
      [key]: value,
    }))
    setSaveMessage('')
  }

  async function handleConnectionTest() {
    try {
      setConnectionStatus('checking')
      setSaveMessage('')

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

  function handleRefreshData() {
    updateSetting('lastDataUpdatedAt', formatDateTime(new Date()))
    setSaveMessage('데이터 갱신 시간이 업데이트되었습니다.')
  }

  function handleClearCache() {
    localStorage.removeItem(SETTINGS_STORAGE_KEY)
    setSettings(DEFAULT_SETTINGS)
    setConnectionStatus('idle')
    setLastCheckedAt('-')
    setSaveMessage('캐시 데이터가 삭제되었습니다.')
  }

  function handleReset() {
    setSettings(DEFAULT_SETTINGS)
    setConnectionStatus('idle')
    setLastCheckedAt('-')
    setSaveMessage('설정값이 초기화되었습니다. 저장 버튼을 누르면 반영됩니다.')
  }

  function handleSave() {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
    localStorage.setItem(THEME_STORAGE_KEY, settings.darkMode ? '다크 모드' : '라이트 모드')
    applyTheme(settings.darkMode ? '다크 모드' : '라이트 모드')
    setSaveMessage('설정이 저장되었습니다.')
  }

  return (
    <section className="settings-page">
      <header className="settings-header">
        <h1>9. 설정</h1>
      </header>

      <nav className="settings-tab-bar" aria-label="설정 탭">
        {SETTINGS_TABS.map((tab) => (
          <button
            key={tab.id}
            className={activeTab === tab.id ? 'active' : ''}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="settings-layout">
        <SettingsCard
          className={activeTab === 'general' || activeTab === 'display' ? 'focused' : ''}
          title="일반 설정"
        >
          <SelectField
            label="언어"
            value={settings.language}
            options={['한국어', 'English']}
            onChange={(value) => updateSetting('language', value)}
          />

          <SelectField
            label="통화 단위"
            value={settings.currency}
            options={['USD (달러)', 'KRW (원)', 'USD + KRW']}
            onChange={(value) => updateSetting('currency', value)}
          />

          <SelectField
            label="시간대"
            value={settings.timezone}
            options={['(UTC+09:00) 서울', '(UTC+00:00) 런던', '(UTC-08:00) 로스앤젤레스']}
            onChange={(value) => updateSetting('timezone', value)}
          />

          <SelectField
            label="기본 페이지"
            value={settings.defaultPage}
            options={[
              '대시보드',
              '게임 상세 분석',
              '리뷰 인사이트',
              '트렌드 비교',
              '토픽 분석',
              '시장 분포',
              '검색',
              '관심 게임',
            ]}
            onChange={(value) => updateSetting('defaultPage', value)}
          />

          <ToggleRow
            title="다크 모드 사용"
            checked={settings.darkMode}
            onChange={(value) => updateSetting('darkMode', value)}
          />

          <ToggleRow
            title="애니메이션 효과"
            checked={settings.animationEffect}
            onChange={(value) => updateSetting('animationEffect', value)}
          />
        </SettingsCard>

        <div className="settings-side-stack">
          <SettingsCard
            className={activeTab === 'notification' ? 'focused' : ''}
            title="알림 설정"
          >
            <ToggleRow
              title="가격 변화 알림"
              icon="♡"
              checked={settings.priceChangeAlert}
              onChange={(value) => updateSetting('priceChangeAlert', value)}
            />

            <ToggleRow
              title="리뷰 증가 알림"
              icon="⌁"
              checked={settings.reviewIncreaseAlert}
              onChange={(value) => updateSetting('reviewIncreaseAlert', value)}
            />

            <ToggleRow
              title="신규 게임 알림"
              icon="☆"
              checked={settings.newGameAlert}
              onChange={(value) => updateSetting('newGameAlert', value)}
            />

            <ToggleRow
              title="위시리스트 변동 알림"
              icon="□"
              checked={settings.wishlistChangeAlert}
              onChange={(value) => updateSetting('wishlistChangeAlert', value)}
            />
          </SettingsCard>

          <SettingsCard className={activeTab === 'etc' ? 'focused' : ''} title="기타">
            <div className="settings-etc-row">
              <button
                className="settings-outline-button blue"
                onClick={handleConnectionTest}
                type="button"
                disabled={connectionStatus === 'checking'}
              >
                {connectionStatus === 'checking' ? '확인 중...' : 'API 연결 상태 확인'}
              </button>

              <div className="settings-status-inline">
                <span>API 상태</span>
                <strong className={connectionClassName}>{connectionLabel}</strong>
              </div>
            </div>

            <div className="settings-etc-row">
              <button className="settings-outline-button blue" onClick={handleClearCache} type="button">
                캐시 데이터 삭제
              </button>

              <div className="settings-status-inline">
                <span>마지막 업데이트</span>
                <strong>{settings.lastDataUpdatedAt}</strong>
              </div>
            </div>

            <div className="settings-etc-row">
              <button className="settings-outline-button" onClick={handleRefreshData} type="button">
                데이터 새로고침
              </button>

              <div className="settings-status-inline">
                <span>최근 연결 확인</span>
                <strong>{lastCheckedAt}</strong>
              </div>
            </div>
          </SettingsCard>
        </div>
      </div>

      <footer className="settings-footer">
        <p>
          설정값은 화면 표시와 알림 UI 기준에만 적용되며, 백엔드 데이터 자체는 변경되지 않습니다.
          {saveMessage && <span>{saveMessage}</span>}
        </p>

        <div className="settings-footer-buttons">
          <button className="settings-outline-button" onClick={handleReset} type="button">
            초기화
          </button>

          <button className="settings-primary-button" onClick={handleSave} type="button">
            저장
          </button>
        </div>
      </footer>
    </section>
  )
}

function SettingsCard({
  title,
  className = '',
  children,
}: {
  title: string
  className?: string
  children: ReactNode
}) {
  return (
    <section className={`settings-card ${className}`}>
      <h2>{title}</h2>
      {children}
    </section>
  )
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
}) {
  return (
    <label className="settings-field-group">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}

function ToggleRow({
  title,
  icon,
  checked,
  onChange,
}: {
  title: string
  icon?: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="settings-toggle-row">
      <div className="settings-toggle-title">
        {icon && <i>{icon}</i>}
        <strong>{title}</strong>
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

function readStoredSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY)

    if (!raw) {
      return {
        ...DEFAULT_SETTINGS,
        darkMode: savedTheme === '다크 모드',
      }
    }

    const parsed = JSON.parse(raw)

    if (!parsed || typeof parsed !== 'object') {
      return DEFAULT_SETTINGS
    }

    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      darkMode:
        typeof parsed.darkMode === 'boolean'
          ? parsed.darkMode
          : savedTheme === '다크 모드',
    }
  } catch (error) {
    console.error('설정값을 불러오지 못했습니다.', error)
    return DEFAULT_SETTINGS
  }
}

function applyTheme(theme: ThemeMode) {
  const root = document.documentElement

  if (theme === '다크 모드') {
    root.classList.add('theme-dark')
  } else {
    root.classList.remove('theme-dark')
  }

  localStorage.setItem(THEME_STORAGE_KEY, theme)
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
