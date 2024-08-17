import * as anchor from "@coral-xyz/anchor"
import { Program } from "@coral-xyz/anchor"
import { BN } from "bn.js"
import { expect } from "chai"
import { EventProtocol } from "../target/types/event_protocol"
import { SIDE } from "../test-helper/const"
import { createPredictionEvent } from "../test-helper/create-prediction-event"
import { makeAVote } from "../test-helper/make-a-vote"
import { mock } from "../test-helper/mock"
import { bnLamports } from "../test-helper/transform"

describe("vote_event instruction", () => {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  const program = anchor.workspace.EventProtocol as Program<EventProtocol>
  const signer = provider.wallet as anchor.Wallet

  let goni: anchor.web3.Keypair
  let asura: anchor.web3.Keypair
  let leftMint: anchor.web3.PublicKey
  let rightMint: anchor.web3.PublicKey

  before(async () => {
    const init = await mock(provider)

    goni = init.goni
    asura = init.asura
    leftMint = init.leftMint
    rightMint = init.rightMint
  })

  it(`Vote event left mint is "None", right mint is "None"`, async () => {
    const { event } = await createPredictionEvent(signer, program, {
      kind: "none::none",
      leftMint: null,
      rightMint: null
    })

    const beforeLamports = await provider.connection.getBalance(event)

    const [goniLeftTicket, asuraRightTicket] = await Promise.all([
      makeAVote(goni, program, event, "left", 3),
      makeAVote(asura, program, event, "right", 6)
    ])

    await makeAVote(goni, program, event, "left", 3)

    const afterLamports = await provider.connection.getBalance(event)
    const goniLeftTicketAcc = await program.account.ticket.fetch(goniLeftTicket)

    const asuraRightTicketAcc = await program.account.ticket.fetch(
      asuraRightTicket
    )

    const eventAcc = await program.account.predictionEvent.fetch(event)

    expect(goniLeftTicketAcc.creator.toBase58()).eq(goni.publicKey.toBase58())
    expect(goniLeftTicketAcc.selection).deep.eq(SIDE.Left)
    expect(goniLeftTicketAcc.amount.eq(bnLamports(6))).be.true

    expect(asuraRightTicketAcc.creator.toBase58()).eq(
      asura.publicKey.toBase58()
    )
    expect(asuraRightTicketAcc.selection).deep.eq(SIDE.Right)
    expect(asuraRightTicketAcc.amount.eq(bnLamports(6))).be.true

    expect(eventAcc.leftPool.eq(bnLamports(6))).be.true
    expect(eventAcc.rightPool.eq(bnLamports(6))).be.true

    expect(new BN(beforeLamports).add(bnLamports(12)).eq(new BN(afterLamports)))
      .be.true
  })

  //   it(`Vote event(left), left is "Some", right is "None"`, async () => {
  //     const amount = new BN(web3.LAMPORTS_PER_SOL * 3)

  //     const { predictionEvent, id, leftPool, leftMint } =
  //       await createPredictionEvent(signer, provider, program, "some::none")

  //     const leftSenderAta = await spl.getOrCreateAssociatedTokenAccount(
  //       provider.connection,
  //       signer.payer,
  //       leftMint,
  //       signer.publicKey
  //     )

  //     await spl.mintTo(
  //       provider.connection,
  //       signer.payer,
  //       leftMint,
  //       leftSenderAta.address,
  //       signer.publicKey,
  //       web3.LAMPORTS_PER_SOL * 12
  //     )

  //     const [ticket] = web3.PublicKey.findProgramAddressSync(
  //       [
  //         Buffer.from("ticket"),
  //         Buffer.from("left"),
  //         id.toBuffer(),
  //         signer.payer.publicKey.toBuffer()
  //       ],
  //       program.programId
  //     )

  //     await program.methods
  //       .voteEvent(SIDE.Left, amount)
  //       .accountsStrict({
  //         leftMint,
  //         leftPool,
  //         leftSenderAta: leftSenderAta.address,

  //         rightMint: null,
  //         rightPool: null,
  //         rightSenderAta: null,

  //         predictionEvent,
  //         rent: web3.SYSVAR_RENT_PUBKEY,
  //         signer: signer.publicKey,
  //         systemProgram: web3.SystemProgram.programId,
  //         ticket,
  //         tokenProgram: spl.TOKEN_PROGRAM_ID
  //       })
  //       .rpc()

  //     const ticketAcc = await program.account.ticket.fetch(ticket)
  //     const predictionEventAcc = await program.account.predictionEvent.fetch(
  //       predictionEvent
  //     )
  //     const leftPoolAcc = await spl.getAccount(provider.connection, leftPool)

  //     expect(ticketAcc.amount.eq(amount)).be.true
  //     expect(ticketAcc.creator.toBase58()).eq(signer.publicKey.toBase58())
  //     expect(ticketAcc.selection).deep.eq(SIDE.Left)

  //     expect(predictionEventAcc.leftPool.eq(amount)).be.true

  //     expect(leftPoolAcc.amount).eq(BigInt(amount.toString()))
  //   })

  //   it(`Vote event(both), left is "None", right is "Some"`, async () => {
  //     let amount = new BN(web3.LAMPORTS_PER_SOL * 3)

  //     const { predictionEvent, id, rightMint, rightPool } =
  //       await createPredictionEvent(signer, provider, program, "none::some")

  //     const rightSenderAta = await spl.getOrCreateAssociatedTokenAccount(
  //       provider.connection,
  //       signer.payer,
  //       rightMint,
  //       signer.publicKey
  //     )

  //     await spl.mintTo(
  //       provider.connection,
  //       signer.payer,
  //       rightMint,
  //       rightSenderAta.address,
  //       signer.publicKey,
  //       web3.LAMPORTS_PER_SOL * 12
  //     )

  //     const [rightTicket] = web3.PublicKey.findProgramAddressSync(
  //       [
  //         Buffer.from("ticket"),
  //         Buffer.from("right"),
  //         id.toBuffer(),
  //         signer.payer.publicKey.toBuffer()
  //       ],
  //       program.programId
  //     )

  //     await program.methods
  //       .voteEvent(SIDE.Right, amount)
  //       .accountsStrict({
  //         leftMint: null,
  //         leftPool: null,
  //         leftSenderAta: null,

  //         rightMint,
  //         rightPool,
  //         rightSenderAta: rightSenderAta.address,

  //         predictionEvent,
  //         rent: web3.SYSVAR_RENT_PUBKEY,
  //         signer: signer.publicKey,
  //         systemProgram: web3.SystemProgram.programId,
  //         ticket: rightTicket,
  //         tokenProgram: spl.TOKEN_PROGRAM_ID
  //       })
  //       .rpc()

  //     let rightTicketAcc = await program.account.ticket.fetch(rightTicket)
  //     let predictionEventAcc = await program.account.predictionEvent.fetch(
  //       predictionEvent
  //     )
  //     let rightPoolAcc = await spl.getAccount(provider.connection, rightPool)

  //     expect(rightTicketAcc.amount.eq(amount)).be.true
  //     expect(rightTicketAcc.creator.toBase58()).eq(signer.publicKey.toBase58())
  //     expect(rightTicketAcc.selection).deep.eq(SIDE.Right)

  //     expect(predictionEventAcc.leftPool.eq(new BN(0))).be.true

  //     expect(rightPoolAcc.amount).eq(BigInt(amount.toString()))

  //     amount = new BN(web3.LAMPORTS_PER_SOL * 6)

  //     await program.methods
  //       .voteEvent(SIDE.Right, amount)
  //       .accountsStrict({
  //         leftMint: null,
  //         leftPool: null,
  //         leftSenderAta: null,

  //         rightMint,
  //         rightPool,
  //         rightSenderAta: rightSenderAta.address,

  //         predictionEvent,
  //         rent: web3.SYSVAR_RENT_PUBKEY,
  //         signer: signer.publicKey,
  //         systemProgram: web3.SystemProgram.programId,
  //         ticket: rightTicket,
  //         tokenProgram: spl.TOKEN_PROGRAM_ID
  //       })
  //       .rpc()

  //     const [leftTicket] = web3.PublicKey.findProgramAddressSync(
  //       [
  //         Buffer.from("ticket"),
  //         Buffer.from("left"),
  //         id.toBuffer(),
  //         signer.payer.publicKey.toBuffer()
  //       ],
  //       program.programId
  //     )

  //     const beforeLamports = await provider.connection.getBalance(predictionEvent)

  //     await program.methods
  //       .voteEvent(SIDE.Left, amount)
  //       .accountsStrict({
  //         leftMint: null,
  //         leftPool: null,
  //         leftSenderAta: null,

  //         rightMint: null,
  //         rightPool: null,
  //         rightSenderAta: null,

  //         predictionEvent,
  //         rent: web3.SYSVAR_RENT_PUBKEY,
  //         signer: signer.publicKey,
  //         systemProgram: web3.SystemProgram.programId,
  //         ticket: leftTicket,
  //         tokenProgram: spl.TOKEN_PROGRAM_ID
  //       })
  //       .rpc()

  //     const afterLamports = await provider.connection.getBalance(predictionEvent)

  //     const leftTicketAcc = await program.account.ticket.fetch(leftTicket)
  //     rightTicketAcc = await program.account.ticket.fetch(rightTicket)

  //     predictionEventAcc = await program.account.predictionEvent.fetch(
  //       predictionEvent
  //     )
  //     rightPoolAcc = await spl.getAccount(provider.connection, rightPool)

  //     expect(leftTicketAcc.amount.eq(new BN(web3.LAMPORTS_PER_SOL * 6))).be.true
  //     expect(leftTicketAcc.selection).deep.eq(SIDE.Left)
  //     expect(leftTicketAcc.creator.toBase58()).eq(signer.publicKey.toBase58())

  //     expect(predictionEventAcc.rightPool.eq(new BN(web3.LAMPORTS_PER_SOL * 9)))
  //       .be.true
  //     expect(predictionEventAcc.leftPool.eq(new BN(web3.LAMPORTS_PER_SOL * 6))).be
  //       .true

  //     expect(rightPoolAcc.amount).eq(BigInt(web3.LAMPORTS_PER_SOL * 9))
  //     expect(new BN(beforeLamports).add(amount).eq(new BN(afterLamports))).be.true
  //   })

  //   it(`Vote event(both), left is "Some", right is "Some"`, async () => {
  //     const amount = new BN(web3.LAMPORTS_PER_SOL * 3)

  //     const { id, predictionEvent, leftMint, leftPool, rightMint, rightPool } =
  //       await createPredictionEvent(signer, provider, program, "some::some")

  //     const [leftTicket] = web3.PublicKey.findProgramAddressSync(
  //       [
  //         Buffer.from("ticket"),
  //         Buffer.from("left"),
  //         id.toBuffer(),
  //         signer.payer.publicKey.toBuffer()
  //       ],
  //       program.programId
  //     )

  //     const [rightTicket] = web3.PublicKey.findProgramAddressSync(
  //       [
  //         Buffer.from("ticket"),
  //         Buffer.from("right"),
  //         id.toBuffer(),
  //         signer.payer.publicKey.toBuffer()
  //       ],
  //       program.programId
  //     )

  //     const leftSenderAta = await spl.getOrCreateAssociatedTokenAccount(
  //       provider.connection,
  //       signer.payer,
  //       leftMint,
  //       signer.publicKey
  //     )

  //     await spl.mintTo(
  //       provider.connection,
  //       signer.payer,
  //       leftMint,
  //       leftSenderAta.address,
  //       signer.publicKey,
  //       web3.LAMPORTS_PER_SOL * 20
  //     )

  //     const rightSenderAta = await spl.getOrCreateAssociatedTokenAccount(
  //       provider.connection,
  //       signer.payer,
  //       rightMint,
  //       signer.publicKey
  //     )

  //     await spl.mintTo(
  //       provider.connection,
  //       signer.payer,
  //       rightMint,
  //       rightSenderAta.address,
  //       signer.publicKey,
  //       web3.LAMPORTS_PER_SOL * 20
  //     )

  //     await program.methods
  //       .voteEvent(SIDE.Left, amount)
  //       .accountsStrict({
  //         leftMint,
  //         leftPool,
  //         leftSenderAta: leftSenderAta.address,

  //         rightMint: null,
  //         rightPool: null,
  //         rightSenderAta: null,

  //         predictionEvent,
  //         rent: web3.SYSVAR_RENT_PUBKEY,
  //         signer: signer.publicKey,
  //         systemProgram: web3.SystemProgram.programId,
  //         ticket: leftTicket,
  //         tokenProgram: spl.TOKEN_PROGRAM_ID
  //       })
  //       .rpc()

  //     let leftTicketAcc = await program.account.ticket.fetch(leftTicket)

  //     let predictionEventAcc = await program.account.predictionEvent.fetch(
  //       predictionEvent
  //     )

  //     let leftPoolAcc = await spl.getAccount(provider.connection, leftPool)
  //     let rightPoolAcc = await spl.getAccount(provider.connection, rightPool)

  //     expect(leftTicketAcc.creator.toBase58()).eq(signer.publicKey.toBase58())
  //     expect(leftTicketAcc.selection).deep.eq(SIDE.Left)
  //     expect(leftTicketAcc.amount.eq(amount)).be.true

  //     expect(predictionEventAcc.leftPool.eq(new BN(amount))).be.true
  //     expect(predictionEventAcc.rightPool.eq(new BN(0))).be.true

  //     expect(leftPoolAcc.amount).eq(BigInt(amount.toString()))
  //     expect(rightPoolAcc.amount).eq(BigInt(0))

  //     await program.methods
  //       .voteEvent(SIDE.Left, amount)
  //       .accountsStrict({
  //         leftMint,
  //         leftPool,
  //         leftSenderAta: leftSenderAta.address,

  //         rightMint: null,
  //         rightPool: null,
  //         rightSenderAta: null,

  //         predictionEvent,
  //         rent: web3.SYSVAR_RENT_PUBKEY,
  //         signer: signer.publicKey,
  //         systemProgram: web3.SystemProgram.programId,
  //         ticket: leftTicket,
  //         tokenProgram: spl.TOKEN_PROGRAM_ID
  //       })
  //       .rpc()

  //     await program.methods
  //       .voteEvent(SIDE.Right, amount)
  //       .accountsStrict({
  //         leftMint: null,
  //         leftPool: null,
  //         leftSenderAta: null,

  //         rightMint,
  //         rightPool,
  //         rightSenderAta: rightSenderAta.address,

  //         predictionEvent,
  //         rent: web3.SYSVAR_RENT_PUBKEY,
  //         signer: signer.publicKey,
  //         systemProgram: web3.SystemProgram.programId,
  //         ticket: rightTicket,
  //         tokenProgram: spl.TOKEN_PROGRAM_ID
  //       })
  //       .rpc()

  //     leftTicketAcc = await program.account.ticket.fetch(leftTicket)

  //     predictionEventAcc = await program.account.predictionEvent.fetch(
  //       predictionEvent
  //     )

  //     leftPoolAcc = await spl.getAccount(provider.connection, leftPool)
  //     rightPoolAcc = await spl.getAccount(provider.connection, rightPool)

  //     expect(leftTicketAcc.amount.eq(amount.add(amount))).be.true

  //     expect(predictionEventAcc.leftPool.eq(new BN(amount).add(amount))).be.true
  //     expect(predictionEventAcc.rightPool.eq(new BN(amount))).be.true

  //     expect(leftPoolAcc.amount).eq(BigInt(amount.add(amount).toString()))
  //     expect(rightPoolAcc.amount).eq(BigInt(amount.toString()))
  //   })
})
