import { Program, Wallet, web3 } from "@coral-xyz/anchor"
import * as spl from "@solana/spl-token"
import { BN } from "bn.js"
import { EventProtocol } from "../target/types/event_protocol"
import { createKeyPairWithAssets } from "./create-keypair-with-assets"
import { SELECTION } from "./const"

export async function makeAVote(
  program: Program<EventProtocol>,
  minter: Wallet,
  predictionEvent: web3.PublicKey,
  selection: "left" | "right",
  amount: number
) {
  const predictionEventAcc = await program.account.predictionEvent.fetch(
    predictionEvent
  )

  if (selection === "left") {
    if (predictionEventAcc.leftMint) {
      const someone = await createKeyPairWithAssets(
        program.provider.connection,
        minter,
        3 + amount,
        [{ mint: predictionEventAcc.leftMint, balance: 10 }]
      )

      const senderAta = await spl.getOrCreateAssociatedTokenAccount(
        program.provider.connection,
        someone,
        predictionEventAcc.leftMint,
        someone.publicKey
      )

      const [leftPool] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from("left_pool"), predictionEventAcc.id.toBuffer()],
        program.programId
      )

      const [ticket] = web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("ticket"),
          Buffer.from("left"),
          predictionEventAcc.id.toBuffer(),
          someone.publicKey.toBuffer()
        ],
        program.programId
      )

      await program.methods
        .voteEvent(SELECTION.Left, new BN(amount * web3.LAMPORTS_PER_SOL))
        .accountsStrict({
          leftMint: predictionEventAcc.leftMint,
          leftPool: leftPool,
          leftSenderAta: senderAta.address,

          rightPool: null,
          rightMint: null,
          rightSenderAta: null,

          predictionEvent,
          rent: web3.SYSVAR_RENT_PUBKEY,
          systemProgram: web3.SystemProgram.programId,
          signer: someone.publicKey,
          ticket,
          tokenProgram: spl.TOKEN_PROGRAM_ID
        })
        .signers([someone])
        .rpc()

      console.log(`some one has voted left ${amount} tokens`)

      return someone
    }

    const someone = await createKeyPairWithAssets(
      program.provider.connection,
      minter,
      3 + amount
    )

    const [ticket] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("ticket"),
        Buffer.from("left"),
        predictionEventAcc.id.toBuffer(),
        someone.publicKey.toBuffer()
      ],
      program.programId
    )

    await program.methods
      .voteEvent(SELECTION.Left, new BN(amount * web3.LAMPORTS_PER_SOL))
      .accountsStrict({
        leftMint: null,
        leftPool: null,
        leftSenderAta: null,

        rightMint: null,
        rightPool: null,
        rightSenderAta: null,

        predictionEvent,
        rent: web3.SYSVAR_RENT_PUBKEY,
        systemProgram: web3.SystemProgram.programId,
        signer: someone.publicKey,
        ticket,
        tokenProgram: spl.TOKEN_PROGRAM_ID
      })
      .signers([someone])
      .rpc()

    console.log("some one has voted left 6 sols")

    return someone
  }

  if (predictionEventAcc.rightMint) {
    const someone = await createKeyPairWithAssets(
      program.provider.connection,
      minter,
      3 + amount,
      [{ mint: predictionEventAcc.rightMint, balance: 10 }]
    )

    const senderAta = await spl.getOrCreateAssociatedTokenAccount(
      program.provider.connection,
      someone,
      predictionEventAcc.rightMint,
      someone.publicKey
    )

    const [rightPool] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from("right_pool"), predictionEventAcc.id.toBuffer()],
      program.programId
    )

    const [ticket] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("ticket"),
        Buffer.from("right"),
        predictionEventAcc.id.toBuffer(),
        someone.publicKey.toBuffer()
      ],
      program.programId
    )

    await program.methods
      .voteEvent(SELECTION.Right, new BN(amount * web3.LAMPORTS_PER_SOL))
      .accountsStrict({
        leftMint: null,
        leftPool: null,
        leftSenderAta: null,

        rightPool,
        rightMint: predictionEventAcc.rightMint,
        rightSenderAta: senderAta.address,

        predictionEvent,
        rent: web3.SYSVAR_RENT_PUBKEY,
        systemProgram: web3.SystemProgram.programId,
        signer: someone.publicKey,
        ticket,
        tokenProgram: spl.TOKEN_PROGRAM_ID
      })
      .signers([someone])
      .rpc()

    console.log(`some one has voted right ${amount} tokens`)

    return someone
  }

  const someone = await createKeyPairWithAssets(
    program.provider.connection,
    minter,
    3 + amount
  )

  const [ticket] = web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("ticket"),
      Buffer.from("right"),
      predictionEventAcc.id.toBuffer(),
      someone.publicKey.toBuffer()
    ],
    program.programId
  )

  await program.methods
    .voteEvent(SELECTION.Right, new BN(amount * web3.LAMPORTS_PER_SOL))
    .accountsStrict({
      leftMint: null,
      leftPool: null,
      leftSenderAta: null,

      rightMint: null,
      rightPool: null,
      rightSenderAta: null,

      predictionEvent,
      rent: web3.SYSVAR_RENT_PUBKEY,
      systemProgram: web3.SystemProgram.programId,
      signer: someone.publicKey,
      ticket,
      tokenProgram: spl.TOKEN_PROGRAM_ID
    })
    .signers([someone])
    .rpc()

  console.log(`some one has voted right ${amount} sols`)

  return someone
}
