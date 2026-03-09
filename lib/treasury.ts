import { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';

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

  const balance = await connection.getBalance(treasury.publicKey);
  const totalNeeded = lamports + 5000;
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

// Platform fee taken from failed pool on each successful claim
export const PLATFORM_FEE_RATE = 0.05; // 5%

/**
 * Pool model (Moonwalk-style):
 * - Failed stakes accumulate in treasury as the reward pool
 * - Successful claimants get: their stake back + proportional share of the pool
 * - Proportion = user_stake / total_active_stakes
 * - Platform takes 5% of the pool share
 */
export function calculatePoolPayout(
  userStakeLamports: number,
  failedPoolLamports: number,
  totalActiveStakeLamports: number
): number {
  if (totalActiveStakeLamports === 0) return userStakeLamports;

  const proportion = userStakeLamports / totalActiveStakeLamports;
  const poolShare = failedPoolLamports * proportion * (1 - PLATFORM_FEE_RATE);

  return userStakeLamports + Math.floor(poolShare);
}
