import * as anchor from "@coral-xyz/anchor"
import * as spl from "@solana/spl-token"
import { Program, web3 } from "@coral-xyz/anchor"
import { EventProtocol } from "../target/types/event_protocol"
import { expect } from "chai"
import { BN } from "bn.js"

describe("vote event", () => {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(anchor.AnchorProvider.env())

  const program = anchor.workspace.EventProtocol as Program<EventProtocol>
  const singer = provider.wallet as anchor.Wallet

  it("vote event ", async () => {
    // const [ticket] = web3.PublicKey.findProgramAddressSync(
    //   [
    //     Buffer.from("ticket"),
    //     ssEventId.toBuffer(),
    //     singer.payer.publicKey.toBuffer()
    //   ],
    //   program.programId
    // )
    // await program.methods
    //   .voteEvent(new BN(web3.LAMPORTS_PER_SOL * 3))
    //   .accountsStrict({
    //     predictionEvent,
    //     signer: singer.payer.publicKey,
    //     systemProgram: web3.SystemProgram.programId,
    //     ticket
    //   })
    //   .rpc()
    // const predictionEventAcc = await program.account.predictionEvent.fetch(
    //   predictionEvent
    // )
    // console.log("predictionEventAcc: ", predictionEventAcc)
    // const ticketAcc = await program.account.ticket.fetch(ticket)
    // console.log("ticketAcc amount: ", ticketAcc.amount.toNumber())
    // console.log(
    //   "predictionEventAcc lamports: ",
    //   await provider.connection.getBalance(predictionEvent)
    // )
  })
})
