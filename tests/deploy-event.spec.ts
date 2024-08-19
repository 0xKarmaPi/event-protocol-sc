import * as anchor from "@coral-xyz/anchor"
import { Program } from "@coral-xyz/anchor"
import { BN } from "bn.js"
import { expect } from "chai"
import { before } from "mocha"
import { EventProtocol } from "../target/types/event_protocol"
import { createPredictionEvent } from "../test-helper/create-prediction-event"
import { mock } from "../test-helper/mock"

describe("deploy_event instruction", () => {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  const program = anchor.workspace.EventProtocol as Program<EventProtocol>
  const signer = provider.wallet as anchor.Wallet

  let leftMint: anchor.web3.PublicKey
  let rightMint: anchor.web3.PublicKey

  before(async () => {
    const init = await mock(provider)
    leftMint = init.leftMint
    rightMint = init.rightMint
  })

  it(`Deploy a event left mint is "Some", right mint is "Some"`, async () => {
    const { id, eventAcc } = await createPredictionEvent(signer, program, {
      kind: "some::some",
      leftMint,
      rightMint
    })

    expect(eventAcc.id.toBase58()).eq(id.toBase58())
    expect(eventAcc.creator.toBase58()).eq(signer.publicKey.toBase58())

    expect(eventAcc.leftMint?.toBase58()).eq(leftMint.toBase58())
    expect(eventAcc.rightMint?.toBase58()).eq(rightMint.toBase58())

    expect(eventAcc.leftPool.eq(new BN(0))).be.true

    expect(eventAcc.rightPool.eq(new BN(0))).be.true
  })

  it(`Deploy a event left mint is "Some", right mint is "None"`, async () => {
    const { id, eventAcc } = await createPredictionEvent(signer, program, {
      kind: "some::none",
      leftMint,
      rightMint: null
    })

    expect(eventAcc.id.toBase58()).eq(id.toBase58())
    expect(eventAcc.creator.toBase58()).eq(signer.publicKey.toBase58())

    expect(eventAcc.leftMint?.toBase58()).eq(leftMint.toBase58())
    expect(eventAcc.rightMint).eq(null)

    expect(eventAcc.leftPool.eq(new BN(0))).be.true
    expect(eventAcc.rightPool.eq(new BN(0))).be.true
  })

  it(`Deploy a event left mint is "None", right mint is "Some"`, async () => {
    const { id, eventAcc } = await createPredictionEvent(signer, program, {
      kind: "none::some",
      leftMint: null,
      rightMint
    })

    expect(eventAcc.id.toBase58()).eq(id.toBase58())
    expect(eventAcc.creator.toBase58()).eq(signer.publicKey.toBase58())

    expect(eventAcc.leftMint).eq(null)
    expect(eventAcc.rightMint?.toBase58()).eq(rightMint.toBase58())

    expect(eventAcc.leftPool.eq(new BN(0))).be.true
    expect(eventAcc.rightPool.eq(new BN(0))).be.true
  })

  it(`Deploy a event left mint is "None", right mint is "None"`, async () => {
    const { id, eventAcc } = await createPredictionEvent(signer, program, {
      kind: "none::none",
      leftMint: null,
      rightMint: null
    })

    expect(eventAcc.id.toBase58()).eq(id.toBase58())
    expect(eventAcc.creator.toBase58()).eq(signer.publicKey.toBase58())

    expect(eventAcc.leftMint).eq(null)
    expect(eventAcc.rightMint).eq(null)

    expect(eventAcc.leftPool.eq(new BN(0))).be.true
    expect(eventAcc.rightPool.eq(new BN(0))).be.true
  })
})
