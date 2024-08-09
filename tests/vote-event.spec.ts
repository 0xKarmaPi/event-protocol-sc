import * as anchor from "@coral-xyz/anchor"
import * as spl from "@solana/spl-token"
import { Program, web3 } from "@coral-xyz/anchor"
import { EventProtocol } from "../target/types/event_protocol"
import { expect } from "chai"
import { BN } from "bn.js"
import { createPredictionEvent } from "../test-helper/create-prediction-event"
import { SELECTION } from "../test-helper/const"

describe("vote_event instruction", () => {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  const program = anchor.workspace.EventProtocol as Program<EventProtocol>
  const signer = provider.wallet as anchor.Wallet

  it(`Vote event(left), left mint is "None", right mint is "None"`, async () => {
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
      .voteEvent(SELECTION.Left, amount)
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

    expect(new BN(beforeLamports).add(amount).eq(new BN(afterLamports))).be.true

    expect(ticketAcc.creator.toBase58()).eq(signer.publicKey.toBase58())
    expect(ticketAcc.selection).deep.eq(SELECTION.Left)
    expect(ticketAcc.amount.eq(amount)).be.true
    expect(predictionEventAcc.solLeftPool?.eq(amount)).be.true
  })

  it(`Vote event(left), left is "Some", right is "None"`, async () => {
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
      .voteEvent(SELECTION.Left, amount)
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

    expect(ticketAcc.amount.eq(amount)).be.true
    expect(ticketAcc.creator.toBase58()).eq(signer.publicKey.toBase58())
    expect(ticketAcc.selection).deep.eq(SELECTION.Left)

    expect(predictionEventAcc.solLeftPool).be.null
    expect(predictionEventAcc.leftPool?.eq(amount)).be.true

    expect(leftPoolAcc.amount).eq(BigInt(amount.toString()))
  })

  it(`Vote event(both), left is "None", right is "Some"`, async () => {
    let amount = new BN(web3.LAMPORTS_PER_SOL * 3)

    const { predictionEvent, id, rightMint, rightPool } =
      await createPredictionEvent(signer, provider, program, "none::some")

    const rightSenderAta = await spl.getOrCreateAssociatedTokenAccount(
      provider.connection,
      signer.payer,
      rightMint,
      signer.publicKey
    )

    await spl.mintTo(
      provider.connection,
      signer.payer,
      rightMint,
      rightSenderAta.address,
      signer.publicKey,
      web3.LAMPORTS_PER_SOL * 12
    )

    const [rightTicket] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("ticket"),
        Buffer.from("right"),
        id.toBuffer(),
        signer.payer.publicKey.toBuffer()
      ],
      program.programId
    )

    await program.methods
      .voteEvent(SELECTION.Right, amount)
      .accountsStrict({
        leftMint: null,
        leftPool: null,
        leftSenderAta: null,

        rightMint,
        rightPool,
        rightSenderAta: rightSenderAta.address,

        predictionEvent,
        rent: web3.SYSVAR_RENT_PUBKEY,
        signer: signer.publicKey,
        systemProgram: web3.SystemProgram.programId,
        ticket: rightTicket,
        tokenProgram: spl.TOKEN_PROGRAM_ID
      })
      .rpc()

    let rightTicketAcc = await program.account.ticket.fetch(rightTicket)
    let predictionEventAcc = await program.account.predictionEvent.fetch(
      predictionEvent
    )
    let rightPoolAcc = await spl.getAccount(provider.connection, rightPool)

    expect(rightTicketAcc.amount.eq(amount)).be.true
    expect(rightTicketAcc.creator.toBase58()).eq(signer.publicKey.toBase58())
    expect(rightTicketAcc.selection).deep.eq(SELECTION.Right)

    expect(predictionEventAcc.solLeftPool).be.not.null
    expect(predictionEventAcc.leftPool).be.null

    expect(rightPoolAcc.amount).eq(BigInt(amount.toString()))

    amount = new BN(web3.LAMPORTS_PER_SOL * 6)

    await program.methods
      .voteEvent(SELECTION.Right, amount)
      .accountsStrict({
        leftMint: null,
        leftPool: null,
        leftSenderAta: null,

        rightMint,
        rightPool,
        rightSenderAta: rightSenderAta.address,

        predictionEvent,
        rent: web3.SYSVAR_RENT_PUBKEY,
        signer: signer.publicKey,
        systemProgram: web3.SystemProgram.programId,
        ticket: rightTicket,
        tokenProgram: spl.TOKEN_PROGRAM_ID
      })
      .rpc()

    const [leftTicket] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("ticket"),
        Buffer.from("left"),
        id.toBuffer(),
        signer.payer.publicKey.toBuffer()
      ],
      program.programId
    )

    const beforeLamports = await provider.connection.getBalance(predictionEvent)

    await program.methods
      .voteEvent(SELECTION.Left, amount)
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
        ticket: leftTicket,
        tokenProgram: spl.TOKEN_PROGRAM_ID
      })
      .rpc()

    const afterLamports = await provider.connection.getBalance(predictionEvent)

    const leftTicketAcc = await program.account.ticket.fetch(leftTicket)
    rightTicketAcc = await program.account.ticket.fetch(rightTicket)

    predictionEventAcc = await program.account.predictionEvent.fetch(
      predictionEvent
    )
    rightPoolAcc = await spl.getAccount(provider.connection, rightPool)

    expect(leftTicketAcc.amount.eq(new BN(web3.LAMPORTS_PER_SOL * 6))).be.true
    expect(leftTicketAcc.selection).deep.eq(SELECTION.Left)
    expect(leftTicketAcc.creator.toBase58()).eq(signer.publicKey.toBase58())

    expect(predictionEventAcc.solRightPool).be.null
    expect(
      predictionEventAcc.solLeftPool?.eq(new BN(web3.LAMPORTS_PER_SOL * 6))
    ).be.true
    expect(predictionEventAcc.rightPool).be.not.null
    expect(predictionEventAcc.leftPool).be.null

    expect(rightPoolAcc.amount).eq(BigInt(web3.LAMPORTS_PER_SOL * 9))
    expect(new BN(beforeLamports).add(amount).eq(new BN(afterLamports))).be.true
  })

  it(`Vote event(both), left is "Some", right is "Some"`, async () => {
    const amount = new BN(web3.LAMPORTS_PER_SOL * 3)

    const { id, predictionEvent, leftMint, leftPool, rightMint, rightPool } =
      await createPredictionEvent(signer, provider, program, "some::some")

    const [leftTicket] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("ticket"),
        Buffer.from("left"),
        id.toBuffer(),
        signer.payer.publicKey.toBuffer()
      ],
      program.programId
    )

    const [rightTicket] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("ticket"),
        Buffer.from("right"),
        id.toBuffer(),
        signer.payer.publicKey.toBuffer()
      ],
      program.programId
    )

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
      web3.LAMPORTS_PER_SOL * 20
    )

    const rightSenderAta = await spl.getOrCreateAssociatedTokenAccount(
      provider.connection,
      signer.payer,
      rightMint,
      signer.publicKey
    )

    await spl.mintTo(
      provider.connection,
      signer.payer,
      rightMint,
      rightSenderAta.address,
      signer.publicKey,
      web3.LAMPORTS_PER_SOL * 20
    )

    await program.methods
      .voteEvent(SELECTION.Left, amount)
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
        ticket: leftTicket,
        tokenProgram: spl.TOKEN_PROGRAM_ID
      })
      .rpc()

    let leftTicketAcc = await program.account.ticket.fetch(leftTicket)

    let predictionEventAcc = await program.account.predictionEvent.fetch(
      predictionEvent
    )

    let leftPoolAcc = await spl.getAccount(provider.connection, leftPool)
    let rightPoolAcc = await spl.getAccount(provider.connection, rightPool)

    expect(leftTicketAcc.creator.toBase58()).eq(signer.publicKey.toBase58())
    expect(leftTicketAcc.selection).deep.eq(SELECTION.Left)
    expect(leftTicketAcc.amount.eq(amount)).be.true

    expect(predictionEventAcc.solLeftPool).be.null
    expect(predictionEventAcc.solRightPool).be.null
    expect(predictionEventAcc.leftPool?.eq(new BN(amount))).be.true
    expect(predictionEventAcc.rightPool?.eq(new BN(0))).be.true

    expect(leftPoolAcc.amount).eq(BigInt(amount.toString()))
    expect(rightPoolAcc.amount).eq(BigInt(0))

    await program.methods
      .voteEvent(SELECTION.Left, amount)
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
        ticket: leftTicket,
        tokenProgram: spl.TOKEN_PROGRAM_ID
      })
      .rpc()

    await program.methods
      .voteEvent(SELECTION.Right, amount)
      .accountsStrict({
        leftMint: null,
        leftPool: null,
        leftSenderAta: null,

        rightMint,
        rightPool,
        rightSenderAta: rightSenderAta.address,

        predictionEvent,
        rent: web3.SYSVAR_RENT_PUBKEY,
        signer: signer.publicKey,
        systemProgram: web3.SystemProgram.programId,
        ticket: rightTicket,
        tokenProgram: spl.TOKEN_PROGRAM_ID
      })
      .rpc()

    leftTicketAcc = await program.account.ticket.fetch(leftTicket)

    predictionEventAcc = await program.account.predictionEvent.fetch(
      predictionEvent
    )

    leftPoolAcc = await spl.getAccount(provider.connection, leftPool)
    rightPoolAcc = await spl.getAccount(provider.connection, rightPool)

    expect(leftTicketAcc.amount.eq(amount.add(amount))).be.true

    expect(predictionEventAcc.leftPool?.eq(new BN(amount).add(amount))).be.true
    expect(predictionEventAcc.rightPool?.eq(new BN(amount))).be.true

    expect(leftPoolAcc.amount).eq(BigInt(amount.add(amount).toString()))
    expect(rightPoolAcc.amount).eq(BigInt(amount.toString()))
  })
})
