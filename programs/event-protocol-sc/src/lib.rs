use anchor_lang::prelude::*;

declare_id!("6vG8Nz6smWS5BDdCowUdaEWAC4F8RAVEmGDD3j5ittMk");

#[program]
pub mod event_protocol_sc {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
