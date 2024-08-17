import * as anchor from "@coral-xyz/anchor"
import { Program, web3 } from "@coral-xyz/anchor"
import * as spl from "@solana/spl-token"
import { EventProtocol } from "../target/types/event_protocol"
import { createPredictionEvent } from "../test-helper/create-prediction-event"
import { makeAVote } from "../test-helper/make-a-vote"
import { sleep } from "../test-helper/sleep"
import {
  MASTER_SEEDS,
  SIDE,
  TOKENS_PLATFORM_POOL_SEEDS_PREFIX
} from "../test-helper/const"
import { expect } from "chai"
import { BN } from "bn.js"
import { mock } from "../test-helper/mock"
import { bnLamports } from "../test-helper/transform"
import { addCreateAtaInsIfNotExist } from "../test-helper/add-create-ata-ins-if-not-exist"

describe("finish_event instruction", () => {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  const program = anchor.workspace.EventProtocol as Program<EventProtocol>
  const signer = provider.wallet as anchor.Wallet

  const [master] = web3.PublicKey.findProgramAddressSync(
    [MASTER_SEEDS],
    program.programId
  )

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

  it("finish a SS event", async () => {
    const { rightPool, event, id } = await createPredictionEvent(
      signer,
      program,
      {
        kind: "some::some",
        leftMint,
        rightMint
      }
    )

    const [rightPlatformPool] = web3.PublicKey.findProgramAddressSync(
      [TOKENS_PLATFORM_POOL_SEEDS_PREFIX, rightMint.toBuffer()],
      program.programId
    )

    const transaction = new web3.Transaction()

    const createRightPlatformPoolIns = await program.methods
      .createTokenPlatformPool(id)
      .accountsStrict({
        mint: rightMint,
        platformPool: rightPlatformPool,
        signer: signer.publicKey,
        systemProgram: web3.SystemProgram.programId,
        tokenProgram: spl.TOKEN_PROGRAM_ID
      })
      .instruction()

    transaction.add(createRightPlatformPoolIns)

    const rightCreatorFee = await addCreateAtaInsIfNotExist(
      transaction,
      provider.connection,
      signer.publicKey,
      rightMint,
      signer.publicKey
    )

    await Promise.all([
      makeAVote(goni, program, event, "left", 0.5),
      makeAVote(asura, program, event, "right", 0.6)
    ])

    await sleep(3000)

    const finishEventIns = await program.methods
      .finishEvent(SIDE.Left)
      .accountsStrict({
        leftMint: null,
        leftCreatorFee: null,
        leftPlatformFee: null,
        leftPool: null,

        rightMint,
        rightCreatorFee: rightCreatorFee,
        rightPlatformFee: rightPlatformPool,
        rightPool,

        master,
        event,

        signer: signer.publicKey,
        systemProgram: web3.SystemProgram.programId,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
        associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID
      })
      .instruction()

    transaction.add(finishEventIns)

    await web3.sendAndConfirmTransaction(provider.connection, transaction, [
      signer.payer
    ])

    const platformAta = await spl.getAccount(
      provider.connection,
      rightPlatformPool
    )

    const creatorAta = await spl.getAccount(
      provider.connection,
      rightCreatorFee
    )

    const eventAcc = await program.account.predictionEvent.fetch(event)

    expect(eventAcc.leftPool.eq(bnLamports(0.5))).be.true
    expect(eventAcc.rightPool.eq(bnLamports(0.6 * 0.95))).be.true
    expect(eventAcc.result?.left).be.not.undefined
    expect(eventAcc.result?.right).be.undefined

    expect(creatorAta.amount).eq(BigInt(0.6 * web3.LAMPORTS_PER_SOL * 0.025))
    expect(platformAta.amount).eq(BigInt(0.6 * web3.LAMPORTS_PER_SOL * 0.025))
  })
})
