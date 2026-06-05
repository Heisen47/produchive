import { create } from 'zustand';
import { apiClient } from './api';
import { StoreItem, InventoryEntry, CoinTransaction } from './api-contract';

interface GameStore {
  // Wallet
  coinBalance: number;
  lifetimeEarned: number;
  walletLoaded: boolean;

  // Catalog
  catalog: Record<string, StoreItem[]>;
  catalogLoaded: boolean;

  // Inventory
  inventory: InventoryEntry[];
  inventoryLoaded: boolean;

  // Equipped loadout (slot → item)
  equippedLoadout: Record<string, StoreItem & { inventoryId: string }>;

  // Transaction history
  transactions: CoinTransaction[];

  // Coin earn animation
  lastEarnedCoins: number;
  showEarnAnimation: boolean;

  // Actions
  fetchWallet: () => Promise<void>;
  fetchCatalog: () => Promise<void>;
  fetchInventory: () => Promise<void>;
  fetchEquipped: () => Promise<void>;
  fetchTransactions: (page?: number) => Promise<void>;
  purchaseItem: (itemId: string) => Promise<{ success: boolean; message: string }>;
  equipItem: (itemId: string, equip: boolean) => Promise<void>;
  triggerEarnAnimation: (coins: number) => void;
  dismissEarnAnimation: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  // State
  coinBalance: 0,
  lifetimeEarned: 0,
  walletLoaded: false,
  catalog: {},
  catalogLoaded: false,
  inventory: [],
  inventoryLoaded: false,
  equippedLoadout: {},
  transactions: [],
  lastEarnedCoins: 0,
  showEarnAnimation: false,

  // Actions
  fetchWallet: async () => {
    try {
      const data = await apiClient.getWallet();
      set({ coinBalance: data.balance, lifetimeEarned: data.lifetimeEarned, walletLoaded: true });
    } catch (e) {
      console.error('Failed to fetch wallet:', e);
    }
  },

  fetchCatalog: async () => {
    try {
      const data = await apiClient.getCatalog();
      set({ catalog: data.catalog, catalogLoaded: true });
    } catch (e) {
      console.error('Failed to fetch catalog:', e);
    }
  },

  fetchInventory: async () => {
    try {
      const data = await apiClient.getInventory();
      set({ inventory: data.inventory, inventoryLoaded: true });
    } catch (e) {
      console.error('Failed to fetch inventory:', e);
    }
  },

  fetchEquipped: async () => {
    try {
      const data = await apiClient.getEquipped();
      set({ equippedLoadout: data.loadout });
    } catch (e) {
      console.error('Failed to fetch equipped:', e);
    }
  },

  fetchTransactions: async (page = 1) => {
    try {
      const data = await apiClient.getTransactions(page);
      set({ transactions: data.transactions });
    } catch (e) {
      console.error('Failed to fetch transactions:', e);
    }
  },

  purchaseItem: async (itemId: string) => {
    try {
      const data = await apiClient.purchaseItem(itemId);
      set({ coinBalance: data.newBalance });
      // Refresh inventory
      get().fetchInventory();
      return { success: true, message: data.message };
    } catch (e: any) {
      const msg = e?.response?.data?.error || 'Purchase failed';
      return { success: false, message: msg };
    }
  },

  equipItem: async (itemId: string, equip: boolean) => {
    try {
      await apiClient.equipItem(itemId, equip);
      // Refresh equipped loadout & inventory
      get().fetchEquipped();
      get().fetchInventory();
    } catch (e) {
      console.error('Failed to equip item:', e);
    }
  },

  triggerEarnAnimation: (coins: number) => {
    set({ lastEarnedCoins: coins, showEarnAnimation: true });
    setTimeout(() => set({ showEarnAnimation: false }), 3500);
  },

  dismissEarnAnimation: () => set({ showEarnAnimation: false }),
}));
