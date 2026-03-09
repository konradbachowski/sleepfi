import { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction, LAMPORTS_PER_SOL } from '@solana/web3.js';

export const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

function getTreasuryKeypair(): Keypair {
  const b64 = process.env.TREASURY_PRIVATE_KEY_BASE64;
  if (!b64) throw new Error('TREASURY_PRIVATE_KEY_BASE64 not set');
  const bytes = Buffer.from(b64, 'base64');
  return Keypair.fromSecretKey(bytes);
}

export async function sendSolFromTreasury(
  recipientAddress: string,
  lamports: number
): Promise<string> {
  const treasury = getTreasuryKeypair();
  const recipient = new PublicKey(recipientAddress);

  // Check treasury balance
  const balance = await connection.getBalance(treasury.publicKey);
  const totalNeeded = lamports + 5000; // 5000 lamports for fee
  if (balance < totalNeeded) {
    throw new Error(`Treasury insufficient balance: ${balance} lamports, need ${totalNeeded}`);
  }

  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: treasury.publicKey,
      toPubkey: recipient,
      lamports,
    })
  );

  const signature = await sendAndConfirmTransaction(connection, tx, [treasury]);
  return signature;
}

export const REWARD_BONUS_RATE = 0.1; // 10% bonus on successful challenge

export function calculatePayout(stakeLamports: number, success: boolean): number {
  if (!success) return 0;
  const bonus = Math.floor(stakeLamports * REWARD_BONUS_RATE);
  return stakeLamports + bonus;
}
