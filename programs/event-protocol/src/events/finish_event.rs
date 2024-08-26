use anchor_lang::prelude::*;

use crate::state::Side;

#[event]
pub struct FinishEvtEvent {
    pub key: Pubkey,
    pub result: Side,
}
