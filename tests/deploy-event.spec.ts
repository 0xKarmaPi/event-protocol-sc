import * as anchor from "@coral-xyz/anchor"
import { Program } from "@coral-xyz/anchor"
import { BN } from "bn.js"
import { expect } from "chai"
import { EventProtocol } from "../target/types/event_protocol"
import { createPredictionEvent } from "../test-helper/create-prediction-event"

describe("deploy_event instruction", () => {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  const program = anchor.workspace.EventProtocol as Program<EventProtocol>
  const signer = provider.wallet as anchor.Wallet

  it(`Deploy a event left mint is "Some", right mint is "Some"`, async () => {
    const { id, leftMint, predictionEventAcc, rightMint } =
      await createPredictionEvent(signer, provider, program, "some::some")

    expect(predictionEventAcc.id.toBase58()).eq(id.toBase58())
    expect(predictionEventAcc.creator.toBase58()).eq(
      signer.publicKey.toBase58()
    )
    expect(predictionEventAcc.title, "title").eq("some(title)")
    expect(predictionEventAcc.description).eq("some(description)")

    expect(predictionEventAcc.leftMint?.toBase58()).eq(leftMint.toBase58())
    expect(predictionEventAcc.rightMint?.toBase58()).eq(rightMint.toBase58())

    expect(predictionEventAcc.solLeftPool).eq(null)
    expect(predictionEventAcc.solRightPool).eq(null)

    expect(predictionEventAcc.leftPool?.eq(new BN(0))).to.be.true

    expect(predictionEventAcc.rightPool?.eq(new BN(0))).to.be.true
  })

  it(`Deploy a event left mint is "Some", right mint is "None"`, async () => {
    const { id, leftMint, predictionEventAcc } = await createPredictionEvent(
      signer,
      provider,
      program,
      "some::none"
    )

    expect(predictionEventAcc.id.toBase58()).eq(id.toBase58())
    expect(predictionEventAcc.creator.toBase58()).eq(
      signer.publicKey.toBase58()
    )
    expect(predictionEventAcc.title).eq("some(title)")
    expect(predictionEventAcc.description).eq("some(description)")

    expect(predictionEventAcc.leftMint?.toBase58()).eq(leftMint.toBase58())
    expect(predictionEventAcc.rightMint).eq(null)

    expect(predictionEventAcc.solLeftPool).eq(null)
    expect(predictionEventAcc.solRightPool?.eq(new BN(0))).to.be.true

    expect(predictionEventAcc.leftPool?.eq(new BN(0))).to.be.true
    expect(predictionEventAcc.rightPool).eq(null)
  })

  it(`Deploy a event left mint is "None", right mint is "Some"`, async () => {
    const { id, predictionEventAcc, rightMint } = await createPredictionEvent(
      signer,
      provider,
      program,
      "none::some"
    )

    expect(predictionEventAcc.id.toBase58()).eq(id.toBase58())
    expect(predictionEventAcc.creator.toBase58()).eq(
      signer.publicKey.toBase58()
    )
    expect(predictionEventAcc.title).eq("some(title)")
    expect(predictionEventAcc.description).eq("some(description)")

    expect(predictionEventAcc.leftMint).eq(null)
    expect(predictionEventAcc.rightMint?.toBase58()).eq(rightMint.toBase58())

    expect(predictionEventAcc.solLeftPool?.eq(new BN(0))).to.be.true
    expect(predictionEventAcc.solRightPool).eq(null)

    expect(predictionEventAcc.leftPool).eq(null)
    expect(predictionEventAcc.rightPool?.eq(new BN(0))).to.be.true
  })

  it(`Deploy a event left mint is "None", right mint is "None"`, async () => {
    const { id, predictionEventAcc } = await createPredictionEvent(
      signer,
      provider,
      program,
      "none::none"
    )

    expect(predictionEventAcc.id.toBase58()).eq(id.toBase58())
    expect(predictionEventAcc.creator.toBase58()).eq(
      signer.publicKey.toBase58()
    )
    expect(predictionEventAcc.title).eq("some(title)")
    expect(predictionEventAcc.description).eq("some(description)")

    expect(predictionEventAcc.leftMint).eq(null)
    expect(predictionEventAcc.rightMint).eq(null)

    expect(predictionEventAcc.solLeftPool?.eq(new BN(0))).to.be.true
    expect(predictionEventAcc.solRightPool?.eq(new BN(0))).to.be.true

    expect(predictionEventAcc.leftPool).eq(null)
    expect(predictionEventAcc.rightPool).eq(null)
  })
})
