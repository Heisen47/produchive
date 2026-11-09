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

/** How a user's character looks in focus rooms. Skin and hair are free; the rest is premium. */
export interface CharacterLook {
  skin: 's1' | 's2' | 's3' | 's4' | 's5' | 's6';
  hair: 'none' | 'short' | 'bob' | 'long' | 'bun' | 'curly';
  hairColor: string;
  outfit: 'classic' | 'hoodie' | 'dress' | 'kimono' | 'overalls' | 'cardigan';
  outfitColor: string;
  pattern: 'none' | 'stripes' | 'dots' | 'stars' | 'checks';
  patternColor: string;
  headwear: 'none' | 'beanie' | 'cap' | 'flower-crown' | 'cat-ears' | 'headphones' | 'witch-hat' | 'glasses';
  headwearColor: string;
}

/** Scenery of a fixed community room. */
export type CommunityEnvironment =
  | 'observatory'
  | 'waterfall-cafe'
  | 'greenhouse'
  | 'lakeside'
  | 'tea-garden'
  | 'mountain-lodge';

/** Public community room (study with strangers). Never includes host or participant user ids. */
export interface CommunityRoom {
  id: string;
  joinCode: string;
  name: string;
  environment: CommunityEnvironment;
  maxLimit: number;
  /** Real users plus ambient studiers. */
  occupantCount: number;
  isFull: boolean;
  createdAt: string;
  /** Only on GET /community/rooms: the caller is sitting in this room. */
  isMine?: boolean;
}

/** 409 body from POST /community/rooms/:code/join. */
export interface CommunityJoinConflict {
  error: string;
  code: 'already_in_room' | 'room_full';
  currentRoom?: { joinCode: string; name: string; environment: CommunityEnvironment };
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

  // Character look (wardrobe)
  '/character/me': {
    GET: {
      req: null;
      /** look = what is saved; effective = what others see right now. */
      res: { look: CharacterLook; effective: CharacterLook; isPremium: boolean };
    };
    PUT: {
      req: { look: CharacterLook };
      res: { look: CharacterLook; effective: CharacterLook; isPremium: boolean };
    };
  };

  // Community Rooms (fixed set seeded by the server; public, anonymous, premium only)
  '/community/rooms': {
    GET: {
      req: null;
      res: CommunityRoom[];
    };
  };
  '/community/rooms/:code/join': {
    POST: {
      req: null;
      res: { message: string; room: CommunityRoom; seatIdx: number };
    };
  };
  '/community/rooms/:code/leave': {
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

  // Activity Telemetry & Ingestion
  '/activity/event': {
    POST: {
      req: { eventType: string; payload: Record<string, any>; timestamp: string };
      res: { success: boolean; eventId: string };
    };
  };
  '/activity/batch': {
    POST: {
      req: { events: Array<{ eventType: string; payload: Record<string, any>; timestamp: string }> };
      res: { success: boolean; ingestedCount: number };
    };
  };

  // Analytics Platform
  '/analytics/summary': {
    GET: {
      req: null;
      res: { focusSeconds: number; idleSeconds: number; contextSwitches: number; focusScore: number; topApps: Array<{ name: string; seconds: number }> };
    };
  };
  '/analytics/dna': {
    GET: {
      req: null;
      res: { categories: Record<string, number>; dominantCategory: string };
    };
  };
  '/analytics/context-switches': {
    GET: {
      req: null;
      res: { count: number; breakdown: Array<{ hour: number; count: number }> };
    };
  };

  // AI Coach Platform
  '/coach/insights': {
    GET: {
      req: null;
      res: { insights: string[]; focusScore: number; recommendations: string[] };
    };
  };
  '/coach/recommend': {
    POST: {
      req: { context?: Record<string, any> };
      res: { recommendation: string };
    };
  };

  // Goals & Completion Velocity
  '/goals/backend': {
    GET: {
      req: null;
      res: Array<{ id: string; title: string; targetMinutes: number; currentMinutes: number; deadline?: string; status: string }>;
    };
    POST: {
      req: { title: string; targetMinutes: number; deadline?: string };
      res: { id: string; title: string; targetMinutes: number; currentMinutes: number; status: string };
    };
  };
  '/goals/backend/:id/forecast': {
    GET: {
      req: null;
      res: { goalId: string; estimatedCompletionDate: string; dailyVelocityMinutes: number; onTrack: boolean };
    };
  };

  // Executive Reports & Experiments
  '/reports/weekly': {
    GET: {
      req: null;
      res: Array<{ id: string; weekStartDate: string; totalFocusHours: number; topCategory: string; aiSummary: string }>;
    };
  };
  '/reports/weekly/:id': {
    GET: {
      req: null;
      res: { id: string; weekStartDate: string; reportData: any; aiInsights: any };
    };
  };
  '/experiments': {
    GET: {
      req: null;
      res: Array<{ id: string; title: string; status: string; baselineFocusScore: number; currentFocusScore: number }>;
    };
    POST: {
      req: { title: string; ruleConfig: Record<string, any>; startDate: string; endDate: string };
      res: { id: string; title: string; status: string };
    };
  };
  '/replay/:date': {
    GET: {
      req: null;
      res: { dateBucket: string; snapshots: Array<{ timestamp: string; activeApp: string; windowTitle: string; focusScore: number }> };
    };
  };
}

