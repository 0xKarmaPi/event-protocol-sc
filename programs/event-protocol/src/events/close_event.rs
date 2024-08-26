use anchor_lang::prelude::*;

#[event]
pub struct CloseEvtEvent {
    pub key: Pubkey,
}
