use anchor_lang::prelude::*;

#[error_code]
pub enum Error {
    #[msg("Invalid mint account")]
    InvalidMint,

    #[msg("This event does not have the left mint and left pool")]
    NonLeftEvent,

    #[msg("This event does not have the right mint and right pool")]
    NonRightEvent,

    #[msg("Missing left pool")]
    MissingLeftPool,

    #[msg("Missing sender's ata")]
    MissingSenderAta,

    #[msg("This event does not have sol left pool")]
    LeftEvent,

    #[msg("This event does not have sol right pool")]
    RightEvent,
}
