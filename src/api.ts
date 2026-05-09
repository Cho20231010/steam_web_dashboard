const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

if (!API_BASE_URL) {
  throw new Error('VITE_API_BASE_URL 환경변수가 설정되지 않았습니다.')
}

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`)

  if (!response.ok) {
    throw new Error(`API 요청 실패: ${path} / status: ${response.status}`)
  }

  return response.json()
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
}

export type Game = {
  id?: number | string
  appid?: number | string
  app_id?: number | string
  appId?: number | string
  steam_appid?: number | string
  steamAppId?: number | string
  game_id?: number | string
  name?: string
  title?: string
  genre?: string
  genres?: string | string[]
  positive_rate?: number
  positiveRate?: number
  score?: number | string
  review_count?: number
  total_reviews?: number
  price?: number | string
  owners?: string

  header_image?: string
  capsule_image?: string
  image_url?: string
  image?: string
}

export type SentimentAnalysis = {
  positive?: number
  neutral?: number
  negative?: number
  positive_ratio?: number
  neutral_ratio?: number
  negative_ratio?: number
  positiveRate?: number
  neutralRate?: number
  negativeRate?: number
}

export type TopicAnalysis = {
  topic_id?: number | string
  topicId?: number | string
  topic?: string | number
  topic_name?: string
  topicName?: string
  topic_label?: string
  topicLabel?: string
  display_name?: string
  label?: string
  keyword?: string
  keywords?: string | string[]
  top_keywords?: string | string[]
  topKeywords?: string | string[]
  words?: string | string[]
  top_words?: string | string[]
  topWords?: string | string[]
  terms?: string | string[]
  name?: string
  value?: number
  ratio?: number
  weight?: number
  percentage?: number
  percent?: number
}

export type CorrelationResult = {
  item1?: string
  item2?: string
  feature_x?: string
  feature_y?: string
  x?: string
  y?: string
  variable_1?: string
  variable_2?: string
  variable1?: string
  variable2?: string

  correlation?: number | string
  correlation_coefficient?: number | string
  correlation_value?: number | string
  coefficient?: number | string
  value?: number | string

  p_value?: number | string
  sample_size?: number | string
  min_sample_size?: number | string
  reliability?: string
  warning?: string

  insight?: string
  description?: string
}

export function getDashboardSummary() {
  return request<DashboardSummary>('/dashboard/summary')
}

export function getGames() {
  return request<Game[]>('/games')
}

export function getGameDetail(gameId: string | number) {
  return request<Game>(`/games/${gameId}`)
}

export function getGameSentiment(gameId: string | number) {
  return request<SentimentAnalysis>(`/games/${gameId}/sentiment`)
}

export function getGameTopics(gameId: string | number) {
  return request<TopicAnalysis[]>(`/games/${gameId}/topics`)
}

export function getSentimentAnalysis() {
  return request<SentimentAnalysis>('/analysis/sentiment')
}

export function getTopicAnalysis() {
  return request<TopicAnalysis[]>('/analysis/topics')
}

export function getCorrelationAnalysis() {
  return request<CorrelationResult[]>('/analysis/correlation')
}
