import { web3 } from "@coral-xyz/anchor"
import {
  createAssociatedTokenAccountInstruction,
  getAccount,
  getAssociatedTokenAddress,
  TokenAccountNotFoundError
} from "@solana/spl-token"

export async function addCreateAtaInsIfNotExist(
  transaction: web3.Transaction,
  connection: web3.Connection,
  payper: web3.PublicKey,
  mint: web3.PublicKey,
  owner: web3.PublicKey
) {
  const associatedToken = await getAssociatedTokenAddress(mint, owner)

  try {
    await getAccount(connection, associatedToken)
  } catch (error) {
    if (error instanceof TokenAccountNotFoundError) {
      const ins = createAssociatedTokenAccountInstruction(
        payper,
        associatedToken,
        owner,
        mint
      )

      transaction.add(ins)

      return associatedToken
    }

    throw error
  }

  return associatedToken
}
