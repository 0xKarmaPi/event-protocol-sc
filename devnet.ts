import { web3 } from "@coral-xyz/anchor"
import fs from "node:fs"
import idl from "./target/idl/event_protocol.json"
import { EventProtocol } from "./target/types/event_protocol"
import * as anchor from "@coral-xyz/anchor"
import { createPredictionEvent } from "./test-helper/create-prediction-event"
import { BN } from "bn.js"
import { asuraSecretKey, goniSecretKey } from "./secret"
import { makeAVote } from "./test-helper/make-a-vote"
import { sleep } from "./test-helper/sleep"
import { SIDE, TOKENS_SYSTEM_FEE_SEEDS_PREFIX } from "./test-helper/const"
import * as spl from "@solana/spl-token"

const leftMint = new web3.PublicKey(
  "AgqZLFFYRqfsRcup3nWGFUByeSv1w97G9hcT47sjPL2B"
)

const rightMint = new web3.PublicKey(
  "EMySEdgeZwAuKbwqxmGhxW7wpbkCDJtpvxF8nPrQYnuC"
)

async function main() {
  const secretKey = JSON.parse(
    fs.readFileSync("/home/vitaminc/.config/solana/id.json").toString()
  )

  const me = web3.Keypair.fromSecretKey(Uint8Array.from(secretKey))

  const wallet = new anchor.Wallet(me)

  const connection = new web3.Connection(web3.clusterApiUrl("devnet"))

  const provider = new anchor.AnchorProvider(connection, wallet)

  anchor.setProvider(provider)

  const program = new anchor.Program(idl as EventProtocol, provider)

  const [master] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("master")],
    program.programId
  )

  const { event, rightPool, leftPool } = await createPredictionEvent(
    wallet,
    program,
    {
      leftMint,
      rightMint,
      kind: "some::some",
      endDate: new BN(Math.floor(new Date().getTime() / 1000 + 26))
    }
  )

  console.log("done create event")

  const goni = web3.Keypair.fromSecretKey(Uint8Array.from(goniSecretKey))
  const asura = web3.Keypair.fromSecretKey(Uint8Array.from(asuraSecretKey))

  const goniLeftTicket = await makeAVote(goni, program, event, "left", 0.2)
  await makeAVote(asura, program, event, "right", 0.2)

  console.log("done make votes")

  await sleep(26_000)

  const finishEventTx = new web3.Transaction()

  const creatorRightBeneficiaryAta =
    await spl.getOrCreateAssociatedTokenAccount(
      connection,
      me,
      rightMint,
      me.publicKey
    )

  const [systemFee] = web3.PublicKey.findProgramAddressSync(
    [TOKENS_SYSTEM_FEE_SEEDS_PREFIX, rightMint.toBuffer()],
    program.programId
  )

  const finishEventIns = await program.methods
    .finishEvent(SIDE.Left)
    .accountsStrict({
      leftMint: null,
      creatorLeftBeneficiaryAta: null,
      systemLeftFee: null,
      leftPool: null,

      rightMint,
      creatorRightBeneficiaryAta: creatorRightBeneficiaryAta.address,
      systemRightFee: systemFee,
      rightPool,

      master,
      event,

      signer: me.publicKey,
      systemProgram: web3.SystemProgram.programId,
      tokenProgram: spl.TOKEN_PROGRAM_ID,
      associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID
    })
    .instruction()

  finishEventTx.add(finishEventIns)

  await web3.sendAndConfirmTransaction(connection, finishEventTx, [me])

  console.log("done finish event")

  await sleep(2_000)

  const goniLeftAta = await spl.getOrCreateAssociatedTokenAccount(
    connection,
    goni,
    leftMint,
    goni.publicKey
  )

  const goniRightAta = await spl.getOrCreateAssociatedTokenAccount(
    connection,
    goni,
    rightMint,
    goni.publicKey
  )

  const claimRewardsTx = new web3.Transaction()

  claimRewardsTx.add(
    await program.methods
      .claimRewards()
      .accountsStrict({
        event,

        leftMint: null,
        leftPool: null,
        signerLeftBeneficiaryAta: null,

        rightMint,
        rightPool,
        signerRightBeneficiaryAta: goniRightAta.address,

        ticket: goniLeftTicket,

        signer: goni.publicKey,
        systemProgram: web3.SystemProgram.programId,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
        associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID
      })
      .signers([goni])
      .instruction()
  )

  await web3.sendAndConfirmTransaction(connection, claimRewardsTx, [goni])

  console.log("done claims reward")

  const withdrawTx = new web3.Transaction()

  withdrawTx.add(
    await program.methods
      .withdrawDeposited()
      .accountsStrict({
        event,
        leftMint,
        leftPool,
        signerLeftBeneficiaryAta: goniLeftAta.address,

        rightMint: null,
        rightPool: null,
        signerRightBeneficiaryAta: null,

        ticket: goniLeftTicket,

        signer: goni.publicKey,
        systemProgram: web3.SystemProgram.programId,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
        associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID
      })
      .signers([goni])
      .instruction()
  )

  await web3.sendAndConfirmTransaction(connection, withdrawTx, [goni])

  console.log("done withdraw")

  //   const x = await connection.getSignaturesForAddress(program.programId, {
  //     until:
  //       "5E9y5TdXtVe5NHh3Hg17Q25C2Ck5A4tERLqUDttAYbQACw2UosJC9qCoNJPxQMoHeY78Zg7p57t3cjuRdEBigxcs"
  //   })

  //   const tx = await connection.getParsedTransaction(
  //     "5E9y5TdXtVe5NHh3Hg17Q25C2Ck5A4tERLqUDttAYbQACw2UosJC9qCoNJPxQMoHeY78Zg7p57t3cjuRdEBigxcs",
  //     { commitment: "confirmed" }
  //   )

  //   const eventParser = new anchor.EventParser(
  //     program.programId,
  //     new anchor.BorshCoder(program.idl)
  //   )

  //   console.log(tx?.meta?.logMessages)

  //   const events = eventParser.parseLogs(tx!.meta!.logMessages!)

  //   for (let event of events) {
  //     console.log(event)
  //   }
}

main()
