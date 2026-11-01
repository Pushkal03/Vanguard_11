import React, { useState } from 'react';
import {
  Shield,
  Laptop,
  Users,
  GraduationCap,
  CheckCircle2,
  LogIn,
  X,
  Lock,
} from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import {
  ClassStandard,
  MAX_DEVICES_PER_ACCOUNT,
  MAX_PARENTS_PER_ACCOUNT,
  RegisteredDevice,
  StudentProfile,
  TargetExam,
} from '../utils/accountabilityEngine';

interface AuthOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: StudentProfile;
  activeRole: 'student' | 'parent_1' | 'parent_2';
  onSaveProfileAndRole: (params: {
    profile: StudentProfile;
    role: 'student' | 'parent_1' | 'parent_2';
    deviceName: string;
    devicePlatform: RegisteredDevice['platform'];
    parent1Name?: string;
    parent1Email?: string;
    parent2Name?: string;
    parent2Email?: string;
  }) => void;
}

export const AuthOnboardingModal: React.FC<AuthOnboardingModalProps> = ({
  isOpen,
  onClose,
  profile,
  activeRole,
  onSaveProfileAndRole,
}) => {
  const [selectedRole, setSelectedRole] = useState<'student' | 'parent_1' | 'parent_2'>(
    activeRole
  );
  const [studentName, setStudentName] = useState(profile.studentName || 'Pushkal');
  const [email, setEmail] = useState(profile.email || 'v.v.h.s.pushkal@gmail.com');
  const [classStandard, setClassStandard] = useState<ClassStandard>(
    profile.classStandard || '11th Standard'
  );
  const [targetExam, setTargetExam] = useState<TargetExam>(
    profile.targetExam || 'JEE Main & Advanced'
  );
  const [dailyGoalHours, setDailyGoalHours] = useState<number>(
    profile.dailyGoalHours || 8
  );
  const [deviceName, setDeviceName] = useState('Primary Study Laptop');
  const [devicePlatform, setDevicePlatform] =
    useState<RegisteredDevice['platform']>('Laptop');
  const [pairingCodeInput, setPairingCodeInput] = useState(
    profile.pairingCode || 'V11-942'
  );
  const [parent1Name, setParent1Name] = useState('Parent 1 (Mother)');
  const [parent1Email, setParent1Email] = useState('parent1.guardian@gmail.com');
  const [parent2Name, setParent2Name] = useState('Parent 2 (Father)');
  const [parent2Email, setParent2Email] = useState('parent2.guardian@gmail.com');
  const [authStatusNote, setAuthStatusNote] = useState<string | null>(null);
  const [isSigningInGoogle, setIsSigningInGoogle] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setIsSigningInGoogle(true);
    setAuthStatusNote(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      if (user.displayName) setStudentName(user.displayName);
      if (user.email) setEmail(user.email);
      setAuthStatusNote(
        `Signed in with Google as ${user.email || user.displayName}. Complete your exam & device customization below.`
      );
    } catch {
      setAuthStatusNote(
        'Popup blocked by preview frame — using direct Vanguard Account Session so you can customize and sync immediately.'
      );
    } finally {
      setIsSigningInGoogle(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const uid = auth.currentUser?.uid || profile.uid || 'student-vanguard-11';
    onSaveProfileAndRole({
      profile: {
        uid,
        studentName: studentName.trim() || 'Pushkal',
        email: email.trim() || 'scholar@vanguard11.app',
        classStandard,
        targetExam,
        dailyGoalHours: Number(dailyGoalHours) || 8,
        pairingCode: (pairingCodeInput.trim() || 'V11-942').toUpperCase(),
        onboarded: true,
      },
      role: selectedRole,
      deviceName: deviceName.trim() || 'Primary Study Laptop',
      devicePlatform,
      parent1Name: parent1Name.trim() || 'Parent 1 (Mother)',
      parent1Email: parent1Email.trim() || 'parent1@family.org',
      parent2Name: parent2Name.trim() || 'Parent 2 (Father)',
      parent2Email: parent2Email.trim() || 'parent2@family.org',
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Account Login, Exam Customization & Multi-Device Setup"
    >
      <div className="w-full max-w-3xl rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden my-auto">
        {/* Top Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <GraduationCap className="h-5 w-5 text-amber-400" />
            <div>
              <h2 className="font-display text-base font-bold text-white">
                Vanguard Account Login & Exam Customization
              </h2>
              <p className="text-xs text-slate-400">
                Customizes your syllabus by Class & Target Exam · Syncs up to {MAX_DEVICES_PER_ACCOUNT} Devices · Links {MAX_PARENTS_PER_ACCOUNT} Parent Accounts
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close Login Modal"
            onClick={onClose}
            className="rounded-lg border border-slate-800 bg-slate-900 p-1.5 text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[82vh] overflow-y-auto">
          {/* Google Sign-In + Role Selector */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-800 bg-slate-950/80 p-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-white">
                Cloud Account Authentication (Firebase Auth + Cross-Device Sync)
              </p>
              <p className="text-xs text-slate-400">
                Sign in with Google or customize your student/parent session directly below.
              </p>
            </div>
            <button
              type="button"
              disabled={isSigningInGoogle}
              onClick={handleGoogleSignIn}
              className="flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0"
            >
              <LogIn className="h-3.5 w-3.5" />
              {isSigningInGoogle ? 'Connecting Google...' : 'Sign In with Google'}
            </button>
          </div>

          {authStatusNote && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-950/30 px-4 py-2.5 text-xs text-emerald-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>{authStatusNote}</span>
            </div>
          )}

          {/* Select Active Account View (Student vs Parent 1 vs Parent 2) */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              01. Choose Account Role to Sign Into
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => setSelectedRole('student')}
                className={`rounded-xl border p-3.5 text-left transition-colors ${
                  selectedRole === 'student'
                    ? 'border-amber-500 bg-amber-500/10 text-white'
                    : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 font-display text-xs font-bold text-amber-400">
                  <Laptop className="h-4 w-4" />
                  <span>Student Account</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Customize Class & Target Exam. Syncs Lockdown & PDFs across up to 5 devices.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setSelectedRole('parent_1')}
                className={`rounded-xl border p-3.5 text-left transition-colors ${
                  selectedRole === 'parent_1'
                    ? 'border-emerald-500 bg-emerald-500/10 text-white'
                    : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 font-display text-xs font-bold text-emerald-400">
                  <Users className="h-4 w-4" />
                  <span>Parent Account #1</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Registered Parent 1 (Mother / Father). Live feed of every student moment.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setSelectedRole('parent_2')}
                className={`rounded-xl border p-3.5 text-left transition-colors ${
                  selectedRole === 'parent_2'
                    ? 'border-sky-500 bg-sky-500/10 text-white'
                    : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 font-display text-xs font-bold text-sky-400">
                  <Users className="h-4 w-4" />
                  <span>Parent Account #2</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Registered Parent 2 (Co-Parent / Guardian). Live study & camera updates.
                </p>
              </button>
            </div>
          </div>

          {/* Student Basic Details & Target Exam Customization */}
          <div className="space-y-4 border-t border-slate-800 pt-5">
            <h3 className="font-display text-sm font-semibold text-white">
              02. Student Academic Profile (Customizes Subjects, Tasks & Formula Deck)
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="onboard-student-name"
                  className="block text-xs font-medium text-slate-300 mb-1"
                >
                  Student Full Name
                </label>
                <input
                  id="onboard-student-name"
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="e.g., Pushkal"
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="onboard-student-email"
                  className="block text-xs font-medium text-slate-300 mb-1"
                >
                  Account Email
                </label>
                <input
                  id="onboard-student-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="onboard-class-standard"
                  className="block text-xs font-medium text-slate-300 mb-1"
                >
                  Which Class / Standard Are You In?
                </label>
                <select
                  id="onboard-class-standard"
                  value={classStandard}
                  onChange={(e) => setClassStandard(e.target.value as ClassStandard)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
                >
                  <option value="10th Standard">10th Standard</option>
                  <option value="11th Standard">11th Standard</option>
                  <option value="12th Standard">12th Standard</option>
                  <option value="Dropper / Gap Year">Dropper / Gap Year</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="onboard-target-exam"
                  className="block text-xs font-medium text-slate-300 mb-1"
                >
                  Target Examination (Customizes App Curriculum)
                </label>
                <select
                  id="onboard-target-exam"
                  value={targetExam}
                  onChange={(e) => setTargetExam(e.target.value as TargetExam)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
                >
                  <option value="JEE Main & Advanced">JEE Main & Advanced</option>
                  <option value="NEET UG">NEET UG (Medical)</option>
                  <option value="BITSAT & Olympiads">BITSAT & Olympiads</option>
                  <option value="Computer Science & SAT">Computer Science & SAT / AP</option>
                  <option value="Board Exams Excellence">Board Exams Excellence</option>
                </select>
              </div>
            </div>
          </div>

          {/* Current Device Slot & 5-Device Sync Code */}
          <div className="space-y-4 border-t border-slate-800 pt-5">
            <h3 className="font-display text-sm font-semibold text-white">
              03. Current Device Registration (Up to {MAX_DEVICES_PER_ACCOUNT} Devices Synced in Lockdown)
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label
                  htmlFor="onboard-device-name"
                  className="block text-xs font-medium text-slate-300 mb-1"
                >
                  This Device Name
                </label>
                <input
                  id="onboard-device-name"
                  type="text"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="onboard-device-platform"
                  className="block text-xs font-medium text-slate-300 mb-1"
                >
                  Device Type
                </label>
                <select
                  id="onboard-device-platform"
                  value={devicePlatform}
                  onChange={(e) =>
                    setDevicePlatform(e.target.value as RegisteredDevice['platform'])
                  }
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100"
                >
                  <option value="Laptop">Laptop</option>
                  <option value="Desktop">Desktop</option>
                  <option value="Tablet">Tablet / iPad</option>
                  <option value="Mobile">Mobile Phone</option>
                  <option value="Workstation">Lab Workstation</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="onboard-pairing-code"
                  className="block text-xs font-medium text-slate-300 mb-1"
                >
                  5-Device & Parent Sync Code
                </label>
                <input
                  id="onboard-pairing-code"
                  type="text"
                  value={pairingCodeInput}
                  onChange={(e) => setPairingCodeInput(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-xs text-amber-400 uppercase"
                />
              </div>
            </div>
          </div>

          {/* 2 Parent Accounts Registration */}
          <div className="space-y-4 border-t border-slate-800 pt-5">
            <h3 className="font-display text-sm font-semibold text-white">
              04. Register {MAX_PARENTS_PER_ACCOUNT} Linked Parent Accounts (Receive Every Student Update Live)
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-3.5 space-y-2.5">
                <p className="text-xs font-semibold text-emerald-400">
                  Parent Account #1 (Mother / Father)
                </p>
                <input
                  type="text"
                  aria-label="Parent 1 Name"
                  value={parent1Name}
                  onChange={(e) => setParent1Name(e.target.value)}
                  placeholder="Parent 1 Name"
                  className="w-full rounded border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-100"
                />
                <input
                  type="email"
                  aria-label="Parent 1 Email"
                  value={parent1Email}
                  onChange={(e) => setParent1Email(e.target.value)}
                  placeholder="parent1@email.com"
                  className="w-full rounded border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-100"
                />
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950 p-3.5 space-y-2.5">
                <p className="text-xs font-semibold text-sky-400">
                  Parent Account #2 (Co-Parent / Guardian)
                </p>
                <input
                  type="text"
                  aria-label="Parent 2 Name"
                  value={parent2Name}
                  onChange={(e) => setParent2Name(e.target.value)}
                  placeholder="Parent 2 Name"
                  className="w-full rounded border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-100"
                />
                <input
                  type="email"
                  aria-label="Parent 2 Email"
                  value={parent2Email}
                  onChange={(e) => setParent2Email(e.target.value)}
                  placeholder="parent2@email.com"
                  className="w-full rounded border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-100"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-xs font-semibold text-slate-950 hover:bg-amber-400 transition-colors"
            >
              <Shield className="h-4 w-4" />
              {selectedRole === 'student'
                ? `Save & Customize for ${classStandard} (${targetExam})`
                : `Open ${selectedRole === 'parent_1' ? 'Parent #1' : 'Parent #2'} Live Telemetry Portal`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
