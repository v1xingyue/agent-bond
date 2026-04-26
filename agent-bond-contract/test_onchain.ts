import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import { Buffer } from "buffer";

const PROGRAM_ID = new PublicKey("FcwjKm2RZY2WNS7HWVLo18pH9HJTDsPeyfVgYjGHQHGN");
const connection = new Connection("http://127.0.0.1:8899", "confirmed");

function loadKeypair(p: string): Keypair {
  return Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(p, "utf-8")))
  );
}

async function airdrop(pubkey: PublicKey, amount: number) {
  const sig = await connection.requestAirdrop(pubkey, amount);
  await connection.confirmTransaction(sig);
}

// Load deployer keypair
const deployer = loadKeypair(path.join(process.env.HOME || "", ".config/solana/id.json"));
const treasury = Keypair.generate();
const user = Keypair.generate();

// Instruction builders
function buildInitializeIx(admin: PublicKey, treasury: PublicKey) {
  const [configPda] = PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_ID);
  const payload = Buffer.alloc(32);
  treasury.toBuffer().copy(payload);
  const data = Buffer.alloc(1 + payload.length);
  data.writeUInt8(0, 0); // tag 0 = Initialize
  payload.copy(data, 1);
  return {
    keys: [
      { pubkey: admin, isSigner: true, isWritable: true },
      { pubkey: configPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data,
  };
}

function buildDepositIx(userPk: PublicKey, amountLamports: bigint) {
  const [configPda] = PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_ID);
  const [userStatePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("user_state"), userPk.toBuffer()],
    PROGRAM_ID
  );
  const payload = Buffer.alloc(8);
  payload.writeBigUInt64LE(amountLamports, 0);
  const data = Buffer.alloc(1 + payload.length);
  data.writeUInt8(1, 0); // tag 1 = Deposit
  payload.copy(data, 1);
  return {
    keys: [
      { pubkey: userPk, isSigner: true, isWritable: true },
      { pubkey: configPda, isSigner: false, isWritable: true },
      { pubkey: userStatePda, isSigner: false, isWritable: true },
      { pubkey: treasury.publicKey, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data,
  };
}

function buildExecuteSkillIx(
  userPk: PublicKey,
  agentId: string,
  skillId: string,
  cost: bigint,
  bondGain: bigint
) {
  const [configPda] = PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_ID);
  const [userStatePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("user_state"), userPk.toBuffer()],
    PROGRAM_ID
  );
  const [agentBondPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("agent_bond"), userPk.toBuffer(), Buffer.from(agentId)],
    PROGRAM_ID
  );

  const agentBytes = Buffer.byteLength(agentId, "utf-8");
  const skillBytes = Buffer.byteLength(skillId, "utf-8");
  const payload = Buffer.alloc(4 + agentBytes + 4 + skillBytes + 8 + 8);
  let off = 0;
  payload.writeUInt32LE(agentBytes, off); off += 4;
  payload.write(agentId, off); off += agentBytes;
  payload.writeUInt32LE(skillBytes, off); off += 4;
  payload.write(skillId, off); off += skillBytes;
  payload.writeBigUInt64LE(cost, off); off += 8;
  payload.writeBigUInt64LE(bondGain, off);

  const data = Buffer.alloc(1 + payload.length);
  data.writeUInt8(2, 0); // tag 2 = ExecuteSkill
  payload.copy(data, 1);

  return {
    keys: [
      { pubkey: userPk, isSigner: true, isWritable: true },
      { pubkey: configPda, isSigner: false, isWritable: true },
      { pubkey: userStatePda, isSigner: false, isWritable: true },
      { pubkey: agentBondPda, isSigner: false, isWritable: true },
      { pubkey: treasury.publicKey, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data,
  };
}

async function main() {
  console.log("Deployer:", deployer.publicKey.toBase58());
  console.log("Treasury:", treasury.publicKey.toBase58());
  console.log("User:", user.publicKey.toBase58());

  await airdrop(deployer.publicKey, 2 * LAMPORTS_PER_SOL);
  await airdrop(user.publicKey, 2 * LAMPORTS_PER_SOL);
  await airdrop(treasury.publicKey, 0.1 * LAMPORTS_PER_SOL);

  // 1. Initialize
  console.log("\n1. Initialize...");
  const initIx = buildInitializeIx(deployer.publicKey, treasury.publicKey);
  const tx1 = new Transaction().add(initIx);
  const sig1 = await sendAndConfirmTransaction(connection, tx1, [deployer]);
  console.log("Initialize sig:", sig1);

  // Verify config
  const [configPda] = PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_ID);
  const configAcc = await connection.getAccountInfo(configPda);
  console.log("Config data len:", configAcc?.data.length);
  if (configAcc) {
    console.log("Config owner:", configAcc.owner.toBase58());
    console.log("Config data (hex):", configAcc.data.slice(0, 10).toString("hex"));
  }

  // 2. Deposit 0.5 SOL
  console.log("\n2. Deposit 0.5 SOL...");
  const depositIx = buildDepositIx(user.publicKey, BigInt(0.5 * LAMPORTS_PER_SOL));
  const tx2 = new Transaction().add(depositIx);
  const sig2 = await sendAndConfirmTransaction(connection, tx2, [user]);
  console.log("Deposit sig:", sig2);

  // Verify user state
  const [userStatePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("user_state"), user.publicKey.toBuffer()],
    PROGRAM_ID
  );
  const userStateAcc = await connection.getAccountInfo(userStatePda);
  console.log("UserState data len:", userStateAcc?.data.length);

  // 3. ExecuteSkill
  console.log("\n3. ExecuteSkill (alpha/market_analysis, 0.01 SOL, +30 bond)...");
  const skillIx = buildExecuteSkillIx(
    user.publicKey,
    "alpha",
    "market_analysis",
    BigInt(0.01 * LAMPORTS_PER_SOL),
    BigInt(30)
  );
  const tx3 = new Transaction().add(skillIx);
  const sig3 = await sendAndConfirmTransaction(connection, tx3, [user]);
  console.log("ExecuteSkill sig:", sig3);

  // Verify agent bond
  const [agentBondPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("agent_bond"), user.publicKey.toBuffer(), Buffer.from("alpha")],
    PROGRAM_ID
  );
  const agentBondAcc = await connection.getAccountInfo(agentBondPda);
  console.log("AgentBond data len:", agentBondAcc?.data.length);

  // 4. ExecuteSkill again
  console.log("\n4. ExecuteSkill again (alpha/risk_assessment, 0.01 SOL, +30 bond)...");
  const skillIx2 = buildExecuteSkillIx(
    user.publicKey,
    "alpha",
    "risk_assessment",
    BigInt(0.01 * LAMPORTS_PER_SOL),
    BigInt(30)
  );
  const tx4 = new Transaction().add(skillIx2);
  const sig4 = await sendAndConfirmTransaction(connection, tx4, [user]);
  console.log("ExecuteSkill sig 2:", sig4);

  const agentBondAcc2 = await connection.getAccountInfo(agentBondPda);
  console.log("AgentBond data len after 2nd:", agentBondAcc2?.data.length);

  console.log("\n🎉 All on-chain tests passed!");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
