import React, { useEffect, useState } from 'react';
import { Coins } from 'lucide-react';
import { useGameStore } from '../lib/gameStore';

/**
 * CoinDisplay — Shows the user's current Focus Coin balance in the room HUD.
 * Includes a floating "+N" animation when coins are earned.
 */
export const CoinDisplay = ({ accent = '#f59e0b' }: { accent?: string }) => {
  const { coinBalance, walletLoaded, fetchWallet, showEarnAnimation, lastEarnedCoins } = useGameStore();
  const [displayBalance, setDisplayBalance] = useState(coinBalance);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (!walletLoaded) fetchWallet();
  }, [walletLoaded, fetchWallet]);

  // Animate count-up when balance changes
  useEffect(() => {
    if (coinBalance === displayBalance) return;
    const diff = coinBalance - displayBalance;
    const steps = Math.min(Math.abs(diff), 20);
    const stepSize = diff / steps;
    let current = displayBalance;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      current += stepSize;
      setDisplayBalance(Math.round(current));
      if (step >= steps) {
        setDisplayBalance(coinBalance);
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [coinBalance]);

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      {/* Coin badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '7px 14px',
          borderRadius: 20,
          background: 'rgba(0,0,0,0.5)',
          border: '1px solid rgba(245,158,11,0.3)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
          cursor: 'default',
          transition: 'all 0.2s',
        }}
      >
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 10px rgba(245,158,11,0.4)',
            animation: showEarnAnimation ? 'coinSpin 0.6s ease-out' : undefined,
          }}
        >
          <Coins size={12} color="#fff" strokeWidth={2.5} />
        </div>
        <span
          style={{
            fontSize: 13,
            fontWeight: 800,
            color: '#fef3c7',
            fontFamily: 'monospace',
            letterSpacing: 1,
            minWidth: 24,
            textAlign: 'right',
          }}
        >
          {displayBalance}
        </span>
      </div>

      {/* Floating earn animation */}
      {showEarnAnimation && lastEarnedCoins > 0 && (
        <div
          key={Date.now()}
          style={{
            position: 'absolute',
            top: -8,
            right: -4,
            fontSize: 14,
            fontWeight: 900,
            color: '#4ade80',
            textShadow: '0 2px 8px rgba(0,0,0,0.8)',
            animation: 'coinEarnFloat 3s ease-out forwards',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          +{lastEarnedCoins} ✨
        </div>
      )}

      <style>{`
        @keyframes coinSpin {
          0% { transform: rotateY(0deg) scale(1); }
          50% { transform: rotateY(180deg) scale(1.3); }
          100% { transform: rotateY(360deg) scale(1); }
        }
        @keyframes coinEarnFloat {
          0% { opacity: 1; transform: translateY(0px) scale(1); }
          60% { opacity: 1; transform: translateY(-30px) scale(1.2); }
          100% { opacity: 0; transform: translateY(-50px) scale(0.8); }
        }
      `}</style>
    </div>
  );
};
