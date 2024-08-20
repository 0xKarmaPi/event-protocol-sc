use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::constants::{
    MASTER_SEEDS, PREDICTION_EVENT_SEEDS_PREFIX, TOKENS_LEFT_POOL_SEEDS_PREFIX,
    TOKENS_PLATFORM_POOL_SEEDS_PREFIX, TOKENS_RIGHT_POOL_SEEDS_PREFIX,
};
use crate::error::Error;
use crate::events::FinishEvtEvent;
use crate::state::{Master, PredictionEvent, PredictionEventAccount, Side};

#[derive(Accounts)]
pub struct FinishEvent<'r> {
    #[account(
        mut,
        constraint = signer.key == &event.creator
    )]
    signer: Signer<'r>,

    #[account(
        mut,
        seeds = [
            MASTER_SEEDS,
        ],
        bump,
    )]
    master: Account<'r, Master>,

    #[account(
        mut,
        seeds = [
            PREDICTION_EVENT_SEEDS_PREFIX,
            event.id.key().as_ref(),
        ],
        bump,
    )]
    event: Account<'r, PredictionEvent>,

    #[account(
        mut,
        constraint = left_mint.key() == event.left_mint.ok_or(Error::NonLeftEvent)?.key()
    )]
    left_mint: Option<Account<'r, Mint>>,

    #[account(
        mut,
        seeds = [
            TOKENS_LEFT_POOL_SEEDS_PREFIX,
            event.id.key().as_ref()
        ],
        token::mint = left_mint,
        token::authority = event,
        bump,
    )]
    left_pool: Option<Account<'r, TokenAccount>>,

    #[account(
        mut,
        seeds = [
            TOKENS_PLATFORM_POOL_SEEDS_PREFIX,
            event.left_mint.ok_or(Error::NonLeftEvent)?.as_ref()
        ],
        token::mint = left_mint,
        token::authority = left_platform_fee,
        bump,
    )]
    left_platform_fee: Option<Account<'r, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = left_mint,
        associated_token::authority = signer,
    )]
    left_creator_fee: Option<Account<'r, TokenAccount>>,

    #[account(
        mut,
        constraint = right_mint.key() == event.right_mint.ok_or(Error::NonRightEvent)?.key()
    )]
    right_mint: Option<Account<'r, Mint>>,

    #[account(
        mut,
        seeds = [
            TOKENS_RIGHT_POOL_SEEDS_PREFIX,
            event.id.key().as_ref()
        ],
        token::mint = right_mint,
        token::authority = event,
        bump,
    )]
    right_pool: Option<Account<'r, TokenAccount>>,

    #[account(
        mut,
        seeds = [
            TOKENS_PLATFORM_POOL_SEEDS_PREFIX,
            event.right_mint.ok_or(Error::NonRightEvent)?.as_ref()
        ],
        token::mint = right_mint,
        token::authority = right_platform_fee,
        bump,
    )]
    right_platform_fee: Option<Account<'r, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = right_mint,
        associated_token::authority = signer,
    )]
    right_creator_fee: Option<Account<'r, TokenAccount>>,

    token_program: Program<'r, Token>,

    system_program: Program<'r, System>,

    associated_token_program: Program<'r, AssociatedToken>,
}

// transfer 2.5% to creator and platform, burn 95% remaininng if event.burning
pub fn handler(ctx: Context<FinishEvent>, result: Side) -> Result<()> {
    let event = &mut ctx.accounts.event;

    require!(event.is_finished()?, Error::NotFinishedEvent);

    event.result = Some(result);

    let event_id = event.id;

    match result {
        Side::Left => handle_set_left(ctx)?,
        Side::Right => handle_set_right(ctx)?,
    };

    emit!(FinishEvtEvent { event_id, result });

    Ok(())
}

fn handle_set_left(ctx: Context<FinishEvent>) -> Result<()> {
    let event = &mut ctx.accounts.event;

    let amount = event.right_pool / 1000 * 25;

    if event.right_mint.is_some() {
        let creator_fee_ata = ctx
            .accounts
            .right_creator_fee
            .as_ref()
            .ok_or(Error::MissingCreatorFeeAta)?;

        let platform_fee_ata = ctx
            .accounts
            .right_platform_fee
            .as_ref()
            .ok_or(Error::MissingPlatformFeeAta)?;

        let pool = ctx
            .accounts
            .right_pool
            .as_mut()
            .ok_or(Error::MissingRightPool)?;

        let token_program = &ctx.accounts.token_program;

        event.transfer_tokens_from_pool(
            pool,
            creator_fee_ata.to_account_info(),
            token_program,
            amount,
        )?;

        event.transfer_tokens_from_pool(
            pool,
            platform_fee_ata.to_account_info(),
            token_program,
            amount,
        )?;

        if event.burning {
            let mint = ctx
                .accounts
                .right_mint
                .as_ref()
                .ok_or(Error::MissingRightMint)?;

            event.burn_tokens_from_pool(mint, pool, token_program)?;
        }
    } else {
        let master = &ctx.accounts.master;
        let signer = &ctx.accounts.signer;

        event.sub_lamports(amount)?;
        signer.add_lamports(amount)?;

        event.sub_lamports(amount)?;
        master.add_lamports(amount)?;
    }

    event.right_pool -= amount * 2; // 95%

    Ok(())
}

fn handle_set_right(ctx: Context<FinishEvent>) -> Result<()> {
    let event = &mut ctx.accounts.event;

    let amount = event.left_pool / 1000 * 25;

    if event.left_mint.is_some() {
        // transfer 2.5 % token to creator and platform from left pool
        let creator_fee_ata = ctx
            .accounts
            .left_creator_fee
            .as_ref()
            .ok_or(Error::MissingCreatorFeeAta)?;

        let platform_fee_ata = ctx
            .accounts
            .left_platform_fee
            .as_ref()
            .ok_or(Error::MissingPlatformFeeAta)?;

        let pool = ctx
            .accounts
            .left_pool
            .as_mut()
            .ok_or(Error::MissingLeftPool)?;

        let token_program = &ctx.accounts.token_program;

        event.transfer_tokens_from_pool(
            pool,
            creator_fee_ata.to_account_info(),
            token_program,
            amount,
        )?;

        event.transfer_tokens_from_pool(
            pool,
            platform_fee_ata.to_account_info(),
            token_program,
            amount,
        )?;

        if event.burning {
            let mint = ctx
                .accounts
                .left_mint
                .as_ref()
                .ok_or(Error::MissingLeftMint)?;

            event.burn_tokens_from_pool(mint, pool, token_program)?;
        }
    } else {
        // transfer 2.5 % sol to creator and platform from sol left pool
        let master = &ctx.accounts.master;
        let signer = &ctx.accounts.signer;

        event.sub_lamports(amount)?;
        signer.add_lamports(amount)?;

        event.sub_lamports(amount)?;
        master.add_lamports(amount)?;
    }

    event.left_pool -= amount * 2; // 95%

    Ok(())
}
