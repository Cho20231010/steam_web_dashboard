const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'https://steam-market-dashboard-production.up.railway.app'

export type Game = {
  game_id?: number
  id?: number
  app_id?: number
  appid?: number
  steam_appid?: number
  name?: string
  title?: string
  genre?: string | null
  genres?: string[] | string | null
  price?: number | null
  owners?: string | null
  positive_reviews?: number
  negative_reviews?: number
  average_playtime?: number | null
  image_url?: string
  image?: string
  header_image?: string
  capsule_image?: string
  [key: string]: unknown
}

export type DashboardSummary = {
  total_games?: number
  totalGames?: number
  game_count?: number
  total_reviews?: number
  totalReviews?: number
  review_count?: number
  average_positive_rate?: number
  positive_rate?: number
  positiveRate?: number
  top_genre?: string
  topGenre?: string
  representative_genre?: string
  [key: string]: unknown
}

export type SentimentAnalysis = {
  positive?: number
  neutral?: number
  negative?: number
  total?: number
  positive_ratio?: number
  neutral_ratio?: number
  negative_ratio?: number
  positiveRate?: number
  neutralRate?: number
  negativeRate?: number
  reliability?: string
  warning?: string | null
  [key: string]: unknown
}

export type TopicAnalysis = {
  topic_id?: number
  keywords?: string[]
  weight?: number
  weight_percent?: number
  sample_size?: number
  min_sample_size?: number
  reliability?: string
  warning?: string | null
  [key: string]: unknown
}

export type CorrelationResult = {
  feature_x?: string
  feature_y?: string
  item1?: string
  item2?: string
  x?: string
  y?: string
  variable_1?: string
  variable_2?: string
  variable1?: string
  variable2?: string
  correlation?: number
  correlation_value?: number
  correlation_coefficient?: number
  coefficient?: number
  value?: number
  p_value?: number
  sample_size?: number
  reliability?: string
  warning?: string | null
  [key: string]: unknown
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`)

  if (!response.ok) {
    throw new Error(`API 요청 실패: ${response.status} ${path}`)
  }

  return response.json() as Promise<T>
}

export function getDashboardSummary() {
  return fetchJson<DashboardSummary>('/summary')
}

export function getGames() {
  return fetchJson<Game[]>('/games')
}

export function getGameDetail(gameId: string | number) {
  return fetchJson<Game>(`/games/${gameId}`)
}

export function getSentimentAnalysis() {
  return fetchJson<SentimentAnalysis>('/analysis/sentiment')
}

export function getTopicAnalysis() {
  return fetchJson<TopicAnalysis[]>('/analysis/topics')
}

export function getCorrelationAnalysis() {
  return fetchJson<CorrelationResult[]>('/analysis/correlation')
}

export function getGameSentiment(gameId: string | number) {
  return fetchJson<SentimentAnalysis>(`/games/${gameId}/sentiment`)
}

export function getGameTopics(gameId: string | number) {
  return fetchJson<TopicAnalysis[]>(`/games/${gameId}/topics`)
}
