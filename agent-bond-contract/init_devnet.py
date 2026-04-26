#!/usr/bin/env python3
import json
import base58
from solana.rpc.api import Client
from solana.rpc.types import TxOpts
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solders.instruction import Instruction, AccountMeta
from solders.transaction import Transaction
from solders.system_program import ID as SYSTEM_PROGRAM_ID

PROGRAM_ID = Pubkey.from_string("FcwjKm2RZY2WNS7HWVLo18pH9HJTDsPeyfVgYjGHQHGN")
TREASURY = Pubkey.from_string("Hr5fZYwLXkquNomxDctvr3RaQ4N8kHMpRV6XJJxoiQKM")
RPC = "https://api.devnet.solana.com"

# Load keypair
with open("/home/admin/.config/solana/id.json") as f:
    secret = json.load(f)
keypair = Keypair.from_bytes(bytes(secret))

client = Client(RPC)

# Derive Config PDA
config_pda, config_bump = Pubkey.find_program_address([b"config"], PROGRAM_ID)
print(f"Admin: {keypair.pubkey()}")
print(f"Config PDA: {config_pda}")
print(f"Treasury: {TREASURY}")

# Build instruction data: tag(1) + treasury(32)
data = bytes([0]) + bytes(TREASURY)

ix = Instruction(
    PROGRAM_ID,
    data,
    [
        AccountMeta(keypair.pubkey(), True, True),
        AccountMeta(config_pda, False, True),
        AccountMeta(SYSTEM_PROGRAM_ID, False, False),
    ],
)

# Build and send transaction
blockhash = client.get_latest_blockhash().value.blockhash
tx = Transaction.new_with_payer([ix], keypair.pubkey())
tx.sign([keypair], blockhash)

sig = client.send_transaction(tx, opts=TxOpts(skip_preflight=False, preflight_commitment="confirmed"))
print(f"Initialize tx: {sig.value}")

# Wait for confirmation
client.confirm_transaction(sig.value, commitment="confirmed")
print("✅ Config initialized on devnet!")
