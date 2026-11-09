import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Loader2, RefreshCw, Shield, Users, X } from 'lucide-react';
import { apiClient } from '../lib/api';
import type { CommunityJoinConflict, CommunityRoom } from '../lib/api-contract';
import { SCENE_META, isCommunityScene } from './focus-room/Shared3D';

const REFRESH_MS = 20000;
const BRAND = '#fbbf24';

/** The fixed community rooms: pick a scenery and study alongside strangers. */
export const CommunityLobby = ({ base, isDark, isSignedIn, onBack, onJoin, conflict, notice, onLeaveOther, onDismiss }: {
    base: { card: string; cardBorder: string; text: string; sub: string };
    isDark: boolean;
    isSignedIn: boolean;
    onBack: () => void;
    onJoin: (room: CommunityRoom) => void;
    /** Set when joining failed because the user still holds a seat elsewhere, or the room is full. */
    conflict: CommunityJoinConflict | null;
    notice: string | null;
    onLeaveOther: (joinCode: string) => Promise<void>;
    onDismiss: () => void;
}) => {
    const [rooms, setRooms] = useState<CommunityRoom[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [leaving, setLeaving] = useState(false);

    const load = useCallback(async () => {
        if (!isSignedIn) return;
        setRefreshing(true);
        try {
            const list = await apiClient.getCommunityRooms();
            setRooms(list.filter(r => isCommunityScene(r.environment)));
            setError(null);
        } catch (err: any) {
            setError(err?.response?.data?.error || 'Could not load community rooms.');
        } finally {
            setRefreshing(false);
        }
    }, [isSignedIn]);

    useEffect(() => {
        load();
        const id = setInterval(load, REFRESH_MS);
        return () => clearInterval(id);
    }, [load]);

    const totalStudying = rooms?.reduce((n, r) => n + r.occupantCount, 0) ?? 0;
    const banner = conflict?.code === 'already_in_room' && conflict.currentRoom
        ? { text: `You're still sitting in ${conflict.currentRoom.name}, probably on another device. Leave it to join a different room.`, leaveCode: conflict.currentRoom.joinCode }
        : conflict ? { text: conflict.error, leaveCode: null } : notice ? { text: notice, leaveCode: null } : null;

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 12, background: base.card, borderBottom: `1px solid ${base.cardBorder}` }}>
                <button
                    onClick={onBack}
                    aria-label="Back to focus modes"
                    style={{ padding: 6, borderRadius: 8, background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: base.text, border: 'none', cursor: 'pointer', display: 'flex' }}
                >
                    <ArrowLeft size={16} />
                </button>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: BRAND, boxShadow: `0 0 10px ${BRAND}` }} />
                <span style={{ fontSize: 16, fontWeight: 700, color: base.text }}>Community Rooms</span>
                {rooms && (
                    <span style={{ fontSize: 12, color: base.sub }}>{totalStudying} studying now</span>
                )}
                <div style={{ flex: 1 }} />
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: base.sub }}>
                    <Shield size={12} /> Anonymous · no chat
                </span>
                {isSignedIn && (
                    <button
                        onClick={load}
                        disabled={refreshing}
                        aria-label="Refresh rooms"
                        style={{ padding: 6, borderRadius: 8, background: 'transparent', color: base.sub, border: `1px solid ${base.cardBorder}`, cursor: 'pointer', display: 'flex' }}
                    >
                        <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                    </button>
                )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '28px 24px' }} className="custom-scrollbar">
                <div style={{ maxWidth: 980, margin: '0 auto' }}>
                    <p style={{ margin: '0 0 20px', fontSize: 13, color: base.sub, lineHeight: 1.6 }}>
                        Pick a place and take a seat. Up to 100 people share each room; you'll see the people at your table and the tables beside you.
                        Everyone appears under a random alias. Nobody sees your name or email.
                    </p>

                    {banner && (
                        <div role="status" style={{
                            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, marginBottom: 18,
                            background: isDark ? 'rgba(251,191,36,0.1)' : '#fffbeb', border: '1px solid rgba(251,191,36,0.4)', color: base.text, fontSize: 13,
                        }}>
                            <span style={{ flex: 1 }}>{banner.text}</span>
                            {banner.leaveCode && (
                                <button
                                    disabled={leaving}
                                    onClick={async () => {
                                        setLeaving(true);
                                        try { await onLeaveOther(banner.leaveCode!); await load(); } finally { setLeaving(false); }
                                    }}
                                    style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: BRAND, color: '#1c1917', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
                                >
                                    {leaving ? 'Leaving...' : 'Leave that room'}
                                </button>
                            )}
                            <button onClick={onDismiss} aria-label="Dismiss" style={{ background: 'transparent', border: 'none', color: base.sub, cursor: 'pointer', display: 'flex' }}>
                                <X size={14} />
                            </button>
                        </div>
                    )}

                    {!isSignedIn && (
                        <p style={{ textAlign: 'center', color: base.sub, fontSize: 14 }}>Sign in to join a community room.</p>
                    )}
                    {error && <p style={{ color: '#f87171', fontSize: 13 }}>{error}</p>}
                    {isSignedIn && rooms === null && !error && (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
                            <Loader2 size={24} className="animate-spin" color={BRAND} />
                        </div>
                    )}
                    {rooms && rooms.length === 0 && (
                        <p style={{ textAlign: 'center', color: base.sub, fontSize: 13 }}>No community rooms are open right now.</p>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                        {rooms?.map(room => {
                            const meta = SCENE_META[room.environment];
                            const fill = Math.min(1, room.occupantCount / room.maxLimit);
                            return (
                                <div key={room.id} style={{
                                    borderRadius: 18, overflow: 'hidden', background: base.card,
                                    border: `1px solid ${room.isMine ? meta.accent : base.cardBorder}`,
                                    display: 'flex', flexDirection: 'column',
                                }}>
                                    <div style={{ position: 'relative', height: 120, background: `url("${meta.bgImage}") center / cover` }}>
                                        <span style={{
                                            position: 'absolute', left: 12, bottom: 10, display: 'flex', alignItems: 'center', gap: 6,
                                            padding: '4px 10px', borderRadius: 20, background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 11, fontWeight: 700,
                                        }}>
                                            <Users size={12} /> {room.occupantCount} studying
                                        </span>
                                    </div>
                                    <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                                        <div>
                                            <div style={{ fontWeight: 800, fontSize: 15, color: base.text }}>{meta.emoji} {room.name}</div>
                                            <div style={{ fontSize: 12, color: base.sub, marginTop: 2 }}>{meta.tagline}</div>
                                        </div>
                                        <div aria-hidden style={{ height: 4, borderRadius: 4, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
                                            <div style={{ width: `${fill * 100}%`, height: '100%', borderRadius: 4, background: meta.accent }} />
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                                            <span style={{ fontSize: 11, color: base.sub }}>
                                                {room.isFull ? 'Full right now' : `${room.maxLimit - room.occupantCount} seats free`}
                                            </span>
                                            <button
                                                onClick={() => onJoin(room)}
                                                disabled={room.isFull && !room.isMine}
                                                style={{
                                                    padding: '8px 18px', borderRadius: 10, fontWeight: 700, fontSize: 12,
                                                    border: 'none',
                                                    background: room.isFull && !room.isMine ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)') : meta.accent,
                                                    color: room.isFull && !room.isMine ? base.sub : '#1c1917',
                                                    cursor: room.isFull && !room.isMine ? 'not-allowed' : 'pointer',
                                                }}
                                            >
                                                {room.isMine ? 'Return' : room.isFull ? 'Full' : 'Join'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};
