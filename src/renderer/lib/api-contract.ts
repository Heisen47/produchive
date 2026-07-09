/**
 * Produchive API Contract Definition
 * 
 * This file serves as the Single Source of Truth (SSoT) for all API endpoints,
 * including paths, HTTP methods, authorization requirements, request shapes, and response shapes.
 * 
 * Keep in sync between Backend and Frontend projects.
 */

export interface User {
  id: string;
  email: string;
  displayName: string | null;
  isPremium: boolean;
}

export interface Room {
  id: string;
  joinCode: string;
  environment: string;
  maxLimit: number;
  hostId: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RoomParticipant {
  id: string;
  roomId: string;
  userId: string;
  seatIdx: number;
  studySeconds: number;
  joinedAt: string;
}

export interface PersonalRoom {
  id: string;
  userId: string;
  roomType: 'school' | 'library' | 'cafe';
  name: string;
  joinCode: string;
  ambientSound: 'rain' | 'cafe' | 'lofi' | 'forest' | 'none';
  dailyGoalMinutes: number;
  totalStudySeconds: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PersonalSession {
  id: string;
  personalRoomId: string;
  userId: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
  completed: boolean;
}

export interface PersonalRoomStats {
  roomId: string;
  roomType: string;
  dailyGoalMinutes: number;
  todayStudySeconds: number;
  todayStudyMinutes: number;
  dailyGoalProgress: number;
  totalStudySeconds: number;
  totalStudyHours: number;
  totalSessions: number;
  completedSessions: number;
  completionRate: number;
}

export interface APIContract {
  // Health and Checks
  '/health': {
    GET: {
      req: null;
      res: { status: 'ok'; timestamp: string };
    };
  };
  '/check': {
    GET: {
      req: null;
      res: { status: 'OK'; message: string };
    };
  };

  // Authentication Flow
  '/auth/login': {
    POST: {
      req: { email: string; password: string };
      res: { token: string; user: User };
    };
  };
  '/auth/register': {
    POST: {
      req: { email: string; password: string; displayName?: string };
      res: { token: string; user: User };
    };
  };
  '/auth/sync': {
    POST: {
      req: null; // Auth Bearer Token in headers
      res: { message: string; user: User };
    };
  };
  '/auth/check-login': {
    GET: {
      req: null;
      res: { success: boolean; user?: User };
    };
  };

  // User Profile
  '/users': {
    POST: {
      req: {
        id: string;
        email: string;
        displayName?: string;
      };
      res: { message: string; user: User };
    };
  };
  '/users/me': {
    GET: {
      req: null; // Auth Bearer Token in headers
      res: User;
    };
  };

  // Shared Collaborative Rooms
  '/rooms': {
    GET: {
      req: null;
      res: Room[];
    };
    POST: {
      req: {
        environment: string;
        maxLimit?: number | string;
      };
      res: { message: string; room: Room };
    };
  };
  '/rooms/:code': {
    GET: {
      req: null;
      res: { room: Room; participants: RoomParticipant[] };
    };
  };
  '/rooms/:code/join': {
    POST: {
      req: null;
      res: { message: string; room: Room; participant: RoomParticipant };
    };
  };
  '/rooms/:code/leave': {
    POST: {
      req: null;
      res: { message: string };
    };
  };

  // Premium Personal Rooms
  '/personal-rooms': {
    GET: {
      req: null;
      res: PersonalRoom[];
    };
    POST: {
      req: {
        roomType: 'school' | 'library' | 'cafe';
        name?: string;
        ambientSound?: 'rain' | 'cafe' | 'lofi' | 'forest' | 'none';
      };
      res: { message: string; room: PersonalRoom & { maxLimit: number } };
    };
  };
  '/personal-rooms/:id': {
    PATCH: {
      req: {
        name?: string;
        ambientSound?: 'rain' | 'cafe' | 'lofi' | 'forest' | 'none';
        dailyGoalMinutes?: number | string;
      };
      res: { message: string; room: PersonalRoom };
    };
    DELETE: {
      req: null;
      res: { message: string };
    };
  };
  '/personal-rooms/join/:code': {
    POST: {
      req: null;
      res: { message: string; room: PersonalRoom; seatIdx?: number; participant?: RoomParticipant };
    };
  };
  '/personal-rooms/leave/:code': {
    POST: {
      req: null;
      res: { message: string };
    };
  };
  '/personal-rooms/:code/participants': {
    GET: {
      req: null;
      res: { room: PersonalRoom; maxLimit: number; participants: RoomParticipant[]; count: number };
    };
  };
  '/personal-rooms/:id/sessions/start': {
    POST: {
      req: null;
      res: { message: string; session: PersonalSession };
    };
  };
  '/personal-rooms/:id/sessions/end': {
    POST: {
      req: { completed: boolean };
      res: { message: string; session: PersonalSession };
    };
  };
  '/personal-rooms/:id/sessions': {
    GET: {
      req: null; // page and limit query params optional
      res: { page: number; limit: number; sessions: PersonalSession[] };
    };
  };
  '/personal-rooms/:id/stats': {
    GET: {
      req: null;
      res: PersonalRoomStats;
    };
  };

  // User Preset Rooms Selection
  '/user/room/:roomName': {
    POST: {
      req: null;
      res: { message: string; room: { id: string; roomName: string; roomSize: number; currentUserCount: number; createdAt: string } };
    };
  };
  '/user/room': {
    GET: {
      req: null;
      res: {
        membership: { id: string; userId: string; roomId: string; joinedAt: string };
        room: { id: string; roomName: string; roomSize: number; currentUserCount: number; createdAt: string };
      };
    };
    DELETE: {
      req: null;
      res: { message: string };
    };
  };

  // Payments / Premium Upgrade
  '/payments/checkout': {
    POST: {
      req: null;
      res: { url: string; sessionId: string };
    };
  };
  '/payments/webhook': {
    POST: {
      req: any; // Stripe Webhook raw request payload
      res: { received: boolean };
    };
  };
}
