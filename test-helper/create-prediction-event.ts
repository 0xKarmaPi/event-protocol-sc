import * as anchor from "@coral-xyz/anchor"
import * as spl from "@solana/spl-token"
import { web3 } from "@coral-xyz/anchor"
import { EventProtocol } from "../target/types/event_protocol"
import { BN } from "bn.js"

type Options = "some::some" | "some::none" | "none::some" | "none::none"

export async function createPredictionEvent(
  signer: anchor.Wallet,
  provider: anchor.AnchorProvider,
  program: anchor.Program<EventProtocol>,
  options: Options
) {
  const id = web3.Keypair.generate().publicKey
  const endDate = new Date().getSeconds() + 7 * 24 * 60 * 60

  const [predictionEvent] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("prediction_event"), id.toBuffer()],
    program.programId
  )

  const [leftPool] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("left_pool"), id.toBuffer()],
    program.programId
  )

  const [rightPool] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("right_pool"), id.toBuffer()],
    program.programId
  )

  const leftMint = await spl.createMint(
    provider.connection,
    signer.payer,
    signer.publicKey,
    null,
    9
  )

  const rightMint = await spl.createMint(
    provider.connection,
    signer.payer,
    signer.publicKey,
    null,
    9
  )

  const isLeftSome = options === "some::some" || options === "some::none"
  const isRightSome = options === "some::some" || options === "none::some"

  await program.methods
    .deployEvent(id, "some(title)", "some(description)", new BN(endDate))
    .accountsStrict({
      payer: signer.publicKey,
      predictionEvent,
      systemProgram: web3.SystemProgram.programId,
      leftMint: isLeftSome ? leftMint : null,
      rightMint: isRightSome ? rightMint : null,
      leftPool: isLeftSome ? leftPool : null,
      rightPool: isRightSome ? rightPool : null,
      tokenProgram: spl.TOKEN_PROGRAM_ID,
      rent: web3.SYSVAR_RENT_PUBKEY
    })
    .rpc()

  const predictionEventAcc = await program.account.predictionEvent.fetch(
    predictionEvent
  )

  return {
    id,
    predictionEvent,
    predictionEventAcc,
    leftMint,
    rightMint,
    leftPool,
    rightPool
  }
}
