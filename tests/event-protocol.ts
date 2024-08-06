import * as anchor from "@coral-xyz/anchor"
import { Program, web3 } from "@coral-xyz/anchor"
import { EventProtocol } from "../target/types/event_protocol"
import { expect } from "chai"

describe("event-protocol", () => {
  const provider = anchor.AnchorProvider.env()

  anchor.setProvider(anchor.AnchorProvider.env())

  const program = anchor.workspace.EventProtocol as Program<EventProtocol>

  const singer = provider.wallet as anchor.Wallet

  it("Is initialized!", async () => {
    const id = web3.Keypair.generate().publicKey
    const endDate = new Date().getSeconds() + 7 * 24 * 60 * 60

    const [predictionEventPda, bump] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from("prediction_event"), singer.publicKey.toBuffer()],
      program.programId
    )

    await program.methods
      .deployEvent([id, "some(title)", "some(descrition)", new Date()])
      .accountsStrict({
        payer: singer.publicKey,
        predictionEvent: predictionEventPda,
        systemProgram: web3.SystemProgram.programId
      })
      .rpc()

    const predictionEvent = await program.account.predictionEvent.fetch(
      predictionEventPda
    )

    expect(predictionEvent.bump).eq(bump)
  })
})
