mod constants;
mod error;
mod events;
mod instructions;
mod state;

use anchor_lang::prelude::*;
use instructions::*;
use state::Side;

declare_id!("EKaF2Vk8jgEqRdtxHy9smbHRSbsLXcS7nH7YWsckFcSC");

#[program]
pub mod event_protocol {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        initialize::hanlder(ctx)
    }

    pub fn deploy_event(
        ctx: Context<DeployEvent>,
        id: Pubkey,
        title: String,
        description: String,
        left_description: String,
        right_description: String,
        start_date: u64,
        end_date: u64,
        burning: bool,
    ) -> Result<()> {
        deploy_event::handler(
            ctx,
            id,
            title,
            description,
            left_description,
            right_description,
            start_date,
            end_date,
            burning,
        )
    }

    pub fn create_event_token_account(
        _ctx: Context<CreateEventTokenAccount>,
        _side: Side,
    ) -> Result<()> {
        create_event_token_account::handler(_ctx, _side)
    }

    pub fn create_system_fee_token_account(
        _ctx: Context<CreateSystemFeeTokenAccount>,
    ) -> Result<()> {
        create_system_fee_token_account::handler(_ctx)
    }

    pub fn vote_event(ctx: Context<VoteEvent>, selection: Side, amount: u64) -> Result<()> {
        vote_event::handler(ctx, selection, amount)
    }

    pub fn finish_event(ctx: Context<FinishEvent>, result: Side) -> Result<()> {
        finish_event::handler(ctx, result)
    }

    pub fn claim_rewards(ctx: Context<ClaimReward>) -> Result<()> {
        claim_rewards::handler(ctx)
    }

    pub fn close_event(ctx: Context<CloseEvent>) -> Result<()> {
        close_event::handler(ctx)
    }

    pub fn withdraw_deposited(ctx: Context<WithdrawDeposited>) -> Result<()> {
        withdraw_deposited::handler(ctx)
    }
}
