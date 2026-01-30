import React, { useEffect } from 'react';
import { useStore } from '../lib/store';
import { Check, Trash2 } from 'lucide-react';
import clsx from 'clsx';

export const TaskList = () => {
    const { tasks, loadTasks, toggleTask, deleteTask } = useStore();

    useEffect(() => {
        loadTasks();
    }, []);

    if (tasks.length === 0) {
        return (
            <div className="text-center text-gray-500 py-10">
                <p>No tasks yet. Start planning your productivity!</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3 mt-6 text-white text-base">
            {tasks.map((task) => (
                <div
                    key={task.id}
                    className="flex items-center justify-between bg-gray-800/50 p-4 rounded-xl border border-gray-700/50 hover:border-gray-600 transition-all group"
                >
                    <div className="flex items-center gap-3 flex-1">
                        <button
                            onClick={() => toggleTask(task.id)}
                            className={clsx(
                                "p-1 rounded-full border-2 transition-colors cursor-pointer",
                                task.completed ? "bg-green-500 border-green-500 text-black" : "border-gray-500 hover:border-green-500 text-transparent"
                            )}
                        >
                            <Check size={14} className={clsx(task.completed ? "opacity-100" : "opacity-0")} />
                        </button>
                        <span className={clsx("text-lg transition-all", task.completed ? "text-gray-500 line-through" : "text-gray-200")}>
                            {task.text}
                        </span>
                    </div>
                    <button
                        onClick={() => deleteTask(task.id)}
                        className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-2 cursor-pointer"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            ))}
        </div>
    );
};
