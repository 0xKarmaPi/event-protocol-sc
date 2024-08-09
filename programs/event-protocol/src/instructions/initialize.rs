use anchor_lang::prelude::*;

use crate::master::Master;

#[derive(Accounts)]
pub struct Initialize<'r> {
    #[account(mut)]
    signer: Signer<'r>,

    #[account(
        init,
        space = 8 + Master::INIT_SPACE,
        payer = signer,
        seeds = [
            Master::SEED_PREFIX,
        ],
        bump,
    )]
    master: Account<'r, Master>,

    system_program: Program<'r, System>,
}

pub fn hanlder(ctx: Context<Initialize>) -> Result<()> {
    let signer = &ctx.accounts.signer;
    let master = &mut ctx.accounts.master;

    master.address = signer.key();
    master.bump = ctx.bumps.master;

    Ok(())
}
