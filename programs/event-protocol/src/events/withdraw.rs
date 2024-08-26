use anchor_lang::prelude::*;

#[event]
pub struct WithdrawEvent {
    pub event_key: Pubkey,
    pub ticket_key: Pubkey,
    pub signer: Pubkey,
    pub amount: u64,
}
