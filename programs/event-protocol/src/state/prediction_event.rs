use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};

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
    pub fn is_finished(&self) -> Result<bool> {
        let clock = Clock::get()?;
        let current_timestamp = clock.unix_timestamp as u64;

        Ok(self.end_date <= current_timestamp)
    }

    pub fn is_started(&self) -> Result<bool> {
        let clock = Clock::get()?;
        let current_timestamp = clock.unix_timestamp as u64;

        Ok(self.start_date <= current_timestamp)
    }
}

pub trait TokensPool<'r> {
    fn take_tokens_from_sender(
        &self,
        signer: &Signer<'r>,
        sender_ata: &Account<'r, TokenAccount>,
        token_program: &Program<'r, Token>,
        amount: u64,
    ) -> Result<()>;
}

pub trait PredictionEventAccount<'r> {
    fn transfer_tokens_from_pool(
        &self,
        pool: &Account<'r, TokenAccount>,
        to: AccountInfo<'r>,
        token_program: &Program<'r, Token>,
        amount: u64,
    ) -> Result<()>;

    fn take_sols_from_sender(
        &self,
        signer: &Signer<'r>,
        system_program: &Program<'r, System>,
        amount: u64,
    ) -> Result<()>;

    fn close_pool(
        &self,
        pool: &Account<'r, TokenAccount>,
        destination: &Signer<'r>,
        token_program: &Program<'r, Token>,
    ) -> Result<()>;
}

impl<'r> PredictionEventAccount<'r> for Account<'r, PredictionEvent> {
    fn transfer_tokens_from_pool(
        &self,
        pool: &Account<'r, TokenAccount>,
        to: AccountInfo<'r>,
        token_program: &Program<'r, Token>,
        amount: u64,
    ) -> Result<()> {
        let transfer_instruction = anchor_spl::token::Transfer {
            from: pool.to_account_info(),
            to,
            authority: self.to_account_info(),
        };

        let signer_seeds: &[&[&[u8]]] = &[&[
            PREDICTION_EVENT_SEEDS_PREFIX,
            self.id.as_ref(),
            &[self.bump],
        ]];

        let cpi_ctx = CpiContext::new_with_signer(
            token_program.to_account_info(),
            transfer_instruction,
            signer_seeds,
        );

        anchor_spl::token::transfer(cpi_ctx, amount)
    }

    fn take_sols_from_sender(
        &self,
        signer: &Signer<'r>,
        system_program: &Program<'r, System>,
        amount: u64,
    ) -> Result<()> {
        let cpi_context = CpiContext::new(
            system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: signer.to_account_info(),
                to: self.to_account_info(),
            },
        );

        anchor_lang::system_program::transfer(cpi_context, amount)
    }

    fn close_pool(
        &self,
        pool: &Account<'r, TokenAccount>,
        destination: &Signer<'r>,
        token_program: &Program<'r, Token>,
    ) -> Result<()> {
        let cpi_accounts = anchor_spl::token::CloseAccount {
            account: pool.to_account_info(),
            destination: destination.to_account_info(),
            authority: self.to_account_info(),
        };

        let cpi_program = token_program.to_account_info();

        let signer_seeds: &[&[&[u8]]] = &[&[
            PREDICTION_EVENT_SEEDS_PREFIX,
            self.id.as_ref(),
            &[self.bump],
        ]];

        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);

        anchor_spl::token::close_account(cpi_ctx)
    }
}

impl<'r> TokensPool<'r> for Account<'r, TokenAccount> {
    fn take_tokens_from_sender(
        &self,
        signer: &Signer<'r>,
        sender_ata: &Account<'r, TokenAccount>,
        token_program: &Program<'r, Token>,
        amount: u64,
    ) -> Result<()> {
        let transfer_instruction = anchor_spl::token::Transfer {
            from: sender_ata.to_account_info(),
            to: self.to_account_info(),
            authority: signer.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(token_program.to_account_info(), transfer_instruction);

        anchor_spl::token::transfer(cpi_ctx, amount)
    }
}
