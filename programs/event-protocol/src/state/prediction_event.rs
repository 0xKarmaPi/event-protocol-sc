use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount};

use super::Selection;

#[account]
#[derive(InitSpace, Debug)]
pub struct PredictionEvent {
    pub id: Pubkey,

    pub creator: Pubkey,

    pub bump: u8,

    pub end_date: u64,

    #[max_len(50)]
    pub title: String,

    #[max_len(144)]
    pub description: String,

    pub left_mint: Option<Pubkey>,

    pub right_mint: Option<Pubkey>,

    pub left_pool: u64,

    pub right_pool: u64,

    pub result: Option<Selection>,
}

impl PredictionEvent {
    pub const SEED_PREFIX: &'static [u8; 16] = b"prediction_event";

    pub fn transfer_tokens<'r>(
        prediction_event: &Account<'r, Self>,
        pool: &Account<'r, TokenAccount>,
        to: AccountInfo<'r>,
        amount: u64,
        token_program: &Program<'r, Token>,
    ) -> Result<()> {
        let transfer_instruction = token::Transfer {
            from: pool.to_account_info(),
            to,
            authority: prediction_event.to_account_info(),
        };

        let bump = prediction_event.bump;

        let seeds = &[Self::SEED_PREFIX, prediction_event.id.as_ref(), &[bump]];

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
