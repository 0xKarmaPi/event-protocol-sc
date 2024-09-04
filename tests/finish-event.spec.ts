import * as anchor from "@coral-xyz/anchor"
import { Program, web3 } from "@coral-xyz/anchor"
import * as spl from "@solana/spl-token"
import { expect } from "chai"
import { EventProtocol } from "../target/types/event_protocol"
import { addCreateAtaInsIfNotExist } from "../test-helper/add-create-ata-ins-if-not-exist"
import {
  MASTER_SEEDS,
  SIDE,
  TOKENS_SYSTEM_FEE_SEEDS_PREFIX
} from "../test-helper/const"
import { createPredictionEvent } from "../test-helper/create-prediction-event"
import { makeAVote } from "../test-helper/make-a-vote"
import { mock } from "../test-helper/mock"
import { sleep } from "../test-helper/sleep"
import { bnLamports } from "../test-helper/transform"

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
    const { rightPool, event } = await createPredictionEvent(signer, program, {
      kind: "some::some",
      leftMint,
      rightMint
    })

    const [systemFee] = web3.PublicKey.findProgramAddressSync(
      [TOKENS_SYSTEM_FEE_SEEDS_PREFIX, rightMint.toBuffer()],
      program.programId
    )

    const transaction = new web3.Transaction()

    const createRightPlatformPoolIns = await program.methods
      .createSystemFeeTokenAccount()
      .accountsStrict({
        mint: rightMint,
        systemFee,
        signer: signer.publicKey,
        systemProgram: web3.SystemProgram.programId,
        tokenProgram: spl.TOKEN_PROGRAM_ID
      })
      .instruction()

    transaction.add(createRightPlatformPoolIns)

    const creatorRightBeneficiaryAta = await addCreateAtaInsIfNotExist(
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
        creatorLeftBeneficiaryAta: null,
        systemLeftFee: null,
        leftPool: null,

        rightMint,
        creatorRightBeneficiaryAta,
        systemRightFee: systemFee,
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

    const platformAta = await spl.getAccount(provider.connection, systemFee)

    const systemFeeAta = await spl.getAccount(provider.connection, systemFee)

    const eventAcc = await program.account.predictionEvent.fetch(event)

    expect(eventAcc.leftPool.eq(bnLamports(0.5))).be.true
    expect(eventAcc.rightPool.eq(bnLamports(0.6 * 0.95))).be.true
    expect(eventAcc.result?.left).be.not.undefined
    expect(eventAcc.result?.right).be.undefined

    expect(systemFeeAta.amount).eq(BigInt(0.6 * web3.LAMPORTS_PER_SOL * 0.025))
    expect(platformAta.amount).eq(BigInt(0.6 * web3.LAMPORTS_PER_SOL * 0.025))
  })

  it("finish a event, the tokens losing side should be burned", async () => {
    const { rightPool, event } = await createPredictionEvent(signer, program, {
      kind: "some::some",
      leftMint,
      rightMint,
      burning: true
    })

    const [systemFee] = web3.PublicKey.findProgramAddressSync(
      [TOKENS_SYSTEM_FEE_SEEDS_PREFIX, rightMint.toBuffer()],
      program.programId
    )

    const transaction = new web3.Transaction()

    const createRightPlatformPoolIns = await program.methods
      .createSystemFeeTokenAccount()
      .accountsStrict({
        mint: rightMint,
        systemFee,
        signer: signer.publicKey,
        systemProgram: web3.SystemProgram.programId,
        tokenProgram: spl.TOKEN_PROGRAM_ID
      })
      .instruction()

    transaction.add(createRightPlatformPoolIns)

    const creatorRightBeneficiaryAta = await addCreateAtaInsIfNotExist(
      transaction,
      provider.connection,
      signer.publicKey,
      rightMint,
      signer.publicKey
    )

    await Promise.all([
      makeAVote(goni, program, event, "left", 0.8),
      makeAVote(asura, program, event, "right", 0.8)
    ])

    await sleep(3000)

    const finishEventIns = await program.methods
      .finishEvent(SIDE.Left)
      .accountsStrict({
        leftMint: null,
        creatorLeftBeneficiaryAta: null,
        systemLeftFee: null,
        leftPool: null,

        rightMint,
        creatorRightBeneficiaryAta,
        systemRightFee: systemFee,
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

    const { amount } = await spl.getAccount(provider.connection, rightPool)

    expect(amount).eq(BigInt(0))
  })

  it("finish a NN event", async () => {
    const { event } = await createPredictionEvent(signer, program, {
      kind: "none::none",
      leftMint: null,
      rightMint: null
    })

    const transaction = new web3.Transaction()

    await Promise.all([
      makeAVote(goni, program, event, "left", 0.5),
      makeAVote(asura, program, event, "right", 0.6)
    ])

    await sleep(3000)

    const eventLamportsBefore = await provider.connection.getBalance(event)
    const masterLamportsBefore = await provider.connection.getBalance(master)

    const finishEventIns = await program.methods
      .finishEvent(SIDE.Left)
      .accountsStrict({
        leftMint: null,
        creatorLeftBeneficiaryAta: null,
        systemLeftFee: null,
        leftPool: null,

        rightMint: null,
        creatorRightBeneficiaryAta: null,
        systemRightFee: null,
        rightPool: null,

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

    const eventLamportsAfter = await provider.connection.getBalance(event)
    const masterLamportAfter = await provider.connection.getBalance(master)

    expect(eventLamportsBefore - eventLamportsAfter).eq(
      0.6 * web3.LAMPORTS_PER_SOL * 0.05
    )
    expect(masterLamportAfter - masterLamportsBefore).eq(
      0.6 * web3.LAMPORTS_PER_SOL * 0.025
    )
  })
})
