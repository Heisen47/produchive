import type { CommunityRoom, CharacterLook } from './api-contract';
import { normalizeLook } from './characterLook';
import type { Occupant } from '../components/focus-room/Shared3D';

/** Participant as sent in `room:state` / `room:delta` WebSocket frames. */
export interface RoomStateParticipant {
  userId: string;
  displayName: string;
  seatIdx: number;
  studySeconds: number;
  isPaused?: boolean;
  isPremium?: boolean;
  /** Character look, as the server shows it to others. Older servers don't send it. */
  look?: CharacterLook;
}

export interface RoomStateFrame {
  type: 'room:state';
  participants: RoomStateParticipant[];
  /** Community rooms: this client's own per-room alias id (sent with the first snapshot). */
  selfId?: string;
}

/**
 * Convert a friends-room `room:state` frame into scene occupants.
 * Friends rooms identify the current user by real user id.
 */
export function roomStateToOccupants(frame: RoomStateFrame, currentUserId: string | undefined): Occupant[] {
  return frame.participants.map(p => {
    const isUser = (!!frame.selfId && p.userId === frame.selfId) || (!!currentUserId && p.userId === currentUserId);
    return {
      id: p.userId,
      name: isUser ? 'You' : p.displayName,
      isUser,
      elapsedSeconds: p.studySeconds,
      seatIdx: p.seatIdx,
      isPaused: p.isPaused,
      look: p.look ? normalizeLook(p.look) : undefined,
    };
  });
}

/* ------------------------------------------------------------------------- *
 * Community rooms
 *
 * The server sends a full snapshot when you join and once a minute after
 * that; in between it only sends what changed (joined / left / updated).
 * Timers are counted here, from the seconds each person had when we last
 * heard about them.
 * ------------------------------------------------------------------------- */

export type CommunityFrame =
  | { type: 'room:welcome'; selfId: string }
  | { type: 'room:state'; participants: RoomStateParticipant[]; selfId?: string }
  | { type: 'room:delta'; joined?: RoomStateParticipant[]; left?: string[]; updated?: RoomStateParticipant[] };

interface TrackedParticipant {
  p: RoomStateParticipant;
  /** When `p.studySeconds` was true. */
  receivedAt: number;
}

export interface CommunityRoomState {
  selfId?: string;
  participants: Map<string, TrackedParticipant>;
}

export const emptyCommunityState = (): CommunityRoomState => ({ participants: new Map() });

/** Apply one server frame. Returns a new state object (the input is not mutated). */
export function applyCommunityFrame(state: CommunityRoomState, frame: CommunityFrame, nowMs: number): CommunityRoomState {
  switch (frame.type) {
    case 'room:welcome':
      return { ...state, selfId: frame.selfId };
    case 'room:state': {
      const participants = new Map<string, TrackedParticipant>();
      for (const p of frame.participants) participants.set(p.userId, { p, receivedAt: nowMs });
      return { selfId: frame.selfId ?? state.selfId, participants };
    }
    case 'room:delta': {
      const participants = new Map(state.participants);
      for (const p of [...(frame.joined ?? []), ...(frame.updated ?? [])]) {
        participants.set(p.userId, { p, receivedAt: nowMs });
      }
      for (const id of frame.left ?? []) participants.delete(id);
      return { ...state, participants };
    }
    default:
      return state;
  }
}

/** Everyone in the room, with timers advanced to `nowMs`. */
export function communityOccupants(state: CommunityRoomState, nowMs: number): Occupant[] {
  const out: Occupant[] = [];
  for (const { p, receivedAt } of state.participants.values()) {
    const isUser = !!state.selfId && p.userId === state.selfId;
    const elapsed = p.isPaused ? 0 : Math.max(0, Math.floor((nowMs - receivedAt) / 1000));
    out.push({
      id: p.userId,
      name: isUser ? 'You' : p.displayName,
      isUser,
      elapsedSeconds: p.studySeconds + elapsed,
      seatIdx: p.seatIdx,
      isPaused: p.isPaused,
      look: p.look ? normalizeLook(p.look) : undefined,
    });
  }
  return out.sort((a, b) => a.seatIdx - b.seatIdx);
}

/** Seats per table in community scenes, and how many tables are drawn around you. */
export const SEATS_PER_TABLE = 4;
export const VISIBLE_TABLES = 3;
export const VISIBLE_SEATS = SEATS_PER_TABLE * VISIBLE_TABLES;

/**
 * First global seat of the tables drawn on screen: your table, with one table
 * either side (clamped to the room). Before you are seated, the front tables.
 */
export function visibleWindowStart(userSeat: number | undefined, capacity: number): number {
  const tables = Math.ceil(capacity / SEATS_PER_TABLE);
  const userTable = userSeat === undefined ? 0 : Math.floor(userSeat / SEATS_PER_TABLE);
  const firstTable = Math.max(0, Math.min(userTable - 1, tables - VISIBLE_TABLES));
  return firstTable * SEATS_PER_TABLE;
}

/**
 * The people drawn in the scene: those at the tables around you, re-numbered
 * to local seats 0–11. Everyone else only counts towards `othersCount`.
 */
export function nearbyOccupants(all: Occupant[], capacity: number): { nearby: Occupant[]; othersCount: number } {
  const me = all.find(o => o.isUser);
  const start = visibleWindowStart(me?.seatIdx, capacity);
  const nearby = all
    .filter(o => o.seatIdx >= start && o.seatIdx < start + VISIBLE_SEATS)
    .map(o => ({ ...o, seatIdx: o.seatIdx - start }));
  return { nearby, othersCount: all.length - nearby.length };
}

export function seatsLabel(room: Pick<CommunityRoom, 'occupantCount' | 'maxLimit'>): string {
  if (room.occupantCount >= room.maxLimit) return 'Full';
  const free = room.maxLimit - room.occupantCount;
  if (room.occupantCount === 0) return `Empty · ${free} seats`;
  return `${room.occupantCount} studying · ${free} seat${free === 1 ? '' : 's'} free`;
}
