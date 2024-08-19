use anchor_lang::prelude::*;

#[error_code]
pub enum Error {
    #[msg("Invalid time")]
    InvalidTime,

    #[msg("This event does not have the left mint and left pool")]
    NonLeftEvent,

    #[msg("This event does not have the right mint and right pool")]
    NonRightEvent,

    #[msg("Missing left pool account")]
    MissingLeftPool,

    #[msg("Missing right pool account")]
    MissingRightPool,

    #[msg("Missing sender's ata")]
    MissingSenderAta,

    #[msg("Missing creator fee's ata")]
    MissingCreatorFeeAta,

    #[msg("Missing platform fee's ata")]
    MissingPlatformFeeAta,

    #[msg("This event has not finsished yet, the end date is not reached or creator have not finished its")]
    NotFinishedEvent,

    #[msg("This event had finished")]
    FinishedEvent,

    #[msg("This event has not started yet")]
    NotStartedEvent,

    #[msg("This event had started")]
    StartedEvent,

    #[msg("Missing left mint")]
    MissingLeftMint,

    #[msg("Missing left mint")]
    MissingRightMint,

    #[msg("The event is not allow to withdraw, the losing side tokens had burned")]
    BurningEvent,
}
