import React, { useState, useEffect } from 'react';
import { X, Coins, ShoppingBag, Package, Check, Sparkles, Crown, Lock } from 'lucide-react';
import { useGameStore } from '../lib/gameStore';
import { useTheme } from './ThemeProvider';
import { StoreItem } from '../lib/api-contract';

const RARITY_COLORS: Record<string, { border: string; bg: string; text: string; glow: string }> = {
  common:    { border: '#64748b', bg: 'rgba(100,116,139,0.1)', text: '#94a3b8', glow: 'none' },
  rare:      { border: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  text: '#60a5fa', glow: '0 0 12px rgba(59,130,246,0.3)' },
  epic:      { border: '#a855f7', bg: 'rgba(168,85,247,0.1)',  text: '#c084fc', glow: '0 0 16px rgba(168,85,247,0.3)' },
  legendary: { border: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  text: '#fbbf24', glow: '0 0 20px rgba(245,158,11,0.4)' },
};

const CATEGORY_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  accessory: { label: 'Accessories', icon: <Crown size={14} /> },
  desk_item: { label: 'Desk Items', icon: <Package size={14} /> },
  ambient:   { label: 'Ambients', icon: <Sparkles size={14} /> },
  desk_skin: { label: 'Desk Skins', icon: <ShoppingBag size={14} /> },
};

const CATEGORY_ORDER = ['accessory', 'desk_item', 'ambient', 'desk_skin'];

interface StudyStoreProps {
  isOpen: boolean;
  onClose: () => void;
  inline?: boolean;
}

export const StudyStore = ({ isOpen, onClose, inline = false }: StudyStoreProps) => {
  const { isDark } = useTheme();
  const {
    coinBalance, fetchWallet, walletLoaded,
    catalog, fetchCatalog, catalogLoaded,
    inventory, fetchInventory, inventoryLoaded,
    purchaseItem, equipItem,
  } = useGameStore();

  const [activeTab, setActiveTab] = useState('accessory');
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (!walletLoaded) fetchWallet();
      if (!catalogLoaded) fetchCatalog();
      if (!inventoryLoaded) fetchInventory();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const ownedIds = new Set(inventory.map(i => i.itemId));
  const equippedIds = new Set(inventory.filter(i => i.isEquipped).map(i => i.itemId));

  const items = catalog[activeTab] || [];

  const base = isDark
    ? { bg: 'rgba(10,15,30,0.97)', card: 'rgba(20,30,50,0.9)', border: 'rgba(255,255,255,0.08)', text: '#f1f5f9', sub: '#94a3b8' }
    : { bg: 'rgba(248,250,252,0.98)', card: 'rgba(255,255,255,0.95)', border: 'rgba(0,0,0,0.08)', text: '#0f172a', sub: '#64748b' };

  const handlePurchase = async (itemId: string) => {
    setPurchasing(itemId);
    setFeedback(null);
    const result = await purchaseItem(itemId);
    setPurchasing(null);
    setFeedback({ msg: result.message, ok: result.success });
    if (result.success) {
      fetchWallet();
      fetchInventory();
    }
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleEquip = async (itemId: string) => {
    const isCurrentlyEquipped = equippedIds.has(itemId);
    await equipItem(itemId, !isCurrentlyEquipped);
  };

  // ─── Store content (shared between modal and inline) ───
  const storeContent = (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
        animation: 'storeOverlayFadeIn 0.25s ease-out',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: inline ? '100%' : '90%',
          maxWidth: inline ? '100%' : 720,
          maxHeight: inline ? '100%' : '85vh',
          height: inline ? '100%' : undefined,
          borderRadius: inline ? 0 : 24,
          background: base.bg,
          border: inline ? 'none' : `1px solid ${base.border}`,
          boxShadow: inline ? 'none' : (isDark
            ? '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)'
            : '0 32px 80px rgba(0,0,0,0.15)'),
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          animation: inline ? undefined : 'storeSlideUp 0.3s ease-out',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: `1px solid ${base.border}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(245,158,11,0.3)',
            }}>
              <ShoppingBag size={20} color="#fff" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: base.text }}>Focus Store</h2>
              <p style={{ margin: 0, fontSize: 11, color: base.sub }}>Spend your hard-earned coins</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Balance */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 12,
              background: isDark ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.2)',
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Coins size={10} color="#fff" strokeWidth={3} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#fbbf24', fontFamily: 'monospace' }}>
                {coinBalance}
              </span>
            </div>

            {!inline && (
              <button
                onClick={onClose}
                style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                  border: `1px solid ${base.border}`,
                  color: base.sub, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'; }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Category Tabs */}
        <div style={{
          padding: '12px 24px 0',
          display: 'flex', gap: 6,
          borderBottom: `1px solid ${base.border}`,
        }}>
          {CATEGORY_ORDER.map(cat => {
            const catInfo = CATEGORY_LABELS[cat];
            const isActive = activeTab === cat;
            const itemCount = (catalog[cat] || []).length;
            return (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '8px 14px', borderRadius: '10px 10px 0 0',
                  border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 700,
                  background: isActive ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)') : 'transparent',
                  color: isActive ? base.text : base.sub,
                  borderBottom: isActive ? `2px solid #f59e0b` : '2px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                {catInfo?.icon}
                {catInfo?.label || cat}
                <span style={{
                  fontSize: 10, fontWeight: 600,
                  padding: '1px 6px', borderRadius: 8,
                  background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  color: base.sub,
                }}>
                  {itemCount}
                </span>
              </button>
            );
          })}
        </div>

        {/* Feedback toast */}
        {feedback && (
          <div style={{
            margin: '12px 24px 0', padding: '8px 14px', borderRadius: 10,
            background: feedback.ok ? 'rgba(74,222,128,0.12)' : 'rgba(239,68,68,0.12)',
            border: `1px solid ${feedback.ok ? 'rgba(74,222,128,0.3)' : 'rgba(239,68,68,0.3)'}`,
            color: feedback.ok ? '#4ade80' : '#f87171',
            fontSize: 12, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 6,
            animation: 'storeOverlayFadeIn 0.2s ease-out',
          }}>
            {feedback.ok ? <Check size={14} /> : <X size={14} />}
            {feedback.msg}
          </div>
        )}

        {/* Items Grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 24px' }} className="custom-scrollbar">
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: base.sub }}>
              <ShoppingBag size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
              <p style={{ fontSize: 13, fontWeight: 600 }}>No items in this category yet</p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: 14,
            }}>
              {items.map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  owned={ownedIds.has(item.id)}
                  equipped={equippedIds.has(item.id)}
                  canAfford={coinBalance >= item.price}
                  purchasing={purchasing === item.id}
                  onPurchase={() => handlePurchase(item.id)}
                  onEquip={() => handleEquip(item.id)}
                  isDark={isDark}
                  base={base}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes storeOverlayFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes storeSlideUp { from { opacity: 0; transform: translateY(20px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>
    </div>
  );

  // If inline mode, skip the overlay wrapper
  if (inline) {
    return (
      <div style={{ width: '100%', height: '100%' }}>
        {storeContent}
        <style>{`
          @keyframes storeOverlayFadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes storeSlideUp { from { opacity: 0; transform: translateY(20px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        `}</style>
      </div>
    );
  }

  // Modal mode — wrapped in overlay
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
        animation: 'storeOverlayFadeIn 0.25s ease-out',
      }}
      onClick={onClose}
    >
      {storeContent}
    </div>
  );
};

// ─── Item Card ─────────────────────────────────────────────────────────────────
interface ItemCardProps {
  item: StoreItem;
  owned: boolean;
  equipped: boolean;
  canAfford: boolean;
  purchasing: boolean;
  onPurchase: () => void;
  onEquip: () => void;
  isDark: boolean;
  base: any;
}

const ItemCard = ({ item, owned, equipped, canAfford, purchasing, onPurchase, onEquip, isDark, base }: ItemCardProps) => {
  const rarity = RARITY_COLORS[item.rarity] || RARITY_COLORS.common;
  let previewData: any = {};
  try { previewData = JSON.parse(item.previewData || '{}'); } catch {}

  return (
    <div style={{
      borderRadius: 16,
      background: base.card,
      border: `1px solid ${owned ? rarity.border + '55' : base.border}`,
      overflow: 'hidden',
      transition: 'all 0.2s',
      boxShadow: owned ? rarity.glow : 'none',
      position: 'relative',
    }}>
      {/* Preview area */}
      <div style={{
        height: 90,
        background: rarity.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
        borderBottom: `1px solid ${base.border}`,
      }}>
        {/* Rarity badge */}
        <div style={{
          position: 'absolute', top: 8, right: 8,
          fontSize: 9, fontWeight: 800, textTransform: 'uppercase',
          letterSpacing: 1.5,
          color: rarity.text,
          padding: '2px 8px', borderRadius: 6,
          background: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.7)',
          border: `1px solid ${rarity.border}44`,
        }}>
          {item.rarity}
        </div>

        {/* Owned badge */}
        {owned && (
          <div style={{
            position: 'absolute', top: 8, left: 8,
            fontSize: 9, fontWeight: 800,
            color: '#4ade80',
            padding: '2px 8px', borderRadius: 6,
            background: 'rgba(74,222,128,0.15)',
            border: '1px solid rgba(74,222,128,0.3)',
            display: 'flex', alignItems: 'center', gap: 3,
          }}>
            <Check size={10} /> OWNED
          </div>
        )}

        {/* Simple preview visualization */}
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: `linear-gradient(135deg, ${previewData.color || rarity.border}, ${previewData.gradient || rarity.border}88)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 4px 16px ${previewData.color || rarity.border}44`,
          fontSize: 22,
        }}>
          {item.category === 'accessory' && item.slot === 'head' && '🎩'}
          {item.category === 'accessory' && item.slot === 'face' && '👓'}
          {item.category === 'accessory' && item.slot === 'body' && '✨'}
          {item.category === 'desk_item' && '🪴'}
          {item.category === 'ambient' && '🌸'}
          {item.category === 'desk_skin' && '🎨'}
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: '10px 12px 12px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: base.text, marginBottom: 2, lineHeight: 1.3 }}>
          {item.name}
        </div>
        <div style={{ fontSize: 10, color: base.sub, lineHeight: 1.4, marginBottom: 10, minHeight: 28 }}>
          {item.description}
        </div>

        {/* Action */}
        {owned ? (
          <button
            onClick={onEquip}
            style={{
              width: '100%', padding: '7px 0', borderRadius: 10,
              border: equipped ? '1px solid #4ade80' : `1px solid ${base.border}`,
              background: equipped ? 'rgba(74,222,128,0.12)' : 'transparent',
              color: equipped ? '#4ade80' : base.sub,
              fontSize: 11, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              transition: 'all 0.15s',
            }}
          >
            {equipped ? <><Check size={12} /> Equipped</> : 'Equip'}
          </button>
        ) : (
          <button
            onClick={canAfford && !purchasing ? onPurchase : undefined}
            disabled={!canAfford || purchasing}
            style={{
              width: '100%', padding: '7px 0', borderRadius: 10,
              border: 'none',
              background: canAfford
                ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
              color: canAfford ? '#fff' : base.sub,
              fontSize: 11, fontWeight: 800, cursor: canAfford ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              opacity: purchasing ? 0.6 : 1,
              transition: 'all 0.15s',
              boxShadow: canAfford ? '0 4px 12px rgba(245,158,11,0.3)' : 'none',
            }}
          >
            {purchasing ? (
              'Buying...'
            ) : canAfford ? (
              <>
                <Coins size={11} /> {item.price}
              </>
            ) : (
              <>
                <Lock size={10} /> {item.price}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
