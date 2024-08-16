use anchor_lang::prelude::*;

use crate::state::Selection;

#[event]
pub struct VoteEvtEvent {
    pub event_id: Pubkey,
    pub creator: Pubkey,
    pub selection: Selection,
    pub amount: u64,
}
