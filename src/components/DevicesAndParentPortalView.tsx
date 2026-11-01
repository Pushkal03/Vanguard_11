import React, { useState } from 'react';
import {
  Laptop,
  Smartphone,
  Tablet,
  Monitor,
  Shield,
  Lock,
  Unlock,
  Users,
  Activity,
  FileText,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Send,
  Eye,
  GraduationCap,
} from 'lucide-react';
import {
  FocusViolation,
  HomeworkFile,
  LinkedParentAccount,
  MAX_DEVICES_PER_ACCOUNT,
  MAX_PARENTS_PER_ACCOUNT,
  RegisteredDevice,
  StudentActivityMoment,
  StudentProfile,
  StudyTask,
  TimetableBlock,
} from '../utils/accountabilityEngine';

interface DevicesAndParentPortalViewProps {
  profile: StudentProfile;
  activeRole: 'student' | 'parent_1' | 'parent_2';
  onSwitchRole: (role: 'student' | 'parent_1' | 'parent_2') => void;
  onOpenAuthModal: () => void;
  devices: RegisteredDevice[];
  currentDeviceId: string;
  onSwitchActiveDevice: (deviceId: string) => void;
  onAddDevice: (name: string, platform: RegisteredDevice['platform']) => void;
  onRemoveDevice: (deviceId: string) => void;
  parents: LinkedParentAccount[];
  onAddParent: (
    name: string,
    relation: LinkedParentAccount['relation'],
    emailOrHandle: string
  ) => void;
  onRemoveParent: (parentId: string) => void;
  isLockdownActive: boolean;
  onToggleGlobalLockdown: (nextLockdown: boolean) => void;
  cameraVerified: boolean;
  xpPoints: number;
  streakDays: number;
  activeBlock: TimetableBlock | null;
  tasks: StudyTask[];
  homeworkFiles: HomeworkFile[];
  violations: FocusViolation[];
  moments: StudentActivityMoment[];
  parentEncouragement: string;
  onSendParentNote: (parentLabel: string, noteText: string) => void;
  onOpenHomeworkInReader: (homeworkId: string) => void;
}

export const DevicesAndParentPortalView: React.FC<DevicesAndParentPortalViewProps> = ({
  profile,
  activeRole,
  onSwitchRole,
  onOpenAuthModal,
  devices,
  currentDeviceId,
  onSwitchActiveDevice,
  onAddDevice,
  onRemoveDevice,
  parents,
  onAddParent,
  onRemoveParent,
  isLockdownActive,
  onToggleGlobalLockdown,
  cameraVerified,
  xpPoints,
  streakDays,
  activeBlock,
  tasks,
  homeworkFiles,
  violations,
  moments,
  parentEncouragement,
  onSendParentNote,
  onOpenHomeworkInReader,
}) => {
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDevicePlatform, setNewDevicePlatform] =
    useState<RegisteredDevice['platform']>('Tablet');
  const [newParentName, setNewParentName] = useState('');
  const [newParentRelation, setNewParentRelation] =
    useState<LinkedParentAccount['relation']>('Parent 2 (Co-Parent / Guardian)');
  const [newParentEmail, setNewParentEmail] = useState('');
  const [parentNoteDraft, setParentNoteDraft] = useState('');

  const completedTasksCount = tasks.filter((t) => t.completed).length;

  const handleAddDeviceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeviceName.trim()) return;
    onAddDevice(newDeviceName.trim(), newDevicePlatform);
    setNewDeviceName('');
  };

  const handleAddParentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newParentName.trim() || !newParentEmail.trim()) return;
    onAddParent(newParentName.trim(), newParentRelation, newParentEmail.trim());
    setNewParentName('');
    setNewParentEmail('');
  };

  const handleSendNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentNoteDraft.trim()) return;
    const senderLabel =
      activeRole === 'parent_2'
        ? parents[1]?.name || 'Parent #2'
        : parents[0]?.name || 'Parent #1';
    onSendParentNote(senderLabel, parentNoteDraft.trim());
    setParentNoteDraft('');
  };

  const getDeviceIcon = (platform: RegisteredDevice['platform']) => {
    switch (platform) {
      case 'Mobile':
        return <Smartphone className="h-4 w-4 text-sky-400" />;
      case 'Tablet':
        return <Tablet className="h-4 w-4 text-amber-400" />;
      case 'Desktop':
      case 'Workstation':
        return <Monitor className="h-4 w-4 text-emerald-400" />;
      default:
        return <Laptop className="h-4 w-4 text-amber-400" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Identity, Exam Customization & Role Switcher Banner */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-amber-400 font-medium">
            <GraduationCap className="h-4 w-4" />
            <span>{profile.studentName}</span>
            <span>·</span>
            <span>{profile.classStandard}</span>
            <span>·</span>
            <span>Target: {profile.targetExam}</span>
            <span>·</span>
            <span className="font-mono text-emerald-400">
              Sync Code: {profile.pairingCode}
            </span>
          </div>
          <h1 className="font-display text-2xl font-bold text-white">
            5-Device Lockdown Sync & 2-Parent Live Telemetry Hub
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Lockdown Mode and uploaded PDF files automatically mirror across all {devices.length}/{MAX_DEVICES_PER_ACCOUNT} registered devices. Every study update and moment streams live to {parents.length}/{MAX_PARENTS_PER_ACCOUNT} registered Parent Accounts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onSwitchRole('student')}
            className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              activeRole === 'student'
                ? 'bg-amber-500 text-slate-950'
                : 'border border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800'
            }`}
          >
            Student View ({devices.length}/5 Devices)
          </button>
          <button
            type="button"
            onClick={() => onSwitchRole('parent_1')}
            className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              activeRole === 'parent_1'
                ? 'bg-emerald-500 text-slate-950'
                : 'border border-slate-800 bg-slate-950 text-emerald-300 hover:bg-slate-800'
            }`}
          >
            {parents[0]?.name || 'Parent #1'} Live View
          </button>
          <button
            type="button"
            onClick={() => onSwitchRole('parent_2')}
            className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              activeRole === 'parent_2'
                ? 'bg-sky-500 text-slate-950'
                : 'border border-slate-800 bg-slate-950 text-sky-300 hover:bg-slate-800'
            }`}
          >
            {parents[1]?.name || 'Parent #2'} Live View
          </button>
          <button
            type="button"
            onClick={onOpenAuthModal}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            Edit Class / Target Exam
          </button>
        </div>
      </div>

      {/* Main 12-Col Grid: Left = 5-Device Lockdown & File Sync, Right = 2-Parent Live Telemetry & Moment Stream */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
        {/* Left 5 Cols: 5-Device Account Manager & Cross-Device Lockdown Mirror */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-bold text-white">
                  01. Connected Student Devices ({devices.length} / {MAX_DEVICES_PER_ACCOUNT} Max)
                </h2>
                <p className="text-xs text-slate-400">
                  When Lockdown or a PDF upload triggers on one device, all {devices.length} devices lock & sync simultaneously.
                </p>
              </div>
              <span className="font-mono text-xs font-semibold text-amber-400 tabular-nums">
                {devices.length}/{MAX_DEVICES_PER_ACCOUNT} Slots
              </span>
            </div>

            {/* Global Cross-Device Lockdown Trigger */}
            <div
              className={`rounded-xl border p-4 flex items-center justify-between gap-3 ${
                isLockdownActive
                  ? 'border-emerald-500/50 bg-emerald-950/30'
                  : 'border-slate-800 bg-slate-950'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  {isLockdownActive ? (
                    <Lock className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Unlock className="h-3.5 w-3.5 text-amber-400" />
                  )}
                  <span className={isLockdownActive ? 'text-emerald-300' : 'text-slate-200'}>
                    {isLockdownActive
                      ? `All ${devices.length} Devices Locked in Focus Lockdown`
                      : 'Cross-Device Lockdown Standby'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {homeworkFiles.length} PDF/Study files mirrored across all {devices.length} devices.
                </p>
              </div>

              <button
                type="button"
                onClick={() => onToggleGlobalLockdown(!isLockdownActive)}
                className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  isLockdownActive
                    ? 'border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
                    : 'bg-emerald-600 text-white hover:bg-emerald-500'
                }`}
              >
                {isLockdownActive ? 'Unlock All Devices' : 'Lock All 5 Devices Now'}
              </button>
            </div>

            {/* Device List (1 to 5) */}
            <div className="space-y-2.5">
              {devices.map((dev, index) => {
                const isCurrent = dev.id === currentDeviceId;
                return (
                  <div
                    key={dev.id}
                    className={`rounded-xl border p-3.5 flex items-center justify-between gap-3 ${
                      isCurrent
                        ? 'border-amber-500/50 bg-slate-950'
                        : 'border-slate-800 bg-slate-950/60'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="mt-0.5 shrink-0">{getDeviceIcon(dev.platform)}</div>
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-display text-xs font-semibold text-white truncate">
                            Slot #{index + 1}: {dev.name}
                          </span>
                          {isCurrent && (
                            <span className="text-[11px] text-amber-400 font-mono">
                              (This Device)
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                          <span>{dev.platform}</span>
                          <span>·</span>
                          <span
                            className={
                              isLockdownActive
                                ? 'text-emerald-400 font-semibold'
                                : 'text-slate-400'
                            }
                          >
                            {isLockdownActive
                              ? 'LOCKDOWN ENFORCED'
                              : 'Synced & Ready'}
                          </span>
                          <span>·</span>
                          <span className="font-mono tabular-nums">
                            {homeworkFiles.length} PDFs Synced
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {!isCurrent && (
                        <button
                          type="button"
                          onClick={() => onSwitchActiveDevice(dev.id)}
                          className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-slate-800"
                        >
                          Use Device
                        </button>
                      )}
                      {devices.length > 1 && (
                        <button
                          type="button"
                          aria-label={`Remove ${dev.name}`}
                          onClick={() => onRemoveDevice(dev.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Register New Device Form (Enforces 5-Device Cap) */}
            <form
              onSubmit={handleAddDeviceSubmit}
              className="space-y-3 border-t border-slate-800 pt-4"
            >
              <p className="text-xs font-semibold text-slate-300">
                Register Additional Student Device (Max {MAX_DEVICES_PER_ACCOUNT} Devices)
              </p>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                <input
                  type="text"
                  aria-label="New Device Name"
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  placeholder="e.g., iPad Pro Study Tablet"
                  className="sm:col-span-2 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
                />
                <select
                  aria-label="New Device Platform"
                  value={newDevicePlatform}
                  onChange={(e) =>
                    setNewDevicePlatform(e.target.value as RegisteredDevice['platform'])
                  }
                  className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-2 text-xs text-slate-100"
                >
                  <option value="Laptop">Laptop</option>
                  <option value="Desktop">Desktop</option>
                  <option value="Tablet">Tablet</option>
                  <option value="Mobile">Mobile</option>
                  <option value="Workstation">Workstation</option>
                </select>
              </div>
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-950 hover:bg-white transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Device to Account ({devices.length}/{MAX_DEVICES_PER_ACCOUNT} Used)
              </button>
            </form>
          </div>

          {/* 2 Parent Accounts Registration Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-bold text-white">
                  02. Registered Parent Accounts ({parents.length} / {MAX_PARENTS_PER_ACCOUNT} Max)
                </h2>
                <p className="text-xs text-slate-400">
                  Up to 2 parent accounts receive every live moment, camera check, and task update.
                </p>
              </div>
              <span className="font-mono text-xs font-semibold text-emerald-400 tabular-nums">
                {parents.length}/{MAX_PARENTS_PER_ACCOUNT} Parents
              </span>
            </div>

            <div className="space-y-2.5">
              {parents.map((parent, idx) => (
                <div
                  key={parent.id}
                  className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 flex items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      <span className="font-display text-xs font-semibold text-white truncate">
                        Parent #{idx + 1}: {parent.name}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                      <span>{parent.relation}</span>
                      <span>·</span>
                      <span className="font-mono text-slate-300 truncate">
                        {parent.emailOrHandle}
                      </span>
                      <span>·</span>
                      <span className="text-emerald-400">Live Stream Active</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        onSwitchRole(idx === 0 ? 'parent_1' : 'parent_2')
                      }
                      className="rounded-lg border border-emerald-500/40 bg-emerald-950/30 px-2.5 py-1 text-[11px] font-medium text-emerald-300 hover:bg-emerald-900/40"
                    >
                      View Portal
                    </button>
                    {parents.length > 1 && (
                      <button
                        type="button"
                        aria-label={`Remove ${parent.name}`}
                        onClick={() => onRemoveParent(parent.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <form
              onSubmit={handleAddParentSubmit}
              className="space-y-3 border-t border-slate-800 pt-4"
            >
              <p className="text-xs font-semibold text-slate-300">
                Register Parent Account (Max {MAX_PARENTS_PER_ACCOUNT} Parents)
              </p>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <input
                  type="text"
                  aria-label="New Parent Name"
                  value={newParentName}
                  onChange={(e) => setNewParentName(e.target.value)}
                  placeholder="Parent Full Name"
                  className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100"
                />
                <input
                  type="email"
                  aria-label="New Parent Email"
                  value={newParentEmail}
                  onChange={(e) => setNewParentEmail(e.target.value)}
                  placeholder="parent@email.com"
                  className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100"
                />
              </div>
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Register Parent Account ({parents.length}/{MAX_PARENTS_PER_ACCOUNT} Linked)
              </button>
            </form>
          </div>
        </div>

        {/* Right 7 Cols: Live Parent Account Telemetry Dashboard (Shows Every Student Update & Moment) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6 space-y-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
                  <Activity className="h-3.5 w-3.5" />
                  <span>
                    LIVE PARENT TELEMETRY STREAM · VIEWING AS{' '}
                    {activeRole === 'parent_2'
                      ? (parents[1]?.name || 'PARENT #2').toUpperCase()
                      : (parents[0]?.name || 'PARENT #1').toUpperCase()}
                  </span>
                </div>
                <h2 className="font-display text-lg font-bold text-white mt-0.5">
                  {profile.studentName}’s Real-Time Study & Lockdown Monitor
                </h2>
              </div>

              <div className="text-xs font-mono text-slate-400">
                All {devices.length} Devices & Camera Monitored Live
              </div>
            </div>

            {/* Live Student Status Grid for Parents */}
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 space-y-1">
                <span className="text-[11px] text-slate-400">Device Lockdown</span>
                <div
                  className={`font-display text-sm font-bold ${
                    isLockdownActive ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {isLockdownActive
                    ? `LOCKED (${devices.length} Devs)`
                    : 'Unlocked / Planning'}
                </div>
                <p className="text-[11px] text-slate-500">
                  Mirrored across all devices
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 space-y-1">
                <span className="text-[11px] text-slate-400">5s Camera Monitor</span>
                <div
                  className={`font-display text-sm font-bold flex items-center gap-1.5 ${
                    cameraVerified ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  <Camera className="h-3.5 w-3.5" />
                  <span>{cameraVerified ? 'Present at Desk' : 'Desk Absence!'}</span>
                </div>
                <p className="text-[11px] text-slate-500">Auto-checked every 5s</p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 space-y-1">
                <span className="text-[11px] text-slate-400">Tasks & Discipline XP</span>
                <div className="font-mono text-sm font-bold text-white tabular-nums">
                  {completedTasksCount}/{tasks.length} Done · {xpPoints} XP
                </div>
                <p className="text-[11px] text-slate-500">{streakDays}-Day Study Streak</p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 space-y-1">
                <span className="text-[11px] text-slate-400">Focus Violations</span>
                <div
                  className={`font-mono text-sm font-bold tabular-nums ${
                    violations.length === 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {violations.length} Violations
                </div>
                <p className="text-[11px] text-slate-500">
                  Tab / App / Camera alerts
                </p>
              </div>
            </div>

            {/* Active Timetable Slot & Parent Nudge Sender */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <span className="text-[11px] text-slate-400">
                    Current Timetable Block on Student’s Screen
                  </span>
                  <p className="font-display text-sm font-semibold text-white">
                    {activeBlock
                      ? `${activeBlock.startTime} – ${activeBlock.endTime} · ${activeBlock.title} (${activeBlock.category.toUpperCase()})`
                      : 'All Scheduled Blocks Completed'}
                  </p>
                </div>
                <span className="text-xs text-amber-400 font-mono">
                  VS Code: {activeBlock?.category === 'coding' ? 'Unlocked' : 'Locked'}
                </span>
              </div>

              {parentEncouragement && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 px-3 py-2 text-xs text-emerald-200">
                  Latest Parent Note on Student Screen: “{parentEncouragement}”
                </div>
              )}

              <form onSubmit={handleSendNoteSubmit} className="flex gap-2 pt-1">
                <input
                  type="text"
                  aria-label="Send Live Parent Nudge to Student"
                  value={parentNoteDraft}
                  onChange={(e) => setParentNoteDraft(e.target.value)}
                  placeholder="Send a live encouragement or accountability check-in to student's screen..."
                  className="flex-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400 whitespace-nowrap shrink-0"
                >
                  <Send className="h-3.5 w-3.5" />
                  Send to Student
                </button>
              </form>
            </div>

            {/* Synced Homework & PDF Files Visible to Parents & All 5 Devices */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xs font-bold uppercase tracking-wider text-slate-300">
                  Synced PDF & Homework Files Across All {devices.length} Devices ({homeworkFiles.length})
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {homeworkFiles.map((file) => (
                  <div
                    key={file.id}
                    className="rounded-lg border border-slate-800 bg-slate-950 p-3 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-100 truncate">
                        {file.name}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {file.subject} · {file.sizeLabel} · Uploaded {file.uploadedAt}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenHomeworkInReader(file.id)}
                      className="flex items-center gap-1 rounded-md bg-amber-500 px-2.5 py-1.5 text-[11px] font-semibold text-slate-950 hover:bg-amber-400 shrink-0"
                    >
                      <Eye className="h-3 w-3" />
                      Open PDF
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Chronological Moment-by-Moment Student Activity Feed */}
            <div className="space-y-3 border-t border-slate-800 pt-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-sm font-bold text-white">
                  Every Update & Moment of {profile.studentName} ({moments.length} Live Events)
                </h3>
                <span className="text-xs text-emerald-400">Real-Time Feed</span>
              </div>

              <div className="max-h-[340px] overflow-y-auto space-y-2 pr-1">
                {moments.map((moment) => (
                  <div
                    key={moment.id}
                    className={`rounded-lg border p-3 text-xs flex items-start justify-between gap-3 ${
                      moment.isAlert || moment.eventType === 'violation'
                        ? 'border-rose-500/40 bg-rose-950/25 text-rose-200'
                        : moment.eventType === 'lockdown'
                        ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-200'
                        : 'border-slate-800 bg-slate-950/90 text-slate-200'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                        <span className="font-mono font-semibold text-amber-400 tabular-nums">
                          {moment.timestamp}
                        </span>
                        <span>·</span>
                        <span className="uppercase font-semibold text-slate-300">
                          {moment.eventType.replace('_', ' ')}
                        </span>
                        <span>·</span>
                        <span>{moment.deviceLabel}</span>
                      </div>
                      <p className="text-xs leading-relaxed">{moment.summary}</p>
                    </div>

                    {typeof moment.xpDelta === 'number' && moment.xpDelta !== 0 && (
                      <span
                        className={`font-mono text-xs font-bold shrink-0 tabular-nums ${
                          moment.xpDelta > 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {moment.xpDelta > 0 ? `+${moment.xpDelta} XP` : `${moment.xpDelta} XP`}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
