import React, { useState, useEffect, useRef } from 'react';
import { FocusRoom, ScenePicker } from './FocusRoom';
import { SceneId, Occupant } from './focus-room/Shared3D';
import { useStore } from '../lib/store';
import { apiClient } from '../lib/api';
import {
    Users, Plus, ArrowRight, X, Crown, Target, BookOpen, GraduationCap, Coffee,
    ArrowLeft, Loader2, Check, Copy
} from 'lucide-react';
import { PremiumPaywall } from './PremiumPaywall';
import { useTheme } from './ThemeProvider';
import { openWebPage } from '../lib/urls';
import { WS_BASE_URL } from '../lib/config';

export const StudyRooms = ({ onNavigate }: { onNavigate?: (view: string) => void }) => {
    const { isDark } = useTheme();
    const [mode, setMode] = useState<'lobby' | 'solo' | 'multiplayer'>('lobby');
    const isPremium = useStore(state => state.isPremium);
    const user = useStore(state => state.user);

    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [activeRoom, setActiveRoom] = useState<{ id: string; joinCode: string; scene: SceneId; environment: string } | null>(null);
    const [activeRoomOccupants, setActiveRoomOccupants] = useState<Occupant[]>([]);
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const socketRef = useRef<WebSocket | null>(null);

    const [showJoinModal, setShowJoinModal] = useState(false);
    const [joinCode, setJoinCode] = useState('');
    const [showCreateSuccessModal, setShowCreateSuccessModal] = useState(false);
    const [createdRoomInfo, setCreatedRoomInfo] = useState<{ code: string; scene: SceneId } | null>(null);
    const [copied, setCopied] = useState(false);
    const [copiedActive, setCopiedActive] = useState(false);

    const base = isDark
        ? { card: 'rgba(15,23,42,0.85)', cardBorder: 'rgba(255,255,255,0.07)', text: '#f1f5f9', sub: '#94a3b8' }
        : { card: 'rgba(255,255,255,0.9)', cardBorder: 'rgba(0,0,0,0.08)', text: '#0f172a', sub: '#64748b' };

    useEffect(() => {
        return () => {
            if (socketRef.current) {
                try {
                    if (socketRef.current.readyState === WebSocket.OPEN) {
                        socketRef.current.send(JSON.stringify({ type: 'room:leave' }));
                    }
                    socketRef.current.close();
                } catch (err) {
                    console.error('Error during cleanup of room socket:', err);
                }
            }
        };
    }, []);

    const connectToRoomWS = (roomCode: string, targetScene: SceneId) => {
        const token = sessionStorage.getItem('token');

        if (socketRef.current) {
            try {
                socketRef.current.close();
            } catch (err) {
                console.error(err);
            }
        }

        const ws = new WebSocket(WS_BASE_URL);
        socketRef.current = ws;
        setSocket(ws);

        ws.onopen = () => {
            console.log('WS connection opened, joining room:', roomCode);
            ws.send(JSON.stringify({
                type: 'room:join',
                payload: {
                    token,
                    joinCode: roomCode
                }
            }));
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'room:state') {
                    const currentUserId = useStore.getState().user?.id;
                    const occupants = data.participants.map((p: any) => ({
                        id: p.userId,
                        name: p.userId === currentUserId ? 'You' : p.displayName,
                        isUser: p.userId === currentUserId,
                        elapsedSeconds: p.studySeconds,
                        seatIdx: p.seatIdx,
                    }));
                    setActiveRoomOccupants(occupants);
                    setLoading(false);
                } else if (data.type === 'error') {
                    console.error('WS Error:', data.message);
                    alert(`Room connection error: ${data.message}`);
                    setLoading(false);
                    setActiveRoom(null);
                    setMode('lobby');
                    ws.close();
                }
            } catch (err) {
                console.error('Failed to parse WS message:', err);
            }
        };

        ws.onerror = (err) => {
            console.error('WS error occurred:', err);
        };

        ws.onclose = () => {
            console.log('WS connection closed');
        };
    };

    const handleCreateRoom = async (scene: SceneId) => {
        setLoading(true);
        setLoadingMessage('Creating your room...');
        try {
            const backendEnv = scene === 'classroom' ? 'school' : scene;
            const res = await apiClient.createRoom({ environment: backendEnv });
            if (res && res.room) {
                // Set active room details
                setActiveRoom({
                    id: res.room.id,
                    joinCode: res.room.joinCode,
                    scene: scene,
                    environment: res.room.environment
                });

                // Set room info to show in the success modal
                setCreatedRoomInfo({
                    code: res.room.joinCode,
                    scene: scene
                });

                setLoading(false);
                setShowCreateSuccessModal(true);
            } else {
                throw new Error('Failed to create room: invalid response');
            }
        } catch (err: any) {
            console.error('Failed to create room:', err);
            const msg = err.response?.data?.error || err.message || 'Unknown error';
            alert(`Error creating room: ${msg}`);
            setLoading(false);
        }
    };

    const handleEnterCreatedRoom = async (copyCode: boolean) => {
        if (!createdRoomInfo) return;

        if (copyCode) {
            try {
                await navigator.clipboard.writeText(createdRoomInfo.code);
                setCopied(true);
                setTimeout(() => {
                    setCopied(false);
                    setShowCreateSuccessModal(false);
                    setLoading(true);
                    setLoadingMessage('Connecting to real-time server...');
                    connectToRoomWS(createdRoomInfo.code, createdRoomInfo.scene);
                }, 800);
                return;
            } catch (clipErr) {
                console.warn('Failed to copy join code to clipboard', clipErr);
            }
        }

        setShowCreateSuccessModal(false);
        setLoading(true);
        setLoadingMessage('Connecting to real-time server...');
        connectToRoomWS(createdRoomInfo.code, createdRoomInfo.scene);
    };

    const handleJoinRoom = async (code: string) => {
        setLoading(true);
        setLoadingMessage(`Joining room ${code.toUpperCase()}...`);
        try {
            const cleanCode = code.trim().toUpperCase();
            const res = await apiClient.joinRoom(cleanCode);
            if (res && res.room) {
                const scene = (res.room.environment === 'school' ? 'classroom' : res.room.environment) as SceneId;
                setActiveRoom({
                    id: res.room.id,
                    joinCode: res.room.joinCode,
                    scene: scene,
                    environment: res.room.environment
                });

                setLoadingMessage('Connecting to real-time server...');
                connectToRoomWS(res.room.joinCode, scene);
            } else {
                throw new Error('Failed to join room: invalid response');
            }
        } catch (err: any) {
            console.error('Failed to join room:', err);
            const msg = err.response?.data?.error || err.message || 'Unknown error';
            alert(`Error joining room: ${msg}`);
            setLoading(false);
        }
    };

    const handleLeaveRoom = async () => {
        if (socketRef.current) {
            try {
                if (socketRef.current.readyState === WebSocket.OPEN) {
                    socketRef.current.send(JSON.stringify({ type: 'room:leave' }));
                }
                socketRef.current.close();
            } catch (err) {
                console.error('Error closing socket:', err);
            }
            socketRef.current = null;
            setSocket(null);
        }

        if (activeRoom) {
            try {
                await apiClient.leaveRoom(activeRoom.joinCode);
            } catch (err) {
                console.error('Failed to call leaveRoom API:', err);
            }
        }

        setActiveRoom(null);
        setActiveRoomOccupants([]);
        setMode('lobby');
    };

    const joinRoomModal = showJoinModal && (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100
        }} onClick={() => setShowJoinModal(false)}>
            <div style={{
                background: base.card, padding: 24, borderRadius: 16, width: 320,
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)', border: `1px solid ${base.cardBorder}`
            }} onClick={e => e.stopPropagation()}>
                <h3 style={{ margin: '0 0 16px', color: base.text, fontSize: 18 }}>Join Room</h3>
                <input 
                    autoFocus
                    placeholder="Enter Room Code"
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value)}
                    style={{
                        width: '100%', padding: '10px 14px', borderRadius: 8,
                        background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                        border: `1px solid ${base.cardBorder}`, color: base.text, outline: 'none',
                        fontSize: 14, marginBottom: 16, boxSizing: 'border-box'
                    }}
                    onKeyDown={e => {
                        if (e.key === 'Enter' && joinCode.trim()) {
                            setShowJoinModal(false);
                            handleJoinRoom(joinCode.trim());
                        }
                    }}
                />
                <div style={{ display: 'flex', gap: 10 }}>
                    <button 
                        onClick={() => setShowJoinModal(false)}
                        style={{ flex: 1, padding: '8px', borderRadius: 8, background: 'transparent', border: `1px solid ${base.cardBorder}`, color: base.text, cursor: 'pointer', fontWeight: 600 }}
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={() => {
                            if (joinCode.trim()) {
                                        setShowJoinModal(false);
                                        handleJoinRoom(joinCode.trim());
                            }
                        }}
                        disabled={!joinCode.trim()}
                        style={{ flex: 1, padding: '8px', borderRadius: 8, background: joinCode.trim() ? '#a78bfa' : 'rgba(255,255,255,0.05)', color: joinCode.trim() ? '#000' : base.sub, border: 'none', cursor: joinCode.trim() ? 'pointer' : 'not-allowed', fontWeight: 700 }}
                    >
                        Join
                    </button>
                </div>
            </div>
        </div>
    );

    const createSuccessModal = showCreateSuccessModal && createdRoomInfo && (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100
        }} onClick={() => handleEnterCreatedRoom(false)}>
            <div style={{
                background: base.card, padding: 32, borderRadius: 20, width: 360,
                boxShadow: '0 20px 50px rgba(0,0,0,0.3)', border: `1px solid ${base.cardBorder}`,
                textAlign: 'center'
            }} onClick={e => e.stopPropagation()}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(167, 139, 250, 0.15)', color: '#a78bfa', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                    <Plus size={28} />
                </div>
                
                <h3 style={{ margin: '0 0 8px', color: base.text, fontSize: 20, fontWeight: 800 }}>Room Created!</h3>
                <p style={{ margin: '0 0 24px', color: base.sub, fontSize: 13, lineHeight: 1.5 }}>
                    Your private study room is ready. Share this code with friends so they can join you.
                </p>

                <div style={{ 
                    fontFamily: 'monospace', 
                    background: 'rgba(0,0,0,0.15)', 
                    color: '#a78bfa',
                    fontSize: 32,
                    fontWeight: 800,
                    letterSpacing: '0.15em',
                    padding: '16px',
                    borderRadius: 12,
                    border: '1px dashed rgba(167, 139, 250, 0.3)',
                    marginBottom: 24,
                    textTransform: 'uppercase'
                }}>
                    {createdRoomInfo.code}
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                    <button 
                        onClick={() => handleEnterCreatedRoom(false)}
                        style={{ flex: 1, padding: '12px', borderRadius: 12, background: 'transparent', border: `1px solid ${base.cardBorder}`, color: base.text, cursor: 'pointer', fontWeight: 600, fontSize: 13, transition: 'background 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={() => handleEnterCreatedRoom(true)}
                        style={{ 
                            flex: 1.5, padding: '12px', borderRadius: 12, 
                            background: copied ? 'linear-gradient(135deg, #34d399, #059669)' : 'linear-gradient(135deg, #a78bfa, #8b5cf6)', 
                            color: copied ? '#fff' : '#000', 
                            border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, 
                            boxShadow: copied ? '0 4px 15px rgba(52, 211, 153, 0.3)' : '0 4px 15px rgba(167, 139, 250, 0.3)', 
                            transition: 'all 0.3s ease',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                        }}
                        disabled={copied}
                    >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                        {copied ? 'Copied!' : 'Copy & Enter'}
                    </button>
                </div>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: base.card,
                padding: '40px',
                borderRadius: 24,
                border: `1px solid ${base.cardBorder}`
            }}>
                <div className="flex flex-col items-center gap-4 animate-fade-in" style={{ textAlign: 'center' }}>
                    <div className="relative" style={{ marginBottom: 16 }}>
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(167, 139, 250, 0.1)', border: '1px solid rgba(167, 139, 250, 0.2)' }}>
                            <Loader2 size={32} className="animate-spin" style={{ color: '#a78bfa' }} />
                        </div>
                        <div className="absolute inset-0 rounded-2xl animate-pulse" style={{ background: 'rgba(167, 139, 250, 0.05)', filter: 'blur(8px)' }} />
                    </div>
                    <h3 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 8px', color: base.text }}>
                        {loadingMessage}
                    </h3>
                    <p style={{ fontSize: 13, color: base.sub, maxWidth: 320, margin: 0, lineHeight: 1.5 }}>
                        Setting up the 3D space and synchronizing focus stats with peer connections.
                    </p>
                </div>
            </div>
        );
    }

    if (activeRoom && !showCreateSuccessModal) {
        return (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: base.card, borderBottom: `1px solid ${base.cardBorder}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button
                            onClick={handleLeaveRoom}
                            style={{ padding: '6px', borderRadius: 8, background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: base.text, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            <ArrowLeft size={16} />
                        </button>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 10px #4ade80' }} />
                        <span style={{ fontSize: 16, fontWeight: 700, color: base.text }}>
                            Room: <span style={{ fontFamily: 'monospace', background: 'rgba(0,0,0,0.15)', padding: '2px 8px', borderRadius: 6, marginLeft: 4, letterSpacing: '0.05em' }}>{activeRoom.joinCode}</span>
                        </span>
                    </div>

                    <button
                        onClick={async () => {
                            try {
                                await navigator.clipboard.writeText(activeRoom.joinCode);
                                setCopiedActive(true);
                                setTimeout(() => setCopiedActive(false), 2000);
                            } catch (e) {
                                console.error(e);
                            }
                        }}
                        style={{
                            background: copiedActive ? 'rgba(52, 211, 153, 0.15)' : 'rgba(167, 139, 250, 0.15)',
                            color: copiedActive ? '#34d399' : '#a78bfa',
                            border: copiedActive ? '1px solid rgba(52, 211, 153, 0.3)' : '1px solid rgba(167, 139, 250, 0.3)',
                            padding: '6px 16px',
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                        }}
                    >
                        {copiedActive ? <Check size={14} /> : <Copy size={14} />}
                        {copiedActive ? 'Copied!' : 'Copy Code'}
                    </button>
                </div>
                <div style={{ flex: 1, position: 'relative' }}>
                    <FocusRoom
                        onNavigate={onNavigate}
                        overrideOccupants={activeRoomOccupants}
                        forcedScene={activeRoom.scene}
                        onLeave={handleLeaveRoom}
                    />
                </div>
            </div>
        );
    }

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
                {joinRoomModal}
                {createSuccessModal}
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
            {joinRoomModal}
            {createSuccessModal}
        </div>
    );
};


