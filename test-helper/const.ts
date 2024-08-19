export const SIDE = {
  Left: {
    left: {}
  },
  Right: {
    right: {}
  }
}

export type SIDE = (typeof SIDE)[keyof typeof SIDE]

export const MASTER_SEEDS = Buffer.from("master")

export const PREDICTION_EVENT_SEEDS_PREFIX = Buffer.from("prediction_event")

export const TOKENS_RIGHT_POOL_SEEDS_PREFIX = Buffer.from("right_pool")

export const TOKENS_LEFT_POOL_SEEDS_PREFIX = Buffer.from("left_pool")

export const TICKET_SEEDS_PREFIX = Buffer.from("ticket")

export const TOKENS_PLATFORM_POOL_SEEDS_PREFIX = Buffer.from("platform")
