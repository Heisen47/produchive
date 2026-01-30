import React from 'react';
import { TaskInput } from './components/TaskInput';
import { TaskList } from './components/TaskList';
import { AIChat } from './components/AIChat';

const App = () => {
    return (
        <div className="h-screen w-screen bg-gray-950 text-white flex overflow-hidden font-sans">
            {/* Left Panel: Tasks */}
            <div className="w-1/2 p-8 flex flex-col border-r border-gray-800">
                <header className="mb-8">
                    <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent mb-2">
                        Produchive
                    </h1>
                    <p className="text-gray-400">Offline Productivity & AI Companion</p>
                </header>

                <div className="mb-6">
                    <TaskInput />
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    <TaskList />
                </div>
            </div>

            {/* Right Panel: AI Chat */}
            <div className="w-1/2 p-6 bg-gray-900/30">
                <AIChat />
            </div>
        </div>
    );
};

export default App;
