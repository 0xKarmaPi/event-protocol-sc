import * as anchor from "@coral-xyz/anchor"
import * as spl from "@solana/spl-token"
import { Program, web3 } from "@coral-xyz/anchor"
import { EventProtocol } from "../target/types/event_protocol"
import { expect } from "chai"
import { BN } from "bn.js"

describe("deploy_event instruction", () => {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(anchor.AnchorProvider.env())

  const program = anchor.workspace.EventProtocol as Program<EventProtocol>
  const singer = provider.wallet as anchor.Wallet

  it(`Deploy a event left mint is "Some", right mint is "Some"`, async () => {
    const id = web3.Keypair.generate().publicKey
    const endDate = new Date().getSeconds() + 7 * 24 * 60 * 60

    const [predictionEvent] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from("prediction_event"), id.toBuffer()],
      program.programId
    )

    const [leftPool] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from("left_pool"), id.toBuffer()],
      program.programId
    )

    const [rightPool] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from("right_pool"), id.toBuffer()],
      program.programId
    )

    const leftMint = await spl.createMint(
      provider.connection,
      singer.payer,
      singer.publicKey,
      null,
      9
    )

    const rightMint = await spl.createMint(
      provider.connection,
      singer.payer,
      singer.publicKey,
      null,
      9
    )

    await program.methods
      .deployEvent(id, "some(title)", "some(description)", new BN(endDate))
      .accountsStrict({
        payer: singer.publicKey,
        predictionEvent,
        systemProgram: web3.SystemProgram.programId,
        leftMint,
        rightMint,
        leftPool,
        rightPool,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
        rent: web3.SYSVAR_RENT_PUBKEY
      })
      .rpc()

    const predictionEventAcc = await program.account.predictionEvent.fetch(
      predictionEvent
    )

    expect(predictionEventAcc.id.toBase58()).eq(id.toBase58())
    expect(predictionEventAcc.creator.toBase58()).eq(
      singer.publicKey.toBase58()
    )
    expect(predictionEventAcc.title, "title").eq("some(title)")
    expect(predictionEventAcc.description).eq("some(description)")

    expect(predictionEventAcc.leftMint?.toBase58()).eq(leftMint.toBase58())
    expect(predictionEventAcc.rightMint?.toBase58()).eq(rightMint.toBase58())

    expect(predictionEventAcc.solLeftPool).eq(null)
    expect(predictionEventAcc.solRightPool).eq(null)

    expect(predictionEventAcc.leftPool?.eq(new BN(0))).to.be.true

    expect(predictionEventAcc.rightPool?.eq(new BN(0))).to.be.true
  })

  it(`Deploy a event left mint is "Some", right mint is "None"`, async () => {
    const id = web3.Keypair.generate().publicKey

    const [predictionEvent] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from("prediction_event"), id.toBuffer()],
      program.programId
    )

    const endDate = new Date().getSeconds() + 7 * 24 * 60 * 60

    const [leftPool] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from("left_pool"), id.toBuffer()],
      program.programId
    )

    const leftMint = await spl.createMint(
      provider.connection,
      singer.payer,
      singer.publicKey,
      null,
      9
    )

    await program.methods
      .deployEvent(id, "some(title)", "some(description)", new BN(endDate))
      .accountsStrict({
        payer: singer.publicKey,
        predictionEvent: predictionEvent,
        systemProgram: web3.SystemProgram.programId,
        leftMint,
        leftPool,
        rightMint: null,
        rightPool: null,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
        rent: web3.SYSVAR_RENT_PUBKEY
      })
      .rpc()

    const predictionEventAcc = await program.account.predictionEvent.fetch(
      predictionEvent
    )

    expect(predictionEventAcc.id.toBase58()).eq(id.toBase58())
    expect(predictionEventAcc.creator.toBase58()).eq(
      singer.publicKey.toBase58()
    )
    expect(predictionEventAcc.title).eq("some(title)")
    expect(predictionEventAcc.description).eq("some(description)")

    expect(predictionEventAcc.leftMint?.toBase58()).eq(leftMint.toBase58())
    expect(predictionEventAcc.rightMint).eq(null)

    expect(predictionEventAcc.solLeftPool).eq(null)
    expect(predictionEventAcc.solRightPool?.eq(new BN(0))).to.be.true

    expect(predictionEventAcc.leftPool?.eq(new BN(0))).to.be.true
    expect(predictionEventAcc.rightPool).eq(null)
  })

  it(`Deploy a event left mint is "None", right mint is "Some"`, async () => {
    const id = web3.Keypair.generate().publicKey

    const [predictionEvent] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from("prediction_event"), id.toBuffer()],
      program.programId
    )

    const endDate = new Date().getSeconds() + 7 * 24 * 60 * 60

    const [rightPool] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from("right_pool"), id.toBuffer()],
      program.programId
    )

    const rightMint = await spl.createMint(
      provider.connection,
      singer.payer,
      singer.publicKey,
      null,
      9
    )

    await program.methods
      .deployEvent(id, "some(title)", "some(description)", new BN(endDate))
      .accountsStrict({
        payer: singer.publicKey,
        predictionEvent: predictionEvent,
        systemProgram: web3.SystemProgram.programId,
        leftMint: null,
        leftPool: null,
        rightMint,
        rightPool,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
        rent: web3.SYSVAR_RENT_PUBKEY
      })
      .rpc()

    const predictionEventAcc = await program.account.predictionEvent.fetch(
      predictionEvent
    )

    expect(predictionEventAcc.id.toBase58()).eq(id.toBase58())
    expect(predictionEventAcc.creator.toBase58()).eq(
      singer.publicKey.toBase58()
    )
    expect(predictionEventAcc.title).eq("some(title)")
    expect(predictionEventAcc.description).eq("some(description)")

    expect(predictionEventAcc.leftMint).eq(null)
    expect(predictionEventAcc.rightMint?.toBase58()).eq(rightMint.toBase58())

    expect(predictionEventAcc.solLeftPool?.eq(new BN(0))).to.be.true
    expect(predictionEventAcc.solRightPool).eq(null)

    expect(predictionEventAcc.leftPool).eq(null)
    expect(predictionEventAcc.rightPool?.eq(new BN(0))).to.be.true
  })

  it(`Deploy a event left mint is "None", right mint is "None"`, async () => {
    const id = web3.Keypair.generate().publicKey

    const [predictionEvent] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from("prediction_event"), id.toBuffer()],
      program.programId
    )

    const endDate = new Date().getSeconds() + 7 * 24 * 60 * 60

    await program.methods
      .deployEvent(id, "some(title)", "some(description)", new BN(endDate))
      .accountsStrict({
        payer: singer.publicKey,
        predictionEvent: predictionEvent,
        systemProgram: web3.SystemProgram.programId,
        leftMint: null,
        leftPool: null,
        rightMint: null,
        rightPool: null,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
        rent: web3.SYSVAR_RENT_PUBKEY
      })
      .rpc()

    const predictionEventAcc = await program.account.predictionEvent.fetch(
      predictionEvent
    )

    expect(predictionEventAcc.id.toBase58()).eq(id.toBase58())
    expect(predictionEventAcc.creator.toBase58()).eq(
      singer.publicKey.toBase58()
    )
    expect(predictionEventAcc.title).eq("some(title)")
    expect(predictionEventAcc.description).eq("some(description)")

    expect(predictionEventAcc.leftMint).eq(null)
    expect(predictionEventAcc.rightMint).eq(null)

    expect(predictionEventAcc.solLeftPool?.eq(new BN(0))).to.be.true
    expect(predictionEventAcc.solRightPool?.eq(new BN(0))).to.be.true

    expect(predictionEventAcc.leftPool).eq(null)
    expect(predictionEventAcc.rightPool).eq(null)
  })
})
