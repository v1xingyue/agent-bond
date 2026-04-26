#!/bin/bash
set -e

NETWORK=${NETWORK:-devnet}
PROGRAM_KEYPAIR="target/deploy/agent_bond-keypair.json"
PROGRAM_SO="target/deploy/agent_bond.so"

echo "=== Agent Bond Contract Deployment ==="
echo "Network: $NETWORK"
echo "Program ID: $(solana-keygen pubkey $PROGRAM_KEYPAIR)"
echo ""

# Ensure devnet
solana config set --url https://api.devnet.solana.com

# Check balance
BALANCE=$(solana balance | awk '{print $1}')
echo "Deployer balance: $BALANCE SOL"

if (( $(echo "$BALANCE < 0.5" | bc -l) )); then
  echo "Balance too low. Requesting airdrop..."
  solana airdrop 2
fi

# Deploy
echo ""
echo "Deploying program..."
solana program deploy \
  --program-id "$PROGRAM_KEYPAIR" \
  "$PROGRAM_SO" \
  --url https://api.devnet.solana.com

echo ""
echo "Program deployed successfully!"
echo "Program ID: $(solana-keygen pubkey $PROGRAM_KEYPAIR)"
echo ""
echo "Next steps:"
echo "1. Copy Program ID to your frontend .env"
echo "2. Run 'ts-node tests/test.ts' to initialize the contract"
