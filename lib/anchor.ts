import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
} from '@solana/web3.js';

// ─── Deployed program constants ────────────────────────────────────────────────
export const PROGRAM_ID = new PublicKey('Gq6HZCUkXhznL8BBfEVXwnB4BCyzfvhpu4CwYe86wUuD');
export const RPC_URL = 'https://api.devnet.solana.com';
export const ORACLE_PUBKEY = new PublicKey('Brdg78coo8Z5qv6bmxYwGBfEgfP8fJ8nrPj7iek7y6eE');
export const POOL_PDA = new PublicKey('GiqenKFwjeqcgGztmvR31bn44miKp5WxbqsDNDyWqGq1');

// ─── Instruction discriminators (from IDL) ─────────────────────────────────────
// start_challenge discriminator: [241, 96, 253, 187, 177, 158, 16, 122]
const START_CHALLENGE_DISCRIMINATOR = Buffer.from([241, 96, 253, 187, 177, 158, 16, 122]);

// ─── PDA helpers ──────────────────────────────────────────────────────────────
export function getUserStatePDA(userPubkey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('user'), userPubkey.toBytes()],
    PROGRAM_ID
  );
}

export function getChallengePDAWithId(userPubkey: PublicKey, challengeId: number): [PublicKey, number] {
  const idBuffer = Buffer.alloc(8);
  idBuffer.writeBigUInt64LE(BigInt(challengeId));
  return PublicKey.findProgramAddressSync(
    [Buffer.from('challenge'), userPubkey.toBytes(), idBuffer],
    PROGRAM_ID
  );
}

// ─── Read user's current challenge count off-chain ────────────────────────────
export async function getUserChallengeCount(
  connection: Connection,
  userPubkey: PublicKey
): Promise<number> {
  try {
    const [userStatePDA] = getUserStatePDA(userPubkey);
    const accountInfo = await connection.getAccountInfo(userStatePDA);
    if (!accountInfo) return 0;
    // UserState layout: discriminator(8) + challenge_count(u64 LE, 8) + bump(1)
    const count = accountInfo.data.readBigUInt64LE(8);
    return Number(count);
  } catch {
    return 0;
  }
}

// ─── Build start_challenge instruction manually ───────────────────────────────
// We build the instruction manually (without Anchor's Program class) so that
// the existing MWA wallet.sendTransaction flow works without modification.
//
// Instruction args layout (all LE):
//   discriminator : 8 bytes
//   challenge_id  : u64 (8 bytes)
//   goal_hours    : u8  (1 byte)
//   duration_days : u8  (1 byte)
//   stake_lamports: u64 (8 bytes)
//
// Accounts (from IDL, in order):
//   0. user_state      - writable PDA
//   1. challenge_escrow- writable PDA
//   2. user            - writable signer
//   3. system_program  - readonly
function buildStartChallengeInstruction(
  userPubkey: PublicKey,
  userStatePDA: PublicKey,
  challengeEscrowPDA: PublicKey,
  challengeId: number,
  goalHours: number,
  durationDays: number,
  stakeLamports: number
): TransactionInstruction {
  // Serialize args
  const data = Buffer.alloc(8 + 8 + 1 + 1 + 8);
  let offset = 0;

  // 8-byte discriminator
  START_CHALLENGE_DISCRIMINATOR.copy(data, offset);
  offset += 8;

  // challenge_id: u64 LE
  data.writeBigUInt64LE(BigInt(challengeId), offset);
  offset += 8;

  // goal_hours: u8 (contract expects integer hours, round to nearest)
  data.writeUInt8(Math.round(goalHours), offset);
  offset += 1;

  // duration_days: u8
  data.writeUInt8(durationDays, offset);
  offset += 1;

  // stake_lamports: u64 LE
  data.writeBigUInt64LE(BigInt(stakeLamports), offset);

  const keys = [
    { pubkey: userStatePDA,       isSigner: false, isWritable: true },
    { pubkey: challengeEscrowPDA, isSigner: false, isWritable: true },
    { pubkey: userPubkey,         isSigner: true,  isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({ keys, programId: PROGRAM_ID, data });
}

// ─── Main export: initializeChallenge ─────────────────────────────────────────
// Called from challenge.tsx via the mwaWallet shim:
//   wallet.publicKey  = user's PublicKey
//   wallet.sendTransaction(tx, connection) -> calls signAndSendTransaction via MWA
export async function initializeChallenge(
  connection: Connection,
  wallet: { publicKey: PublicKey; sendTransaction: (tx: Transaction, conn: Connection) => Promise<string> },
  goalHours: number,
  durationDays: number,
  stakeLamports: number
): Promise<{ signature: string; challengeId: number }> {
  const userPubkey = wallet.publicKey;

  // Fetch current challenge count to use as challenge_id
  const challengeId = await getUserChallengeCount(connection, userPubkey);

  // Derive PDAs
  const [userStatePDA] = getUserStatePDA(userPubkey);
  const [challengeEscrowPDA] = getChallengePDAWithId(userPubkey, challengeId);

  // Build the instruction
  const ix = buildStartChallengeInstruction(
    userPubkey,
    userStatePDA,
    challengeEscrowPDA,
    challengeId,
    goalHours,
    durationDays,
    stakeLamports
  );

  // Build and prepare the transaction
  const tx = new Transaction().add(ix);
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = userPubkey;
  (tx as any).lastValidBlockHeight = lastValidBlockHeight;

  // Sign and send via MWA wallet shim
  const signature = await wallet.sendTransaction(tx, connection);

  return { signature, challengeId };
}

