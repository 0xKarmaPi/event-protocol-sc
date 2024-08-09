mod error;
mod instructions;
mod state;

use anchor_lang::prelude::*;

use instructions::*;
use state::*;

declare_id!("Fz24nmvrheUJJXbSwbMkP6FpMFFxbjuDqV99AZLWmASf");

#[program]
pub mod event_protocol {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        initialize::hanlder(ctx)
    }

    pub fn deploy_nn_event(
        ctx: Context<DeployNNEvent>,
        id: Pubkey,
        title: String,
        description: String,
        end_date: u64,
    ) -> Result<()> {
        deploy_nn_event::handler(ctx, id, title, description, end_date)
    }

    pub fn deploy_ss_event(
        ctx: Context<DeploySSEvent>,
        id: Pubkey,
        title: String,
        description: String,

        end_date: u64,
    ) -> Result<()> {
        deploy_ss_event::handler(ctx, id, title, description, end_date)
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

    pub fn vote_event(ctx: Context<VoteEvent>, selection: Selection, amount: u64) -> Result<()> {
        vote_event::handler(ctx, selection, amount)
    }
}
