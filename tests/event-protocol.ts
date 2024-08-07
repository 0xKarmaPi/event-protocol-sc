import * as anchor from "@coral-xyz/anchor"
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

    const [predictionEventPda, bump] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from("prediction_event"), id.toBuffer()],
      program.programId
    )

    await program.methods
      .deployEvent(id, "some(title)", "some(descrition)", new BN(endDate))
      .accountsStrict({
        payer: singer.publicKey,
        predictionEvent: predictionEventPda,
        systemProgram: web3.SystemProgram.programId,
        solLeftPool: null,
        solRightPool: null
      })
      .rpc()

    const predictionEvents = await program.account.predictionEvent.all()
    const solLeftPools = await program.account.solLeftPool.all()
    const solRightPools = await program.account.solRightPool.all()

    console.log("predictionEvent: ", predictionEvents)
    console.log("solLeftPools: ", solLeftPools)
    console.log("solRightPools: ", solRightPools)
  })
})
