import * as anchor from "@coral-xyz/anchor"
import { Program } from "@coral-xyz/anchor"
import { BN } from "bn.js"
import { expect } from "chai"
import { EventProtocol } from "../target/types/event_protocol"
import { closePredictionEvent } from "../test-helper/close-prediction-event"
import { createPredictionEvent } from "../test-helper/create-prediction-event"
import { mock } from "../test-helper/mock"

describe("close_event instruction", () => {
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

  it("close a ss event", async () => {
    const { event, leftPool, rightPool, id } = await createPredictionEvent(
      signer,
      program,
      {
        kind: "some::some",
        leftMint,
        rightMint,
        startDate: new BN(Math.floor(new Date().getTime() / 1000 + 3600)),
        endDate: new BN(Math.floor(new Date().getTime() / 1000 + 7200))
      }
    )

    await closePredictionEvent(signer, program, event)

    const eventAcc = await program.provider.connection.getAccountInfo(event)
    const leftPoolAcc = await program.provider.connection.getAccountInfo(
      leftPool
    )
    const rightPoolAcc = await program.provider.connection.getAccountInfo(
      rightPool
    )

    console.log({ eventAcc, leftPoolAcc, rightPoolAcc })

    expect(eventAcc).be.null
    expect(leftPoolAcc).be.null
    expect(rightPoolAcc).be.null
  })
})
