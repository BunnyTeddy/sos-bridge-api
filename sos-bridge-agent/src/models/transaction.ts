/**
 * Transaction Model
 * Đại diện cho giao dịch thưởng USDC trên blockchain
 */

export type TransactionStatus = 'PENDING' | 'SUBMITTED' | 'CONFIRMED' | 'FAILED';

/**
 * Reward Transaction - Giao dịch trả thưởng
 */
export interface RewardTransaction {
  tx_id: string;
  ticket_id: string;
  rescuer_id: string;
  rescuer_wallet: string;
  amount_usdc: number;
  status: TransactionStatus;
  tx_hash?: string;
  block_number?: number;
  network: 'base_sepolia' | 'base_mainnet' | 'ethereum_sepolia' | 'ethereum_mainnet';
  created_at: number;
  confirmed_at?: number;
  error_message?: string;
  gas_used?: string;
  gas_price?: string;
}

/**
 * Treasury Info - Thông tin quỹ
 */
export interface TreasuryInfo {
  wallet_address: string;
  balance_usdc: number;
  total_disbursed: number;
  total_transactions: number;
  network: string;
  last_updated: number;
}

/**
 * Generate unique transaction ID
 */
export function generateTransactionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `TX_${timestamp}_${random}`.toUpperCase();
}

/**
 * Create a new Reward Transaction
 */
export function createRewardTransaction(params: {
  ticket_id: string;
  rescuer_id: string;
  rescuer_wallet: string;
  amount_usdc: number;
  network: RewardTransaction['network'];
}): RewardTransaction {
  return {
    tx_id: generateTransactionId(),
    ticket_id: params.ticket_id,
    rescuer_id: params.rescuer_id,
    rescuer_wallet: params.rescuer_wallet,
    amount_usdc: params.amount_usdc,
    status: 'PENDING',
    network: params.network,
    created_at: Date.now(),
  };
}

/**
 * Format transaction for display
 */
export function formatTransaction(tx: RewardTransaction): string {
  const statusEmoji = {
    PENDING: '⏳',
    SUBMITTED: '📤',
    CONFIRMED: '✅',
    FAILED: '❌',
  }[tx.status];

  return `
${statusEmoji} Transaction ${tx.tx_id}
├─ Ticket: ${tx.ticket_id}
├─ Rescuer: ${tx.rescuer_wallet.substring(0, 10)}...
├─ Amount: ${tx.amount_usdc} USDC
├─ Status: ${tx.status}
├─ Network: ${tx.network}
${tx.tx_hash ? `├─ TX Hash: ${tx.tx_hash}` : ''}
${tx.block_number ? `├─ Block: ${tx.block_number}` : ''}
└─ Time: ${new Date(tx.created_at).toISOString()}
`.trim();
}

/**
 * Calculate gas estimate for USDC transfer
 */
export function estimateGas(): {
  gas_limit: bigint;
  gas_price_gwei: string;
  estimated_cost_eth: string;
} {
  // ERC20 transfer typically uses ~65,000 gas
  const gasLimit = BigInt(80000); // Add buffer
  const gasPriceGwei = '0.001'; // Base L2 is very cheap
  const estimatedCostEth = '0.00008'; // ~$0.0002 at $2500/ETH
  
  return {
    gas_limit: gasLimit,
    gas_price_gwei: gasPriceGwei,
    estimated_cost_eth: estimatedCostEth,
  };
}











