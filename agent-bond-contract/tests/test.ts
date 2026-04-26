import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import * as borsh from "borsh";
import { assert } from "chai";
import fs from "fs";
import path from "path";

// Program ID (replace after deployment)
const PROGRAM_ID = new PublicKey(
  "AgBoNd1111111111111111111111111111111111111"
);

// Treasury keypair (devnet test)
const TREASURY = Keypair.generate();

// Instruction schemas
class InitializeArgs {
  treasury: Uint8Array;
  constructor(treasury: Uint8Array) {
    this.treasury = treasury;
  }
}
const InitializeSchema = new Map([
  [InitializeArgs, { kind: "struct", fields: [["treasury", [32]]] }],
]);

class DepositArgs {
  amount: bigint;
  constructor(amount: bigint) {
    this.amount = amount;
  }
}
const DepositSchema = new Map([
  [DepositArgs, { kind: "struct", fields: [["amount", "u64"]] }],
]);

class ExecuteSkillArgs {
  agent_id: string;
  skill_id: string;
  cost: bigint;
  bond_gain: bigint;
  constructor(
    agent_id: string,
    skill_id: string,
    cost: bigint,
    bond_gain: bigint
  ) {
    this.agent_id = agent_id;
    this.skill_id = skill_id;
    this.cost = cost;
    this.bond_gain = bond_gain;
  }
}
const ExecuteSkillSchema = new Map([
  [
    ExecuteSkillArgs,
    {
      kind: "struct",
      fields: [
        ["agent_id", "string"],
        ["skill_id", "string"],
        ["cost", "u64"],
        ["bond_gain", "u64"],
      ],
    },
  ],
]);

// Instruction enum tag + data
function encodeInstruction(tag: number, data: Buffer): Buffer {
  const buf = Buffer.alloc(1 + data.length);
  buf.writeUInt8(tag, 0);
  data.copy(buf, 1);
  return buf;
}

async function main() {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  // Load deployer keypair
  const keypairPath = path.join(process.env.HOME || "", ".config/solana/id.json");
  const deployer = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(keypairPath, "utf-8")))
  );

  console.log("Deployer:", deployer.publicKey.toBase58());

  // Derive PDAs
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    PROGRAM_ID
  );
  const [userStatePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("user_state"), deployer.publicKey.toBuffer()],
    PROGRAM_ID
  );
  const [agentBondPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("agent_bond"),
      deployer.publicKey.toBuffer(),
      Buffer.from("alpha"),
    ],
    PROGRAM_ID
  );

  console.log("Config PDA:", configPda.toBase58());
  console.log("UserState PDA:", userStatePda.toBase58());
  console.log("AgentBond PDA:", agentBondPda.toBase58());

  // 1. Initialize
  console.log("\n1. Initializing...");
  const initData = borsh.serialize(
    InitializeSchema,
    new InitializeArgs(TREASURY.publicKey.toBytes())
  );
  const initTx = new Transaction().add({
    keys: [
      { pubkey: deployer.publicKey, isSigner: true, isWritable: true },
      { pubkey: configPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: encodeInstruction(0, Buffer.from(initData)),
  });
  await sendAndConfirmTransaction(connection, initTx, [deployer]);
  console.log("Initialized!");

  // 2. Deposit 0.1 SOL
  console.log("\n2. Depositing 0.1 SOL...");
  const depositData = borsh.serialize(
    DepositSchema,
    new DepositArgs(BigInt(0.1 * 1e9))
  );
  const depositTx = new Transaction().add({
    keys: [
      { pubkey: deployer.publicKey, isSigner: true, isWritable: true },
      { pubkey: configPda, isSigner: false, isWritable: true },
      { pubkey: userStatePda, isSigner: false, isWritable: true },
      { pubkey: TREASURY.publicKey, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: encodeInstruction(1, Buffer.from(depositData)),
  });
  await sendAndConfirmTransaction(connection, depositTx, [deployer]);
  console.log("Deposited!");

  // 3. Execute Skill
  console.log("\n3. Executing Skill...");
  const skillData = borsh.serialize(
    ExecuteSkillSchema,
    new ExecuteSkillArgs("alpha", "market_analysis", BigInt(0.01 * 1e9), BigInt(10))
  );
  const skillTx = new Transaction().add({
    keys: [
      { pubkey: deployer.publicKey, isSigner: true, isWritable: true },
      { pubkey: configPda, isSigner: false, isWritable: true },
      { pubkey: userStatePda, isSigner: false, isWritable: true },
      { pubkey: agentBondPda, isSigner: false, isWritable: true },
      { pubkey: TREASURY.publicKey, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: encodeInstruction(2, Buffer.from(skillData)),
  });
  await sendAndConfirmTransaction(connection, skillTx, [deployer]);
  console.log("Skill executed!");

  console.log("\nAll tests passed!");
}

main().catch(console.error);
