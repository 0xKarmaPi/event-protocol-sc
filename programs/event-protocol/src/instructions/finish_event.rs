use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::error::Error;
use crate::master::Master;
use crate::prediction_event::PredictionEvent;
use crate::Selection;

#[derive(Accounts)]
pub struct FinishEvent<'r> {
    #[account(
        mut,
        constraint = signer.key == &prediction_event.creator
    )]
    signer: Signer<'r>,

    #[account(
        mut,
        seeds = [
            Master::SEED_PREFIX,
        ],
        bump = master.bump,
    )]
    master: Box<Account<'r, Master>>,

    #[account(
        mut,
        seeds = [
            PredictionEvent::SEED_PREFIX,
            prediction_event.id.key().as_ref(),
        ],
        bump = prediction_event.bump,
    )]
    prediction_event: Box<Account<'r, PredictionEvent>>,

    #[account(
        constraint = left_mint.key() == prediction_event.left_mint.ok_or(Error::NonLeftEvent)?.key()
    )]
    left_mint: Option<Box<Account<'r, Mint>>>,

    #[account(
        mut,
        seeds = [b"left_pool", prediction_event.id.key().as_ref()],
        token::mint = left_mint,
        token::authority = prediction_event,
        bump,
    )]
    left_pool: Option<Box<Account<'r, TokenAccount>>>,

    #[account(
        init_if_needed,
        payer = signer,
        seeds = [b"platform", prediction_event.left_mint.ok_or(Error::NonLeftEvent)?.as_ref()],
        token::mint = left_mint,
        token::authority = left_platform_fee,
        bump,
    )]
    left_platform_fee: Option<Box<Account<'r, TokenAccount>>>,

    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = left_mint,
        associated_token::authority = signer,
    )]
    left_creator_fee: Option<Box<Account<'r, TokenAccount>>>,

    #[account(
        constraint = right_mint.key() == prediction_event.right_mint.ok_or(Error::NonRightEvent)?.key()
    )]
    right_mint: Option<Box<Account<'r, Mint>>>,

    #[account(
        mut,
        seeds = [b"right_pool", prediction_event.id.key().as_ref()],
        token::mint = right_mint,
        token::authority = prediction_event,
        bump,
    )]
    right_pool: Option<Box<Account<'r, TokenAccount>>>,

    #[account(
        init_if_needed,
        payer = signer,
        seeds = [b"platform", prediction_event.right_mint.ok_or(Error::NonRightEvent)?.as_ref()],
        token::mint = right_mint,
        token::authority = right_platform_fee,
        bump,
    )]
    right_platform_fee: Option<Box<Account<'r, TokenAccount>>>,

    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = right_mint,
        associated_token::authority = signer,
    )]
    right_creator_fee: Option<Box<Account<'r, TokenAccount>>>,

    token_program: Program<'r, Token>,

    system_program: Program<'r, System>,

    associated_token_program: Program<'r, AssociatedToken>,
}

pub fn handler(ctx: Context<FinishEvent>, result: Selection) -> Result<()> {
    let clock = Clock::get()?;

    let prediction_event = &mut ctx.accounts.prediction_event;

    let current_timestamp = clock.unix_timestamp as u64;

    if current_timestamp < prediction_event.end_date {
        return err!(Error::NotFinishedEvent);
    }

    prediction_event.result = Some(result);

    let event_id = prediction_event.id;

    match result {
        Selection::Left => handle_set_left(ctx)?,
        Selection::Right => handle_set_right(ctx)?,
    };

    emit!(FinishEvtEvent { event_id, result });

    Ok(())
}

fn handle_set_left(ctx: Context<FinishEvent>) -> Result<()> {
    let prediction_event = &mut ctx.accounts.prediction_event;
    let signer = &ctx.accounts.signer;
    let token_program = &ctx.accounts.token_program;
    let master = &ctx.accounts.master;
    let right_pool = &ctx.accounts.right_pool;

    let pool_amount = prediction_event.right_pool;
    let amount = pool_amount / 1000 * 25;

    if prediction_event.right_mint.is_some() {
        // transfer 2.5 % token to creator and platform from right pool
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

        let pool = right_pool.as_ref().ok_or(Error::NonRightEvent)?;

        PredictionEvent::transfer_tokens(
            prediction_event,
            pool,
            creator_fee_ata.to_account_info(),
            amount,
            token_program,
        )?;

        PredictionEvent::transfer_tokens(
            prediction_event,
            pool,
            platform_fee_ata.to_account_info(),
            amount,
            token_program,
        )?;
    } else {
        // transfer 2.5 % sol to creator and platform from sol right pool
        prediction_event.sub_lamports(amount)?;
        signer.add_lamports(amount)?;

        prediction_event.sub_lamports(amount)?;
        master.add_lamports(amount)?;
    }

    prediction_event.right_pool -= amount * 2; // 95%

    Ok(())
}

fn handle_set_right(ctx: Context<FinishEvent>) -> Result<()> {
    let prediction_event = &mut ctx.accounts.prediction_event;
    let signer = &ctx.accounts.signer;
    let token_program = &ctx.accounts.token_program;
    let master = &ctx.accounts.master;
    let left_pool = &ctx.accounts.left_pool;

    let pool_amount = prediction_event.left_pool;
    let amount = pool_amount / 1000 * 25;

    if prediction_event.left_mint.is_some() {
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

        let pool = left_pool.as_ref().ok_or(Error::NonLeftEvent)?;

        PredictionEvent::transfer_tokens(
            prediction_event,
            pool,
            creator_fee_ata.to_account_info(),
            amount,
            token_program,
        )?;

        PredictionEvent::transfer_tokens(
            prediction_event,
            pool,
            platform_fee_ata.to_account_info(),
            amount,
            token_program,
        )?;
    } else {
        // transfer 2.5 % sol to creator and platform from sol left pool
        prediction_event.sub_lamports(amount)?;
        signer.add_lamports(amount)?;

        prediction_event.sub_lamports(amount)?;
        master.add_lamports(amount)?;
    }

    prediction_event.left_pool -= amount * 2; // 95%

    Ok(())
}

#[event]
struct FinishEvtEvent {
    event_id: Pubkey,
    result: Selection,
}
