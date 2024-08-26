use anchor_lang::prelude::*;

use crate::state::Side;

#[event]
pub struct VoteEvtEvent {
    pub ticket_key: Pubkey,
    pub event_key: Pubkey,
    pub creator: Pubkey,
    pub selection: Side,
    pub amount: u64,
}
