import React, { useState, useRef, useEffect } from 'react';
import { initEngine } from '../lib/ai';
import { Bot, Send, Loader2, Sparkles, AlertTriangle } from 'lucide-react';
import { useStore } from '../lib/store';

export const AIChat = () => {
    const [engine, setEngine] = useState<any>(null);
    const [messages, setMessages] = useState<{ role: string, content: string }[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState<string>('');
    const [error, setError] = useState<string>('');
    const tasks = useStore(state => state.tasks);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const startEngine = async () => {
        setLoading(true);
        setError('');
        try {
            const eng = await initEngine((progress: any) => {
                setProgress(progress.text);
            });
            setEngine(eng);
            setLoading(false);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to initialize AI");
            setLoading(false);
        }
    };

    const handleSend = async () => {
        if (!input.trim() || !engine) return;

        const userMsg = { role: 'user', content: input };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInput('');

        // Contextualize with tasks
        const context = `Given my current tasks: ${JSON.stringify(tasks.map(t => ({ text: t.text, done: t.completed })))}. `;

        try {
            const tempMessages = [...newMessages, { role: 'assistant', content: '...' }];
            // Update UI immediately
            setMessages(tempMessages);

            const completion = await engine.chat.completions.create({
                messages: [
                    { role: "system", content: "You are a productivity coach. Be concise, motivating, and helpful." },
                    ...newMessages.map(m => m.role === 'user' ? { ...m, content: context + m.content } : m)
                ],
            });

            const reply = completion.choices[0]?.message?.content || "";
            // Replace '...' with reply
            setMessages([...newMessages, { role: 'assistant', content: reply }]);
        } catch (err) {
            console.error(err);
            setMessages(prev => [...prev.slice(0, prev.length - 1), { role: 'assistant', content: "Sorry, I encountered an error generating a response." }]);
        }
    };

    // Auto-scroll
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    if (!engine) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center text-white">
                <div className="bg-gray-800 p-4 rounded-full mb-4">
                    <Bot size={48} className="text-blue-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">AI Productivity Coach</h3>
                <p className="text-gray-400 mb-6 max-w-xs">
                    Analyze your tasks privacy-first. The model runs locally on your device.
                </p>
                {loading ? (
                    <div className="w-full max-w-md">
                        <div className="flex items-center justify-center gap-2 text-blue-400 mb-2">
                            <Loader2 size={20} className="animate-spin" />
                            <span>Loading Model...</span>
                        </div>
                        <p className="text-xs text-gray-500 font-mono truncate">{progress}</p>
                    </div>
                ) : (
                    <button
                        onClick={startEngine}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 cursor-pointer"
                    >
                        <Sparkles size={20} />
                        Activate AI Coach
                    </button>
                )}
                {error && (
                    <div className="mt-4 p-3 bg-red-900/50 border border-red-700 rounded-lg flex items-center gap-2 text-red-200 text-sm">
                        <AlertTriangle size={16} />
                        {error}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-gray-900/50 rounded-2xl overflow-hidden border border-gray-800">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="text-center text-gray-500 mt-10">
                        <p>Ask me to analyze your tasks or for productivity tips!</p>
                    </div>
                )}
                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${m.role === 'user'
                                ? 'bg-blue-600 text-white rounded-br-none'
                                : 'bg-gray-800 text-gray-200 rounded-bl-none'
                            }`}>
                            {m.content}
                        </div>
                    </div>
                ))}
                <div ref={chatEndRef} />
            </div>
            <div className="p-3 bg-gray-800 border-t border-gray-700 flex gap-2">
                <input
                    className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500 placeholder:text-gray-500"
                    placeholder="Ask AI..."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                />
                <button
                    onClick={handleSend}
                    disabled={!input.trim()}
                    className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                    <Send size={20} />
                </button>
            </div>
        </div>
    );
};
