use anchor_lang::prelude::*;

#[event]
pub struct ClaimRewardsEvent {
    pub event_id: Pubkey,
    pub signer: Pubkey,
    pub amount: u64,
}
