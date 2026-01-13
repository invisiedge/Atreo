import { useState } from 'react';
import { FiLock, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';

export default function Settings() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (currentPassword === newPassword) {
      setError('New password must be different from current password');
      return;
    }

    try {
      setLoading(true);
      await apiClient.resetPassword({
        currentPassword,
        newPassword
      });
      
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(false), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please check your current password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">Manage your account settings</p>
      </div>

      {/* Reset Password Section */}
      <div className="bg-card rounded-lg border border-border shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FiLock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Reset Password</h3>
              <p className="text-sm text-gray-500">Change your account password</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <form onSubmit={handleResetPassword} className="space-y-6 max-w-2xl">
            {/* Current Password */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Current Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-background focus:bg-white dark:bg-gray-900"
                placeholder="Enter your current password"
                required
              />
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                New Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-background focus:bg-white dark:bg-gray-900"
                placeholder="Enter your new password (min. 6 characters)"
                required
                minLength={6}
              />
              <p className="mt-1.5 text-xs text-gray-500">Password must be at least 6 characters long</p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Confirm New Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-background focus:bg-white dark:bg-gray-900"
                placeholder="Confirm your new password"
                required
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
                <FiAlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                <FiCheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                <p className="text-sm text-green-800">Password reset successfully!</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setError(null);
                  setSuccess(false);
                }}
                className="px-5 py-2.5 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Resetting...
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Account Information */}
      <div className="bg-card rounded-lg border border-border shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-foreground">Account Information</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Name</label>
              <p className="text-sm font-semibold text-foreground">{user?.name || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Email</label>
              <p className="text-sm font-semibold text-foreground">{user?.email || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Role</label>
              <p className="text-sm font-semibold text-foreground capitalize">
                {user?.role === 'accountant' ? 'Accountant' : user?.role === 'admin' ? 'Admin' : 'User' || 'N/A'}
              </p>
            </div>
            {user?.adminRole && (
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Admin Role</label>
                <p className="text-sm font-semibold text-foreground capitalize">{user.adminRole}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
