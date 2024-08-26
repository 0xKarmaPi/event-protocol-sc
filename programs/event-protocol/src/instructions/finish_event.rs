use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::constants::{
    MASTER_SEEDS, PREDICTION_EVENT_SEEDS_PREFIX, TOKENS_LEFT_POOL_SEEDS_PREFIX,
    TOKENS_RIGHT_POOL_SEEDS_PREFIX, TOKENS_SYSTEM_FEE_SEEDS_PREFIX,
};
use crate::error::Error;
use crate::events::FinishEvtEvent;
use crate::state::{Master, PredictionEvent, PredictionEventAccount, Side};

/// The instruction allow creator to set result for event
/// Transfer 2.5% tokens from losing side to creator and 2.5% to the system (if it is native sol token transfer to master)
/// Burn the losing side token if event is burning option
#[derive(Accounts)]
pub struct FinishEvent<'r> {
    #[account(
        mut,
        constraint = signer.key == &event.creator
    )]
    signer: Signer<'r>,

    #[account(
        seeds = [
            MASTER_SEEDS
        ],
        bump
    )]
    master: Account<'r, Master>,

    #[account(
        mut,
        seeds = [
            PREDICTION_EVENT_SEEDS_PREFIX,
            event.id.key().as_ref()
        ],
        bump
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
        bump
    )]
    left_pool: Option<Account<'r, TokenAccount>>,

    #[account(
        mut,
        seeds = [
            TOKENS_SYSTEM_FEE_SEEDS_PREFIX,
            event.left_mint.ok_or(Error::NonLeftEvent)?.as_ref()
        ],
        token::mint = left_mint,
        token::authority = system_left_fee,
        bump
    )]
    system_left_fee: Option<Account<'r, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = left_mint,
        associated_token::authority = signer,
    )]
    creator_left_beneficiary_ata: Option<Account<'r, TokenAccount>>,

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
        bump
    )]
    right_pool: Option<Account<'r, TokenAccount>>,

    #[account(
        mut,
        seeds = [
            TOKENS_SYSTEM_FEE_SEEDS_PREFIX,
            event.right_mint.ok_or(Error::NonRightEvent)?.as_ref()
        ],
        token::mint = right_mint,
        token::authority = system_right_fee,
        bump,
    )]
    system_right_fee: Option<Account<'r, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = right_mint,
        associated_token::authority = signer,
    )]
    creator_right_beneficiary_ata: Option<Account<'r, TokenAccount>>,

    token_program: Program<'r, Token>,

    system_program: Program<'r, System>,

    associated_token_program: Program<'r, AssociatedToken>,
}

pub fn handler(ctx: Context<FinishEvent>, result: Side) -> Result<()> {
    let event = &mut ctx.accounts.event;

    require!(event.is_finished()?, Error::NotFinishedEvent);

    event.result = Some(result);

    let key = event.key();

    match result {
        Side::Left => handle_set_left(ctx)?,
        Side::Right => handle_set_right(ctx)?,
    };

    emit!(FinishEvtEvent { key, result });

    Ok(())
}

fn handle_set_left(ctx: Context<FinishEvent>) -> Result<()> {
    let event = &mut ctx.accounts.event;

    let amount = event.right_pool / 1000 * 25;

    if event.right_mint.is_some() {
        let creator_beneficiary_ata = ctx
            .accounts
            .creator_right_beneficiary_ata
            .as_ref()
            .ok_or(Error::MissingCreatorFeeAta)?;

        let system_fee = ctx
            .accounts
            .system_right_fee
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
            creator_beneficiary_ata.to_account_info(),
            token_program,
            amount,
        )?;

        event.transfer_tokens_from_pool(
            pool,
            system_fee.to_account_info(),
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
        let creator_beneficiary_ata = ctx
            .accounts
            .creator_left_beneficiary_ata
            .as_ref()
            .ok_or(Error::MissingCreatorFeeAta)?;

        let system_fee = ctx
            .accounts
            .system_left_fee
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
            creator_beneficiary_ata.to_account_info(),
            token_program,
            amount,
        )?;

        event.transfer_tokens_from_pool(
            pool,
            system_fee.to_account_info(),
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
