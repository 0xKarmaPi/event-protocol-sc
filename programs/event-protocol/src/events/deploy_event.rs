use anchor_lang::prelude::*;

#[event]
pub struct DeployEvtEvent {
    pub key: Pubkey,
    pub id: Pubkey,
    pub bump: u8,
    pub title: String,
    pub description: String,
    pub left_description: String,
    pub right_description: String,
    pub creator: Pubkey,
    pub end_date: u64,
    pub start_date: u64,
    pub burning: bool,
    pub left_mint: Option<Pubkey>,
    pub right_mint: Option<Pubkey>,
    pub left_mint_decimals: Option<u8>,
    pub right_mint_decimals: Option<u8>,
}
