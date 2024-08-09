use anchor_lang::{prelude::*, system_program};
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::{
    error::Error,
    prediction_event::PredictionEvent,
    ticket::{Selection, Ticket},
};

#[derive(Accounts)]
#[instruction(selection:  Selection)]
pub struct VoteEvent<'r> {
    #[account(mut)]
    signer: Signer<'r>,

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
        init_if_needed,
        space = 8 + Ticket::INIT_SPACE,
        payer = signer,
        seeds = [
            Ticket::SEED_PREFIX,
            selection.as_seeds(),
            prediction_event.id.key().as_ref(),
            signer.key().as_ref(),
        ],
        bump,
    )]
    ticket: Account<'r, Ticket>,

    left_mint: Option<Account<'r, Mint>>,

    #[account(mut)]
    left_sender_ata: Option<Account<'r, TokenAccount>>,

    #[account(
      mut,
      seeds = [b"left_pool", prediction_event.id.key().as_ref()],
      token::mint = left_mint,
      token::authority = prediction_event,
      bump,
    )]
    left_pool: Option<Account<'r, TokenAccount>>,

    right_mint: Option<Account<'r, Mint>>,

    #[account(
        mut,
        seeds = [b"right_pool", prediction_event.id.key().as_ref()],
        token::mint = right_mint,
        token::authority = prediction_event,
        bump,
    )]
    right_pool: Option<Account<'r, TokenAccount>>,

    #[account(mut)]
    right_sender_ata: Option<Account<'r, TokenAccount>>,

    system_program: Program<'r, System>,

    token_program: Program<'r, Token>,

    rent: Sysvar<'r, Rent>,
}

pub fn handler(ctx: Context<VoteEvent>, selection: Selection, amount: u64) -> Result<()> {
    let ticket = &mut ctx.accounts.ticket;
    let signer = &ctx.accounts.signer;

    ticket.creator = signer.key();
    ticket.amount += amount;
    ticket.selection = selection;

    match selection {
        Selection::Left => handle_vote_left(ctx, amount),
        Selection::Right => handle_vote_right(ctx, amount),
    }
}

fn handle_vote_left(ctx: Context<VoteEvent>, amount: u64) -> Result<()> {
    let prediction_event = &mut ctx.accounts.prediction_event;
    let signer = &ctx.accounts.signer;
    let left_mint = &ctx.accounts.left_mint;
    let left_pool = &ctx.accounts.left_pool;
    let left_sender_ata = &ctx.accounts.left_sender_ata;

    if let Some(left_mint) = left_mint {
        let event_left_mint = prediction_event.left_mint.ok_or(Error::NonLeftEvent)?;

        if event_left_mint != left_mint.key() {
            return err!(Error::InvalidMint);
        }

        let left_pool = left_pool.as_ref().ok_or(Error::MissingLeftPool)?;

        let left_sender_ata = left_sender_ata.as_ref().ok_or(Error::MissingSenderAta)?;

        let transfer_instruction = anchor_spl::token::Transfer {
            from: left_sender_ata.to_account_info(),
            to: left_pool.to_account_info(),
            authority: signer.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            transfer_instruction,
        );

        anchor_spl::token::transfer(cpi_ctx, amount)?;

        let left_pool = prediction_event
            .left_pool
            .as_mut()
            .ok_or(Error::NonLeftEvent)?;

        *left_pool += amount;
    } else {
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: signer.to_account_info(),
                to: prediction_event.to_account_info(),
            },
        );

        let sol_left_pool = prediction_event
            .sol_left_pool
            .as_mut()
            .ok_or(Error::LeftEvent)?;

        system_program::transfer(cpi_context, amount)?;

        *sol_left_pool += amount;
    }

    Ok(())
}

fn handle_vote_right(ctx: Context<VoteEvent>, amount: u64) -> Result<()> {
    let prediction_event = &mut ctx.accounts.prediction_event;
    let signer = &ctx.accounts.signer;
    let right_mint = &ctx.accounts.right_mint;
    let right_pool = &ctx.accounts.right_pool;
    let right_sender_ata = &ctx.accounts.right_sender_ata;

    if let Some(right_mint) = right_mint {
        let event_right_mint = prediction_event.right_mint.ok_or(Error::NonRightEvent)?;

        if event_right_mint != right_mint.key() {
            return err!(Error::InvalidMint);
        }

        let right_pool = right_pool.as_ref().ok_or(Error::NonRightEvent)?;

        let right_sender_ata = right_sender_ata.as_ref().ok_or(Error::MissingSenderAta)?;

        let transfer_instruction = anchor_spl::token::Transfer {
            from: right_sender_ata.to_account_info(),
            to: right_pool.to_account_info(),
            authority: signer.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            transfer_instruction,
        );

        anchor_spl::token::transfer(cpi_ctx, amount)?;

        let right_pool = prediction_event
            .right_pool
            .as_mut()
            .ok_or(Error::NonRightEvent)?;

        *right_pool += amount;
    } else {
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: signer.to_account_info(),
                to: prediction_event.to_account_info(),
            },
        );

        let sol_right_pool = prediction_event
            .sol_right_pool
            .as_mut()
            .ok_or(Error::RightEvent)?;

        system_program::transfer(cpi_context, amount)?;

        *sol_right_pool += amount;
    }

    Ok(())
}
