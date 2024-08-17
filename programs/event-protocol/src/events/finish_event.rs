use anchor_lang::prelude::*;

use crate::state::Side;

#[event]
pub struct FinishEvtEvent {
    pub event_id: Pubkey,
    pub result: Side,
}
