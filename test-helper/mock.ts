import { web3 } from "@coral-xyz/anchor"
import * as anchor from "@coral-xyz/anchor"
import * as spl from "@solana/spl-token"

/// init left mint, right mint, accounts with sols and tokens both side
export async function mock(provider: anchor.AnchorProvider) {
  const goni = web3.Keypair.generate()
  const asura = web3.Keypair.generate()

  const [goniSignature, asuraSignature] = await Promise.all([
    provider.connection.requestAirdrop(
      goni.publicKey,
      5 * web3.LAMPORTS_PER_SOL
    ),
    provider.connection.requestAirdrop(
      asura.publicKey,
      5 * web3.LAMPORTS_PER_SOL
    )
  ])

  await Promise.all([
    provider.connection.confirmTransaction(goniSignature),
    provider.connection.confirmTransaction(asuraSignature)
  ])

  const [leftMint, rightMint] = await Promise.all([
    spl.createMint(provider.connection, goni, goni.publicKey, null, 9),
    spl.createMint(provider.connection, goni, goni.publicKey, null, 9)
  ])

  const [goniLefAta, goniRightAta, asuraLefAta, asuraRightAta] =
    await Promise.all([
      spl.getOrCreateAssociatedTokenAccount(
        provider.connection,
        goni,
        leftMint,
        goni.publicKey
      ),
      spl.getOrCreateAssociatedTokenAccount(
        provider.connection,
        goni,
        rightMint,
        goni.publicKey
      ),
      spl.getOrCreateAssociatedTokenAccount(
        provider.connection,
        goni,
        leftMint,
        asura.publicKey
      ),
      spl.getOrCreateAssociatedTokenAccount(
        provider.connection,
        goni,
        rightMint,
        asura.publicKey
      )
    ])

  await Promise.all([
    spl.mintTo(
      provider.connection,
      goni,
      leftMint,
      goniLefAta.address,
      goni.publicKey,
      web3.LAMPORTS_PER_SOL * 2000
    ),
    spl.mintTo(
      provider.connection,
      goni,
      rightMint,
      goniRightAta.address,
      goni.publicKey,
      web3.LAMPORTS_PER_SOL * 2000
    ),
    spl.mintTo(
      provider.connection,
      goni,
      leftMint,
      asuraLefAta.address,
      goni.publicKey,
      web3.LAMPORTS_PER_SOL * 2000
    ),
    spl.mintTo(
      provider.connection,
      goni,
      rightMint,
      asuraRightAta.address,
      goni.publicKey,
      web3.LAMPORTS_PER_SOL * 2000
    )
  ])

  return {
    goni, /// minter
    asura,
    leftMint,
    rightMint,
    goniLefAta,
    goniRightAta,
    asuraLefAta,
    asuraRightAta
  }
}
