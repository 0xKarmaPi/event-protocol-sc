import * as anchor from "@coral-xyz/anchor"
import { Program } from "@coral-xyz/anchor"
import { EventProtocol } from "../target/types/event_protocol"
import { addCreateAtaInsIfNotExist } from "../test-helper/add-create-ata-ins-if-not-exist"
import {
  MASTER_SEEDS,
  SIDE,
  TOKENS_PLATFORM_POOL_SEEDS_PREFIX
} from "../test-helper/const"
import { createPredictionEvent } from "../test-helper/create-prediction-event"
import { makeAVote } from "../test-helper/make-a-vote"
import { mock } from "../test-helper/mock"
import { sleep } from "../test-helper/sleep"
import { web3 } from "@coral-xyz/anchor"
import * as spl from "@solana/spl-token"
import { expect } from "chai"

describe("claim_rewards instruction", () => {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  const program = anchor.workspace.EventProtocol as Program<EventProtocol>
  const signer = provider.wallet as anchor.Wallet

  let leftMint: anchor.web3.PublicKey
  let rightMint: anchor.web3.PublicKey

  let goni: anchor.web3.Keypair
  let asura: anchor.web3.Keypair

  let goniRightAta: anchor.web3.PublicKey

  before(async () => {
    const init = await mock(provider)

    leftMint = init.leftMint
    rightMint = init.rightMint

    goni = init.goni
    asura = init.asura

    goniRightAta = init.goniRightAta.address
  })

  it("claim on ss event", async () => {
    const { event, rightPool } = await createPredictionEvent(signer, program, {
      kind: "some::some",
      leftMint,
      rightMint
    })

    const [goniLeftTicket] = await Promise.all([
      makeAVote(goni, program, event, "left", 3),
      makeAVote(asura, program, event, "right", 6)
    ])

    await makeAVote(asura, program, event, "left", 3)

    await sleep(3000)

    const [master] = web3.PublicKey.findProgramAddressSync(
      [MASTER_SEEDS],
      program.programId
    )

    const [rightPlatformPool] = anchor.web3.PublicKey.findProgramAddressSync(
      [TOKENS_PLATFORM_POOL_SEEDS_PREFIX, rightMint.toBuffer()],
      program.programId
    )

    const transaction = new anchor.web3.Transaction()

    const createRightPlatformPoolIns = await program.methods
      .createTokenPlatformPool()
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

    const { amount: before } = await spl.getAccount(
      provider.connection,
      goniRightAta
    )

    await program.methods
      .claimRewards()
      .accountsStrict({
        event,

        leftMint: null,
        leftPool: null,
        signerLeftAta: null,

        rightMint,
        rightPool,
        signerRightAta: goniRightAta,

        ticket: goniLeftTicket,

        signer: goni.publicKey,
        systemProgram: web3.SystemProgram.programId,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
        associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID
      })
      .signers([goni])
      .rpc()

    const rewards = (3 + 3) * web3.LAMPORTS_PER_SOL * (3 / 6) * 0.95

    const { amount: after } = await spl.getAccount(
      provider.connection,
      goniRightAta
    )

    expect(before + BigInt(rewards)).eq(after)
  })
})
