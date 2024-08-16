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

    #[msg("Missing creator fee's ata")]
    MissingCreatorFeeAta,

    #[msg("Missing platform fee's ata")]
    MissingPlatformFeeAta,

    #[msg("This event does not have sol left pool")]
    LeftEvent,

    #[msg("This event does not have sol right pool")]
    RightEvent,

    #[msg("This event has not finsished yet, the end date is not reached or creator have not finished its")]
    NotFinishedEvent,

    #[msg("This event had finished")]
    FinishedEvent,

    #[msg("Missing left mint")]
    MissingLeftMint,

    #[msg("Missing left mint")]
    MissingRightMint,
}
