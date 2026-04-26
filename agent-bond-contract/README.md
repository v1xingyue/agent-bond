# Agent Bond Protocol — Native Solana Program

Native Solana smart contract (no Anchor) for the Agent Bond Protocol.

## Architecture

| Account | PDA Seeds | Purpose |
|---------|-----------|---------|
| `Config` | `["config"]` | Global config: admin, treasury address |
| `UserState` | `["user_state", user_pubkey]` | Per-user: total deposited, total spent, skill count |
| `AgentBond` | `["agent_bond", user_pubkey, agent_id]` | Per-user-per-Agent: bond value, skill count, spent |

## Instructions

| # | Tag | Name | Description |
|---|-----|------|-------------|
| 0 | `Initialize` | `Initialize` | One-time setup of protocol config |
| 1 | `Deposit` | `Deposit` | User deposits SOL into protocol |
| 2 | `ExecuteSkill` | `ExecuteSkill` | Pay SOL + gain bond value for an Agent |
| 3 | `Withdraw` | `Withdraw` | Withdraw available SOL |

## Build

```bash
cd agent-bond-contract
cargo build-sbf
```

## Deploy (Devnet)

```bash
chmod +x deploy.sh
./deploy.sh
```

Or manually:

```bash
solana config set --url https://api.devnet.solana.com
solana program deploy target/deploy/agent_bond.so --program-id target/deploy/agent_bond-keypair.json
```

## Program ID (Devnet)

```
FcwjKm2RZY2WNS7HWVLo18pH9HJTDsPeyfVgYjGHQHGN
```

## Frontend Integration

The TypeScript client is in `../agent-bond-demo/src/contract/`:

- `idl.ts` — Instruction builders, PDA helpers, account deserializers
- `useContract.ts` — React hook wrapping on-chain calls

### Usage

```tsx
import { useAgentBondContract } from './contract/useContract';

function MyComponent() {
  const { deposit, executeSkill, fetchOnChainBond } = useAgentBondContract();

  // Deposit 0.5 SOL
  await deposit(0.5);

  // Execute skill
  await executeSkill('alpha', 'market_analysis', 0.01, 10);

  // Read on-chain bond
  const bond = await fetchOnChainBond('alpha');
  console.log(bond?.bondValue);
}
```

## Account Data Layouts

### UserState (54 bytes)
```
0..32   owner:            Pubkey
32..40  total_deposited:  u64 (LE)
40..48  total_spent:      u64 (LE)
48..52  total_skills:     u32 (LE)
52      bump:             u8
53      is_initialized:   u8 (0/1)
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
N+21    is_initialized:   u8 (0/1)
```

## Dev Notes

- Written with `solana-program ~1.17` + `borsh 0.10`
- No Anchor — fully native for minimal binary size (~126KB)
- PDA seeds use UTF-8 bytes of agent_id
- Treasury must be funded for withdrawals to work (treasury needs to be a program-controlled PDA in production)
