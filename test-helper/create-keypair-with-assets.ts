import { Wallet, web3 } from "@coral-xyz/anchor"
import * as spl from "@solana/spl-token"

type Token = {
  mint: web3.PublicKey
  balance: number
}

export async function createKeyPairWithAssets(
  connection: web3.Connection,
  minter: Wallet,
  sols: number,
  tokens: Token[] = []
) {
  const wallet = web3.Keypair.generate()

  const signature = await connection.requestAirdrop(
    wallet.publicKey,
    sols * web3.LAMPORTS_PER_SOL
  )

  await connection.confirmTransaction(signature)

  for (const { balance, mint } of tokens) {
    const m = await spl.getMint(connection, mint)

    const ata = await spl.getOrCreateAssociatedTokenAccount(
      connection,
      minter.payer,
      mint,
      wallet.publicKey
    )

    await spl.mintTo(
      connection,
      minter.payer,
      mint,
      ata.address,
      minter.publicKey,
      balance * web3.LAMPORTS_PER_SOL
    )
  }

  return wallet
}
