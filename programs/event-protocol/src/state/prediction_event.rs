use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount};

use crate::constants::PREDICTION_EVENT_SEED_PREFIX;

use super::Selection;

#[account]
#[derive(InitSpace, Debug)]
pub struct PredictionEvent {
    pub id: Pubkey,

    pub creator: Pubkey,

    pub bump: u8,

    pub start_date: u64,

    pub end_date: u64,

    pub left_pool: u64,

    pub right_pool: u64,

    pub left_mint: Option<Pubkey>,

    pub right_mint: Option<Pubkey>,

    pub result: Option<Selection>,
}

impl PredictionEvent {
    pub fn transfer_tokens<'r>(
        event: &Account<'r, Self>,
        pool: &Account<'r, TokenAccount>,
        to: AccountInfo<'r>,
        amount: u64,
        token_program: &Program<'r, Token>,
    ) -> Result<()> {
        let transfer_instruction = token::Transfer {
            from: pool.to_account_info(),
            to,
            authority: event.to_account_info(),
        };

        let bump = event.bump;

        let seeds = &[PREDICTION_EVENT_SEED_PREFIX, event.id.as_ref(), &[bump]];

        let signer_seeds = &[&seeds[..]];

        let cpi_ctx = CpiContext::new_with_signer(
            token_program.to_account_info(),
            transfer_instruction,
            signer_seeds,
        );

        anchor_spl::token::transfer(cpi_ctx, amount)?;

        Ok(())
    }
}
