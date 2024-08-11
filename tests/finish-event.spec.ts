import * as anchor from "@coral-xyz/anchor"
import { Program, web3 } from "@coral-xyz/anchor"
import * as spl from "@solana/spl-token"
import { EventProtocol } from "../target/types/event_protocol"
import { SELECTION } from "../test-helper/const"
import { createPredictionEvent } from "../test-helper/create-prediction-event"
import { expect } from "chai"
import { createKeyPairWithAssets } from "../test-helper/create-keypair-with-assets"
import { BN } from "bn.js"
import { makeAVote } from "../test-helper/make-a-vote"

describe("finish_event instruction", () => {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  const program = anchor.workspace.EventProtocol as Program<EventProtocol>
  const signer = provider.wallet as anchor.Wallet

  it.only(`finish a SN event`, async () => {
    const { leftMint, predictionEvent } = await createPredictionEvent(
      signer,
      provider,
      program,
      "some::none",
      new Date().getTime() / 1000 + 10
    )
    const [master] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from("master")],
      program.programId
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

    await makeAVote(program, signer, predictionEvent, "left", 6)

    // await program.methods
    //   .finishEvent(SELECTION.Left)
    //   .accountsStrict({
    //     leftMint,
    //     leftCreatorFee: leftCreatorFee.address,
    //     predictionEvent,
    //     rent: web3.SYSVAR_RENT_PUBKEY,
    //     signer: signer.publicKey,
    //     systemProgram: web3.SystemProgram.programId,
    //     tokenProgram: spl.TOKEN_PROGRAM_ID,
    //     associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID,
    //     master,
    //     leftPlatformFee,
    //     rightMint: null,
    //     rightCreatorFee: null,
    //     rightPlatformFee: null
    //   })
    //   .rpc()

    // const leftPlatformAta = await provider.connection.getAccountInfo(
    //   leftPlatformFee
    // )

    // expect(leftPlatformAta?.lamports).not.eq(0)
  })
})
