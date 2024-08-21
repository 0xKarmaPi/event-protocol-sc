use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::constants::TOKENS_SYSTEM_FEE_SEEDS_PREFIX;

/// The instruction is a part of the finish_event instruction
/// It allows to create system fee token account to hold the tokens from two sides
#[derive(Accounts)]
pub struct CreateSystemFeeTokenAccount<'r> {
    #[account(mut)]
    signer: Signer<'r>,

    mint: Account<'r, Mint>,

    #[account(
        init_if_needed,
        payer = signer,
        seeds = [
            TOKENS_SYSTEM_FEE_SEEDS_PREFIX,
            mint.key().as_ref()
        ],
        token::mint = mint,
        token::authority = system_fee,
        bump,
    )]
    system_fee: Account<'r, TokenAccount>,

    token_program: Program<'r, Token>,

    system_program: Program<'r, System>,
}

pub fn handler(_ctx: Context<CreateSystemFeeTokenAccount>) -> Result<()> {
    Ok(())
}
