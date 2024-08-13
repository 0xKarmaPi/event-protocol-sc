use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, TokenAccount};

use crate::{error::Error, prediction_event::PredictionEvent, Ticket};

#[derive(Accounts)]
pub struct ClaimReward<'r> {
    #[account(mut)]
    signer: Signer<'r>,

    #[account(
        seeds = [
            PredictionEvent::SEED_PREFIX,
            prediction_event.id.key().as_ref(),
        ],
        bump = prediction_event.bump,
    )]
    prediction_event: Box<Account<'r, PredictionEvent>>,

    #[account(
        seeds = [
            Ticket::SEED_PREFIX,
            prediction_event.result.ok_or(Error::NotFinishedEvent)?.as_seeds(),
            prediction_event.id.key().as_ref(),
            signer.key().as_ref(),
        ],
        bump,
    )]
    ticket: Box<Account<'r, Ticket>>,

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
}

pub fn handler(_ctx: Context<ClaimReward>) -> Result<()> {
    // let ticket = &ctx.accounts.ticket;
    // let prediction_event = &ctx.accounts.prediction_event;

    // let result = prediction_event.result.ok_or(Error::NotFinishedEvent)?;

    // match result {
    //     Selection::Left => {
    //         if let Some(right_mint) = prediction_event.right_mint {
    //         } else {
    //         }
    //     }
    //     Selection::Right => {}
    // };

    Ok(())
}

// fn on_left(ctx: Context<ClaimReward>) -> Result<()> {
//     // let ticket = &ctx.accounts.ticket;
//     // let prediction_event = &ctx.accounts.prediction_event;
//     // let signer = &ctx.accounts.signer;

//     // if let Some(right_mint) = prediction_event.right_mint {
//     // } else {
//     //     let losing_pool = prediction_event.sol_right_pool.ok_or(Error::RightEvent)?;
//     //     let winning_pool = prediction_event.sol_left_pool.ok_or(Error::LeftEvent)?;
//     // }

//     Ok(())
// }
