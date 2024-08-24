use anchor_lang::prelude::*;

use crate::state::Side;

#[event]
pub struct VoteEvtEvent {
    pub key: Pubkey,
    pub event_id: Pubkey,
    pub creator: Pubkey,
    pub selection: Side,
    pub amount: u64,
}
