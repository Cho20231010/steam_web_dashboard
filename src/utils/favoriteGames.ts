export type FavoriteGame = {
  gameId: string | number
  name: string
  genre: string
  priceLabel: string
  image?: string
}

const FAVORITE_GAMES_KEY = 'steam_dashboard_favorite_games'

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

    return parsed.filter((item): item is FavoriteGame => {
      return (
        item !== null &&
        typeof item === 'object' &&
        'gameId' in item &&
        'name' in item &&
        'genre' in item &&
        'priceLabel' in item
      )
    })
  } catch (error) {
    console.error('관심 게임 목록을 읽는 중 오류가 발생했습니다.', error)
    return []
  }
}

export function saveFavoriteGame(game: FavoriteGame) {
  const favoriteGames = readFavoriteGames()
  const exists = favoriteGames.some((item) => String(item.gameId) === String(game.gameId))

  if (exists) {
    return favoriteGames
  }

  const nextFavoriteGames = [game, ...favoriteGames]

  localStorage.setItem(FAVORITE_GAMES_KEY, JSON.stringify(nextFavoriteGames))
  window.dispatchEvent(new Event('favorite-games-updated'))

  return nextFavoriteGames
}

export function removeFavoriteGame(gameId: string | number) {
  const favoriteGames = readFavoriteGames()

  const nextFavoriteGames = favoriteGames.filter(
    (item) => String(item.gameId) !== String(gameId),
  )

  localStorage.setItem(FAVORITE_GAMES_KEY, JSON.stringify(nextFavoriteGames))
  window.dispatchEvent(new Event('favorite-games-updated'))

  return nextFavoriteGames
}

export function isFavoriteGame(gameId: string | number) {
  return readFavoriteGames().some((item) => String(item.gameId) === String(gameId))
}
