import React, { useState } from 'react';
import {
  Laptop,
  Smartphone,
  Tablet,
  Monitor,
  Lock,
  Unlock,
  Plus,
  Trash2,
  FileText,
  Radio,
  Shield,
  Users,
  RefreshCw,
} from 'lucide-react';
import {
  HomeworkFile,
  LinkedParentAccount,
  MAX_DEVICES_PER_ACCOUNT,
  MAX_PARENTS_PER_ACCOUNT,
  RegisteredDevice,
  StudentProfile,
} from '../utils/accountabilityEngine';
import { DeviceViewMode } from './AuthGatewayScreen';

interface StudentDevicesViewProps {
  profile: StudentProfile;
  devices: RegisteredDevice[];
  currentDeviceId: string;
  onSwitchActiveDevice: (deviceId: string) => void;
  onAddDevice: (name: string, platform: RegisteredDevice['platform']) => void;
  onRemoveDevice: (deviceId: string) => void;
  parents: LinkedParentAccount[];
  isLockdownActive: boolean;
  onToggleGlobalLockdown: (active: boolean) => void;
  homeworkFiles: HomeworkFile[];
  parentEncouragement: string;
  onOpenHomeworkInReader: (homeworkId: string) => void;
  deviceViewMode: DeviceViewMode;
  onChangeDeviceViewMode: (mode: DeviceViewMode) => void;
  syncVersion: number;
  lastSyncedAt: string;
  onForceSyncNow: () => void;
}

export const StudentDevicesView: React.FC<StudentDevicesViewProps> = ({
  profile,
  devices,
  currentDeviceId,
  onSwitchActiveDevice,
  onAddDevice,
  onRemoveDevice,
  parents,
  isLockdownActive,
  onToggleGlobalLockdown,
  homeworkFiles,
  parentEncouragement,
  onOpenHomeworkInReader,
  deviceViewMode,
  onChangeDeviceViewMode,
  syncVersion,
  lastSyncedAt,
  onForceSyncNow,
}) => {
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDevicePlatform, setNewDevicePlatform] =
    useState<RegisteredDevice['platform']>('Tablet');

  const handleRegisterDevice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeviceName.trim()) return;
    onAddDevice(newDeviceName.trim(), newDevicePlatform);
    setNewDeviceName('');
  };

  const renderPlatformIcon = (platform: RegisteredDevice['platform']) => {
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
    <div className="space-y-6">
      {/* Top Banner: 5-Device Real-Time Sync Bus + Mobile vs Laptop/Tab Mode Switcher */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-amber-400">
            <Radio className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
            <span>5-Device Real-Time Sync Mesh (Sync v{syncVersion})</span>
            <span>·</span>
            <span>Last Synced: {lastSyncedAt}</span>
            <span>·</span>
            <span className="font-mono text-emerald-400">
              Pairing Code: {profile.pairingCode}
            </span>
          </div>
          <h2 className="font-display text-lg sm:text-xl font-bold text-white">
            My {devices.length} / {MAX_DEVICES_PER_ACCOUNT} Synchronized Study Devices
          </h2>
          <p className="text-xs text-slate-400 max-w-3xl">
            All tasks, timetable slots, Lockdown Mode, and uploaded PDF homework files sync in real
            time across all {devices.length} devices. Switch between dedicated{' '}
            <strong className="text-sky-300">Mobile Mode</strong> and{' '}
            <strong className="text-amber-300">Laptop / Tab Mode</strong> anytime below.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Dedicated Layout Mode Switcher */}
          <div className="flex items-center rounded-lg border border-slate-800 bg-slate-950 p-1 text-xs">
            <button
              type="button"
              onClick={() => onChangeDeviceViewMode('laptop_tab')}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-semibold transition-colors ${
                deviceViewMode === 'laptop_tab'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Laptop className="h-3.5 w-3.5" />
              <span>Laptop / Tab Mode</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeDeviceViewMode('mobile')}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-semibold transition-colors ${
                deviceViewMode === 'mobile'
                  ? 'bg-sky-500 text-slate-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>Mobile Mode</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onForceSyncNow}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/30 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-900/40 transition-colors whitespace-nowrap shrink-0"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Sync All {devices.length} Devices Now
          </button>

          <button
            type="button"
            onClick={() => onToggleGlobalLockdown(!isLockdownActive)}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              isLockdownActive
                ? 'border border-rose-500/40 bg-rose-950/40 text-rose-200 hover:bg-rose-900/50'
                : 'bg-emerald-600 text-white hover:bg-emerald-500'
            }`}
          >
            {isLockdownActive ? (
              <>
                <Unlock className="h-3.5 w-3.5" />
                Unlock All {devices.length} Devices
              </>
            ) : (
              <>
                <Lock className="h-3.5 w-3.5" />
                Lock All {devices.length} Devices
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Grid (Single Column in Mobile Mode, 12-Col Split in Laptop/Tab Mode) */}
      <div
        className={
          deviceViewMode === 'mobile'
            ? 'flex flex-col gap-6'
            : 'grid grid-cols-1 gap-8 lg:grid-cols-12 items-start'
        }
      >
        {/* Left 7 Cols: 5-Device Registry & Add Device Form */}
        <div className={deviceViewMode === 'mobile' ? 'space-y-6' : 'lg:col-span-7 space-y-6'}>
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-bold text-white">
                  Registered Student Devices ({devices.length} / {MAX_DEVICES_PER_ACCOUNT} Slots)
                </h3>
                <p className="text-xs text-slate-400">
                  Selecting a Mobile device automatically activates Mobile Mode; selecting a Laptop or
                  Tablet activates Laptop / Tab Mode.
                </p>
              </div>
              <span className="font-mono text-xs text-amber-400 tabular-nums shrink-0">
                {MAX_DEVICES_PER_ACCOUNT - devices.length} slots open
              </span>
            </div>

            {/* Device Slots List */}
            <div className="space-y-3">
              {devices.map((dev, index) => {
                const isCurrent = dev.id === currentDeviceId;
                const isMobileDev = dev.platform === 'Mobile';
                return (
                  <div
                    key={dev.id}
                    className={`rounded-xl border p-4 transition-colors ${
                      isCurrent
                        ? 'border-amber-500/50 bg-slate-950'
                        : 'border-slate-800 bg-slate-950/60'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-lg border border-slate-800 bg-slate-900 p-2">
                          {renderPlatformIcon(dev.platform)}
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-display text-sm font-semibold text-white">
                              Slot #{index + 1}: {dev.name}
                            </span>
                            <span className="text-xs text-slate-500">·</span>
                            <span className="text-xs font-medium text-sky-300">
                              {isMobileDev ? 'Mobile Mode UI' : `${dev.platform} (Laptop/Tab Mode UI)`}
                            </span>
                            {isCurrent && (
                              <>
                                <span className="text-xs text-slate-500">·</span>
                                <span className="text-xs font-semibold text-amber-400">
                                  Active on This Screen
                                </span>
                              </>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span
                              className={
                                isLockdownActive
                                  ? 'text-rose-400 font-semibold'
                                  : 'text-emerald-400'
                              }
                            >
                              {isLockdownActive
                                ? 'LOCKED DOWN (Mirrored)'
                                : `Synced (v${syncVersion})`}
                            </span>
                            <span className="text-slate-600">·</span>
                            <span className="text-slate-400">
                              {homeworkFiles.length} PDFs & Tasks Mirrored
                            </span>
                            <span className="text-slate-600">·</span>
                            <span className="font-mono text-slate-500">{dev.lastActiveAt}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {!isCurrent && (
                          <button
                            type="button"
                            onClick={() => onSwitchActiveDevice(dev.id)}
                            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
                          >
                            Switch to {isMobileDev ? 'Mobile' : dev.platform} View
                          </button>
                        )}
                        {devices.length > 1 && (
                          <button
                            type="button"
                            aria-label={`Remove ${dev.name}`}
                            onClick={() => onRemoveDevice(dev.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Register Another Student Device Form (Up to 5) */}
            <form
              onSubmit={handleRegisterDevice}
              className="border-t border-slate-800 pt-4 space-y-3"
            >
              <div className="text-xs font-medium text-slate-300">
                Add Another Student Device to Your Account (Max {MAX_DEVICES_PER_ACCOUNT})
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <input
                  type="text"
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  disabled={devices.length >= MAX_DEVICES_PER_ACCOUNT}
                  placeholder={
                    devices.length >= MAX_DEVICES_PER_ACCOUNT
                      ? 'Max 5 devices reached'
                      : 'e.g., Library Reading Laptop'
                  }
                  className="sm:col-span-2 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 disabled:opacity-50"
                />
                <select
                  value={newDevicePlatform}
                  onChange={(e) =>
                    setNewDevicePlatform(e.target.value as RegisteredDevice['platform'])
                  }
                  disabled={devices.length >= MAX_DEVICES_PER_ACCOUNT}
                  className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-2 text-xs text-slate-100 disabled:opacity-50"
                >
                  <option value="Laptop">Laptop</option>
                  <option value="Tablet">Tablet</option>
                  <option value="Mobile">Mobile</option>
                  <option value="Desktop">Desktop</option>
                  <option value="Workstation">Workstation</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={devices.length >= MAX_DEVICES_PER_ACCOUNT || !newDeviceName.trim()}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-white disabled:opacity-40 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                {devices.length >= MAX_DEVICES_PER_ACCOUNT
                  ? `All ${MAX_DEVICES_PER_ACCOUNT} Student Device Slots Filled`
                  : `Register Device Slot #${devices.length + 1} of ${MAX_DEVICES_PER_ACCOUNT}`}
              </button>
            </form>
          </div>
        </div>

        {/* Right 5 Cols: Synced PDFs Across Devices + Parent Pairing Code Info (No Parent Screen Access!) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Synced PDFs Across All 5 Devices */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6 space-y-4">
            <h3 className="font-display text-base font-bold text-white">
              Homework & PDFs Mirrored Across All {devices.length} Devices
            </h3>
            <p className="text-xs text-slate-400">
              Any PDF uploaded during your break or study block is immediately available in the PDF
              Opener Studio on all {devices.length} devices.
            </p>
            <div className="space-y-2.5">
              {homeworkFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950 p-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-100 truncate">{file.name}</p>
                    <p className="text-xs text-slate-400">
                      {file.subject} · {file.pages?.length || 1} pages · Synced to {devices.length}{' '}
                      devices
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenHomeworkInReader(file.id)}
                    className="flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-950/30 px-2.5 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-900/40 shrink-0"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Open PDF
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Read-Only Parent Pairing Status (Student Cannot Access Parent Screen) */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-sky-400" />
                <h3 className="font-display text-base font-bold text-white">
                  Parent Account Pairing Status ({parents.length} / {MAX_PARENTS_PER_ACCOUNT})
                </h3>
              </div>
              <span className="font-mono text-xs text-sky-400">
                Code: {profile.pairingCode}
              </span>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3.5 text-xs text-slate-300 space-y-1.5">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <Shield className="h-3.5 w-3.5" />
                Separate Parent Device Enforcement Active
              </div>
              <p className="text-slate-400 leading-relaxed">
                This is a <strong className="text-white">Student Device</strong>. For strict
                accountability, students cannot view or access the Parent Command Screen from this
                session. Your parents can sign in on their own device at the Sign-In Gateway using
                your Pairing Code{' '}
                <strong className="font-mono text-amber-300">{profile.pairingCode}</strong> or your
                email <strong className="text-white">{profile.email}</strong>.
              </p>
            </div>

            <div className="space-y-2">
              {parents.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No parent devices have connected yet. Share Pairing Code{' '}
                  <span className="font-mono text-slate-300">{profile.pairingCode}</span> with up to
                  2 parents.
                </p>
              ) : (
                parents.map((p, i) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/70 px-3.5 py-2.5 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-white">
                        Slot #{i + 1}: {p.name}
                      </span>
                      <span className="text-slate-500"> · {p.emailOrHandle}</span>
                    </div>
                    <span className="text-emerald-400 font-mono">Live Stream Active</span>
                  </div>
                ))
              )}
            </div>

            {parentEncouragement && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-3 text-xs text-emerald-200">
                Latest Note from Parent Device: “{parentEncouragement}”
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
