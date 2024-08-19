import { web3 } from "@coral-xyz/anchor"
import { BN } from "bn.js"

export const bnLamports = (amount: number) =>
  new BN(amount * web3.LAMPORTS_PER_SOL)
