import { useState, useEffect } from 'react';
import { FiMail, FiPlus, FiEdit2, FiTrash2, FiX, FiEye, FiEyeOff } from 'react-icons/fi';
import { apiClient } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import ConfirmModal from '../../components/shared/ConfirmModal';
import { logger } from '../../lib/logger';

interface Email {
  id: string;
  email: string;
  password?: string;
  domain: string;
  organizationId?: string;
  organization?: { id: string; name: string; domain: string };
  provider: 'gmail' | 'outlook' | 'custom' | 'other';
  status: 'active' | 'inactive' | 'suspended';
  isPrimary: boolean;
  owner?: string;
  purpose?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function AdminEmails() {
  const { showToast, ToastContainer } = useToast();
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingEmail, setDeletingEmail] = useState<Email | null>(null);
  const [editingEmail, setEditingEmail] = useState<Email | null>(null);
  const [showPassword, setShowPassword] = useState<{ [key: string]: boolean }>({});
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    domain: '',
    organizationId: '',
    provider: 'custom' as 'gmail' | 'outlook' | 'custom' | 'other',
    status: 'active' as 'active' | 'inactive' | 'suspended',
    isPrimary: false,
    owner: '',
    purpose: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadEmails();
    loadOrganizations();
  }, []);

  const loadEmails = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getEmails();
      setEmails(data);
    } catch (error: any) {
      logger.error('Error loading emails:', error);
      showToast('Failed to load emails', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadOrganizations = async () => {
    try {
      const data = await apiClient.getOrganizations();
      setOrganizations(data);
    } catch (error: any) {
      logger.error('Error loading organizations:', error);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.createEmail(formData);
      showToast('Email created successfully', 'success');
      setShowCreateModal(false);
      setFormData({
        email: '',
        password: '',
        domain: '',
        organizationId: '',
        provider: 'custom',
        status: 'active',
        isPrimary: false,
        owner: '',
        purpose: '',
        notes: ''
      });
      loadEmails();
    } catch (error: any) {
      showToast(error.message || 'Failed to create email', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (email: Email) => {
    setEditingEmail(email);
    setFormData({
      email: email.email,
      password: email.password || '',
      domain: email.domain,
      organizationId: email.organizationId || '',
      provider: email.provider,
      status: email.status,
      isPrimary: email.isPrimary,
      owner: email.owner || '',
      purpose: email.purpose || '',
      notes: email.notes || ''
    });
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmail) return;
    setSubmitting(true);
    try {
      await apiClient.updateEmail(editingEmail.id, formData);
      showToast('Email updated successfully', 'success');
      setShowEditModal(false);
      setEditingEmail(null);
      loadEmails();
    } catch (error: any) {
      showToast(error.message || 'Failed to update email', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (email: Email) => {
    setDeletingEmail(email);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!deletingEmail) return;
    try {
      await apiClient.deleteEmail(deletingEmail.id);
      showToast('Email deleted successfully', 'success');
      setShowDeleteConfirm(false);
      setDeletingEmail(null);
      loadEmails();
    } catch (error: any) {
      showToast(error.message || 'Failed to delete email', 'error');
    }
  };

  const togglePasswordVisibility = (emailId: string) => {
    setShowPassword(prev => ({ ...prev, [emailId]: !prev[emailId] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <FiMail className="h-8 w-8 text-gray-700" />
          <h2 className="text-2xl font-bold text-foreground">Email IDs</h2>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <FiPlus className="h-4 w-4" />
          Add Email
        </button>
      </div>

      <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Domain</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Organization</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Provider</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Owner</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-gray-200">
              {emails.map((email) => (
                <tr key={email.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium text-foreground">{email.email}</div>
                      {email.isPrimary && (
                        <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-primary/20 text-blue-800">
                          Primary
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{email.domain}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {email.organization?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-muted text-foreground">
                      {email.provider}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      email.status === 'active' ? 'bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-400' :
                      email.status === 'suspended' ? 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-400' :
                      'bg-gray-100 dark:bg-gray-800 text-foreground'
                    }`}>
                      {email.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{email.owner || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      {email.password && (
                        <button
                          onClick={() => togglePasswordVisibility(email.id)}
                          className="text-gray-600 hover:text-foreground"
                          title="Show/Hide Password"
                        >
                          {showPassword[email.id] ? (
                            <FiEyeOff className="h-5 w-5" />
                          ) : (
                            <FiEye className="h-5 w-5" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(email)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <FiEdit2 className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(email)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <FiTrash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {emails.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No emails found. Click "Add Email" to create one.
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-foreground">Add Email</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-2 text-muted-foreground hover:text-gray-600">
                <FiX className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Email password"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Domain *</label>
                  <input
                    type="text"
                    required
                    value={formData.domain}
                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Provider</label>
                  <select
                    value={formData.provider}
                    onChange={(e) => setFormData({ ...formData, provider: e.target.value as any })}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="custom">Custom</option>
                    <option value="gmail">Gmail</option>
                    <option value="outlook">Outlook</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Organization</label>
                <select
                  value={formData.organizationId}
                  onChange={(e) => setFormData({ ...formData, organizationId: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">None</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
                <div className="flex items-center pt-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isPrimary}
                      onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked })}
                      className="w-4 h-4 text-primary border-border rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Primary Email</span>
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Owner</label>
                  <input
                    type="text"
                    value={formData.owner}
                    onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Owner name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Purpose</label>
                  <input
                    type="text"
                    value={formData.purpose}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Business, Personal, etc."
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Additional notes..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-border rounded-lg hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingEmail && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-foreground">Edit Email</h3>
              <button onClick={() => setShowEditModal(false)} className="p-2 text-muted-foreground hover:text-gray-600">
                <FiX className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Domain *</label>
                  <input
                    type="text"
                    required
                    value={formData.domain}
                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Provider</label>
                  <select
                    value={formData.provider}
                    onChange={(e) => setFormData({ ...formData, provider: e.target.value as any })}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="custom">Custom</option>
                    <option value="gmail">Gmail</option>
                    <option value="outlook">Outlook</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Organization</label>
                <select
                  value={formData.organizationId}
                  onChange={(e) => setFormData({ ...formData, organizationId: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">None</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
                <div className="flex items-center pt-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isPrimary}
                      onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked })}
                      className="w-4 h-4 text-primary border-border rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Primary Email</span>
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Owner</label>
                  <input
                    type="text"
                    value={formData.owner}
                    onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Purpose</label>
                  <input
                    type="text"
                    value={formData.purpose}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-border rounded-lg hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : 'Update Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Email"
        message={`Are you sure you want to delete the email "${deletingEmail?.email}"? This action cannot be undone.`}
      />

      <ToastContainer />
    </div>
  );
}
