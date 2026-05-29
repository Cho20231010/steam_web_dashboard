export type FavoriteGame = {
  gameId: string | number
  name: string
  genre: string
  priceLabel: string
  image?: string
  savedAt?: string
  priceAlertEnabled?: boolean
  reviewAlertEnabled?: boolean
  targetPriceLabel?: string
}

const FAVORITE_GAMES_KEY = 'steam_dashboard_favorite_games'

export const FAVORITE_GAMES_UPDATED_EVENT = 'favorite-games-updated'

export function readFavoriteGames(): FavoriteGame[] {
  try {
    const raw = localStorage.getItem(FAVORITE_GAMES_KEY)

    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw)

    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .filter((item): item is FavoriteGame => {
        return (
          item !== null &&
          typeof item === 'object' &&
          'gameId' in item &&
          'name' in item &&
          'genre' in item &&
          'priceLabel' in item
        )
      })
      .map(normalizeFavoriteGame)
  } catch (error) {
    console.error('관심 게임 목록을 읽는 중 오류가 발생했습니다.', error)
    return []
  }
}

export function writeFavoriteGames(games: FavoriteGame[]) {
  const normalizedGames = games.map(normalizeFavoriteGame)

  localStorage.setItem(FAVORITE_GAMES_KEY, JSON.stringify(normalizedGames))
  window.dispatchEvent(new Event(FAVORITE_GAMES_UPDATED_EVENT))

  return normalizedGames
}

export function saveFavoriteGame(game: FavoriteGame) {
  const favoriteGames = readFavoriteGames()
  const exists = favoriteGames.some((item) => String(item.gameId) === String(game.gameId))

  if (exists) {
    return favoriteGames
  }

  const nextFavoriteGames = [
    normalizeFavoriteGame({
      ...game,
      savedAt: game.savedAt ?? new Date().toISOString(),
      priceAlertEnabled: game.priceAlertEnabled ?? true,
      reviewAlertEnabled: game.reviewAlertEnabled ?? true,
      targetPriceLabel: game.targetPriceLabel ?? game.priceLabel,
    }),
    ...favoriteGames,
  ]

  localStorage.setItem(FAVORITE_GAMES_KEY, JSON.stringify(nextFavoriteGames))
  window.dispatchEvent(new Event(FAVORITE_GAMES_UPDATED_EVENT))

  return nextFavoriteGames
}

export function updateFavoriteGame(
  gameId: string | number,
  patch: Partial<Omit<FavoriteGame, 'gameId'>>,
) {
  const favoriteGames = readFavoriteGames()

  const nextFavoriteGames = favoriteGames.map((game) => {
    if (String(game.gameId) !== String(gameId)) {
      return game
    }

    return normalizeFavoriteGame({
      ...game,
      ...patch,
    })
  })

  localStorage.setItem(FAVORITE_GAMES_KEY, JSON.stringify(nextFavoriteGames))
  window.dispatchEvent(new Event(FAVORITE_GAMES_UPDATED_EVENT))

  return nextFavoriteGames
}

export function removeFavoriteGame(gameId: string | number) {
  const favoriteGames = readFavoriteGames()

  const nextFavoriteGames = favoriteGames.filter(
    (item) => String(item.gameId) !== String(gameId),
  )

  localStorage.setItem(FAVORITE_GAMES_KEY, JSON.stringify(nextFavoriteGames))
  window.dispatchEvent(new Event(FAVORITE_GAMES_UPDATED_EVENT))

  return nextFavoriteGames
}

export function isFavoriteGame(gameId: string | number) {
  return readFavoriteGames().some((item) => String(item.gameId) === String(gameId))
}

function normalizeFavoriteGame(game: FavoriteGame): FavoriteGame {
  return {
    gameId: game.gameId,
    name: game.name || '이름 없는 게임',
    genre: game.genre || '장르 정보 없음',
    priceLabel: game.priceLabel || '-',
    image: game.image,
    savedAt: game.savedAt ?? new Date().toISOString(),
    priceAlertEnabled: game.priceAlertEnabled ?? true,
    reviewAlertEnabled: game.reviewAlertEnabled ?? true,
    targetPriceLabel: game.targetPriceLabel ?? game.priceLabel ?? '-',
  }
}
