/**
 * Blockchain Tool
 * Real Base Sepolia integration for USDC rewards
 * Production-ready with retry mechanism and proper error handling
 */

import { FunctionTool } from '@iqai/adk';
import { ethers } from 'ethers';
import { store } from '../store/index.js';
import { 
  createRewardTransaction, 
  formatTransaction,
  type RewardTransaction,
  type TreasuryInfo 
} from '../models/transaction.js';

// ============ CONFIGURATION ============

// Base Sepolia Testnet Configuration
const BASE_SEPOLIA_CONFIG = {
  chainId: 84532,
  name: 'Base Sepolia',
  rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
  blockExplorer: 'https://sepolia.basescan.org',
  // USDC on Base Sepolia
  usdcAddress: process.env.USDC_CONTRACT_ADDRESS || '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
};

// Transaction settings
const TX_CONFIG = {
  maxRetries: 3,
  retryDelayMs: 2000,
  confirmations: 1,
  gasLimitBuffer: 1.2, // 20% buffer on estimated gas
  maxGasPrice: ethers.parseUnits('10', 'gwei'), // Max gas price in gwei
};

// Standard ERC20 ABI for transfer
const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function allowance(address owner, address spender) view returns (uint256)',
];

// ============ PROVIDER & WALLET SETUP ============

let cachedProvider: ethers.JsonRpcProvider | null = null;

/**
 * Get provider instance (with caching)
 */
function getProvider(): ethers.JsonRpcProvider {
  if (!cachedProvider) {
    cachedProvider = new ethers.JsonRpcProvider(BASE_SEPOLIA_CONFIG.rpcUrl);
  }
  return cachedProvider;
}

/**
 * Get wallet instance (Treasury wallet)
 */
function getTreasuryWallet(): ethers.Wallet | null {
  const privateKey = process.env.TREASURY_PRIVATE_KEY;
  
  if (!privateKey) {
    console.warn('[Blockchain] TREASURY_PRIVATE_KEY not set - running in mock mode');
    return null;
  }

  // Validate private key format
  if (!privateKey.match(/^(0x)?[0-9a-fA-F]{64}$/)) {
    console.error('[Blockchain] Invalid private key format');
    return null;
  }

  try {
    const provider = getProvider();
    const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
    return new ethers.Wallet(formattedKey, provider);
  } catch (error) {
    console.error('[Blockchain] Failed to create wallet:', error);
    return null;
  }
}

/**
 * Get USDC contract instance
 */
function getUsdcContract(wallet?: ethers.Wallet): ethers.Contract {
  const signerOrProvider = wallet || getProvider();
  return new ethers.Contract(BASE_SEPOLIA_CONFIG.usdcAddress, ERC20_ABI, signerOrProvider);
}

/**
 * Check if blockchain is configured for real transactions
 */
export function isBlockchainConfigured(): boolean {
  return !!process.env.TREASURY_PRIVATE_KEY;
}

// ============ HELPER FUNCTIONS ============

/**
 * Delay helper for retries
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Estimate gas for ERC20 transfer with buffer
 */
async function estimateGasWithBuffer(
  contract: ethers.Contract,
  to: string,
  amount: bigint
): Promise<bigint> {
  try {
    const estimated = await contract.transfer.estimateGas(to, amount);
    const withBuffer = (estimated * BigInt(Math.floor(TX_CONFIG.gasLimitBuffer * 100))) / 100n;
    console.log(`[Blockchain] Estimated gas: ${estimated}, with buffer: ${withBuffer}`);
    return withBuffer;
  } catch {
    // Default gas limit for ERC20 transfers
    console.log('[Blockchain] Using default gas limit: 100000');
    return 100000n;
  }
}

/**
 * Get current gas price with cap
 */
async function getGasPrice(): Promise<bigint> {
  try {
    const provider = getProvider();
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('1', 'gwei');
    
    // Cap gas price
    if (gasPrice > TX_CONFIG.maxGasPrice) {
      console.log(`[Blockchain] Gas price capped at ${ethers.formatUnits(TX_CONFIG.maxGasPrice, 'gwei')} gwei`);
      return TX_CONFIG.maxGasPrice;
    }
    
    console.log(`[Blockchain] Current gas price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);
    return gasPrice;
  } catch {
    return ethers.parseUnits('1', 'gwei');
  }
}

/**
 * Parse and categorize blockchain errors
 */
function parseBlockchainError(error: unknown): { code: string; message: string } {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  if (errorMessage.includes('insufficient funds')) {
    return { 
      code: 'INSUFFICIENT_ETH', 
      message: 'Không đủ ETH để trả phí gas. Vui lòng nạp thêm ETH vào ví Treasury.' 
    };
  }
  
  if (errorMessage.includes('transfer amount exceeds balance')) {
    return { 
      code: 'INSUFFICIENT_USDC', 
      message: 'Không đủ USDC trong ví Treasury để chuyển.' 
    };
  }
  
  if (errorMessage.includes('nonce')) {
    return { 
      code: 'NONCE_ERROR', 
      message: 'Lỗi nonce - có thể do giao dịch trước đó chưa xác nhận. Vui lòng thử lại.' 
    };
  }
  
  if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
    return { 
      code: 'TIMEOUT', 
      message: 'Kết nối blockchain bị timeout. Vui lòng thử lại.' 
    };
  }
  
  if (errorMessage.includes('replacement fee too low')) {
    return { 
      code: 'REPLACEMENT_FEE', 
      message: 'Phí gas quá thấp để thay thế giao dịch pending. Vui lòng đợi hoặc tăng gas.' 
    };
  }
  
  return { 
    code: 'UNKNOWN', 
    message: `Lỗi blockchain: ${errorMessage.substring(0, 200)}` 
  };
}

// ============ TOOL FUNCTIONS ============

/**
 * Get Treasury Balance
 * Check USDC balance in Treasury wallet
 */
async function getTreasuryBalance(): Promise<TreasuryInfo | { success: false; message: string }> {
  console.log('[Blockchain] Getting treasury balance...');

  try {
    const wallet = getTreasuryWallet();
    
    if (!wallet) {
      // Return mock data when wallet is not configured
      console.log('[Blockchain] Using mock treasury data (no wallet configured)');
      return {
        wallet_address: '0x0000000000000000000000000000000000000000',
        balance_usdc: 10000, // Mock balance
        total_disbursed: await store.getTotalDisbursed() || 0,
        total_transactions: await store.getTransactionCount() || 0,
        network: BASE_SEPOLIA_CONFIG.name,
        last_updated: Date.now(),
      };
    }

    const provider = getProvider();
    const usdcContract = getUsdcContract();
    
    // Get USDC balance, ETH balance, and token info
    const [usdcBalance, ethBalance, decimals] = await Promise.all([
      usdcContract.balanceOf(wallet.address),
      provider.getBalance(wallet.address),
      usdcContract.decimals(),
    ]);

    const balanceUsdc = Number(ethers.formatUnits(usdcBalance, decimals));
    const balanceEth = Number(ethers.formatEther(ethBalance));

    const treasuryInfo: TreasuryInfo = {
      wallet_address: wallet.address,
      balance_usdc: balanceUsdc,
      total_disbursed: await store.getTotalDisbursed() || 0,
      total_transactions: await store.getTransactionCount() || 0,
      network: BASE_SEPOLIA_CONFIG.name,
      last_updated: Date.now(),
    };

    console.log(`[Blockchain] Treasury balance: ${balanceUsdc} USDC, ${balanceEth.toFixed(6)} ETH`);
    
    // Warn if ETH balance is low
    if (balanceEth < 0.001) {
      console.warn('[Blockchain] WARNING: ETH balance is low, may not be able to pay for gas');
    }

    return treasuryInfo;

  } catch (error) {
    const { message } = parseBlockchainError(error);
    console.error('[Blockchain] Error getting balance:', message);
    return { success: false, message };
  }
}

export const getTreasuryBalanceTool = new FunctionTool(getTreasuryBalance, {
  name: 'get_treasury_balance',
  description: `Check USDC balance in Treasury wallet on Base Sepolia.
  Returns: wallet address, USDC balance, total disbursed, network info.`,
});

/**
 * Release Fund - Transfer USDC to Rescuer
 * With retry mechanism and proper error handling
 */
async function releaseFund(
  ticketId: string,
  rescuerId: string,
  rescuerWallet: string,
  amountUsdc: number = 20
): Promise<{
  success: boolean;
  transaction?: RewardTransaction;
  tx_hash?: string;
  explorer_url?: string;
  message: string;
}> {
  console.log(`[Blockchain] Releasing ${amountUsdc} USDC to ${rescuerWallet} for ticket ${ticketId}`);

  // Validate inputs
  if (!ticketId || !rescuerId) {
    return {
      success: false,
      message: 'ticketId và rescuerId là bắt buộc',
    };
  }

  if (!rescuerWallet) {
    return {
      success: false,
      message: 'Địa chỉ ví rescuer không được để trống',
    };
  }

  if (!ethers.isAddress(rescuerWallet)) {
    return {
      success: false,
      message: `Địa chỉ ví không hợp lệ: ${rescuerWallet}. Định dạng đúng: 0x... (42 ký tự)`,
    };
  }

  if (amountUsdc <= 0 || amountUsdc > 1000) {
    return {
      success: false,
      message: 'Số tiền phải trong khoảng 0-1000 USDC',
    };
  }

  // Create transaction record
  const transaction = createRewardTransaction({
    ticket_id: ticketId,
    rescuer_id: rescuerId,
    rescuer_wallet: ethers.getAddress(rescuerWallet), // Checksum address
    amount_usdc: amountUsdc,
    network: 'base_sepolia',
  });

  try {
    const wallet = getTreasuryWallet();

    if (!wallet) {
      // Mock mode - simulate successful transaction
      console.log('[Blockchain] MOCK MODE - Simulating transaction...');
      
      transaction.status = 'CONFIRMED';
      transaction.tx_hash = `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;
      transaction.block_number = Math.floor(Math.random() * 1000000) + 10000000;
      transaction.confirmed_at = Date.now();
      transaction.gas_used = '65000';
      transaction.gas_price = '1000000000';

      // Save to store
      await store.addTransaction(transaction);

      console.log(`[Blockchain] MOCK TX Success: ${transaction.tx_hash}`);

      return {
        success: true,
        transaction,
        tx_hash: transaction.tx_hash,
        explorer_url: `${BASE_SEPOLIA_CONFIG.blockExplorer}/tx/${transaction.tx_hash}`,
        message: `[MOCK] Đã chuyển ${amountUsdc} USDC đến ${rescuerWallet}`,
      };
    }

    // ========== REAL TRANSACTION ==========
    const usdcContract = getUsdcContract(wallet);
    const decimals = await usdcContract.decimals();
    const amount = ethers.parseUnits(amountUsdc.toString(), decimals);

    // Pre-flight checks
    const [usdcBalance, ethBalance] = await Promise.all([
      usdcContract.balanceOf(wallet.address),
      getProvider().getBalance(wallet.address),
    ]);

    // Check USDC balance
    if (usdcBalance < amount) {
      transaction.status = 'FAILED';
      transaction.error_message = 'Insufficient USDC balance';
      await store.addTransaction(transaction);

      return {
        success: false,
        transaction,
        message: `Số dư USDC không đủ. Cần ${amountUsdc} USDC, hiện có ${ethers.formatUnits(usdcBalance, decimals)} USDC`,
      };
    }

    // Check ETH for gas
    const estimatedGas = await estimateGasWithBuffer(usdcContract, rescuerWallet, amount);
    const gasPrice = await getGasPrice();
    const estimatedGasCost = estimatedGas * gasPrice;

    if (ethBalance < estimatedGasCost) {
      transaction.status = 'FAILED';
      transaction.error_message = 'Insufficient ETH for gas';
      await store.addTransaction(transaction);

      return {
        success: false,
        transaction,
        message: `Không đủ ETH để trả phí gas. Cần ~${ethers.formatEther(estimatedGasCost)} ETH, hiện có ${ethers.formatEther(ethBalance)} ETH`,
      };
    }

    // Save initial transaction record
    transaction.status = 'SUBMITTED';
    await store.addTransaction(transaction);

    // Execute with retry
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= TX_CONFIG.maxRetries; attempt++) {
      try {
        console.log(`[Blockchain] Attempt ${attempt}/${TX_CONFIG.maxRetries}...`);

        // Send transaction
        const tx = await usdcContract.transfer(rescuerWallet, amount, {
          gasLimit: estimatedGas,
          gasPrice: gasPrice,
        });

    transaction.tx_hash = tx.hash;
        await store.updateTransaction(transaction.tx_id, { tx_hash: tx.hash });

    console.log(`[Blockchain] TX submitted: ${tx.hash}`);

    // Wait for confirmation
        console.log(`[Blockchain] Waiting for ${TX_CONFIG.confirmations} confirmation(s)...`);
        const receipt = await tx.wait(TX_CONFIG.confirmations);

        if (!receipt || receipt.status === 0) {
          throw new Error('Transaction reverted');
        }

    // Update transaction record
    transaction.status = 'CONFIRMED';
        transaction.block_number = receipt.blockNumber;
    transaction.confirmed_at = Date.now();
        transaction.gas_used = receipt.gasUsed?.toString();
        transaction.gas_price = receipt.gasPrice?.toString();

    await store.updateTransaction(transaction.tx_id, transaction);

        console.log(`[Blockchain] TX confirmed in block ${receipt.blockNumber}`);

    return {
      success: true,
      transaction,
      tx_hash: tx.hash,
      explorer_url: `${BASE_SEPOLIA_CONFIG.blockExplorer}/tx/${tx.hash}`,
          message: `Đã chuyển ${amountUsdc} USDC đến ${rescuerWallet}. Block: ${receipt.blockNumber}`,
        };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const { code, message } = parseBlockchainError(error);
        
        console.error(`[Blockchain] Attempt ${attempt} failed: ${message}`);

        // Don't retry for certain errors
        if (['INSUFFICIENT_ETH', 'INSUFFICIENT_USDC'].includes(code)) {
          break;
        }

        // Wait before retry
        if (attempt < TX_CONFIG.maxRetries) {
          console.log(`[Blockchain] Retrying in ${TX_CONFIG.retryDelayMs}ms...`);
          await delay(TX_CONFIG.retryDelayMs);
        }
      }
    }

    // All retries failed
    const { message: errorMsg } = parseBlockchainError(lastError);
    transaction.status = 'FAILED';
    transaction.error_message = errorMsg;
    await store.updateTransaction(transaction.tx_id, transaction);

    return {
      success: false,
      transaction,
      message: `Giao dịch thất bại sau ${TX_CONFIG.maxRetries} lần thử: ${errorMsg}`,
    };

  } catch (error) {
    const { message: errorMsg } = parseBlockchainError(error);
    console.error('[Blockchain] Transaction failed:', errorMsg);

    transaction.status = 'FAILED';
    transaction.error_message = errorMsg;
    await store.updateTransaction(transaction.tx_id, transaction);

    return {
      success: false,
      transaction,
      message: `Giao dịch thất bại: ${errorMsg}`,
    };
  }
}

export const releaseFundTool = new FunctionTool(releaseFund, {
  name: 'release_fund',
  description: `Transfer USDC from Treasury to rescue team wallet on Base Sepolia.
  
  Parameters:
  - ticketId: Rescue ticket ID (required)
  - rescuerId: Rescuer ID (required)
  - rescuerWallet: Ethereum wallet address 0x... (required)
  - amountUsdc: USDC amount (default 20, max 1000)
  
  Has retry mechanism and full error handling.`,
});

/**
 * Log Transaction
 * Save transaction info and return details
 */
async function logTransaction(
  txId: string,
  txHash?: string,
  status?: RewardTransaction['status']
): Promise<{
  success: boolean;
  transaction?: RewardTransaction;
  formatted?: string;
  message: string;
}> {
  console.log(`[Blockchain] Logging transaction ${txId}`);

  const transaction = await store.getTransaction(txId);
  
  if (!transaction) {
    return {
      success: false,
      message: `Không tìm thấy transaction ${txId}`,
    };
  }

  // Update if new info provided
  if (txHash || status) {
    const updates: Partial<RewardTransaction> = {};
    if (txHash) updates.tx_hash = txHash;
    if (status) updates.status = status;
    
    await store.updateTransaction(txId, updates);
  }

  const updated = await store.getTransaction(txId);
  const formatted = formatTransaction(updated!);

  console.log(`[Blockchain] Transaction logged:\n${formatted}`);

  return {
    success: true,
    transaction: updated,
    formatted,
    message: `Transaction ${txId} đã được ghi nhận`,
  };
}

export const logTransactionTool = new FunctionTool(logTransaction, {
  name: 'log_transaction',
  description: `Record and update transaction information.
  
  Parameters:
  - txId: Transaction ID in system
  - txHash: (optional) Transaction hash on blockchain
  - status: (optional) New status: PENDING, SUBMITTED, CONFIRMED, FAILED`,
});

/**
 * Get Transaction by Ticket
 * Retrieve transactions for a ticket
 */
async function getTransactionByTicket(ticketId: string): Promise<{
  success: boolean;
  transactions: RewardTransaction[];
  message: string;
}> {
  const transactions = await store.getTransactionsByTicket(ticketId);
  
  return {
    success: true,
    transactions,
    message: transactions.length > 0 
      ? `Tìm thấy ${transactions.length} transaction cho ticket ${ticketId}`
      : `Không có transaction nào cho ticket ${ticketId}`,
  };
}

export const getTransactionByTicketTool = new FunctionTool(getTransactionByTicket, {
  name: 'get_transaction_by_ticket',
  description: `Get list of transactions by ticket ID.`,
});

/**
 * Verify Wallet Address
 * Check if wallet address is valid and optionally check activity
 */
async function verifyWalletAddress(
  address: string,
  checkActivity: boolean = false
): Promise<{
  valid: boolean;
  checksummed?: string;
  hasActivity?: boolean;
  balance_eth?: number;
  message: string;
}> {
  if (!address) {
    return { valid: false, message: 'Địa chỉ ví không được để trống' };
  }

  try {
    if (!ethers.isAddress(address)) {
      return { valid: false, message: 'Địa chỉ ví không đúng định dạng Ethereum (0x... 42 ký tự)' };
    }

      const checksummed = ethers.getAddress(address);
    
    if (!checkActivity) {
      return {
        valid: true,
        checksummed,
        message: `Địa chỉ hợp lệ: ${checksummed}`,
      };
    }

    // Check wallet activity on blockchain
    const provider = getProvider();
    const [balance, txCount] = await Promise.all([
      provider.getBalance(checksummed),
      provider.getTransactionCount(checksummed),
    ]);

    const hasActivity = txCount > 0 || balance > 0n;
    const balanceEth = Number(ethers.formatEther(balance));

    return {
      valid: true,
      checksummed,
      hasActivity,
      balance_eth: balanceEth,
      message: hasActivity 
        ? `Địa chỉ hợp lệ và đã có hoạt động (${txCount} giao dịch, ${balanceEth.toFixed(6)} ETH)`
        : `Địa chỉ hợp lệ nhưng chưa có hoạt động trên Base Sepolia`,
    };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return { valid: false, message: `Lỗi khi kiểm tra địa chỉ ví: ${errorMsg}` };
  }
}

export const verifyWalletAddressTool = new FunctionTool(verifyWalletAddress, {
  name: 'verify_wallet_address',
  description: `Check if Ethereum wallet address is valid.
  
  Parameters:
  - address: Wallet address to check
  - checkActivity: (optional) If true, also check transaction history on blockchain`,
});

/**
 * Check Network Status
 * Verify blockchain connection and get network info
 */
async function checkNetworkStatus(): Promise<{
  connected: boolean;
  network: string;
  chainId?: number;
  blockNumber?: number;
  gasPrice?: string;
  message: string;
}> {
  try {
    const provider = getProvider();
    const [network, blockNumber, feeData] = await Promise.all([
      provider.getNetwork(),
      provider.getBlockNumber(),
      provider.getFeeData(),
    ]);

    return {
      connected: true,
      network: BASE_SEPOLIA_CONFIG.name,
      chainId: Number(network.chainId),
      blockNumber,
      gasPrice: feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, 'gwei') + ' gwei' : undefined,
      message: `Kết nối thành công đến ${BASE_SEPOLIA_CONFIG.name} (Block ${blockNumber})`,
    };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return {
      connected: false,
      network: BASE_SEPOLIA_CONFIG.name,
      message: `Không thể kết nối blockchain: ${errorMsg}`,
    };
  }
}

export const checkNetworkStatusTool = new FunctionTool(checkNetworkStatus, {
  name: 'check_network_status',
  description: `Check blockchain Base Sepolia connection status.
  Returns: connection status, chain ID, block number, gas price.`,
});
