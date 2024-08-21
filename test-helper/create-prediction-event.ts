import * as anchor from "@coral-xyz/anchor"
import * as spl from "@solana/spl-token"
import { web3 } from "@coral-xyz/anchor"
import { EventProtocol } from "../target/types/event_protocol"
import { BN } from "bn.js"
import {
  PREDICTION_EVENT_SEEDS_PREFIX,
  SIDE,
  TOKENS_LEFT_POOL_SEEDS_PREFIX,
  TOKENS_RIGHT_POOL_SEEDS_PREFIX
} from "./const"

type Kind = "some::some" | "some::none" | "none::some" | "none::none"

type Options<
  K,
  L = K extends "some::some" | "some::none" ? web3.PublicKey : null,
  R = K extends "some::some" | "none::some" ? web3.PublicKey : null
> = {
  kind: K
  leftMint: L
  rightMint: R
  title?: string
  description?: string
  startDate?: anchor.BN
  endDate?: anchor.BN
  burning?: boolean
}

export async function createPredictionEvent<K extends Kind>(
  signer: anchor.Wallet,
  program: anchor.Program<EventProtocol>,
  options: Options<K>
) {
  const {
    kind,
    description = "some(description)",
    title = "some(title)",
    leftMint,
    rightMint,
    startDate = new BN(Math.floor(new Date().getTime() / 1000 - 10)),
    endDate = new BN(Math.floor(new Date().getTime() / 1000 + 2)),
    burning = false
  } = options
  const id = web3.Keypair.generate().publicKey

  const [event] = web3.PublicKey.findProgramAddressSync(
    [PREDICTION_EVENT_SEEDS_PREFIX, id.toBuffer()],
    program.programId
  )

  const [leftPool] = web3.PublicKey.findProgramAddressSync(
    [TOKENS_LEFT_POOL_SEEDS_PREFIX, id.toBuffer()],
    program.programId
  )

  const [rightPool] = web3.PublicKey.findProgramAddressSync(
    [TOKENS_RIGHT_POOL_SEEDS_PREFIX, id.toBuffer()],
    program.programId
  )

  const transaction = new web3.Transaction()

  const deployEventIns = await program.methods
    .deployEvent(id, title, description, startDate, endDate, burning)
    .accountsStrict({
      signer: signer.publicKey,
      event,
      systemProgram: web3.SystemProgram.programId,
      leftMint,
      rightMint,
      tokenProgram: spl.TOKEN_PROGRAM_ID
    })
    .instruction()

  transaction.add(deployEventIns)

  if (isLeftSome(kind)) {
    const creatLeftTokenEventPoolIns = await program.methods
      .createEventTokenAccount(SIDE.Left)
      .accountsStrict({
        event,
        mint: leftMint!,
        pool: leftPool,
        signer: signer.publicKey,
        systemProgram: web3.SystemProgram.programId,
        tokenProgram: spl.TOKEN_PROGRAM_ID
      })
      .instruction()

    transaction.add(creatLeftTokenEventPoolIns)
  }

  if (isRightSome(kind)) {
    const creatRightTokenEventPoolIns = await program.methods
      .createEventTokenAccount(SIDE.Right)
      .accountsStrict({
        event,
        mint: rightMint!,
        pool: rightPool,
        signer: signer.publicKey,
        systemProgram: web3.SystemProgram.programId,
        tokenProgram: spl.TOKEN_PROGRAM_ID
      })
      .instruction()

    transaction.add(creatRightTokenEventPoolIns)
  }

  await web3.sendAndConfirmTransaction(
    program.provider.connection,
    transaction,
    [signer.payer]
  )

  const eventAcc = await program.account.predictionEvent.fetch(event)

  return {
    id,
    event,
    eventAcc,
    leftPool,
    rightPool
  }
}

function isLeftSome(kind: Kind): kind is "some::some" | "some::none" {
  return kind === "some::none" || kind === "some::some"
}

function isRightSome(kind: Kind): kind is "some::some" | "none::some" {
  return kind === "none::some" || kind === "some::some"
}
