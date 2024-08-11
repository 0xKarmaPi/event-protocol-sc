use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount};

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
    master: Account<'r, Master>,

    #[account(
        mut,
        seeds = [
            PredictionEvent::SEED_PREFIX,
            prediction_event.id.key().as_ref(),
        ],
        bump = prediction_event.bump,
    )]
    prediction_event: Account<'r, PredictionEvent>,

    #[account(
        constraint = left_mint.key() == prediction_event.left_mint.ok_or(Error::NonLeftEvent)?.key()
    )]
    left_mint: Option<Account<'r, Mint>>,

    #[account(
        init_if_needed,
        payer = signer,
        seeds = [b"platform", prediction_event.left_mint.ok_or(Error::NonLeftEvent)?.as_ref()],
        token::mint = left_mint,
        token::authority = left_platform_fee,
        bump,
    )]
    left_platform_fee: Option<Account<'r, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = left_mint,
        associated_token::authority = signer,
    )]
    left_creator_fee: Option<Account<'r, TokenAccount>>,

    #[account(
        constraint = right_mint.key() == prediction_event.right_mint.ok_or(Error::NonRightEvent)?.key()
    )]
    right_mint: Option<Account<'r, Mint>>,

    #[account(
        init_if_needed,
        payer = signer,
        seeds = [b"platform", prediction_event.left_mint.ok_or(Error::NonRightEvent)?.as_ref()],
        token::mint = right_mint,
        token::authority = right_platform_fee,
        bump,
    )]
    right_platform_fee: Option<Account<'r, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = right_mint,
        associated_token::authority = signer,
    )]
    right_creator_fee: Option<Account<'r, TokenAccount>>,

    token_program: Program<'r, Token>,

    system_program: Program<'r, System>,

    associated_token_program: Program<'r, AssociatedToken>,

    rent: Sysvar<'r, Rent>,
}

pub fn handler(ctx: Context<FinishEvent>, result: Selection) -> Result<()> {
    let clock = Clock::get()?;

    let prediction_event = &mut ctx.accounts.prediction_event;

    let current_timestamp = clock.unix_timestamp as u64;

    if current_timestamp < prediction_event.end_date {
        return err!(Error::NotFinishedEvent);
    }

    prediction_event.result = Some(result);

    match result {
        Selection::Left => handle_set_left(ctx),
        Selection::Right => handle_set_right(ctx),
    }
}

fn handle_set_left(ctx: Context<FinishEvent>) -> Result<()> {
    let prediction_event = &ctx.accounts.prediction_event;
    let signer = &ctx.accounts.signer;
    let token_program = &ctx.accounts.token_program;
    let master = &ctx.accounts.master;

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

        let right_pool = prediction_event.right_pool.ok_or(Error::NonRightEvent)?;

        let amount = right_pool / 100 * 25;

        transfer_token_from_prediction_event(
            prediction_event,
            creator_fee_ata.to_account_info(),
            amount,
            token_program,
        )?;

        transfer_token_from_prediction_event(
            prediction_event,
            platform_fee_ata.to_account_info(),
            amount,
            token_program,
        )?;
    } else {
        // transfer 2.5 % sol to creator and platform from sol right pool
        let sol_right_pool = prediction_event.sol_right_pool.ok_or(Error::RightEvent)?;

        let amount = sol_right_pool / 100 * 25;

        prediction_event.sub_lamports(amount)?;
        signer.add_lamports(amount)?;

        prediction_event.sub_lamports(amount)?;
        master.add_lamports(amount)?;
    }

    Ok(())
}

fn handle_set_right(ctx: Context<FinishEvent>) -> Result<()> {
    let prediction_event = &ctx.accounts.prediction_event;
    let signer = &ctx.accounts.signer;
    let token_program = &ctx.accounts.token_program;
    let master = &ctx.accounts.master;

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

        let left_pool = prediction_event.left_pool.ok_or(Error::NonLeftEvent)?;

        let amount = left_pool / 100 * 25;

        transfer_token_from_prediction_event(
            prediction_event,
            creator_fee_ata.to_account_info(),
            amount,
            token_program,
        )?;

        transfer_token_from_prediction_event(
            prediction_event,
            platform_fee_ata.to_account_info(),
            amount,
            token_program,
        )?;
    } else {
        // transfer 2.5 % sol to creator and platform from sol left pool
        let sol_left_pool = prediction_event.sol_right_pool.ok_or(Error::LeftEvent)?;

        let amount = sol_left_pool / 100 * 25;

        prediction_event.sub_lamports(amount)?;
        signer.add_lamports(amount)?;

        prediction_event.sub_lamports(amount)?;
        master.add_lamports(amount)?;
    }

    Ok(())
}

fn transfer_token_from_prediction_event<'r>(
    prediction_event: &Account<'r, PredictionEvent>,
    to: AccountInfo<'r>,
    amount: u64,
    token_program: &Program<'r, Token>,
) -> Result<()> {
    let transfer_instruction = token::Transfer {
        from: prediction_event.to_account_info(),
        to,
        authority: prediction_event.to_account_info(),
    };

    let bump = prediction_event.bump;
    let seeds = &[
        PredictionEvent::SEED_PREFIX,
        prediction_event.id.as_ref(),
        &[bump],
    ];

    let signer_seeds = &[&seeds[..]];

    let cpi_ctx = CpiContext::new_with_signer(
        token_program.to_account_info(),
        transfer_instruction,
        signer_seeds,
    );

    anchor_spl::token::transfer(cpi_ctx, amount)?;

    Ok(())
}
