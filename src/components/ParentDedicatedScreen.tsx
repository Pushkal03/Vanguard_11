import React, { useState } from 'react';
import {
  Shield,
  Users,
  Lock,
  Unlock,
  Camera,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Send,
  Laptop,
  Smartphone,
  LogOut,
  Radio,
  Clock,
  RefreshCw,
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
import { DeviceViewMode } from './AuthGatewayScreen';

interface ParentDedicatedScreenProps {
  parentAccount: LinkedParentAccount;
  profile: StudentProfile;
  devices: RegisteredDevice[];
  parents: LinkedParentAccount[];
  isLockdownActive: boolean;
  onParentTriggerLockdown: (lockdown: boolean) => void;
  cameraVerified: boolean;
  xpPoints: number;
  streakDays: number;
  activeBlock: TimetableBlock | null;
  tasks: StudyTask[];
  homeworkFiles: HomeworkFile[];
  violations: FocusViolation[];
  moments: StudentActivityMoment[];
  parentEncouragement: string;
  onSendParentNote: (parentName: string, message: string) => void;
  onInspectHomeworkPdf: (homeworkId: string) => void;
  onSignOut: () => void;
  deviceViewMode: DeviceViewMode;
  onChangeDeviceViewMode: (mode: DeviceViewMode) => void;
  syncVersion: number;
  lastSyncedAt: string;
  onForceSyncNow: () => void;
}

type MomentFilter =
  | 'all'
  | 'lockdown'
  | 'camera'
  | 'file_upload'
  | 'task_complete'
  | 'violation';

export const ParentDedicatedScreen: React.FC<ParentDedicatedScreenProps> = ({
  parentAccount,
  profile,
  devices,
  parents,
  isLockdownActive,
  onParentTriggerLockdown,
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
  onInspectHomeworkPdf,
  onSignOut,
  deviceViewMode,
  onChangeDeviceViewMode,
  syncVersion,
  lastSyncedAt,
  onForceSyncNow,
}) => {
  const [momentFilter, setMomentFilter] = useState<MomentFilter>('all');
  const [noteInput, setNoteInput] = useState('');
  const [noteBanner, setNoteBanner] = useState<string | null>(null);
  const [mobileSection, setMobileSection] = useState<'moments' | 'nudge' | 'devices' | 'tasks_pdfs'>('moments');

  const completedTasksCount = tasks.filter((t) => t.completed).length;

  const filteredMoments = moments.filter((m) =>
    momentFilter === 'all' ? true : m.eventType === momentFilter
  );

  const handleSendNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteInput.trim()) return;
    onSendParentNote(parentAccount.name, noteInput.trim());
    setNoteBanner(
      `Delivered live parent message to ${profile.studentName} across all ${devices.length} student devices.`
    );
    setNoteInput('');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* 3-Zone Top Bar Contract for Dedicated Parent Device */}
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 md:flex-nowrap md:gap-8 border-b border-slate-800 bg-slate-950/90 px-4 sm:px-6 py-3.5 sticky top-0 z-30 backdrop-blur-xs">
        {/* Zone 1: Brand Wordmark */}
        <a
          href="#parent-top"
          className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0"
        >
          Vanguard 11 · Parent Portal
        </a>

        {/* Zone 2: Section Navigation Links */}
        <nav
          aria-label="Parent Portal Navigation"
          className="order-3 w-full md:order-2 md:w-auto flex items-center justify-between sm:justify-start gap-4 md:gap-6 text-xs sm:text-sm font-medium text-slate-400 overflow-x-auto border-t border-slate-800/80 pt-2.5 md:border-t-0 md:pt-0"
        >
          <a href="#parent-live-telemetry" className="text-white hover:text-sky-300 whitespace-nowrap">
            Live Telemetry
          </a>
          <a href="#parent-moments-feed" className="hover:text-slate-200 whitespace-nowrap">
            Every Student Moment ({moments.length})
          </a>
          <a href="#parent-devices-status" className="hover:text-slate-200 whitespace-nowrap">
            Student’s {devices.length} Devices
          </a>
          <a href="#parent-synced-pdfs" className="hover:text-slate-200 whitespace-nowrap">
            Synced PDFs ({homeworkFiles.length})
          </a>
        </nav>

        {/* Zone 3: Mode Switcher + Remote Lockdown Trigger + Sign Out */}
        <div className="order-2 md:order-3 flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center rounded-lg border border-slate-800 bg-slate-900 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => onChangeDeviceViewMode('laptop_tab')}
              className={`flex items-center gap-1 rounded-md px-2 py-1 font-semibold transition-colors ${
                deviceViewMode === 'laptop_tab'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Laptop className="h-3 w-3" />
              <span className="hidden sm:inline">Laptop / Tab</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeDeviceViewMode('mobile')}
              className={`flex items-center gap-1 rounded-md px-2 py-1 font-semibold transition-colors ${
                deviceViewMode === 'mobile'
                  ? 'bg-sky-500 text-slate-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="h-3 w-3" />
              <span className="hidden sm:inline">Mobile</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onForceSyncNow}
            className="flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-950/30 px-2.5 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-900/40 transition-colors"
            title="Sync student state now"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Sync v{syncVersion}</span>
          </button>

          <button
            type="button"
            onClick={() => onParentTriggerLockdown(!isLockdownActive)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              isLockdownActive
                ? 'border border-emerald-500/40 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/40'
                : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
            }`}
          >
            {isLockdownActive ? (
              <>
                <Lock className="h-3.5 w-3.5" />
                <span>All {devices.length} Devices Locked</span>
              </>
            ) : (
              <>
                <Unlock className="h-3.5 w-3.5" />
                <span>Enforce Lockdown</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onSignOut}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            <LogOut className="h-3.5 w-3.5 text-slate-400" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content (Constrained Mobile Shell in Mobile Mode, 1360px 12-Col in Laptop/Tab Mode) */}
      <main
        id="parent-top"
        className={`mx-auto w-full flex-1 px-4 sm:px-6 py-6 sm:py-8 space-y-6 ${
          deviceViewMode === 'mobile'
            ? 'max-w-[480px] pb-24 border-x border-slate-800/60 bg-slate-950'
            : 'max-w-[1360px]'
        }`}
      >
        {/* Parent Identity & Student Pairing Banner */}
        <section
          id="parent-live-telemetry"
          className="rounded-xl border border-sky-500/30 bg-slate-900/80 p-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
        >
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-sky-400">
              <Radio className="h-3.5 w-3.5 text-emerald-400" />
              <span>Dedicated Parent Telemetry Device</span>
              <span>·</span>
              <span>Signed in as: {parentAccount.name}</span>
              <span>·</span>
              <span>{parentAccount.relation}</span>
              <span>·</span>
              <span className="font-mono text-amber-300">
                Student Code: {profile.pairingCode}
              </span>
            </div>
            <h1 className="font-display text-2xl font-bold text-white">
              Monitoring {profile.studentName} · {profile.classStandard} ({profile.targetExam})
            </h1>
            <p className="text-xs text-slate-300 max-w-3xl">
              Every study update, 5-second webcam check, Lockdown state change, task completion,
              and PDF homework upload from {profile.studentName}’s {devices.length} connected
              devices streams to this Parent Screen in real time.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs space-y-1 shrink-0">
            <div className="text-slate-400">Registered Parent Accounts</div>
            <div className="font-mono text-sm font-bold text-white">
              {parents.length} / {MAX_PARENTS_PER_ACCOUNT} Parent Slots Active
            </div>
            <div className="text-emerald-400">
              Real-Time Stream Connected · {streakDays}-Day Study Streak
            </div>
          </div>
        </section>

        {/* 4-Card Live Student Telemetry KPI Strip */}
        <section
          aria-label="Student Real-Time Telemetry KPIs"
          className="grid grid-cols-2 gap-4 rounded-xl border border-slate-800 bg-slate-900/50 p-5 lg:grid-cols-4"
        >
          <div className="space-y-1">
            <span className="text-xs text-slate-400">5-Second Camera Presence</span>
            <div
              className={`font-display text-lg font-bold flex items-center gap-2 ${
                cameraVerified ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              <Camera className="h-4 w-4" />
              {cameraVerified ? 'Verified at Study Desk' : 'AWAY FROM DESK ALERT'}
            </div>
            <p className="text-xs text-slate-500">
              Auto-checked every 5 seconds · Active slot: {activeBlock?.title || 'Study Session'}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-400">5-Device Lockdown State</span>
            <div
              className={`font-display text-lg font-bold ${
                isLockdownActive ? 'text-amber-400' : 'text-slate-200'
              }`}
            >
              {isLockdownActive
                ? `All ${devices.length} Devices Locked Down`
                : `${devices.length} Devices Synced (Standby)`}
            </div>
            <p className="text-xs text-slate-500">
              {devices.length} / {MAX_DEVICES_PER_ACCOUNT} student devices registered
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-400">Tasks & Discipline XP</span>
            <div className="font-mono text-2xl font-bold text-white tabular-nums">
              {completedTasksCount} / {tasks.length} Tasks · {xpPoints} XP
            </div>
            <p className="text-xs text-slate-500">
              Target Exam: {profile.targetExam}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-400">Violations & Distraction Blocks</span>
            <div
              className={`font-mono text-2xl font-bold tabular-nums ${
                violations.length === 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {violations.length} Violations
            </div>
            <p className="text-xs text-slate-500">
              {moments.length} total study moments recorded today
            </p>
          </div>
        </section>

        {/* Mobile Parent Quick Section Switcher (Visible in Mobile Mode) */}
        {deviceViewMode === 'mobile' && (
          <div className="grid grid-cols-4 gap-1.5 rounded-xl border border-slate-800 bg-slate-900 p-1.5 text-xs">
            <button
              type="button"
              onClick={() => setMobileSection('moments')}
              className={`rounded-lg py-2 font-semibold transition-colors ${
                mobileSection === 'moments'
                  ? 'bg-sky-500 text-slate-950'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              Moments ({moments.length})
            </button>
            <button
              type="button"
              onClick={() => setMobileSection('nudge')}
              className={`rounded-lg py-2 font-semibold transition-colors ${
                mobileSection === 'nudge'
                  ? 'bg-sky-500 text-slate-950'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              Send Nudge
            </button>
            <button
              type="button"
              onClick={() => setMobileSection('devices')}
              className={`rounded-lg py-2 font-semibold transition-colors ${
                mobileSection === 'devices'
                  ? 'bg-sky-500 text-slate-950'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              {devices.length} Devices
            </button>
            <button
              type="button"
              onClick={() => setMobileSection('tasks_pdfs')}
              className={`rounded-lg py-2 font-semibold transition-colors ${
                mobileSection === 'tasks_pdfs'
                  ? 'bg-sky-500 text-slate-950'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              Tasks & PDFs
            </button>
          </div>
        )}

        {/* Main 12-Col Split in Laptop/Tab Mode or Tabbed Single Column in Mobile Mode */}
        <div
          className={
            deviceViewMode === 'mobile'
              ? 'flex flex-col gap-6'
              : 'grid grid-cols-1 gap-8 lg:grid-cols-12 items-start'
          }
        >
          {/* Left 7 Cols: Chronological Moment-by-Moment Student Activity Feed */}
          {(deviceViewMode === 'laptop_tab' || mobileSection === 'moments') && (
          <div id="parent-moments-feed" className="lg:col-span-7 space-y-6">
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-bold text-white">
                    Every Study Update & Moment of {profile.studentName}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Real-time chronological feed across all {devices.length} student devices.
                  </p>
                </div>

                {/* Filter buttons */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {(
                    [
                      ['all', 'All Moments'],
                      ['camera', 'Camera (5s)'],
                      ['lockdown', 'Lockdown'],
                      ['task_complete', 'Tasks'],
                      ['file_upload', 'PDFs'],
                      ['violation', 'Violations'],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setMomentFilter(key)}
                      className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                        momentFilter === key
                          ? 'bg-sky-500 text-slate-950 font-semibold'
                          : 'border border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Moments Stream List */}
              <div className="divide-y divide-slate-800/80 max-h-[620px] overflow-y-auto pr-1">
                {filteredMoments.map((mom) => (
                  <div key={mom.id} className="py-3.5 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-mono font-semibold text-sky-400 tabular-nums">
                          {mom.timestamp}
                        </span>
                        <span className="text-slate-600">·</span>
                        <span
                          className={`font-semibold uppercase ${
                            mom.isAlert || mom.eventType === 'violation'
                              ? 'text-rose-400'
                              : mom.eventType === 'task_complete'
                              ? 'text-emerald-400'
                              : mom.eventType === 'lockdown'
                              ? 'text-amber-400'
                              : 'text-slate-300'
                          }`}
                        >
                          {mom.eventType.replace('_', ' ')}
                        </span>
                        <span className="text-slate-600">·</span>
                        <span className="text-slate-400">{mom.deviceLabel}</span>
                      </div>

                      <p className="text-sm text-slate-100 leading-relaxed">{mom.summary}</p>
                    </div>

                    {typeof mom.xpDelta === 'number' && mom.xpDelta !== 0 && (
                      <span
                        className={`font-mono text-xs font-bold tabular-nums shrink-0 ${
                          mom.xpDelta > 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {mom.xpDelta > 0 ? `+${mom.xpDelta} XP` : `${mom.xpDelta} XP`}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          )}

          {/* Right 5 Cols: Send Parent Nudge + Student's 5 Devices + Synced PDFs + Daily Tasks */}
          <div className="lg:col-span-5 space-y-6">
            {/* Live Parent Encouragement / Check-In Sender */}
            {(deviceViewMode === 'laptop_tab' || mobileSection === 'nudge') && (
            <div className="rounded-xl border border-sky-500/30 bg-slate-900/70 p-6 space-y-4">
              <div>
                <h3 className="font-display text-base font-bold text-white">
                  Send Live Parent Message to {profile.studentName}’s Screen
                </h3>
                <p className="text-xs text-slate-400">
                  Appears immediately on the banner of all {devices.length} connected student
                  devices (Sync v{syncVersion} · {lastSyncedAt}).
                </p>
              </div>

              {noteBanner && (
                <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-200">
                  {noteBanner}
                </div>
              )}

              <form onSubmit={handleSendNote} className="space-y-3">
                <textarea
                  rows={2}
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder={`Write an encouragement or accountability reminder for ${profile.studentName}...`}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-100 focus:border-sky-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-sky-500 px-4 py-2.5 text-xs font-semibold text-slate-950 hover:bg-sky-400 transition-colors"
                >
                  <Send className="h-3.5 w-3.5" />
                  Deliver Message to All {devices.length} Student Devices
                </button>
              </form>

              {parentEncouragement && (
                <p className="text-xs text-slate-400 pt-1">
                  Currently displayed on student screen: “
                  <span className="text-emerald-300">{parentEncouragement}</span>”
                </p>
              )}
            </div>
            )}

            {/* Student's 5 Registered Devices Status */}
            {(deviceViewMode === 'laptop_tab' || mobileSection === 'devices') && (
            <div
              id="parent-devices-status"
              className="rounded-xl border border-slate-800 bg-slate-900/70 p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-bold text-white flex items-center gap-2">
                  <Laptop className="h-4 w-4 text-amber-400" />
                  Student’s {devices.length} / {MAX_DEVICES_PER_ACCOUNT} Connected Devices
                </h3>
                <span className="text-xs text-emerald-400 font-mono">
                  {isLockdownActive ? 'ALL LOCKED' : `SYNCED (v${syncVersion})`}
                </span>
              </div>

              <div className="space-y-2.5">
                {devices.map((dev, idx) => (
                  <div
                    key={dev.id}
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-white">
                        Device #{idx + 1}: {dev.name}
                      </span>
                      <span className="text-slate-500"> · {dev.platform}</span>
                    </div>
                    <span
                      className={`font-mono ${
                        isLockdownActive ? 'text-amber-400 font-semibold' : 'text-emerald-400'
                      }`}
                    >
                      {isLockdownActive ? 'Locked Down' : dev.lastActiveAt}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            )}

            {/* Student's Daily Tasks & Completion Status */}
            {(deviceViewMode === 'laptop_tab' || mobileSection === 'tasks_pdfs') && (
            <>
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-bold text-white flex items-center gap-2">
                  <Clock className="h-4 w-4 text-emerald-400" />
                  Student’s Daily Task Checklist ({completedTasksCount}/{tasks.length})
                </h3>
              </div>
              <div className="space-y-2.5">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs"
                  >
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2
                        className={`h-4 w-4 shrink-0 mt-0.5 ${
                          task.completed ? 'text-emerald-400' : 'text-slate-600'
                        }`}
                      />
                      <div>
                        <p
                          className={`font-medium ${
                            task.completed ? 'line-through text-slate-500' : 'text-slate-100'
                          }`}
                        >
                          {task.title}
                        </p>
                        <p className="text-slate-400 mt-0.5">
                          {task.subject} · {task.durationMinutes} min · +{task.points} XP
                        </p>
                      </div>
                    </div>
                    <span
                      className={`font-mono shrink-0 ${
                        task.completed ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {task.completed ? `Done ${task.completedAt || ''}` : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Synced Homework & Study PDFs (Parent Can Inspect Content) */}
            <div
              id="parent-synced-pdfs"
              className="rounded-xl border border-slate-800 bg-slate-900/70 p-6 space-y-4"
            >
              <h3 className="font-display text-base font-bold text-white flex items-center gap-2">
                <FileText className="h-4 w-4 text-amber-400" />
                Uploaded Homework & Study PDFs ({homeworkFiles.length})
              </h3>
              <div className="space-y-2.5">
                {homeworkFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-100 truncate">{file.name}</p>
                      <p className="text-slate-400">
                        {file.subject} · Uploaded at {file.uploadedAt} ·{' '}
                        {file.pages?.length || 1} pages
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onInspectHomeworkPdf(file.id)}
                      className="rounded-lg border border-sky-500/40 bg-sky-950/30 px-3 py-1.5 font-semibold text-sky-300 hover:bg-sky-900/40 shrink-0"
                    >
                      Inspect PDF
                    </button>
                  </div>
                ))}
              </div>
            </div>
            </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
