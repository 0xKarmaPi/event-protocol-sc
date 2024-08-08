import * as anchor from "@coral-xyz/anchor"
import * as spl from "@solana/spl-token"
import { Program, web3 } from "@coral-xyz/anchor"
import { EventProtocol } from "../target/types/event_protocol"
import { expect } from "chai"
import { BN } from "bn.js"
import { createPredictionEvent } from "../test-helper/create-prediction-event"

describe("vote_event instruction", () => {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  const program = anchor.workspace.EventProtocol as Program<EventProtocol>
  const signer = provider.wallet as anchor.Wallet

  it(`Vote event, left mint is "None", right mint is "None"`, async () => {
    const amount = new BN(web3.LAMPORTS_PER_SOL * 3)

    const { id, predictionEvent } = await createPredictionEvent(
      signer,
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
        signer.payer.publicKey.toBuffer()
      ],
      program.programId
    )

    await program.methods
      .voteEvent({ left: {} }, amount)
      .accountsStrict({
        leftMint: null,
        leftPool: null,
        leftSenderAta: null,

        rightMint: null,
        rightPool: null,
        rightSenderAta: null,

        predictionEvent,
        rent: web3.SYSVAR_RENT_PUBKEY,
        signer: signer.publicKey,
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

    expect(ticketAcc.creator.toBase58()).eq(signer.publicKey.toBase58())
    expect(ticketAcc.selection).property("left").not.null
    expect(ticketAcc.amount.eq(amount)).to.be.true
    expect(predictionEventAcc.solLeftPool?.eq(amount)).to.be.true
  })

  it(`Vote event, left is "Some", right is "None"`, async () => {
    const amount = new BN(web3.LAMPORTS_PER_SOL * 3)

    const { predictionEvent, id, leftPool, leftMint } =
      await createPredictionEvent(signer, provider, program, "some::none")

    const leftSenderAta = await spl.getOrCreateAssociatedTokenAccount(
      provider.connection,
      signer.payer,
      leftMint,
      signer.publicKey
    )

    await spl.mintTo(
      provider.connection,
      signer.payer,
      leftMint,
      leftSenderAta.address,
      signer.publicKey,
      web3.LAMPORTS_PER_SOL * 12
    )

    const [ticket] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("ticket"),
        Buffer.from("left"),
        id.toBuffer(),
        signer.payer.publicKey.toBuffer()
      ],
      program.programId
    )

    await program.methods
      .voteEvent({ left: {} }, amount)
      .accountsStrict({
        leftMint,
        leftPool,
        leftSenderAta: leftSenderAta.address,

        rightMint: null,
        rightPool: null,
        rightSenderAta: null,

        predictionEvent,
        rent: web3.SYSVAR_RENT_PUBKEY,
        signer: signer.publicKey,
        systemProgram: web3.SystemProgram.programId,
        ticket,
        tokenProgram: spl.TOKEN_PROGRAM_ID
      })
      .rpc()

    const ticketAcc = await program.account.ticket.fetch(ticket)
    const predictionEventAcc = await program.account.predictionEvent.fetch(
      predictionEvent
    )
    const leftPoolAcc = await spl.getAccount(provider.connection, leftPool)

    expect(ticketAcc.amount.eq(amount)).to.be.true
    expect(ticketAcc.creator.toBase58()).eq(signer.publicKey.toBase58())
    expect(ticketAcc.selection).property("left").to.be.not.null

    expect(predictionEventAcc.solLeftPool).to.be.null
    expect(predictionEventAcc.leftPool?.eq(amount)).to.be.true

    expect(leftPoolAcc.amount).eq(BigInt(amount.toString()))
  })
})
