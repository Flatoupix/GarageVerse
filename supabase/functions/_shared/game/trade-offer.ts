// Généré depuis src/game/trade.ts par supabase/sync-rules.mjs.
export interface TradeOffer { cars: readonly string[]; credits: number }

export const TRADE_CREDIT_LIMIT = 1e7

const amount = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0

const validId = (id: unknown): id is string => typeof id === 'string' && id.trim().length > 0

const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)

function validOffer(offer: unknown): offer is TradeOffer {
  return object(offer) && amount(offer.credits) && offer.credits <= TRADE_CREDIT_LIMIT && Array.isArray(offer.cars)
    && [...offer.cars].every(validId) && new Set(offer.cars).size === offer.cars.length
}

export { validOffer }
