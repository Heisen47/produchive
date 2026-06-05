/// <reference types="vite/client" />
import axios from 'axios';
import { APIContract } from './api-contract';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const apiClient = {
  // Health and Checks
  check: async () => {
    const res = await api.get<APIContract['/check']['GET']['res']>('/check');
    return res.data;
  },

  // Auth
  login: async (data: APIContract['/auth/login']['POST']['req']) => {
    const res = await api.post<APIContract['/auth/login']['POST']['res']>('/auth/login', data);
    return res.data;
  },
  register: async (data: APIContract['/auth/register']['POST']['req']) => {
    const res = await api.post<APIContract['/auth/register']['POST']['res']>('/auth/register', data);
    return res.data;
  },
  syncAuth: async () => {
    const res = await api.post<APIContract['/auth/sync']['POST']['res']>('/auth/sync');
    return res.data;
  },

  // Users
  createUser: async (data: APIContract['/users']['POST']['req']) => {
    const res = await api.post<APIContract['/users']['POST']['res']>('/users', data);
    return res.data;
  },
  getMe: async () => {
    const res = await api.get<APIContract['/users/me']['GET']['res']>('/users/me');
    return res.data;
  },

  // Shared Rooms
  getRooms: async () => {
    const res = await api.get<APIContract['/rooms']['GET']['res']>('/rooms');
    return res.data;
  },
  createRoom: async (data: APIContract['/rooms']['POST']['req']) => {
    const res = await api.post<APIContract['/rooms']['POST']['res']>('/rooms', data);
    return res.data;
  },
  getRoomByCode: async (code: string) => {
    const res = await api.get<APIContract['/rooms/:code']['GET']['res']>(`/rooms/${code}`);
    return res.data;
  },
  joinRoom: async (code: string) => {
    const res = await api.post<APIContract['/rooms/:code/join']['POST']['res']>(`/rooms/${code}/join`);
    return res.data;
  },
  leaveRoom: async (code: string) => {
    const res = await api.post<APIContract['/rooms/:code/leave']['POST']['res']>(`/rooms/${code}/leave`);
    return res.data;
  },

  // Personal Rooms
  getPersonalRooms: async () => {
    const res = await api.get<APIContract['/personal-rooms']['GET']['res']>('/personal-rooms');
    return res.data;
  },
  createPersonalRoom: async (data: APIContract['/personal-rooms']['POST']['req']) => {
    const res = await api.post<APIContract['/personal-rooms']['POST']['res']>('/personal-rooms', data);
    return res.data;
  },
  updatePersonalRoom: async (id: string, data: APIContract['/personal-rooms/:id']['PATCH']['req']) => {
    const res = await api.patch<APIContract['/personal-rooms/:id']['PATCH']['res']>(`/personal-rooms/${id}`, data);
    return res.data;
  },
  deletePersonalRoom: async (id: string) => {
    const res = await api.delete<APIContract['/personal-rooms/:id']['DELETE']['res']>(`/personal-rooms/${id}`);
    return res.data;
  },
  joinPersonalRoom: async (code: string) => {
    const res = await api.post<APIContract['/personal-rooms/join/:code']['POST']['res']>(`/personal-rooms/join/${code}`);
    return res.data;
  },
  leavePersonalRoom: async (code: string) => {
    const res = await api.post<APIContract['/personal-rooms/leave/:code']['POST']['res']>(`/personal-rooms/leave/${code}`);
    return res.data;
  },
  getPersonalRoomParticipants: async (code: string) => {
    const res = await api.get<APIContract['/personal-rooms/:code/participants']['GET']['res']>(`/personal-rooms/${code}/participants`);
    return res.data;
  },
  startPersonalSession: async (id: string) => {
    const res = await api.post<APIContract['/personal-rooms/:id/sessions/start']['POST']['res']>(`/personal-rooms/${id}/sessions/start`);
    return res.data;
  },
  endPersonalSession: async (id: string, data: APIContract['/personal-rooms/:id/sessions/end']['POST']['req']) => {
    const res = await api.post<APIContract['/personal-rooms/:id/sessions/end']['POST']['res']>(`/personal-rooms/${id}/sessions/end`, data);
    return res.data;
  },
  getPersonalSessions: async (id: string) => {
    const res = await api.get<APIContract['/personal-rooms/:id/sessions']['GET']['res']>(`/personal-rooms/${id}/sessions`);
    return res.data;
  },
  getPersonalRoomStats: async (id: string) => {
    const res = await api.get<APIContract['/personal-rooms/:id/stats']['GET']['res']>(`/personal-rooms/${id}/stats`);
    return res.data;
  },

  // User Preset Rooms
  createUserRoom: async (roomName: string) => {
    const res = await api.post<APIContract['/user/room/:roomName']['POST']['res']>(`/user/room/${roomName}`);
    return res.data;
  },
  getUserRooms: async () => {
    const res = await api.get<APIContract['/user/room']['GET']['res']>('/user/room');
    return res.data;
  },
  deleteUserRoom: async () => {
    const res = await api.delete<APIContract['/user/room']['DELETE']['res']>('/user/room');
    return res.data;
  },

  // Payments
  checkout: async () => {
    const res = await api.post<APIContract['/payments/checkout']['POST']['res']>('/payments/checkout');
    return res.data;
  },

  // ─── Gamification / Store ───
  getWallet: async () => {
    const res = await api.get<APIContract['/store/wallet']['GET']['res']>('/store/wallet');
    return res.data;
  },
  getCatalog: async () => {
    const res = await api.get<APIContract['/store/catalog']['GET']['res']>('/store/catalog');
    return res.data;
  },
  getInventory: async () => {
    const res = await api.get<APIContract['/store/inventory']['GET']['res']>('/store/inventory');
    return res.data;
  },
  getEquipped: async () => {
    const res = await api.get<APIContract['/store/equipped']['GET']['res']>('/store/equipped');
    return res.data;
  },
  getTransactions: async (page = 1, limit = 20) => {
    const res = await api.get<APIContract['/store/transactions']['GET']['res']>(`/store/transactions?page=${page}&limit=${limit}`);
    return res.data;
  },
  purchaseItem: async (itemId: string) => {
    const res = await api.post<APIContract['/store/purchase']['POST']['res']>('/store/purchase', { itemId });
    return res.data;
  },
  equipItem: async (itemId: string, equip: boolean) => {
    const res = await api.patch<APIContract['/store/equip']['PATCH']['res']>('/store/equip', { itemId, equip });
    return res.data;
  },
  earnCoins: async (durationSeconds: number) => {
    const res = await api.post<APIContract['/store/earn']['POST']['res']>('/store/earn', { durationSeconds });
    return res.data;
  },
};

