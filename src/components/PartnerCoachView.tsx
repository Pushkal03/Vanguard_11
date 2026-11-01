import React, { useState } from 'react';
import { Send, Flame, MessageSquare, Zap } from 'lucide-react';
import { FocusViolation, StudyTask, TimetableBlock } from '../utils/accountabilityEngine';

export interface PartnerMessage {
  id: string;
  sender: 'kai' | 'student';
  text: string;
  timestamp: string;
}

interface PartnerCoachViewProps {
  messages: PartnerMessage[];
  onSendMessage: (text: string) => Promise<void>;
  tasks: StudyTask[];
  activeBlock: TimetableBlock | null;
  xpPoints: number;
  violations: FocusViolation[];
  isSending: boolean;
}

const QUICK_PUSH_PROMPTS = [
  'I feel lazy and want to procrastinate right now. Push me hard.',
  'Challenge my progress today—am I working like someone sacrificing 2 years?',
  'I am stuck on a tough 11th standard Physics problem and want to quit.',
  'Give me a 30-second battle plan for my next study block.',
];

export const PartnerCoachView: React.FC<PartnerCoachViewProps> = ({
  messages,
  onSendMessage,
  tasks,
  activeBlock,
  xpPoints,
  violations,
  isSending,
}) => {
  const [input, setInput] = useState('');

  const completedCount = tasks.filter((t) => t.completed).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;
    const text = input.trim();
    setInput('');
    await onSendMessage(text);
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
      {/* Left 4 Cols: Partner Persona & Live Accountability Contract */}
      <div className="lg:col-span-4 space-y-6">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-white">Kai — Your Growth Partner</h2>
              <p className="text-xs text-slate-400">
                Closest Friend · Relentless 11th–12th Std Enforcer
              </p>
            </div>
          </div>

          <p className="text-xs leading-relaxed text-slate-300">
            You told me on Day 1: <em className="text-amber-200">"I have high dreams and I am ready to sacrifice my two years, but I am lazy until someone pushes me."</em> I am here to make sure you never fold to laziness again.
          </p>

          <div className="border-t border-slate-800 pt-4 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">2-Year Mission Remaining</span>
              <span className="font-mono font-semibold text-slate-100 tabular-nums">712 Days</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Tasks Completed Today</span>
              <span className="font-mono font-semibold text-emerald-400 tabular-nums">
                {completedCount} / {tasks.length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Discipline Score</span>
              <span className="font-mono font-semibold text-amber-400 tabular-nums">
                {xpPoints} XP
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Lockdown Violations</span>
              <span className="font-mono font-semibold text-rose-400 tabular-nums">
                {violations.length}
              </span>
            </div>
          </div>
        </div>

        {/* Instant Push Triggers */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-400" />
            <h3 className="font-display text-sm font-semibold text-white">
              Need an Immediate Push?
            </h3>
          </div>
          <div className="space-y-2">
            {QUICK_PUSH_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                disabled={isSending}
                onClick={() => onSendMessage(prompt)}
                className="w-full text-left rounded-lg border border-slate-800 bg-slate-950/80 p-3 text-xs text-slate-300 hover:border-amber-500/40 hover:text-white transition-colors"
              >
                "{prompt}"
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right 8 Cols: Live Accountability Dialogue */}
      <div className="lg:col-span-8 flex flex-col rounded-xl border border-slate-800 bg-slate-900/70 h-[640px] overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/60 px-6 py-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-amber-400" />
            <span className="font-display text-sm font-semibold text-white">
              Direct Accountability Channel with Kai
            </span>
          </div>
          <span className="text-xs text-slate-400">
            Monitoring: {activeBlock ? activeBlock.title : 'Daily Schedule'}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col max-w-2xl ${
                msg.sender === 'student' ? 'ml-auto items-end' : 'mr-auto items-start'
              }`}
            >
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                <span className="font-semibold text-slate-300">
                  {msg.sender === 'kai' ? 'Kai (Accountability Partner)' : 'You (11th Std Aspirant)'}
                </span>
                <span>·</span>
                <span className="font-mono tabular-nums">{msg.timestamp}</span>
              </div>
              <div
                className={`rounded-xl px-4 py-3 text-xs leading-relaxed ${
                  msg.sender === 'student'
                    ? 'bg-amber-500 text-slate-950 font-medium'
                    : 'border border-slate-800 bg-slate-950 text-slate-100'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        <form
          onSubmit={handleSubmit}
          className="border-t border-slate-800 bg-slate-950 p-4 flex items-center gap-3"
        >
          <input
            type="text"
            aria-label="Message your accountability partner Kai"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tell Kai what you're struggling with, or ask for a tough reality check..."
            className="flex-1 rounded-lg border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isSending || !input.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2.5 text-xs font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
          >
            <Send className="h-3.5 w-3.5" />
            {isSending ? 'Replying...' : 'Send to Kai'}
          </button>
        </form>
      </div>
    </div>
  );
};
