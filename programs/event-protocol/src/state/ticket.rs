use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone, PartialEq, Eq, InitSpace)]
pub enum Selection {
    Left,
    Right,
}

#[account]
#[derive(InitSpace)]
pub struct Ticket {
    pub creator: Pubkey,
    pub amount: u64,
    pub selection: Selection,
}

impl Ticket {
    pub const SEED_PREFIX: &'static [u8; 6] = b"ticket";
}

impl Selection {
    pub fn as_seeds(&self) -> &[u8] {
        match self {
            Self::Left => b"left",
            Self::Right => b"right",
        }
    }
}
