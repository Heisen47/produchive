import { describe, it, expect } from 'vitest';
import {
    roomStateToOccupants, seatsLabel,
    applyCommunityFrame, emptyCommunityState, communityOccupants,
    nearbyOccupants, visibleWindowStart, VISIBLE_SEATS,
} from '../renderer/lib/communityRooms';
import {
    SCENE_META, SCENE_STYLE, PICKER_SCENES, COMMUNITY_SCENES, isCommunityScene,
} from '../renderer/components/focus-room/Shared3D';
import { communitySeat, COMMUNITY_TABLES } from '../renderer/components/focus-room/community/CommunityScene';

const p = (userId: string, seatIdx: number, studySeconds = 0, isPaused = false) =>
    ({ userId, displayName: `Name ${userId}`, seatIdx, studySeconds, isPaused });

describe('friends rooms: roomStateToOccupants', () => {
    it('matches the current user by real user id', () => {
        const occ = roomStateToOccupants({
            type: 'room:state',
            participants: [{ userId: 'u1', displayName: 'Rishi', seatIdx: 0, studySeconds: 0 }],
        }, 'u1');
        expect(occ[0].isUser).toBe(true);
        expect(occ[0].name).toBe('You');
    });
});

describe('community room state', () => {
    const t0 = 1_000_000;

    it('builds from welcome + snapshot and marks you by selfId', () => {
        let s = applyCommunityFrame(emptyCommunityState(), { type: 'room:welcome', selfId: 'anon-me' }, t0);
        s = applyCommunityFrame(s, { type: 'room:state', participants: [p('anon-a', 0, 100), p('anon-me', 4, 10)] }, t0);
        const occ = communityOccupants(s, t0);
        expect(occ.map(o => o.id)).toEqual(['anon-a', 'anon-me']);
        expect(occ.find(o => o.isUser)?.name).toBe('You');
    });

    it('counts timers locally between server messages, and freezes paused ones', () => {
        let s = applyCommunityFrame(emptyCommunityState(), {
            type: 'room:state', participants: [p('anon-a', 0, 100), p('anon-b', 1, 50, true)],
        }, t0);
        const occ = communityOccupants(s, t0 + 30_000);
        expect(occ.find(o => o.id === 'anon-a')?.elapsedSeconds).toBe(130);
        expect(occ.find(o => o.id === 'anon-b')?.elapsedSeconds).toBe(50);

        // A pause update resets the baseline to what the server reported.
        s = applyCommunityFrame(s, { type: 'room:delta', updated: [p('anon-a', 0, 131, true)] }, t0 + 31_000);
        expect(communityOccupants(s, t0 + 90_000).find(o => o.id === 'anon-a')?.elapsedSeconds).toBe(131);
    });

    it('applies joins and leaves without touching anyone else', () => {
        let s = applyCommunityFrame(emptyCommunityState(), { type: 'room:state', participants: [p('anon-a', 0, 100)] }, t0);
        s = applyCommunityFrame(s, { type: 'room:delta', joined: [p('anon-c', 5)] }, t0 + 5_000);
        expect(communityOccupants(s, t0 + 5_000).map(o => o.id)).toEqual(['anon-a', 'anon-c']);
        s = applyCommunityFrame(s, { type: 'room:delta', left: ['anon-a'] }, t0 + 6_000);
        expect(communityOccupants(s, t0 + 6_000).map(o => o.id)).toEqual(['anon-c']);
    });

    it('a later snapshot replaces the list but keeps selfId', () => {
        let s = applyCommunityFrame(emptyCommunityState(), { type: 'room:welcome', selfId: 'anon-me' }, t0);
        s = applyCommunityFrame(s, { type: 'room:state', participants: [p('anon-a', 0), p('anon-me', 4)] }, t0);
        s = applyCommunityFrame(s, { type: 'room:state', participants: [p('anon-me', 4)] }, t0 + 60_000);
        const occ = communityOccupants(s, t0 + 60_000);
        expect(occ).toHaveLength(1);
        expect(occ[0].isUser).toBe(true);
    });
});

describe('only the tables around you are drawn', () => {
    it('picks your table and one either side, clamped to the room', () => {
        expect(visibleWindowStart(undefined, 100)).toBe(0);
        expect(visibleWindowStart(2, 100)).toBe(0);    // table 0 → tables 0-2
        expect(visibleWindowStart(5, 100)).toBe(0);    // table 1 → tables 0-2
        expect(visibleWindowStart(41, 100)).toBe(36);  // table 10 → tables 9-11
        expect(visibleWindowStart(99, 100)).toBe(88);  // last table → tables 22-24
    });

    it('re-numbers nearby people to local seats and counts the rest', () => {
        const all = Array.from({ length: 60 }, (_, i) => ({
            id: `p${i}`, name: `P${i}`, isUser: i === 41, elapsedSeconds: 0, seatIdx: i,
        }));
        const { nearby, othersCount } = nearbyOccupants(all, 100);
        expect(nearby).toHaveLength(VISIBLE_SEATS);
        expect(othersCount).toBe(60 - VISIBLE_SEATS);
        expect(nearby.find(o => o.isUser)?.seatIdx).toBe(41 - 36);
        for (const o of nearby) expect(o.seatIdx).toBeLessThan(VISIBLE_SEATS);
    });

    it('gives every visible seat a distinct spot around one of the three tables', () => {
        expect(COMMUNITY_TABLES).toHaveLength(3);
        const keys = Array.from({ length: VISIBLE_SEATS }, (_, i) => communitySeat(i).pos.join(','));
        expect(new Set(keys).size).toBe(VISIBLE_SEATS);
    });
});

describe('community sceneries', () => {
    it('has six 100-seat sceneries that are not offered in the solo/friends picker', () => {
        expect(COMMUNITY_SCENES).toEqual(['observatory', 'waterfall-cafe', 'greenhouse', 'lakeside', 'tea-garden', 'mountain-lodge']);
        for (const id of COMMUNITY_SCENES) {
            expect(isCommunityScene(id)).toBe(true);
            expect(PICKER_SCENES).not.toContain(id);
            expect(SCENE_META[id].maxSeats).toBe(100);
            expect(SCENE_META[id].bgImage.startsWith('data:image/svg+xml')).toBe(true);
            expect(SCENE_STYLE[id].fog).toMatch(/^#[0-9a-f]{6}$/i);
        }
        expect(isCommunityScene('cafe')).toBe(false);
    });

    it('labels seats', () => {
        expect(seatsLabel({ occupantCount: 0, maxLimit: 100 })).toBe('Empty · 100 seats');
        expect(seatsLabel({ occupantCount: 99, maxLimit: 100 })).toBe('99 studying · 1 seat free');
        expect(seatsLabel({ occupantCount: 100, maxLimit: 100 })).toBe('Full');
    });
});
