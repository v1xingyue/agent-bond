# Agent Bond Trust Protocol

A trust-minimized bonding layer between humans and AI agents on Solana. Users deposit SOL to build on-chain bond value with agents. The more skills they execute, the higher their bond — creating a verifiable, financial reputation signal for human-agent relationships.

> **Live Demo** (Devnet): The frontend connects to a deployed native Solana program. Phantom / Solflare wallet required.

---

## 📁 Repository Structure

```
agent-bond-contract/   # Native Solana smart contract (Rust)
agent-bond-demo/       # React + Vite frontend demo (TypeScript)
Agent_Bond_Trust_Protocol.pptx
```

---

## 🏗 Architecture

### Smart Contract (`agent-bond-contract/`)

A **native Solana program** (~126 KB, no Anchor) built with `solana-program ~1.17` + `borsh 0.10`.

| Account | PDA Seeds | Purpose |
|---------|-----------|---------|
| `Config` | `["config"]` | Global protocol config: admin, treasury |
| `UserState` | `["user_state", user_pubkey]` | Per-user totals: deposited, spent, skill count |
| `AgentBond` | `["agent_bond", user_pubkey, agent_id]` | Per-user-per-agent: bond value, skill count, spent |

### Instructions

| # | Name | Description |
|---|------|-------------|
| 0 | `Initialize` | One-time protocol setup |
| 1 | `Deposit` | User deposits SOL into the protocol |
| 2 | `ExecuteSkill` | Pay SOL + gain bond value for a specific agent |
| 3 | `Withdraw` | Withdraw available SOL |

**Devnet Program ID:** `FcwjKm2RZY2WNS7HWVLo18pH9HJTDsPeyfVgYjGHQHGN`

### Frontend (`agent-bond-demo/`)

- **Framework:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS 4 + Framer Motion
- **State:** Zustand
- **Chain:** `@solana/web3.js` with custom IDL helpers
- **Wallet:** Phantom / Solflare via custom `WalletContext`

Key components:
- `LandingPage.tsx` — Agent marketplace & bond overview
- `ChatModal.tsx` — Skill execution chat interface
- `DepositModal.tsx` — SOL deposit / withdraw UI
- `contract/idl.ts` — Instruction builders, PDA helpers, account deserializers
- `contract/useContract.ts` — React hook wrapping on-chain calls

---

## 🚀 Quick Start

### Prerequisites

- [Rust](https://rustup.rs/)
- [Solana CLI](https://docs.solana.com/cli/install)
- [Node.js](https://nodejs.org/) + pnpm/npm

### 1. Build the Contract

```bash
cd agent-bond-contract
cargo build-sbf
```

### 2. Deploy to Devnet

```bash
chmod +x deploy.sh
./deploy.sh
```

Or manually:
```bash
solana config set --url https://api.devnet.solana.com
solana program deploy target/deploy/agent_bond.so \
  --program-id target/deploy/agent_bond-keypair.json
```

### 3. Run the Demo

```bash
cd agent-bond-demo
pnpm install
pnpm dev
```

Open `http://localhost:5173` and connect your devnet wallet.

---

## 🧪 Testing

```bash
# Run on-chain tests (devnet)
cd agent-bond-contract
# See tests/test.ts for TypeScript test suite
```

---

## 💡 Usage Example

```tsx
import { useAgentBondContract } from './contract/useContract';

function MyComponent() {
  const { deposit, executeSkill, fetchOnChainBond } = useAgentBondContract();

  // Deposit 0.5 SOL
  await deposit(0.5);

  // Execute a skill with agent "alpha"
  await executeSkill('alpha', 'market_analysis', 0.01, 10);

  // Read on-chain bond
  const bond = await fetchOnChainBond('alpha');
  console.log(bond?.bondValue);
}
```

---

## 📊 Account Data Layouts

### UserState (54 bytes)
```
0..32   owner:            Pubkey
32..40  total_deposited:  u64 (LE)
40..48  total_spent:      u64 (LE)
48..52  total_skills:     u32 (LE)
52      bump:             u8
53      is_initialized:   u8
```

### AgentBond (variable, min 58 bytes)
```
0..32   owner:            Pubkey
32..36  agent_id_len:     u32 (LE)
36..N   agent_id:         string (UTF-8)
N..N+8  bond_value:       u64 (LE)
N+8..N+12 skill_count:   u32 (LE)
N+12..N+20 total_spent:  u64 (LE)
N+20    bump:             u8
N+21    is_initialized:   u8
```

---

## 🛡 Security Notes

- Treasury must be funded for withdrawals to work. In production, the treasury should be a program-controlled PDA.
- All PDA seeds use UTF-8 bytes of `agent_id`.
- Overflow checks are enabled in release builds.

---

## 📄 License

MIT
