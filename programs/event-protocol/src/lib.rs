pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("Fz24nmvrheUJJXbSwbMkP6FpMFFxbjuDqV99AZLWmASf");

#[program]
pub mod event_protocol {
    use super::*;

    pub fn initialize(ctx: Context<DeployEvent>) -> Result<()> {
        deploy_event::handler(ctx)
    }
}
