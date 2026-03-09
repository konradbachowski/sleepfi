import { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';

export const SOLANA_CLUSTER = 'devnet';
export const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

export async function buildStakeTransaction(
  fromPubkey: PublicKey,
  treasuryAddress: string,
  lamports: number
): Promise<Transaction> {
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey,
      toPubkey: new PublicKey(treasuryAddress),
      lamports,
    })
  );

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = fromPubkey;
  (tx as any).lastValidBlockHeight = lastValidBlockHeight;

  return tx;
}

export const solToLamports = (sol: number) => Math.floor(sol * LAMPORTS_PER_SOL);
export const lamportsToSol = (lamports: number) => (lamports / LAMPORTS_PER_SOL).toFixed(4);

export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export async function getBalance(address: string): Promise<number> {
  try {
    const pubkey = new PublicKey(address);
    const lamports = await connection.getBalance(pubkey);
    return lamports / LAMPORTS_PER_SOL;
  } catch {
    return 0;
  }
}
