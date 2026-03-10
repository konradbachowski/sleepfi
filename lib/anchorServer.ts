import {
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { Program, AnchorProvider, Idl, BN, Wallet } from '@coral-xyz/anchor';
import { getUserStatePDA, getChallengePDAWithId, PROGRAM_ID } from './anchor';
import IDL from './sleepfi-idl.json';

const DEVNET_CONNECTION = new Connection('https://api.devnet.solana.com', 'confirmed');

function getOracleKeypair(): Keypair {
  const b64 = process.env.TREASURY_PRIVATE_KEY_BASE64;
  if (!b64) throw new Error('TREASURY_PRIVATE_KEY_BASE64 not set');
  const bytes = Buffer.from(b64, 'base64');
  return Keypair.fromSecretKey(bytes);
}

function getServerProgram(oracleKeypair: Keypair): Program {
  const wallet = new Wallet(oracleKeypair);
  const provider = new AnchorProvider(DEVNET_CONNECTION, wallet, {
    commitment: 'confirmed',
    preflightCommitment: 'confirmed',
  });
  return new Program(IDL as unknown as Idl, provider);
}

// ─── Read user's challenge count (to identify the active challenge) ────────────
export async function getUserChallengeCountServer(userWalletAddress: string): Promise<number> {
  const userPubkey = new PublicKey(userWalletAddress);
  const [userStatePDA] = getUserStatePDA(userPubkey);
  const accountInfo = await DEVNET_CONNECTION.getAccountInfo(userStatePDA);
  if (!accountInfo) return 0;
  // UserState layout: discriminator(8) + challenge_count(u64 LE, 8) + bump(1)
  const count = accountInfo.data.readBigUInt64LE(8);
  return Number(count);
}

// ─── Oracle: submit_sleep ─────────────────────────────────────────────────────
// Called by the backend to record a verified sleep day on-chain.
export async function submitSleepOnChain(
  userWalletAddress: string,
  challengeId: number
): Promise<string> {
  const oracleKeypair = getOracleKeypair();
  const program = getServerProgram(oracleKeypair);

  const userPubkey = new PublicKey(userWalletAddress);
  const [challengeEscrowPDA] = getChallengePDAWithId(userPubkey, challengeId);

  const tx = await (program.methods as any)
    .submitSleep(new BN(challengeId))
    .accounts({
      pool: new PublicKey('GiqenKFwjeqcgGztmvR31bn44miKp5WxbqsDNDyWqGq1'),
      challengeEscrow: challengeEscrowPDA,
      oracle: oracleKeypair.publicKey,
    })
    .transaction();

  const { blockhash, lastValidBlockHeight } = await DEVNET_CONNECTION.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = oracleKeypair.publicKey;

  const signature = await sendAndConfirmTransaction(DEVNET_CONNECTION, tx, [oracleKeypair], {
    commitment: 'confirmed',
  });

  return signature;
}

// ─── Oracle: complete_challenge ───────────────────────────────────────────────
export async function completeChallengeOnChain(
  userWalletAddress: string,
  challengeId: number
): Promise<string> {
  const oracleKeypair = getOracleKeypair();
  const program = getServerProgram(oracleKeypair);

  const userPubkey = new PublicKey(userWalletAddress);
  const [challengeEscrowPDA] = getChallengePDAWithId(userPubkey, challengeId);

  const tx = await (program.methods as any)
    .completeChallenge(new BN(challengeId))
    .accounts({
      pool: new PublicKey('GiqenKFwjeqcgGztmvR31bn44miKp5WxbqsDNDyWqGq1'),
      challengeEscrow: challengeEscrowPDA,
      oracle: oracleKeypair.publicKey,
    })
    .transaction();

  const { blockhash } = await DEVNET_CONNECTION.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = oracleKeypair.publicKey;

  const signature = await sendAndConfirmTransaction(DEVNET_CONNECTION, tx, [oracleKeypair], {
    commitment: 'confirmed',
  });

  return signature;
}

// ─── Oracle: fail_challenge ───────────────────────────────────────────────────
export async function failChallengeOnChain(
  userWalletAddress: string,
  challengeId: number
): Promise<string> {
  const oracleKeypair = getOracleKeypair();
  const program = getServerProgram(oracleKeypair);

  const userPubkey = new PublicKey(userWalletAddress);
  const [challengeEscrowPDA] = getChallengePDAWithId(userPubkey, challengeId);

  const tx = await (program.methods as any)
    .failChallenge(new BN(challengeId))
    .accounts({
      pool: new PublicKey('GiqenKFwjeqcgGztmvR31bn44miKp5WxbqsDNDyWqGq1'),
      challengeEscrow: challengeEscrowPDA,
      oracle: oracleKeypair.publicKey,
    })
    .transaction();

  const { blockhash } = await DEVNET_CONNECTION.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = oracleKeypair.publicKey;

  const signature = await sendAndConfirmTransaction(DEVNET_CONNECTION, tx, [oracleKeypair], {
    commitment: 'confirmed',
  });

  return signature;
}
