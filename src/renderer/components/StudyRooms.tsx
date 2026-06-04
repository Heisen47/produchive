import React, { useState } from 'react';
import { FocusRoom, ScenePicker } from './FocusRoom';
import { SceneId } from './focus-room/Shared3D';
import { useStore } from '../lib/store';
import {
    Users, Plus, ArrowRight, X, Crown, Target, BookOpen, GraduationCap, Coffee,
    ArrowLeft
} from 'lucide-react';
import { PremiumPaywall } from './PremiumPaywall';
import { useTheme } from './ThemeProvider';
import { openWebPage } from '../lib/urls';

export const StudyRooms = ({ onNavigate }: { onNavigate?: (view: string) => void }) => {
    const { isDark } = useTheme();
    const [mode, setMode] = useState<'lobby' | 'solo' | 'multiplayer'>('lobby');
    const isPremium = useStore(state => state.isPremium);

    const base = isDark
        ? { card: 'rgba(15,23,42,0.85)', cardBorder: 'rgba(255,255,255,0.07)', text: '#f1f5f9', sub: '#94a3b8' }
        : { card: 'rgba(255,255,255,0.9)', cardBorder: 'rgba(0,0,0,0.08)', text: '#0f172a', sub: '#64748b' };

    const handleCreateRoom = async (scene: SceneId) => {
        const maxCapacity = {
            classroom: 10,
            library: 6,
            cafe: 4
        }[scene];

        // TODO: API call — POST /rooms { environment: scene, maxLimit: maxCapacity }
        // On success: get joinCode, copy to clipboard, navigate to room
        console.log('TODO: Create room', { scene, maxCapacity });
    };

    const handleJoinRoom = async (code: string) => {
        // TODO: API call — POST /rooms/:code/join
        // On success: get roomState, navigate to FocusRoom with participants
        console.log('TODO: Join room', code);
    };

    if (mode === 'solo') {
        return (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 12, background: base.card, borderBottom: `1px solid ${base.cardBorder}` }}>
                    <button
                        onClick={() => setMode('lobby')}
                        style={{ padding: '6px', borderRadius: 8, background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: base.text, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <ArrowLeft size={16} />
                    </button>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#a855f7', boxShadow: '0 0 10px #a855f7' }} />
                    <span style={{ fontSize: 16, fontWeight: 700, color: base.text }}>Solo Focus Room</span>
                </div>
                <div style={{ flex: 1, position: 'relative' }}>
                    <FocusRoom onNavigate={onNavigate} />
                </div>
            </div>
        );
    }

    if (mode === 'multiplayer') {
        if (!isPremium) {
            return (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: base.card, borderBottom: `1px solid ${base.cardBorder}` }}>
                        <span style={{ fontSize: 16, fontWeight: 700, color: base.text }}>Multiplayer Study Rooms</span>
                        <button
                            onClick={() => setMode('lobby')}
                            style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.1)', color: base.text, border: 'none', fontWeight: 600, cursor: 'pointer' }}
                        >
                            Back
                        </button>
                    </div>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <PremiumPaywall />
                    </div>
                </div>
            );
        }

        return (
            <div style={{ padding: '0px', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 12, background: base.card, borderBottom: `1px solid ${base.cardBorder}` }}>
                    <button
                        onClick={() => setMode('lobby')}
                        style={{ padding: '6px', borderRadius: 8, background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: base.text, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <ArrowLeft size={16} />
                    </button>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 10px #4ade80' }} />
                    <span style={{ fontSize: 16, fontWeight: 700, color: base.text }}>Multiplayer Study Rooms</span>
                </div>
                <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                    <ScenePicker 
                        onPick={(scene, roomMode) => handleCreateRoom(scene as SceneId)} 
                        onNavigate={onNavigate} 
                        isMultiplayer={true}
                        onJoin={(code) => handleJoinRoom(code)}
                    />
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: '60px 24px', maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ fontSize: 32, fontWeight: 800, margin: '0 0 16px', color: base.text }}>Choose your Focus Mode</h2>
            <p style={{ fontSize: 16, color: base.sub, marginBottom: 48, maxWidth: 500, margin: '0 auto 48px' }}>
                Decide how you want to study today. You can focus alone or invite friends to a private multiplayer room.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <button
                    onClick={() => setMode('solo')}
                    style={{
                        background: base.card,
                        border: `1px solid ${base.cardBorder}`,
                        borderRadius: 24, padding: 40,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
                        cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s',
                        color: base.text, textAlign: 'center',
                        boxShadow: '0 8px 30px rgba(0,0,0,0.05)'
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.1)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.05)';
                    }}
                >
                    <div style={{ width: 80, height: 80, borderRadius: 20, background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Target size={40} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px' }}>Join Free Room</h3>
                        <p style={{ margin: 0, color: base.sub, fontSize: 14, lineHeight: 1.5 }}>Focus alone alongside virtual NPCs in a cafe, library, or classroom.</p>
                    </div>
                </button>

                <button
                    onClick={() => {
                        if (isPremium) {
                            setMode('multiplayer');
                        } else {
                            openWebPage('/premium');
                        }
                    }}
                    style={{
                        background: base.card,
                        border: `1px solid ${base.cardBorder}`,
                        borderRadius: 24, padding: 40,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
                        cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s',
                        color: base.text, textAlign: 'center',
                        position: 'relative', overflow: 'hidden',
                        boxShadow: '0 8px 30px rgba(0,0,0,0.05)'
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.1)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.05)';
                    }}
                >
                    <div style={{ position: 'absolute', top: 16, right: 16, background: 'linear-gradient(135deg, #f59e0b, #fb923c)', color: '#fff', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Crown size={12} /> PREMIUM
                    </div>
                    <div style={{ width: 80, height: 80, borderRadius: 20, background: 'rgba(74, 222, 128, 0.1)', color: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Users size={40} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px' }}>Study with Friends</h3>
                        <p style={{ margin: 0, color: base.sub, fontSize: 14, lineHeight: 1.5 }}>Create real-time multiplayer rooms, sync study times, and focus together.</p>
                    </div>
                </button>
            </div>
        </div>
    );
};
