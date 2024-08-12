import * as anchor from "@coral-xyz/anchor"
import { web3 } from "@coral-xyz/anchor"

import { Program } from "@coral-xyz/anchor"
import { EventProtocol } from "../target/types/event_protocol"
import { expect } from "chai"

describe("initialize instruction", () => {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  const program = anchor.workspace.EventProtocol as Program<EventProtocol>
  const signer = provider.wallet as anchor.Wallet

  it("initialize master", async () => {
    const [master, bump] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from("master")],
      program.programId
    )

    await program.methods
      .initialize()
      .accountsStrict({
        master,
        signer: signer.publicKey,
        systemProgram: web3.SystemProgram.programId
      })
      .rpc()

    const masterAcc = await program.account.master.fetch(master)

    expect(masterAcc.address.toBase58()).eq(signer.publicKey.toBase58())
    expect(masterAcc.bump).eq(bump)
  })
})
