const USD_TO_KRW = 1350

export function formatUsdPrice(price: number) {
  return `$${price.toFixed(2)}`
}

export function formatKrwPrice(price: number) {
  const krwPrice = Math.round(price * USD_TO_KRW)

  return `₩${krwPrice.toLocaleString('ko-KR')}`
}

export function formatPriceLabel(price: number, isFree = false) {
  if (isFree || price <= 0) {
    return `무료 (${formatUsdPrice(0)})`
  }

  return `${formatKrwPrice(price)} (${formatUsdPrice(price)})`
}
