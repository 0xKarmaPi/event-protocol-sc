import * as anchor from "@coral-xyz/anchor"
import { web3 } from "@coral-xyz/anchor"
import { EventProtocol } from "../target/types/event_protocol"
import {
  TOKENS_LEFT_POOL_SEEDS_PREFIX,
  TOKENS_RIGHT_POOL_SEEDS_PREFIX
} from "./const"
import * as spl from "@solana/spl-token"

export async function closePredictionEvent(
  signer: anchor.Wallet,
  program: anchor.Program<EventProtocol>,
  event: web3.PublicKey
) {
  const eventAcc = await program.account.predictionEvent.fetch(event)

  const [leftPool] = web3.PublicKey.findProgramAddressSync(
    [TOKENS_LEFT_POOL_SEEDS_PREFIX, eventAcc.id.toBuffer()],
    program.programId
  )

  const [rightPool] = web3.PublicKey.findProgramAddressSync(
    [TOKENS_RIGHT_POOL_SEEDS_PREFIX, eventAcc.id.toBuffer()],
    program.programId
  )

  await program.methods
    .closeEvent(eventAcc.id)
    .accountsStrict({
      event,
      leftMint: eventAcc.leftMint,
      rightMint: eventAcc.rightMint,
      leftPool: eventAcc.leftMint ? leftPool : null,
      rightPool: eventAcc.rightPool ? rightPool : null,
      signer: signer.publicKey,
      tokenProgram: spl.TOKEN_PROGRAM_ID
    })
    .rpc()
}
