use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::constants::PREDICTION_EVENT_SEEDS_PREFIX;

use super::Side;

/// The prediction event account
#[account]
#[derive(InitSpace, Debug)]
pub struct PredictionEvent {
    /// The event's unique id that is generated before deploying
    pub id: Pubkey,

    /// The event creator's wallet pubkey
    pub creator: Pubkey,

    /// The account's canonical bump
    pub bump: u8,

    /// The event's starting date in seconds timestamp
    pub start_date: u64,

    /// The event's ending date in seconds timestamp
    pub end_date: u64,

    /// The left side vault's amount
    pub left_pool: u64,

    /// The right side vault's amount
    pub right_pool: u64,

    /// The left side token mint's pubkey.
    /// If the left side is solana native token instead, it should be None
    pub left_mint: Option<Pubkey>,

    /// The right side token mint's pubkey.
    /// If the right side is solana native token instead, it should be None
    pub right_mint: Option<Pubkey>,

    /// The event's event, it was be set by the creator
    pub result: Option<Side>,

    /// The optional burning configuration,
    /// If set true the tokens losing side would be burned instead of claiming from the winning side's winners
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

    pub fn is_result_set(&self) -> bool {
        self.result.is_some()
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

    fn burn_tokens_from_pool(
        &self,
        mint: &Account<'r, Mint>,
        pool: &mut Account<'r, TokenAccount>,
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

    fn burn_tokens_from_pool(
        &self,
        mint: &Account<'r, Mint>,
        pool: &mut Account<'r, TokenAccount>,
        token_program: &Program<'r, Token>,
    ) -> Result<()> {
        let cpi_accounts = anchor_spl::token::Burn {
            mint: mint.to_account_info(),
            from: pool.to_account_info(),
            authority: self.to_account_info(),
        };

        let signer_seeds: &[&[&[u8]]] = &[&[
            PREDICTION_EVENT_SEEDS_PREFIX,
            self.id.as_ref(),
            &[self.bump],
        ]];

        let cpi_ctx = CpiContext::new_with_signer(
            token_program.to_account_info(),
            cpi_accounts,
            signer_seeds,
        );

        pool.reload()?;

        anchor_spl::token::burn(cpi_ctx, pool.amount)
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
