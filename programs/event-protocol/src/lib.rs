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
