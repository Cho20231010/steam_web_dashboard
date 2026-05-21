const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'https://steam-market-dashboard-production.up.railway.app'

export type ApiRecord = Record<string, unknown>

async function requestApi(path: string) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`${path} API 요청 실패: ${response.status}`)
  }

  return response.json()
}

export function isRecord(value: unknown): value is ApiRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function extractArray(data: unknown): ApiRecord[] {
  if (Array.isArray(data)) {
    return data.filter(isRecord)
  }

  if (isRecord(data)) {
    const candidates = [
      data.items,
      data.data,
      data.results,
      data.games,
      data.rankings,
      data.topics,
      data.history,
      data.trend,
      data.review_trend,
      data.reviewTrend,
    ]

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate.filter(isRecord)
      }
    }
  }

  return []
}

export function extractObject(data: unknown): ApiRecord | null {
  if (isRecord(data)) {
    const candidates = [data.data, data.game, data.result, data.detail]

    for (const candidate of candidates) {
      if (isRecord(candidate)) {
        return candidate
      }
    }

    return data
  }

  return null
}

export async function getGameList() {
  const data = await requestApi('/games')
  return extractArray(data)
}

export async function getGameDetail(gameId: string | number) {
  const data = await requestApi(`/games/${gameId}`)
  return extractObject(data)
}

export async function getGameSentiment(gameId: string | number) {
  const data = await requestApi(`/games/${gameId}/sentiment`)
  return extractObject(data)
}

export async function getGameTopics(gameId: string | number) {
  const data = await requestApi(`/games/${gameId}/topics`)
  return extractArray(data)
}

export async function getGameHistory(gameId: string | number) {
  const data = await requestApi(`/games/${gameId}/history`)
  return extractArray(data)
}

export async function getGameReviewTrend(gameId: string | number) {
  const data = await requestApi(`/games/${gameId}/review-trend`)
  return extractArray(data)
}

export async function getGameReviewInsights(gameId: string | number) {
  return requestApi(`/games/${gameId}/reviews/insights`)
}
