import * as anchor from "@coral-xyz/anchor"
import * as spl from "@solana/spl-token"
import { Program, web3 } from "@coral-xyz/anchor"
import { EventProtocol } from "../target/types/event_protocol"
import { expect } from "chai"
import { BN } from "bn.js"

describe("event-protocol", () => {
  const provider = anchor.AnchorProvider.env()

  anchor.setProvider(anchor.AnchorProvider.env())

  const program = anchor.workspace.EventProtocol as Program<EventProtocol>

  const singer = provider.wallet as anchor.Wallet

  it("Is initialized!", async () => {
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
      singer.payer,
      singer.publicKey,
      null,
      9
    )

    const rightMint = await spl.createMint(
      provider.connection,
      singer.payer,
      singer.publicKey,
      null,
      9
    )

    await program.methods
      .deployEvent(id, "some(title)", "some(descrition)", new BN(endDate))
      .accountsStrict({
        payer: singer.publicKey,
        predictionEvent,
        systemProgram: web3.SystemProgram.programId,
        leftMint,
        rightMint,
        leftPool,
        rightPool,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
        rent: web3.SYSVAR_RENT_PUBKEY
      })
      .rpc()

    const predictionEvents = await program.account.predictionEvent.all()

    console.log("predictionEvent: ", predictionEvents)
  })
})
