import * as anchor from "@coral-xyz/anchor"
import { Program, web3 } from "@coral-xyz/anchor"
import * as spl from "@solana/spl-token"
import { EventProtocol } from "../target/types/event_protocol"
import { createPredictionEvent } from "../test-helper/create-prediction-event"
import { makeAVote } from "../test-helper/make-a-vote"
import { sleep } from "../test-helper/sleep"
import { SELECTION } from "../test-helper/const"
import { expect } from "chai"
import { BN } from "bn.js"

describe("finish_event instruction", () => {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  const program = anchor.workspace.EventProtocol as Program<EventProtocol>
  const signer = provider.wallet as anchor.Wallet

  const [master] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("master")],
    program.programId
  )

  it("finish a NN event", async () => {
    const { predictionEvent } = await createPredictionEvent(
      signer,
      provider,
      program,
      "none::none",
      new Date().getTime() / 1000 + 5
    )

    await Promise.all([
      makeAVote(program, signer, predictionEvent, "left", 2),
      makeAVote(program, signer, predictionEvent, "right", 3),
      makeAVote(program, signer, predictionEvent, "right", 1),
      makeAVote(program, signer, predictionEvent, "left", 4),
      sleep(5000)
    ])

    const predictionEventBalanceBefore = await provider.connection.getBalance(
      predictionEvent
    )
    const masterBlanceBefore = await provider.connection.getBalance(master)

    await program.methods
      .finishEvent(SELECTION.Left)
      .accountsStrict({
        leftMint: null,
        leftCreatorFee: null,
        leftPlatformFee: null,
        leftPool: null,

        rightMint: null,
        rightCreatorFee: null,
        rightPlatformFee: null,
        rightPool: null,

        master,
        predictionEvent,

        rent: web3.SYSVAR_RENT_PUBKEY,
        signer: signer.publicKey,
        systemProgram: web3.SystemProgram.programId,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
        associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID
      })
      .rpc()

    const predictionEventBalanceAfter = await provider.connection.getBalance(
      predictionEvent
    )

    const masterBlanceAfter = await provider.connection.getBalance(master)

    const predictionEventAcc = await program.account.predictionEvent.fetch(
      predictionEvent
    )

    expect(
      predictionEventAcc.solLeftPool?.eq(new BN(6 * web3.LAMPORTS_PER_SOL))
    )
    expect(
      predictionEventAcc.solRightPool?.eq(new BN(4 * web3.LAMPORTS_PER_SOL))
    )
    expect(predictionEventAcc.result?.left).be.not.undefined
    expect(predictionEventAcc.result?.right).be.undefined
    expect(predictionEventBalanceBefore - predictionEventBalanceAfter).eq(
      4 * web3.LAMPORTS_PER_SOL * 0.05
    )
    expect(masterBlanceAfter).eq(
      masterBlanceBefore + 4 * web3.LAMPORTS_PER_SOL * 0.025
    )
  })

  it(`finish a SN event`, async () => {
    const { leftMint, predictionEvent, leftPool } = await createPredictionEvent(
      signer,
      provider,
      program,
      "some::none",
      new Date().getTime() / 1000 + 5
    )

    const [leftPlatformFee] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from("platform"), leftMint.toBuffer()],
      program.programId
    )

    const leftCreatorFee = await spl.getOrCreateAssociatedTokenAccount(
      provider.connection,
      signer.payer,
      leftMint,
      signer.publicKey
    )

    await Promise.all([
      makeAVote(program, signer, predictionEvent, "left", 6),
      makeAVote(program, signer, predictionEvent, "right", 3),
      makeAVote(program, signer, predictionEvent, "right", 2),
      makeAVote(program, signer, predictionEvent, "left", 2),
      sleep(5000)
    ])

    await program.methods
      .finishEvent(SELECTION.Right)
      .accountsStrict({
        leftMint,
        leftCreatorFee: leftCreatorFee.address,
        leftPlatformFee,
        leftPool,

        master,
        predictionEvent,

        rent: web3.SYSVAR_RENT_PUBKEY,
        signer: signer.publicKey,
        systemProgram: web3.SystemProgram.programId,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
        associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID,
        rightMint: null,
        rightCreatorFee: null,
        rightPlatformFee: null,
        rightPool: null
      })
      .rpc()

    const platformAta = await spl.getAccount(
      provider.connection,
      leftPlatformFee
    )

    const creatorAta = await spl.getAccount(
      provider.connection,
      leftCreatorFee.address
    )

    const predictionEventAcc = await program.account.predictionEvent.fetch(
      predictionEvent
    )

    expect(predictionEventAcc.leftPool?.eq(new BN(8 * web3.LAMPORTS_PER_SOL)))
    expect(
      predictionEventAcc.solRightPool?.eq(new BN(5 * web3.LAMPORTS_PER_SOL))
    )
    expect(predictionEventAcc.result?.right).be.not.undefined

    expect(creatorAta.amount).eq(BigInt(8 * web3.LAMPORTS_PER_SOL * 0.025))
    expect(platformAta?.amount).eq(BigInt(8 * web3.LAMPORTS_PER_SOL * 0.025))
  })

  it(`finish a NS event`, async () => {
    const { predictionEvent, rightPool } = await createPredictionEvent(
      signer,
      provider,
      program,
      "none::some",
      new Date().getTime() / 1000 + 5
    )

    await Promise.all([
      makeAVote(program, signer, predictionEvent, "left", 0.4),
      makeAVote(program, signer, predictionEvent, "left", 1),
      makeAVote(program, signer, predictionEvent, "right", 0.2),
      makeAVote(program, signer, predictionEvent, "right", 0.8),
      sleep(5000)
    ])

    const predictionEventBalanceBefore = await provider.connection.getBalance(
      predictionEvent
    )
    const masterBlanceBefore = await provider.connection.getBalance(master)

    await program.methods
      .finishEvent(SELECTION.Right)
      .accountsStrict({
        leftMint: null,
        leftCreatorFee: null,
        leftPlatformFee: null,
        leftPool: null,

        rightMint: null,
        rightCreatorFee: null,
        rightPlatformFee: null,
        rightPool: null,

        master,
        predictionEvent,

        rent: web3.SYSVAR_RENT_PUBKEY,
        signer: signer.publicKey,
        systemProgram: web3.SystemProgram.programId,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
        associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID
      })
      .rpc()

    const predictionEventBalanceAfter = await provider.connection.getBalance(
      predictionEvent
    )

    const masterBlanceAfter = await provider.connection.getBalance(master)

    const predictionEventAcc = await program.account.predictionEvent.fetch(
      predictionEvent
    )

    const rightPoolAta = await spl.getAccount(provider.connection, rightPool)

    expect(
      predictionEventAcc.solLeftPool?.eq(new BN(1.4 * web3.LAMPORTS_PER_SOL))
    )
    expect(predictionEventAcc.rightPool?.eq(new BN(web3.LAMPORTS_PER_SOL)))

    expect(predictionEventAcc.result?.left).be.undefined
    expect(predictionEventAcc.result?.right).be.not.undefined

    expect(predictionEventBalanceBefore - predictionEventBalanceAfter).eq(
      1.4 * web3.LAMPORTS_PER_SOL * 0.05
    )
    expect(masterBlanceAfter).eq(
      masterBlanceBefore + 1.4 * web3.LAMPORTS_PER_SOL * 0.025
    )

    expect(rightPoolAta.amount).eq(BigInt(web3.LAMPORTS_PER_SOL))
  })

  it("finish a SS event", async () => {
    const { rightMint, rightPool, predictionEvent } =
      await createPredictionEvent(
        signer,
        provider,
        program,
        "some::some",
        new Date().getTime() / 1000 + 5
      )

    const [rightPlatformFee] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from("platform"), rightMint.toBuffer()],
      program.programId
    )

    const rightCreatorFee = await spl.getOrCreateAssociatedTokenAccount(
      provider.connection,
      signer.payer,
      rightMint,
      signer.publicKey
    )

    await Promise.all([
      makeAVote(program, signer, predictionEvent, "left", 0.5),
      makeAVote(program, signer, predictionEvent, "left", 0.6),
      makeAVote(program, signer, predictionEvent, "right", 0.3),
      makeAVote(program, signer, predictionEvent, "right", 0.2),
      sleep(5000)
    ])

    await program.methods
      .finishEvent(SELECTION.Left)
      .accountsStrict({
        leftMint: null,
        leftCreatorFee: null,
        leftPlatformFee: null,
        leftPool: null,

        rightMint,
        rightCreatorFee: rightCreatorFee.address,
        rightPlatformFee,
        rightPool,

        master,
        predictionEvent,

        rent: web3.SYSVAR_RENT_PUBKEY,
        signer: signer.publicKey,
        systemProgram: web3.SystemProgram.programId,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
        associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID
      })
      .rpc()

    const platformAta = await spl.getAccount(
      provider.connection,
      rightPlatformFee
    )

    const creatorAta = await spl.getAccount(
      provider.connection,
      rightCreatorFee.address
    )

    const predictionEventAcc = await program.account.predictionEvent.fetch(
      predictionEvent
    )

    expect(predictionEventAcc.leftPool?.eq(new BN(1.1 * web3.LAMPORTS_PER_SOL)))
    expect(
      predictionEventAcc.rightPool?.eq(new BN(0.5 * web3.LAMPORTS_PER_SOL))
    )
    expect(predictionEventAcc.result?.left).be.not.undefined
    expect(predictionEventAcc.result?.right).be.undefined

    expect(creatorAta.amount).eq(BigInt(0.5 * web3.LAMPORTS_PER_SOL * 0.025))
    expect(platformAta?.amount).eq(BigInt(0.5 * web3.LAMPORTS_PER_SOL * 0.025))
  })
})
