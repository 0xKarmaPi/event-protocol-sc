import { Program, web3 } from "@coral-xyz/anchor"
import * as spl from "@solana/spl-token"
import { BN } from "bn.js"
import { EventProtocol } from "../target/types/event_protocol"
import {
  SIDE,
  TICKET_SEEDS_PREFIX,
  TOKENS_LEFT_POOL_SEEDS_PREFIX,
  TOKENS_RIGHT_POOL_SEEDS_PREFIX
} from "./const"

export async function makeAVote(
  signer: web3.Keypair,
  program: Program<EventProtocol>,
  event: web3.PublicKey,
  selection: "left" | "right",
  amount: number
) {
  const eventAcc = await program.account.predictionEvent.fetch(event)

  if (selection === "left") {
    if (eventAcc.leftMint) {
      const senderAta = await spl.getOrCreateAssociatedTokenAccount(
        program.provider.connection,
        signer,
        eventAcc.leftMint,
        signer.publicKey
      )

      const [leftPool] = web3.PublicKey.findProgramAddressSync(
        [TOKENS_LEFT_POOL_SEEDS_PREFIX, eventAcc.id.toBuffer()],
        program.programId
      )

      const [ticket] = web3.PublicKey.findProgramAddressSync(
        [
          TICKET_SEEDS_PREFIX,
          Buffer.from("left"),
          eventAcc.id.toBuffer(),
          signer.publicKey.toBuffer()
        ],
        program.programId
      )

      await program.methods
        .voteEvent(SIDE.Left, new BN(amount * web3.LAMPORTS_PER_SOL))
        .accountsStrict({
          leftMint: eventAcc.leftMint,
          leftPool: leftPool,
          leftSenderAta: senderAta.address,

          rightPool: null,
          rightMint: null,
          rightSenderAta: null,

          event,
          ticket,
          systemProgram: web3.SystemProgram.programId,
          signer: signer.publicKey,
          tokenProgram: spl.TOKEN_PROGRAM_ID
        })
        .signers([signer])
        .rpc()

      console.log(
        `${signer.publicKey.toBase58()} has voted left ${amount} tokens`
      )

      return ticket
    }

    const [ticket] = web3.PublicKey.findProgramAddressSync(
      [
        TICKET_SEEDS_PREFIX,
        Buffer.from("left"),
        eventAcc.id.toBuffer(),
        signer.publicKey.toBuffer()
      ],
      program.programId
    )

    await program.methods
      .voteEvent(SIDE.Left, new BN(amount * web3.LAMPORTS_PER_SOL))
      .accountsStrict({
        leftMint: null,
        leftPool: null,
        leftSenderAta: null,

        rightMint: null,
        rightPool: null,
        rightSenderAta: null,

        event,
        systemProgram: web3.SystemProgram.programId,
        signer: signer.publicKey,
        ticket,
        tokenProgram: spl.TOKEN_PROGRAM_ID
      })
      .signers([signer])
      .rpc()

    console.log(`${signer.publicKey.toBase58()} has voted left ${amount} sols`)

    return ticket
  }

  if (eventAcc.rightMint) {
    const senderAta = await spl.getOrCreateAssociatedTokenAccount(
      program.provider.connection,
      signer,
      eventAcc.rightMint,
      signer.publicKey
    )

    const [rightPool] = web3.PublicKey.findProgramAddressSync(
      [TOKENS_RIGHT_POOL_SEEDS_PREFIX, eventAcc.id.toBuffer()],
      program.programId
    )

    const [ticket] = web3.PublicKey.findProgramAddressSync(
      [
        TICKET_SEEDS_PREFIX,
        Buffer.from("right"),
        eventAcc.id.toBuffer(),
        signer.publicKey.toBuffer()
      ],
      program.programId
    )

    await program.methods
      .voteEvent(SIDE.Right, new BN(amount * web3.LAMPORTS_PER_SOL))
      .accountsStrict({
        leftMint: null,
        leftPool: null,
        leftSenderAta: null,

        rightPool,
        rightMint: eventAcc.rightMint,
        rightSenderAta: senderAta.address,

        event,
        systemProgram: web3.SystemProgram.programId,
        signer: signer.publicKey,
        ticket,
        tokenProgram: spl.TOKEN_PROGRAM_ID
      })
      .signers([signer])
      .rpc()

    console.log(
      `${signer.publicKey.toBase58()} has voted right ${amount} tokens`
    )

    return ticket
  }

  const [ticket] = web3.PublicKey.findProgramAddressSync(
    [
      TICKET_SEEDS_PREFIX,
      Buffer.from("right"),
      eventAcc.id.toBuffer(),
      signer.publicKey.toBuffer()
    ],
    program.programId
  )

  await program.methods
    .voteEvent(SIDE.Right, new BN(amount * web3.LAMPORTS_PER_SOL))
    .accountsStrict({
      leftMint: null,
      leftPool: null,
      leftSenderAta: null,

      rightMint: null,
      rightPool: null,
      rightSenderAta: null,

      event,
      systemProgram: web3.SystemProgram.programId,
      signer: signer.publicKey,
      ticket,
      tokenProgram: spl.TOKEN_PROGRAM_ID
    })
    .signers([signer])
    .rpc()

  console.log(`${signer.publicKey.toBase58()} has voted right ${amount} sols`)

  return ticket
}
