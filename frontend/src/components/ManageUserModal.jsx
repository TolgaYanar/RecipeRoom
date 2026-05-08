import { useState } from 'react';
import { X, Trash2, Shield, KeyRound, ChefHat, Copy, Check } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import { useToast } from '../context/ToastContext';
import {
  deleteAdminUser, promoteUserToChef, demoteUserFromChef, resetUserPassword,
} from '../api/admin';

// Admin actions on a single user. The available buttons depend on the
// user's current role; e.g. a Home_Cook gets "Promote to chef" while a
// Verified_Chef gets "Demote from chef" instead.
export default function ManageUserModal({ user, onClose, onChanged }) {
  const toast = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resetReceipt, setResetReceipt] = useState(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!user) return null;
  const role = user.user_type;

  const wrap = async (label, fn) => {
    setBusy(true);
    try {
      await fn();
      toast.success(label);
      onChanged?.();
    } catch {
      // already toasted by the interceptor
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setConfirmDelete(false);
    await wrap('User deleted', () => deleteAdminUser(user.user_id));
    onClose();
  };

  const handlePromote = () =>
    wrap('User promoted to chef', () => promoteUserToChef(user.user_id));

  const handleDemote = () =>
    wrap('Chef status revoked', () => demoteUserFromChef(user.user_id));

  const handleResetPassword = async () => {
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setBusy(true);
    try {
      await resetUserPassword(user.user_id, newPassword);
      // Hold onto the plaintext locally so the admin can copy it once.
      // Backend never echoes it back; this is the only window.
      setResetReceipt(newPassword);
      setNewPassword('');
      setResetting(false);
      onChanged?.();
    } catch {
      // already toasted by the interceptor
    } finally {
      setBusy(false);
    }
  };

  const copyReceipt = async () => {
    try {
      await navigator.clipboard.writeText(resetReceipt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Copy failed — select and copy manually');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-[440px] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[16px] font-bold text-[#1A1A1A]">Manage user</h2>
            <p className="text-[12px] text-[#6B6B6B]">{user.username} · {user.email}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-[#F5F5F5]"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-[#6B6B6B]" strokeWidth={1.5} />
          </button>
        </header>

        <div className="space-y-2">
          {role === 'Home_Cook' && (
            <ActionRow
              icon={<ChefHat className="w-4 h-4 text-[#F5C518]" strokeWidth={1.5} />}
              label="Promote to chef"
              hint="Grants Verified_Chef status, marked already verified."
              onClick={handlePromote}
              disabled={busy}
            />
          )}
          {role === 'Verified_Chef' && (
            <ActionRow
              icon={<Shield className="w-4 h-4 text-[#A8893E]" strokeWidth={1.5} />}
              label="Revoke chef status"
              hint="Removes Verified_Chef row. Their published recipes are deleted via cascade."
              onClick={handleDemote}
              disabled={busy}
              danger
            />
          )}

          {resetReceipt && (
            <div className="border border-[#1B3A2D] bg-[#F5F8F6] rounded-xl p-3">
              <div className="text-[12px] font-semibold text-[#1B3A2D] mb-1.5">
                Password set — share this with {user.username} manually:
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-2 py-1.5 bg-white border border-[#D0D0D0] rounded-md text-[13px] font-mono text-[#1A1A1A] truncate">
                  {resetReceipt}
                </code>
                <button
                  type="button"
                  onClick={copyReceipt}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#1B3A2D] text-white rounded-md text-[12px] font-semibold hover:bg-[#142B22]"
                >
                  {copied
                    ? <><Check className="w-3.5 h-3.5" strokeWidth={2} /> Copied</>
                    : <><Copy className="w-3.5 h-3.5" strokeWidth={1.5} /> Copy</>}
                </button>
              </div>
              <div className="text-[11px] text-[#6B6B6B] mt-1.5">
                Visible until you close this dialog. Backend stored only the hash.
              </div>
            </div>
          )}

          {!resetting ? (
            <ActionRow
              icon={<KeyRound className="w-4 h-4 text-[#1B3A2D]" strokeWidth={1.5} />}
              label="Reset password"
              hint="Demo has no email channel — admin tells the user out of band."
              onClick={() => setResetting(true)}
              disabled={busy}
            />
          ) : (
            <div className="border border-[#EBEBEB] rounded-xl p-3 space-y-2">
              <input
                type="password"
                autoFocus
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password (min 8 chars)"
                className="w-full px-3 py-2 text-[14px] border border-[#D0D0D0] rounded-lg focus:outline-none focus:border-[#1B3A2D]"
                onKeyDown={(e) => e.key === 'Enter' && handleResetPassword()}
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetPassword}
                  disabled={busy || newPassword.length < 8}
                  className="px-3 py-1.5 bg-[#1B3A2D] text-white rounded-md text-[13px] font-semibold disabled:opacity-50 hover:bg-[#142B22]"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => { setResetting(false); setNewPassword(''); }}
                  className="px-3 py-1.5 bg-white border border-[#D0D0D0] rounded-md text-[13px] font-semibold text-[#1A1A1A] hover:border-[#1B3A2D]"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <ActionRow
            icon={<Trash2 className="w-4 h-4 text-[#B71C1C]" strokeWidth={1.5} />}
            label="Delete account"
            hint="Cascades through all role + activity tables. Cannot be undone."
            onClick={() => setConfirmDelete(true)}
            disabled={busy}
            danger
          />
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmDelete}
        title={`Delete ${user.username}?`}
        message="Removes the User row and cascades through every role + activity table they touch (orders, recipes, reviews, cook log, balances, etc.). This can't be undone."
        confirmLabel="Delete user"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

function ActionRow({ icon, label, hint, onClick, disabled, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        'w-full flex items-start gap-3 p-3 border rounded-xl text-left transition-colors disabled:opacity-50 ' +
        (danger ? 'border-[#F5C0C0] hover:bg-[#FEEBEE]' : 'border-[#EBEBEB] hover:bg-[#FAF8F5]')
      }
    >
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <div className={`text-[14px] font-semibold ${danger ? 'text-[#B71C1C]' : 'text-[#1A1A1A]'}`}>{label}</div>
        <div className="text-[12px] text-[#6B6B6B]">{hint}</div>
      </div>
    </button>
  );
}
