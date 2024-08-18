mod constants;
mod error;
mod events;
mod instructions;
mod state;

use anchor_lang::prelude::*;
use instructions::*;
use state::Side;

declare_id!("Fz24nmvrheUJJXbSwbMkP6FpMFFxbjuDqV99AZLWmASf");

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
        start_date: u64,
        end_date: u64,
        burning: bool,
    ) -> Result<()> {
        deploy_event::handler(ctx, id, title, description, start_date, end_date, burning)
    }

    pub fn create_token_event_pool(
        _ctx: Context<CreateTokenEventPool>,
        _event_id: Pubkey,
        _side: Side,
    ) -> Result<()> {
        create_token_event_pool::handler(_ctx, _event_id, _side)
    }

    pub fn create_token_platform_pool(
        _ctx: Context<CreateTokenPlatformPool>,
        _event_id: Pubkey,
    ) -> Result<()> {
        create_token_platform_pool::handler(_ctx, _event_id)
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

    pub fn close_event(ctx: Context<CloseEvent>, id: Pubkey) -> Result<()> {
        close_event::handler(ctx, id)
    }
}
