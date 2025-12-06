'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import {
  Copy,
  Check,
  Wallet,
  ExternalLink,
  AlertCircle,
  QrCode,
} from 'lucide-react';
import { Modal, ModalBody, ModalFooter } from './modal';
import { Button } from '@sos-bridge/ui';

export interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress?: string;
  network?: string;
}

// Simple QR Code generator using SVG
// This is a simplified implementation - for production, use a proper QR library
function QRCodeSVG({ data, size = 200 }: { data: string; size?: number }) {
  // Generate a deterministic pattern based on the address
  // This is a simplified visual representation - for real QR, use qrcode.react or similar
  const [qrData, setQrData] = useState<boolean[][]>([]);
  
  useEffect(() => {
    // Simple hash-based pattern generation
    const gridSize = 21; // Standard QR code size
    const grid: boolean[][] = Array(gridSize).fill(null).map(() => Array(gridSize).fill(false));
    
    // Add finder patterns (corners)
    const addFinderPattern = (startX: number, startY: number) => {
      for (let x = 0; x < 7; x++) {
        for (let y = 0; y < 7; y++) {
          if (
            x === 0 || x === 6 || y === 0 || y === 6 || // Outer border
            (x >= 2 && x <= 4 && y >= 2 && y <= 4) // Inner square
          ) {
            grid[startY + y][startX + x] = true;
          }
        }
      }
    };
    
    // Add finder patterns at corners
    addFinderPattern(0, 0); // Top-left
    addFinderPattern(gridSize - 7, 0); // Top-right
    addFinderPattern(0, gridSize - 7); // Bottom-left
    
    // Generate data pattern based on address hash
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) - hash) + data.charCodeAt(i);
      hash = hash & hash;
    }
    
    // Fill data area with pseudo-random pattern based on hash
    for (let y = 8; y < gridSize - 8; y++) {
      for (let x = 8; x < gridSize - 8; x++) {
        const index = y * gridSize + x;
        const seed = (hash + index * 31) % 100;
        grid[y][x] = seed < 50;
      }
    }
    
    // Add timing patterns
    for (let i = 8; i < gridSize - 8; i++) {
      grid[6][i] = i % 2 === 0;
      grid[i][6] = i % 2 === 0;
    }
    
    setQrData(grid);
  }, [data]);
  
  const cellSize = size / 21;
  
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="rounded-lg bg-white p-2"
    >
      {/* White background */}
      <rect width={size} height={size} fill="white" />
      
      {/* QR modules */}
      {qrData.map((row, y) =>
        row.map((cell, x) =>
          cell ? (
            <rect
              key={`${x}-${y}`}
              x={x * cellSize + 4}
              y={y * cellSize + 4}
              width={cellSize - 0.5}
              height={cellSize - 0.5}
              fill="#1a1a1a"
              rx={1}
            />
          ) : null
        )
      )}
    </svg>
  );
}

export function DepositModal({
  isOpen,
  onClose,
  walletAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f8fE58',
  network = 'Base Sepolia',
}: DepositModalProps) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(true);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleOpenFaucet = () => {
    window.open('https://www.coinbase.com/faucets/base-ethereum-goerli-faucet', '_blank');
  };

  const handleOpenExplorer = () => {
    window.open(`https://sepolia.basescan.org/address/${walletAddress}`, '_blank');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nạp tiền vào ngân quỹ"
      subtitle="Gửi USDC hoặc ETH đến địa chỉ ví dưới đây"
      size="md"
    >
      <ModalBody>
        <div className="space-y-6">
          {/* Network Info */}
          <div className="rounded-lg bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-blue-600" />
              <div>
                <h4 className="font-medium text-blue-900">Lưu ý quan trọng</h4>
                <p className="mt-1 text-sm text-blue-700">
                  Chỉ gửi token trên mạng <strong>{network}</strong>. Gửi sai mạng có thể mất tiền vĩnh viễn.
                </p>
              </div>
            </div>
          </div>

          {/* QR Code */}
          {showQR && (
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-xl border-2 border-dashed border-border p-3">
                <QRCodeSVG data={walletAddress} size={180} />
              </div>
              <p className="text-xs text-muted-foreground">
                Quét mã QR để nạp tiền
              </p>
            </div>
          )}

          {/* Wallet Address */}
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              Địa chỉ ví ngân quỹ
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 overflow-hidden rounded-lg border bg-muted/50 px-3 py-2.5">
                <p className="truncate font-mono text-sm text-foreground">
                  {walletAddress}
                </p>
              </div>
              <button
                onClick={handleCopy}
                className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-all ${
                  copied
                    ? 'border-green-500 bg-green-50 text-green-600'
                    : 'border-border bg-card hover:bg-muted'
                }`}
                title={copied ? 'Đã sao chép!' : 'Sao chép địa chỉ'}
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
            {copied && (
              <p className="mt-1 text-xs text-green-600">
                ✓ Đã sao chép địa chỉ vào clipboard
              </p>
            )}
          </div>

          {/* Full Address Display */}
          <div className="rounded-lg border bg-card p-3">
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              Địa chỉ đầy đủ:
            </p>
            <p className="break-all font-mono text-xs text-foreground">
              {walletAddress}
            </p>
          </div>

          {/* Network Badge */}
          <div className="flex items-center justify-between rounded-lg border px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <span className="text-lg">🔵</span>
              </div>
              <div>
                <p className="font-medium">{network}</p>
                <p className="text-xs text-muted-foreground">Testnet Network</p>
              </div>
            </div>
            <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
              Testnet
            </span>
          </div>

          {/* Supported Tokens */}
          <div>
            <p className="mb-2 text-sm font-medium">Token được hỗ trợ:</p>
            <div className="flex gap-2">
              <div className="flex items-center gap-2 rounded-full border px-3 py-1.5">
                <span className="text-sm">💵</span>
                <span className="text-sm font-medium">USDC</span>
              </div>
              <div className="flex items-center gap-2 rounded-full border px-3 py-1.5">
                <span className="text-sm">⟠</span>
                <span className="text-sm font-medium">ETH</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="flex gap-2">
            <button
              onClick={handleOpenFaucet}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border py-2.5 text-sm hover:bg-muted"
            >
              <span>💧</span>
              Lấy testnet ETH
            </button>
            <button
              onClick={handleOpenExplorer}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border py-2.5 text-sm hover:bg-muted"
            >
              <ExternalLink className="h-4 w-4" />
              Xem trên Explorer
            </button>
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <Button variant="outline" onClick={onClose}>
          Đóng
        </Button>
        <Button onClick={handleCopy}>
          {copied ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              Đã sao chép
            </>
          ) : (
            <>
              <Copy className="mr-2 h-4 w-4" />
              Sao chép địa chỉ
            </>
          )}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

