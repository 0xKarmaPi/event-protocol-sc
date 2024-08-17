use anchor_lang::{prelude::*, system_program};
use anchor_spl::token::{self, Token, TokenAccount};

use crate::constants::PREDICTION_EVENT_SEEDS_PREFIX;

use super::Side;

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

    pub result: Option<Side>,

    pub burning: bool,
}

impl PredictionEvent {
    pub fn transfer_tokens_from_pool<'r>(
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

        let seeds = &[PREDICTION_EVENT_SEEDS_PREFIX, event.id.as_ref(), &[bump]];

        let signer_seeds = &[&seeds[..]];

        let cpi_ctx = CpiContext::new_with_signer(
            token_program.to_account_info(),
            transfer_instruction,
            signer_seeds,
        );

        anchor_spl::token::transfer(cpi_ctx, amount)
    }

    pub fn take_sols_from_sender<'r>(
        event: &Account<'r, Self>,
        signer: &Signer<'r>,
        system_program: &Program<'r, System>,
        amount: u64,
    ) -> Result<()> {
        let cpi_context = CpiContext::new(
            system_program.to_account_info(),
            system_program::Transfer {
                from: signer.to_account_info(),
                to: event.to_account_info(),
            },
        );

        system_program::transfer(cpi_context, amount)
    }

    pub fn take_tokens_from_sender<'r>(
        target_pool: &Account<'r, TokenAccount>,
        signer: &Signer<'r>,
        sender_ata: &Account<'r, TokenAccount>,
        token_program: &Program<'r, Token>,
        amount: u64,
    ) -> Result<()> {
        let transfer_instruction = anchor_spl::token::Transfer {
            from: sender_ata.to_account_info(),
            to: target_pool.to_account_info(),
            authority: signer.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(token_program.to_account_info(), transfer_instruction);

        anchor_spl::token::transfer(cpi_ctx, amount)
    }

    pub fn is_finished(&self) -> Result<bool> {
        let clock = Clock::get()?;
        let current_timestamp = clock.unix_timestamp as u64;

        msg!("current_timestamp {}", current_timestamp);
        msg!("self.end_date {}", self.end_date);

        Ok(self.end_date <= current_timestamp)
    }

    pub fn is_started(&self) -> Result<bool> {
        let clock = Clock::get()?;
        let current_timestamp = clock.unix_timestamp as u64;

        Ok(self.start_date <= current_timestamp)
    }
}
