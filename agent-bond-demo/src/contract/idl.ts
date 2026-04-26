/**
 * Agent Bond Contract IDL & TypeScript Client
 * Program ID: FcwjKm2RZY2WNS7HWVLo18pH9HJTDsPeyfVgYjGHQHGN (devnet)
 */

import {
  Connection,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js';

// ─── Program ID ───────────────────────────────────────────────
export const PROGRAM_ID = new PublicKey(
  'FcwjKm2RZY2WNS7HWVLo18pH9HJTDsPeyfVgYjGHQHGN'
);

// ─── Treasury (devnet) ────────────────────────────────────────
export const TREASURY_ADDRESS = new PublicKey(
  'Hr5fZYwLXkquNomxDctvr3RaQ4N8kHMpRV6XJJxoiQKM'
);

// ─── Instruction Tags ─────────────────────────────────────────
export const InstructionTag = {
  Initialize: 0,
  Deposit: 1,
  ExecuteSkill: 2,
  Withdraw: 3,
} as const;
export type InstructionTag = typeof InstructionTag[keyof typeof InstructionTag];

// ─── Low-level byte helpers ───────────────────────────────────
const encoder = new TextEncoder();

function writeU64(buf: Uint8Array, offset: number, value: bigint): void {
  const view = new DataView(buf.buffer, buf.byteOffset + offset, 8);
  view.setBigUint64(0, value, true);
}

function writeString(buf: Uint8Array, offset: number, str: string): number {
  const bytes = encoder.encode(str);
  const view = new DataView(buf.buffer, buf.byteOffset + offset, 4);
  view.setUint32(0, bytes.length, true);
  buf.set(bytes, offset + 4);
  return 4 + bytes.length;
}

// Use web3.js internal Buffer via global to ensure instanceof compatibility
function makeBuffer(tag: number, payload: Uint8Array): Buffer {
  // Access the same Buffer constructor that @solana/web3.js uses
  const Buf = (typeof Buffer !== 'undefined') ? Buffer : (window as any).Buffer;
  if (!Buf) throw new Error('Buffer not available');
  const buf = Buf.alloc(1 + payload.length);
  buf.writeUInt8(tag, 0);
  for (let i = 0; i < payload.length; i++) {
    buf[i + 1] = payload[i];
  }
  return buf;
}

// ─── PDA Helpers ──────────────────────────────────────────────
export function getConfigPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [encoder.encode('config')],
    PROGRAM_ID
  );
}

export function getUserStatePda(user: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [encoder.encode('user_state'), user.toBytes()],
    PROGRAM_ID
  );
}

export function getAgentBondPda(
  user: PublicKey,
  agentId: string
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [encoder.encode('agent_bond'), user.toBytes(), encoder.encode(agentId)],
    PROGRAM_ID
  );
}

// ─── Instruction Builders ─────────────────────────────────────

/** Initialize the protocol config (one-time, admin only) */
export function buildInitializeIx(
  payer: PublicKey,
  treasury: PublicKey
): TransactionInstruction {
  const [configPda] = getConfigPda();
  const payload = new Uint8Array(32);
  const tBytes = treasury.toBytes();
  payload.set(tBytes, 0);
  return new TransactionInstruction({
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: configPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: makeBuffer(InstructionTag.Initialize, payload),
  });
}

/** Deposit SOL into the protocol */
export function buildDepositIx(
  user: PublicKey,
  amountLamports: bigint
): TransactionInstruction {
  const [configPda] = getConfigPda();
  const [userStatePda] = getUserStatePda(user);
  const payload = new Uint8Array(8);
  writeU64(payload, 0, amountLamports);
  return new TransactionInstruction({
    keys: [
      { pubkey: user, isSigner: true, isWritable: true },
      { pubkey: configPda, isSigner: false, isWritable: true },
      { pubkey: userStatePda, isSigner: false, isWritable: true },
      { pubkey: TREASURY_ADDRESS, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: makeBuffer(InstructionTag.Deposit, payload),
  });
}

/** Execute a skill (pay SOL, gain bond) */
export function buildExecuteSkillIx(
  user: PublicKey,
  agentId: string,
  skillId: string,
  costLamports: bigint,
  bondGain: bigint
): TransactionInstruction {
  const [configPda] = getConfigPda();
  const [userStatePda] = getUserStatePda(user);
  const [agentBondPda] = getAgentBondPda(user, agentId);

  const agentBytes = encoder.encode(agentId).length;
  const skillBytes = encoder.encode(skillId).length;
  const payload = new Uint8Array(4 + agentBytes + 4 + skillBytes + 8 + 8);
  let off = 0;
  off += writeString(payload, off, agentId);
  off += writeString(payload, off, skillId);
  writeU64(payload, off, costLamports);
  off += 8;
  writeU64(payload, off, bondGain);

  return new TransactionInstruction({
    keys: [
      { pubkey: user, isSigner: true, isWritable: true },
      { pubkey: configPda, isSigner: false, isWritable: true },
      { pubkey: userStatePda, isSigner: false, isWritable: true },
      { pubkey: agentBondPda, isSigner: false, isWritable: true },
      { pubkey: TREASURY_ADDRESS, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: makeBuffer(InstructionTag.ExecuteSkill, payload),
  });
}

/** Withdraw SOL from the protocol */
export function buildWithdrawIx(
  user: PublicKey,
  amountLamports: bigint
): TransactionInstruction {
  const [configPda] = getConfigPda();
  const [userStatePda] = getUserStatePda(user);
  const payload = new Uint8Array(8);
  writeU64(payload, 0, amountLamports);
  return new TransactionInstruction({
    keys: [
      { pubkey: user, isSigner: true, isWritable: false },
      { pubkey: configPda, isSigner: false, isWritable: true },
      { pubkey: userStatePda, isSigner: false, isWritable: true },
      { pubkey: TREASURY_ADDRESS, isSigner: false, isWritable: true },
      { pubkey: user, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: makeBuffer(InstructionTag.Withdraw, payload),
  });
}

// ─── Account Deserializers (raw byte layout) ──────────────────

export interface UserStateData {
  owner: PublicKey;
  totalDeposited: bigint;
  totalSpent: bigint;
  totalSkillsExecuted: number;
  bump: number;
  isInitialized: boolean;
}

export interface AgentBondData {
  owner: PublicKey;
  agentId: string;
  bondValue: bigint;
  skillCount: number;
  totalSpent: bigint;
  bump: number;
  isInitialized: boolean;
}

function readBigUInt64LE(buf: Uint8Array, offset: number): bigint {
  const view = new DataView(buf.buffer, buf.byteOffset + offset, 8);
  return view.getBigUint64(0, true);
}

function readUInt32LE(buf: Uint8Array, offset: number): number {
  const view = new DataView(buf.buffer, buf.byteOffset + offset, 4);
  return view.getUint32(0, true);
}

export async function fetchUserState(
  connection: Connection,
  user: PublicKey
): Promise<UserStateData | null> {
  const [pda] = getUserStatePda(user);
  const acc = await connection.getAccountInfo(pda);
  if (!acc || acc.data.length < 54) return null;

  const d = acc.data;
  return {
    owner: new PublicKey(d.slice(0, 32)),
    totalDeposited: readBigUInt64LE(d, 32),
    totalSpent: readBigUInt64LE(d, 40),
    totalSkillsExecuted: readUInt32LE(d, 48),
    bump: d[52],
    isInitialized: d[53] !== 0,
  };
}

export async function fetchAgentBond(
  connection: Connection,
  user: PublicKey,
  agentId: string
): Promise<AgentBondData | null> {
  const [pda] = getAgentBondPda(user, agentId);
  const acc = await connection.getAccountInfo(pda);
  if (!acc || acc.data.length < 58) return null;

  const d = acc.data;
  const agentIdLen = readUInt32LE(d, 32);
  const agentIdStr = new TextDecoder().decode(d.slice(36, 36 + agentIdLen));
  let off = 36 + agentIdLen;
  return {
    owner: new PublicKey(d.slice(0, 32)),
    agentId: agentIdStr,
    bondValue: readBigUInt64LE(d, off),
    skillCount: readUInt32LE(d, off + 8),
    totalSpent: readBigUInt64LE(d, off + 12),
    bump: d[off + 20],
    isInitialized: d[off + 21] !== 0,
  };
}
