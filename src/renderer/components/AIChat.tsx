import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, MessageCircle } from 'lucide-react';
import { useTheme } from './ThemeProvider';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface AIChatProps {
    engine: any;
}

export const AIChat: React.FC<AIChatProps> = ({ engine }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const { isDark } = useTheme();

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const sendMessage = async () => {
        if (!input.trim() || !engine || isLoading) return;

        const userMessage: Message = { role: 'user', content: input.trim() };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const completion = await engine.chat.completions.create({
                messages: [
                    { role: 'system', content: 'You are a helpful productivity coach. Keep responses concise and actionable.' },
                    ...messages.map(m => ({ role: m.role, content: m.content })),
                    { role: 'user', content: input.trim() }
                ],
                temperature: 0.7,
            });

            const responseText = completion.choices[0]?.message?.content || "I couldn't generate a response.";
            setMessages(prev => [...prev, { role: 'assistant', content: responseText }]);
        } catch (err) {
            setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!engine) {
        return (
            <div className="glass-card-static rounded-2xl p-8 text-center animate-fade-in-up">
                <div className="p-4 rounded-full inline-block mb-4 animate-float" style={{ background: 'var(--bg-elevated)' }}>
                    <MessageCircle size={32} style={{ color: 'var(--text-muted)' }} />
                </div>
                <h3 className="font-display font-bold text-lg mb-2" style={{ color: 'var(--text-secondary)' }}>AI Chat Unavailable</h3>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Activate the AI engine first to use the productivity coach.</p>
            </div>
        );
    }

    return (
        <div className="glass-card-static rounded-2xl overflow-hidden flex flex-col h-[500px] animate-fade-in-up">
            {/* Header */}
            <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border-secondary)' }}>
                <Bot size={20} style={{ color: 'var(--accent)' }} />
                <h3 className="font-display font-bold" style={{ color: 'var(--text-primary)' }}>AI Coach</h3>
                <div className="ml-auto flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Online</span>
                </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
                        <Bot size={48} style={{ color: 'var(--text-muted)', opacity: 0.3 }} className="mb-4" />
                        <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>Start a conversation</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Ask about productivity tips, time management, or goal setting.</p>
                    </div>
                )}
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex gap-3 animate-fade-in-up ${msg.role === 'user' ? 'justify-end' : ''}`}>
                        {msg.role === 'assistant' && (
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(99,102,241,0.15)' }}>
                                <Bot size={14} style={{ color: '#818cf8' }} />
                            </div>
                        )}
                        <div
                            className="max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
                            style={{
                                background: msg.role === 'user'
                                    ? 'linear-gradient(135deg, var(--accent), var(--accent-dark))'
                                    : 'var(--bg-elevated)',
                                color: msg.role === 'user' ? '#fff' : 'var(--text-secondary)',
                                border: msg.role === 'user' ? 'none' : '1px solid var(--border-secondary)',
                            }}
                        >
                            {msg.content}
                        </div>
                        {msg.role === 'user' && (
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent-glow)' }}>
                                <User size={14} style={{ color: 'var(--accent)' }} />
                            </div>
                        )}
                    </div>
                ))}
                {isLoading && (
                    <div className="flex gap-3 animate-fade-in">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.15)' }}>
                            <Bot size={14} style={{ color: '#818cf8' }} />
                        </div>
                        <div className="px-4 py-3 rounded-2xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-secondary)' }}>
                            <Loader2 size={16} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
                        </div>
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="p-3" style={{ borderTop: '1px solid var(--border-secondary)' }}>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder="Ask your AI coach..."
                        className="flex-1 rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-all duration-200"
                        style={{
                            background: 'var(--bg-input)',
                            border: '1px solid var(--border-input)',
                            color: 'var(--text-primary)',
                        }}
                        onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px var(--accent-glow)'; }}
                        onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-input)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!input.trim() || isLoading}
                        className="p-2.5 rounded-xl disabled:opacity-40 transition-all duration-200 hover:scale-105"
                        style={{
                            background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))',
                            color: '#fff',
                            boxShadow: input.trim() ? '0 4px 12px var(--accent-glow)' : 'none',
                        }}
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};
