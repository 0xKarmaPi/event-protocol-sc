use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

#[derive(Accounts)]
pub struct CreateTokenPlatformPool<'r> {
    #[account(mut)]
    signer: Signer<'r>,

    mint: Account<'r, Mint>,

    #[account(
        init_if_needed,
        payer = signer,
        seeds = [b"platform",mint.key().as_ref()],
        token::mint = mint,
        token::authority = platform_pool,
        bump,
    )]
    platform_pool: Option<Box<Account<'r, TokenAccount>>>,

    token_program: Program<'r, Token>,

    system_program: Program<'r, System>,
}

pub fn handler(_ctx: Context<CreateTokenPlatformPool>, _event_id: Pubkey) -> Result<()> {
    Ok(())
}
