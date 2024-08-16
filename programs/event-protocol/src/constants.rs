use anchor_lang::prelude::*;

#[constant]
pub const MASTER_SEED: &[u8; 6] = b"master";

#[constant]
pub const PREDICTION_EVENT_SEED_PREFIX: &[u8; 16] = b"prediction_event";

#[constant]
pub const TOKENS_RIGHT_POOL_SEED_PREFIX: &[u8; 10] = b"right_pool";

#[constant]
pub const TOKENS_LEFT_POOL_SEED_PREFIX: &[u8; 9] = b"left_pool";

#[constant]
pub const TICKET_SEED_PREFIX: &[u8; 6] = b"ticket";

#[constant]
pub const TOKENS_PLATFORM_SEED_PREFIX: &[u8; 8] = b"platform";
