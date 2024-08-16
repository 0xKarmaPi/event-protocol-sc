mod constants;
mod error;
mod events;
mod instructions;
mod state;

use anchor_lang::prelude::*;
use instructions::*;
use state::Selection;

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
        end_date: u64,
    ) -> Result<()> {
        deploy_event::handler(ctx, id, title, description, end_date)
    }

    pub fn create_token_event_pool(
        _ctx: Context<CreateTokenEventPool>,
        _event_id: Pubkey,
    ) -> Result<()> {
        create_token_event_pool::handler(_ctx, _event_id)
    }

    pub fn create_token_platform_pool(
        _ctx: Context<CreateTokenPlatformPool>,
        _event_id: Pubkey,
    ) -> Result<()> {
        create_token_platform_pool::handler(_ctx, _event_id)
    }

    pub fn vote_event(ctx: Context<VoteEvent>, selection: Selection, amount: u64) -> Result<()> {
        vote_event::handler(ctx, selection, amount)
    }

    pub fn finish_event(ctx: Context<FinishEvent>, result: Selection) -> Result<()> {
        finish_event::handler(ctx, result)
    }

    pub fn claim_rewards(ctx: Context<ClaimReward>) -> Result<()> {
        claim_rewards::handler(ctx)
    }
}
