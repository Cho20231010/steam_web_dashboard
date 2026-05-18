const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  'https://steam-market-dashboard-production.up.railway.app'

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  })

  if (!response.ok) {
    throw new Error(`API 요청 실패: ${endpoint}`)
  }

  return response.json()
}

export type ApiListResponse<T> = {
  items?: T[]
  data?: T[]
  results?: T[]
  total?: number
  page?: number
  size?: number
  pages?: number
}

export type Game = {
  game_id?: number | string
  id?: number | string
  app_id?: number | string
  appid?: number | string
  steam_appid?: number | string

  name?: string
  title?: string

  genre?: string
  genres?: string[] | string

  price?: number | string
  price_usd?: number | string
  final_price?: number | string
  initial_price?: number | string
  is_free?: boolean
  free?: boolean
  isFree?: boolean

  header_image?: string | null
  capsule_image?: string | null
  image?: string | null
  website?: string | null

  owners?: string | number
  estimated_owners?: string
  owners_text?: string
  owners_range?: string
  owners_value?: number | string
  owners_count?: number | string

  positive_reviews?: number | string
  negative_reviews?: number | string
  neutral_reviews?: number | string
  total_reviews?: number | string
  review_count?: number | string
  totalReviews?: number | string

  positive_ratio?: number | string
  negative_ratio?: number | string
  neutral_ratio?: number | string

  average_playtime?: number | string
  avg_playtime?: number | string
  playtime_forever?: number | string

  release_date?: string
  developer?: string
  publisher?: string
  metacritic_score?: number | string | null
  is_windows?: boolean | null
  is_mac?: boolean | null
  is_linux?: boolean | null
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

  average_price?: number
  average_price_usd?: number

  top_genre?: string
  topGenre?: string
  representative_genre?: string
}

export type GenreStat = {
  genre?: string
  name?: string
  count?: number
  game_count?: number
  ratio?: number
  percent?: number
  percentage?: number
}

export type PriceReviewPoint = {
  game_id?: number | string
  name?: string
  game_name?: string
  price?: number | string
  price_usd?: number | string
  review_count?: number | string
  total_reviews?: number | string
  positive_ratio?: number | string
  positive_reviews?: number | string
  negative_reviews?: number | string
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

  correlation?: number
  correlation_value?: number
  correlation_coefficient?: number
  coefficient?: number
  value?: number

  direction?: string
  strength?: string
  insight?: string
}

export type SentimentAnalysis = {
  positive: number
  neutral: number
  negative: number
  total: number
  positive_ratio: number
  neutral_ratio: number
  negative_ratio: number
  min_sample_size?: number
  reliability?: string
  warning?: string | null
}

export type TopicAnalysis = {
  topic_id: number
  topicId?: number

  keywords: string[]
  top_keywords?: string[]
  topKeywords?: string[]
  words?: string[]
  terms?: string[]

  weight: number
  weight_percent: number
  percentage?: number
  percent?: number
  ratio?: number

  sample_size?: number
  min_sample_size?: number
  reliability?: string
  warning?: string | null

  positive_ratio?: number
  neutral_ratio?: number
  negative_ratio?: number
  sentiment?: string
}

function unwrapList<T>(result: T[] | ApiListResponse<T>): T[] {
  if (Array.isArray(result)) {
    return result
  }

  if (Array.isArray(result.items)) {
    return result.items
  }

  if (Array.isArray(result.data)) {
    return result.data
  }

  if (Array.isArray(result.results)) {
    return result.results
  }

  return []
}

export async function getGames() {
  const result = await request<Game[] | ApiListResponse<Game>>('/games')
  return unwrapList<Game>(result)
}

export async function getGameRankings() {
  try {
    const result = await request<Game[] | ApiListResponse<Game>>('/games/rankings')
    return unwrapList<Game>(result)
  } catch {
    return getGames()
  }
}

export function getGenres() {
  return request<string[]>('/genres')
}

export function getGameDetail(gameId: string | number) {
  return request<Game>(`/games/${gameId}`)
}

export function getGameHistory(gameId: string | number) {
  return request<unknown[]>(`/games/${gameId}/history`)
}

export function getGameReviewTrend(gameId: string | number) {
  return request<unknown[]>(`/games/${gameId}/review-trend`)
}

export function getGameSentiment(gameId: string | number) {
  return request<SentimentAnalysis>(`/games/${gameId}/sentiment`)
}

export async function getGameTopics(gameId: string | number) {
  const result = await request<TopicAnalysis[] | ApiListResponse<TopicAnalysis>>(
    `/games/${gameId}/topics`,
  )

  return unwrapList<TopicAnalysis>(result)
}

export function getGameReviewInsights(gameId: string | number) {
  return request<unknown>(`/games/${gameId}/reviews/insights`)
}

export function getDashboardSummary() {
  return request<DashboardSummary>('/dashboard/summary')
}

export function getAnalysisTrends() {
  return request<unknown[]>('/analysis/trends')
}

export function getGenreTrends() {
  return request<unknown[]>('/analysis/genre-trends')
}

export function getPriceTrends() {
  return request<unknown[]>('/analysis/price-trends')
}

export async function getGenreStats() {
  const result = await request<GenreStat[] | ApiListResponse<GenreStat>>(
    '/analysis/genre-stats',
  )

  return unwrapList<GenreStat>(result)
}

export function getPriceBandStats() {
  return request<unknown[]>('/analysis/price-band-stats')
}

export function getPlatformStats() {
  return request<unknown[]>('/analysis/platform-stats')
}

export function getReleaseYearStats() {
  return request<unknown[]>('/analysis/release-year-stats')
}

export async function getPriceReview() {
  const result = await request<PriceReviewPoint[] | ApiListResponse<PriceReviewPoint>>(
    '/analysis/price-review',
  )

  return unwrapList<PriceReviewPoint>(result)
}

export function getSentimentAnalysis() {
  return request<SentimentAnalysis>('/analysis/sentiment')
}

export async function getTopicAnalysis() {
  const result = await request<TopicAnalysis[] | ApiListResponse<TopicAnalysis>>(
    '/analysis/topics',
  )

  return unwrapList<TopicAnalysis>(result)
}

export function getTopicClusters() {
  return request<unknown[]>('/analysis/topics/clusters')
}

export function getTopicSentiment() {
  return request<unknown[]>('/analysis/topics/sentiment')
}

export function getTopicsByGenre() {
  return request<unknown[]>('/analysis/topics/by-genre')
}

export function getCorrelationAnalysis() {
  return request<CorrelationResult[]>('/analysis/correlation')
}

export function getClientId() {
  const savedClientId = localStorage.getItem('steam-dashboard-client-id')

  if (savedClientId) {
    return savedClientId
  }

  const newClientId = crypto.randomUUID()
  localStorage.setItem('steam-dashboard-client-id', newClientId)

  return newClientId
}

export async function getWishlist() {
  const result = await request<Game[] | ApiListResponse<Game>>('/users/me/wishlist', {
    headers: {
      'X-Client-Id': getClientId(),
    },
  })

  return unwrapList<Game>(result)
}

export function addWishlistGame(gameId: string | number) {
  return request('/users/me/wishlist', {
    method: 'POST',
    headers: {
      'X-Client-Id': getClientId(),
    },
    body: JSON.stringify({ game_id: gameId }),
  })
}

export function deleteWishlistGame(gameId: string | number) {
  return request(`/users/me/wishlist/${gameId}`, {
    method: 'DELETE',
    headers: {
      'X-Client-Id': getClientId(),
    },
  })
}

export function getWishlistCompare() {
  return request('/users/me/wishlist/compare', {
    headers: {
      'X-Client-Id': getClientId(),
    },
  })
}

export async function getNotifications() {
  const result = await request<unknown[] | ApiListResponse<unknown>>(
    '/users/me/notifications',
    {
      headers: {
        'X-Client-Id': getClientId(),
      },
    },
  )

  return unwrapList<unknown>(result)
}
