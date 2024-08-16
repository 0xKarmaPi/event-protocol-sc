use anchor_lang::prelude::*;

use crate::state::Selection;

#[event]
pub struct FinishEvtEvent {
    pub event_id: Pubkey,
    pub result: Selection,
}
