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

    const lamportsBefore = await provider.connection.getBalance(predictionEvent)

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

    const lamportsAfter = await provider.connection.getBalance(predictionEvent)

    const predictionEventAcc = await program.account.predictionEvent.fetch(
      predictionEvent
    )

    expect(
      predictionEventAcc.solLeftPool?.eq(new BN(6 * web3.LAMPORTS_PER_SOL))
    ).be.true
    expect(
      predictionEventAcc.solRightPool?.eq(new BN(4 * web3.LAMPORTS_PER_SOL))
    )
    expect(predictionEventAcc.result?.left).be.not.null
    expect(predictionEventAcc.result?.right).be.undefined
    expect(lamportsBefore - lamportsAfter).eq(4 * web3.LAMPORTS_PER_SOL * 0.05)
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
      .be.true
    expect(
      predictionEventAcc.solRightPool?.eq(new BN(5 * web3.LAMPORTS_PER_SOL))
    )
    expect(predictionEventAcc.result?.right).be.not.null

    expect(creatorAta.amount).eq(BigInt(8 * web3.LAMPORTS_PER_SOL * 0.025))
    expect(platformAta?.amount).eq(BigInt(8 * web3.LAMPORTS_PER_SOL * 0.025))
  })
})
