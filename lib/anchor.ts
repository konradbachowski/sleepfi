import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { Program, AnchorProvider, Idl, BN } from '@coral-xyz/anchor';

export const PROGRAM_ID = new PublicKey('29ZkK7ivpzz6zTEyPh5grfpekJwAmWuueSRDe85xusuc');

const IDL = {
  address: '29ZkK7ivpzz6zTEyPh5grfpekJwAmWuueSRDe85xusuc',
  metadata: {
    name: 'sleepfi_program',
    version: '0.1.0',
    spec: '0.1.0',
    description: 'Created with Anchor',
  },
  instructions: [
    {
      name: 'claim',
      docs: ['User claims reward after successful challenge.'],
      discriminator: [62, 198, 214, 193, 213, 159, 108, 210],
      accounts: [
        { name: 'user', writable: true, signer: true },
        {
          name: 'challenge',
          writable: true,
          pda: {
            seeds: [
              { kind: 'const', value: [99, 104, 97, 108, 108, 101, 110, 103, 101] },
              { kind: 'account', path: 'user' },
            ],
          },
        },
        {
          name: 'vault',
          writable: true,
          pda: {
            seeds: [
              { kind: 'const', value: [118, 97, 117, 108, 116] },
              { kind: 'account', path: 'challenge' },
            ],
          },
        },
        { name: 'system_program', address: '11111111111111111111111111111111' },
      ],
      args: [],
    },
    {
      name: 'forfeit',
      docs: ['Mark challenge as failed if time expired and streak insufficient. Vault stays in treasury.'],
      discriminator: [80, 154, 237, 158, 244, 198, 154, 9],
      accounts: [
        {
          name: 'caller',
          docs: ['Anyone can trigger forfeit on expired failed challenges'],
          writable: true,
          signer: true,
        },
        { name: 'challenge', writable: true },
        {
          name: 'vault',
          writable: true,
          pda: {
            seeds: [
              { kind: 'const', value: [118, 97, 117, 108, 116] },
              { kind: 'account', path: 'challenge' },
            ],
          },
        },
        { name: 'pool', writable: true },
        { name: 'system_program', address: '11111111111111111111111111111111' },
      ],
      args: [],
    },
    {
      name: 'initialize_challenge',
      docs: ['User stakes SOL and creates a challenge. SOL locked in vault PDA.'],
      discriminator: [131, 92, 76, 227, 13, 71, 164, 243],
      accounts: [
        { name: 'user', writable: true, signer: true },
        { name: 'oracle' },
        {
          name: 'challenge',
          writable: true,
          pda: {
            seeds: [
              { kind: 'const', value: [99, 104, 97, 108, 108, 101, 110, 103, 101] },
              { kind: 'account', path: 'user' },
            ],
          },
        },
        {
          name: 'vault',
          writable: true,
          pda: {
            seeds: [
              { kind: 'const', value: [118, 97, 117, 108, 116] },
              { kind: 'account', path: 'challenge' },
            ],
          },
        },
        { name: 'system_program', address: '11111111111111111111111111111111' },
      ],
      args: [
        { name: 'goal_hours', type: 'f32' },
        { name: 'duration_days', type: 'u8' },
        { name: 'stake_lamports', type: 'u64' },
      ],
    },
    {
      name: 'submit_sleep',
      docs: ['Oracle (backend) submits verified sleep data from Health Connect.'],
      discriminator: [123, 46, 121, 116, 214, 90, 157, 49],
      accounts: [
        { name: 'oracle', writable: true, signer: true },
        { name: 'challenge', writable: true },
      ],
      args: [
        { name: 'duration_hours', type: 'f32' },
        { name: '_date', type: 'i64' },
      ],
    },
  ],
  accounts: [
    {
      name: 'Challenge',
      discriminator: [119, 250, 161, 121, 119, 81, 22, 208],
    },
  ],
  errors: [
    { code: 6000, name: 'StakeTooLow', msg: 'Stake must be at least 0.05 SOL' },
    { code: 6001, name: 'InvalidDuration', msg: 'Duration must be between 3 and 30 days' },
    { code: 6002, name: 'InvalidGoal', msg: 'Goal must be between 6h and 10h' },
    { code: 6003, name: 'ChallengeNotActive', msg: 'Challenge is not active' },
    { code: 6004, name: 'ChallengeNotComplete', msg: 'Challenge is not yet complete' },
    { code: 6005, name: 'ChallengeFailed', msg: 'Challenge failed — insufficient streak' },
    { code: 6006, name: 'ChallengeSucceeded', msg: 'Challenge succeeded — cannot forfeit' },
    { code: 6007, name: 'AllDaysLogged', msg: 'All days already logged' },
    { code: 6008, name: 'Unauthorized', msg: 'Unauthorized' },
  ],
  types: [
    {
      name: 'Challenge',
      type: {
        kind: 'struct',
        fields: [
          { name: 'user', type: 'pubkey' },
          { name: 'oracle', type: 'pubkey' },
          { name: 'goal_hours', type: 'f32' },
          { name: 'duration_days', type: 'u8' },
          { name: 'stake_lamports', type: 'u64' },
          { name: 'streak', type: 'u8' },
          { name: 'days_logged', type: 'u8' },
          { name: 'starts_at', type: 'i64' },
          { name: 'ends_at', type: 'i64' },
          { name: 'status', type: { defined: { name: 'ChallengeStatus' } } },
          { name: 'bump', type: 'u8' },
          { name: 'vault_bump', type: 'u8' },
        ],
      },
    },
    {
      name: 'ChallengeStatus',
      type: {
        kind: 'enum',
        variants: [{ name: 'Active' }, { name: 'Completed' }, { name: 'Failed' }],
      },
    },
  ],
} as unknown as Idl;

export function getChallengePDA(userPubkey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('challenge'), userPubkey.toBytes()],
    PROGRAM_ID
  );
}

export function getVaultPDA(challengePubkey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), challengePubkey.toBytes()],
    PROGRAM_ID
  );
}

export function getProgram(connection: Connection, wallet: any): Program {
  const provider = new AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
    preflightCommitment: 'confirmed',
  });
  return new Program(IDL, provider);
}

export async function initializeChallenge(
  connection: Connection,
  wallet: any,
  goalHours: number,
  durationDays: number,
  stakeLamports: number
): Promise<string> {
  const program = getProgram(connection, wallet);
  const userPubkey = wallet.publicKey as PublicKey;

  const oracleAddress = process.env.EXPO_PUBLIC_TREASURY_WALLET;
  if (!oracleAddress) {
    throw new Error('EXPO_PUBLIC_TREASURY_WALLET is not set');
  }
  const oraclePubkey = new PublicKey(oracleAddress);

  const [challengePDA] = getChallengePDA(userPubkey);
  const [vaultPDA] = getVaultPDA(challengePDA);

  const tx = await (program.methods as any)
    .initializeChallenge(goalHours, durationDays, new BN(stakeLamports))
    .accounts({
      user: userPubkey,
      oracle: oraclePubkey,
      challenge: challengePDA,
      vault: vaultPDA,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = userPubkey;
  (tx as any).lastValidBlockHeight = lastValidBlockHeight;

  const signature = await wallet.sendTransaction(tx, connection);
  await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');

  return signature;
}

export async function claimChallenge(
  connection: Connection,
  wallet: any
): Promise<string> {
  const program = getProgram(connection, wallet);
  const userPubkey = wallet.publicKey as PublicKey;

  const [challengePDA] = getChallengePDA(userPubkey);
  const [vaultPDA] = getVaultPDA(challengePDA);

  const tx = await (program.methods as any)
    .claim()
    .accounts({
      user: userPubkey,
      challenge: challengePDA,
      vault: vaultPDA,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = userPubkey;
  (tx as any).lastValidBlockHeight = lastValidBlockHeight;

  const signature = await wallet.sendTransaction(tx, connection);
  await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');

  return signature;
}
