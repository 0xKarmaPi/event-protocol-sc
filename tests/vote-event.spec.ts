import * as anchor from "@coral-xyz/anchor"
import * as spl from "@solana/spl-token"
import { Program, web3 } from "@coral-xyz/anchor"
import { EventProtocol } from "../target/types/event_protocol"
import { expect } from "chai"
import { BN } from "bn.js"
import { createPredictionEvent } from "./helper"

describe("vote_event instruction", () => {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  const program = anchor.workspace.EventProtocol as Program<EventProtocol>
  const singer = provider.wallet as anchor.Wallet

  it(`Vote event, left mint is "None", right mint is "None"`, async () => {
    const amount = new BN(web3.LAMPORTS_PER_SOL * 3)

    const { id, predictionEvent } = await createPredictionEvent(
      singer,
      provider,
      program,
      "none::none"
    )

    const beforeLamports = await provider.connection.getBalance(predictionEvent)

    const [ticket] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("ticket"),
        Buffer.from("left"),
        id.toBuffer(),
        singer.payer.publicKey.toBuffer()
      ],
      program.programId
    )
    await program.methods
      .voteEvent({ left: {} }, amount)
      .accountsStrict({
        leftMint: null,
        rightMint: null,
        leftPool: null,
        rightPool: null,
        leftSenderAta: null,
        rightSenderAta: null,
        predictionEvent,
        rent: web3.SYSVAR_RENT_PUBKEY,
        signer: singer.publicKey,
        systemProgram: web3.SystemProgram.programId,
        ticket,
        tokenProgram: spl.TOKEN_PROGRAM_ID
      })
      .rpc()

    const afterLamports = await provider.connection.getBalance(predictionEvent)
    const ticketAcc = await program.account.ticket.fetch(ticket)
    const predictionEventAcc = await program.account.predictionEvent.fetch(
      predictionEvent
    )

    expect(new BN(beforeLamports).add(amount).eq(new BN(afterLamports))).to.be
      .true

    expect(ticketAcc.creator.toBase58()).eq(singer.publicKey.toBase58())
    expect(ticketAcc.selection).property("left").not.null
    expect(ticketAcc.amount.eq(amount)).to.be.true
    expect(predictionEventAcc.solLeftPool?.eq(amount)).to.be.true
  })
})
