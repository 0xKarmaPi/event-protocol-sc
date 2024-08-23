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
      makeAVote(goni, program, event, "left", 0.3),
      makeAVote(asura, program, event, "right", 0.6)
    ])

    await makeAVote(goni, program, event, "left", 0.3)

    const afterLamports = await provider.connection.getBalance(event)
    const goniLeftTicketAcc = await program.account.ticket.fetch(goniLeftTicket)

    const asuraRightTicketAcc = await program.account.ticket.fetch(
      asuraRightTicket
    )

    const eventAcc = await program.account.predictionEvent.fetch(event)

    expect(goniLeftTicketAcc.creator.toBase58()).eq(goni.publicKey.toBase58())
    expect(goniLeftTicketAcc.selection).deep.eq(SIDE.Left)
    expect(goniLeftTicketAcc.amount.eq(bnLamports(0.6))).be.true

    expect(asuraRightTicketAcc.creator.toBase58()).eq(
      asura.publicKey.toBase58()
    )
    expect(asuraRightTicketAcc.selection).deep.eq(SIDE.Right)
    expect(asuraRightTicketAcc.amount.eq(bnLamports(0.6))).be.true

    expect(eventAcc.leftPool.eq(bnLamports(0.6))).be.true
    expect(eventAcc.rightPool.eq(bnLamports(0.6))).be.true

    expect(
      new BN(beforeLamports).add(bnLamports(1.2)).eq(new BN(afterLamports))
    ).be.true
  })

  it(`Vote event left mint is "Some", right mint is "Some"`, async () => {
    const { event } = await createPredictionEvent(signer, program, {
      kind: "some::some",
      leftMint,
      rightMint
    })

    const [goniLeftTicket, asuraRightTicket] = await Promise.all([
      makeAVote(goni, program, event, "left", 0.3),
      makeAVote(asura, program, event, "right", 0.6)
    ])

    const [goniRightTicket, asuraLeftTicket] = await Promise.all([
      makeAVote(goni, program, event, "right", 0.2),
      makeAVote(asura, program, event, "left", 0.2)
    ])

    const goniLeftTicketAcc = await program.account.ticket.fetch(goniLeftTicket)
    const goniRightTicketAcc = await program.account.ticket.fetch(
      goniRightTicket
    )

    const asuraRightTicketAcc = await program.account.ticket.fetch(
      asuraRightTicket
    )
    const asuraLeftTicketAcc = await program.account.ticket.fetch(
      asuraLeftTicket
    )

    const eventAcc = await program.account.predictionEvent.fetch(event)

    expect(goniLeftTicketAcc.creator.toBase58()).eq(goni.publicKey.toBase58())
    expect(goniLeftTicketAcc.selection).deep.eq(SIDE.Left)
    expect(goniLeftTicketAcc.amount.eq(bnLamports(0.3))).be.true

    expect(goniRightTicketAcc.creator.toBase58()).eq(goni.publicKey.toBase58())
    expect(goniRightTicketAcc.selection).deep.eq(SIDE.Right)
    expect(goniRightTicketAcc.amount.eq(bnLamports(0.2))).be.true

    expect(asuraRightTicketAcc.creator.toBase58()).eq(
      asura.publicKey.toBase58()
    )
    expect(asuraRightTicketAcc.selection).deep.eq(SIDE.Right)
    expect(asuraRightTicketAcc.amount.eq(bnLamports(0.6))).be.true

    expect(asuraLeftTicketAcc.creator.toBase58()).eq(asura.publicKey.toBase58())
    expect(asuraLeftTicketAcc.selection).deep.eq(SIDE.Left)
    expect(asuraLeftTicketAcc.amount.eq(bnLamports(0.2))).be.true

    expect(eventAcc.leftPool.eq(bnLamports(0.5))).be.true
    expect(eventAcc.rightPool.eq(bnLamports(0.8))).be.true
  })

  it(`Vote event left mint is "Some", right mint is "None"`, async () => {
    const { event } = await createPredictionEvent(signer, program, {
      kind: "some::none",
      leftMint,
      rightMint: null
    })

    const beforeLamports = await provider.connection.getBalance(event)

    const [goniLeftTicket, asuraRightTicket] = await Promise.all([
      makeAVote(goni, program, event, "left", 0.1),
      makeAVote(asura, program, event, "right", 0.1)
    ])

    await Promise.all([
      makeAVote(goni, program, event, "left", 0.3),
      makeAVote(asura, program, event, "right", 0.3)
    ])

    const afterLamports = await provider.connection.getBalance(event)
    const goniLeftTicketAcc = await program.account.ticket.fetch(goniLeftTicket)
    const asuraRightTicketAcc = await program.account.ticket.fetch(
      asuraRightTicket
    )
    const eventAcc = await program.account.predictionEvent.fetch(event)

    expect(goniLeftTicketAcc.creator.toBase58()).eq(goni.publicKey.toBase58())
    expect(goniLeftTicketAcc.selection).deep.eq(SIDE.Left)
    expect(goniLeftTicketAcc.amount.eq(bnLamports(0.4))).be.true

    expect(asuraRightTicketAcc.creator.toBase58()).eq(
      asura.publicKey.toBase58()
    )
    expect(asuraRightTicketAcc.selection).deep.eq(SIDE.Right)
    expect(asuraRightTicketAcc.amount.eq(bnLamports(0.4))).be.true

    expect(eventAcc.leftPool.eq(bnLamports(0.4))).be.true
    expect(eventAcc.rightPool.eq(bnLamports(0.4))).be.true

    expect(
      new BN(beforeLamports).add(bnLamports(0.4)).eq(new BN(afterLamports))
    ).be.true
  })

  it(`Vote event left mint is "None", right mint is "Some"`, async () => {
    const { event } = await createPredictionEvent(signer, program, {
      kind: "none::some",
      leftMint: null,
      rightMint
    })

    const beforeLamports = await provider.connection.getBalance(event)

    const [goniLeftTicket, asuraRightTicket] = await Promise.all([
      makeAVote(goni, program, event, "left", 0.4),
      makeAVote(asura, program, event, "right", 0.4)
    ])

    const afterLamports = await provider.connection.getBalance(event)
    const goniLeftTicketAcc = await program.account.ticket.fetch(goniLeftTicket)
    const asuraRightTicketAcc = await program.account.ticket.fetch(
      asuraRightTicket
    )
    const eventAcc = await program.account.predictionEvent.fetch(event)

    expect(goniLeftTicketAcc.creator.toBase58()).eq(goni.publicKey.toBase58())
    expect(goniLeftTicketAcc.selection).deep.eq(SIDE.Left)
    expect(goniLeftTicketAcc.amount.eq(bnLamports(0.4))).be.true

    expect(asuraRightTicketAcc.creator.toBase58()).eq(
      asura.publicKey.toBase58()
    )
    expect(asuraRightTicketAcc.selection).deep.eq(SIDE.Right)
    expect(asuraRightTicketAcc.amount.eq(bnLamports(0.4))).be.true

    expect(eventAcc.leftPool.eq(bnLamports(0.4))).be.true
    expect(eventAcc.rightPool.eq(bnLamports(0.4))).be.true

    expect(
      new BN(beforeLamports).add(bnLamports(0.4)).eq(new BN(afterLamports))
    ).be.true
  })
})
