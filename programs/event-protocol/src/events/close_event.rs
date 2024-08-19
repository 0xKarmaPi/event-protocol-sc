use anchor_lang::prelude::*;

#[event]
pub struct CloseEvtEvent {
    pub event_id: Pubkey,
}
