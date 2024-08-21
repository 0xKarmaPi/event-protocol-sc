use anchor_lang::prelude::*;

#[constant]
pub const MASTER_SEEDS: &[u8; 6] = b"master";

#[constant]
pub const PREDICTION_EVENT_SEEDS_PREFIX: &[u8; 16] = b"prediction_event";

#[constant]
pub const TOKENS_RIGHT_POOL_SEEDS_PREFIX: &[u8; 10] = b"right_pool";

#[constant]
pub const TOKENS_LEFT_POOL_SEEDS_PREFIX: &[u8; 9] = b"left_pool";

#[constant]
pub const TICKET_SEEDS_PREFIX: &[u8; 6] = b"ticket";

#[constant]
pub const TOKENS_SYSTEM_FEE_SEEDS_PREFIX: &[u8; 10] = b"system_fee";
