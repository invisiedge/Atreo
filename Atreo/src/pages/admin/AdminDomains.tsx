import { useState, useEffect } from 'react';
import { FiGlobe, FiPlus, FiEdit2, FiTrash2, FiX } from 'react-icons/fi';
import { apiClient } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import ConfirmModal from '../../components/shared/ConfirmModal';
import { logger } from '../../lib/logger';

interface Domain {
  id: string;
  domain: string;
  organizationId?: string;
  organization?: { id: string; name: string; domain: string };
  status: 'active' | 'inactive' | 'expired';
  registrar?: string;
  registrationDate?: string;
  expirationDate?: string;
  renewalDate?: string;
  dnsProvider?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function AdminDomains() {
  const { showToast, ToastContainer } = useToast();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingDomain, setDeletingDomain] = useState<Domain | null>(null);
  const [editingDomain, setEditingDomain] = useState<Domain | null>(null);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    domain: '',
    organizationId: '',
    status: 'active' as 'active' | 'inactive' | 'expired',
    registrar: '',
    registrationDate: '',
    expirationDate: '',
    renewalDate: '',
    dnsProvider: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadDomains();
    loadOrganizations();
  }, []);

  const loadDomains = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getDomains();
      setDomains(data);
    } catch (error: any) {
      logger.error('Error loading domains:', error);
      showToast('Failed to load domains', 'error');
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
      await apiClient.createDomain(formData);
      showToast('Domain created successfully', 'success');
      setShowCreateModal(false);
      setFormData({
        domain: '',
        organizationId: '',
        status: 'active',
        registrar: '',
        registrationDate: '',
        expirationDate: '',
        renewalDate: '',
        dnsProvider: '',
        notes: ''
      });
      loadDomains();
    } catch (error: any) {
      showToast(error.message || 'Failed to create domain', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (domain: Domain) => {
    setEditingDomain(domain);
    setFormData({
      domain: domain.domain,
      organizationId: domain.organizationId || '',
      status: domain.status,
      registrar: domain.registrar || '',
      registrationDate: domain.registrationDate ? domain.registrationDate.split('T')[0] : '',
      expirationDate: domain.expirationDate ? domain.expirationDate.split('T')[0] : '',
      renewalDate: domain.renewalDate ? domain.renewalDate.split('T')[0] : '',
      dnsProvider: domain.dnsProvider || '',
      notes: domain.notes || ''
    });
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDomain) return;
    setSubmitting(true);
    try {
      await apiClient.updateDomain(editingDomain.id, formData);
      showToast('Domain updated successfully', 'success');
      setShowEditModal(false);
      setEditingDomain(null);
      loadDomains();
    } catch (error: any) {
      showToast(error.message || 'Failed to update domain', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (domain: Domain) => {
    setDeletingDomain(domain);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!deletingDomain) return;
    try {
      await apiClient.deleteDomain(deletingDomain.id);
      showToast('Domain deleted successfully', 'success');
      setShowDeleteConfirm(false);
      setDeletingDomain(null);
      loadDomains();
    } catch (error: any) {
      showToast(error.message || 'Failed to delete domain', 'error');
    }
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
          <FiGlobe className="h-8 w-8 text-gray-700" />
          <h2 className="text-2xl font-bold text-foreground">Domains</h2>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <FiPlus className="h-4 w-4" />
          Add Domain
        </button>
      </div>

      <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Domain</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Organization</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Registrar</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Expiration</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-gray-200">
              {domains.map((domain) => (
                <tr key={domain.id} className="hover:bg-gray-50 dark:bg-gray-900">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-foreground">{domain.domain}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{domain.organization?.name || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      domain.status === 'active' ? 'bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-400' :
                      domain.status === 'expired' ? 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-400' :
                      'bg-gray-100 dark:bg-gray-800 text-foreground'
                    }`}>
                      {domain.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {domain.registrar || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {domain.expirationDate ? new Date(domain.expirationDate).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(domain)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <FiEdit2 className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(domain)}
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
          {domains.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No domains found. Click "Add Domain" to create one.
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-foreground">Add Domain</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-2 text-muted-foreground hover:text-gray-600">
                <FiX className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
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
                    <option value="expired">Expired</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Registrar</label>
                  <input
                    type="text"
                    value={formData.registrar}
                    onChange={(e) => setFormData({ ...formData, registrar: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="GoDaddy, Namecheap, etc."
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Registration Date</label>
                  <input
                    type="date"
                    value={formData.registrationDate}
                    onChange={(e) => setFormData({ ...formData, registrationDate: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Expiration Date</label>
                  <input
                    type="date"
                    value={formData.expirationDate}
                    onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Renewal Date</label>
                  <input
                    type="date"
                    value={formData.renewalDate}
                    onChange={(e) => setFormData({ ...formData, renewalDate: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">DNS Provider</label>
                <input
                  type="text"
                  value={formData.dnsProvider}
                  onChange={(e) => setFormData({ ...formData, dnsProvider: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Cloudflare, AWS Route 53, etc."
                />
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
                  {submitting ? 'Creating...' : 'Create Domain'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingDomain && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-foreground">Edit Domain</h3>
              <button onClick={() => setShowEditModal(false)} className="p-2 text-muted-foreground hover:text-gray-600">
                <FiX className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="p-6 space-y-4">
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
                    <option value="expired">Expired</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Registrar</label>
                  <input
                    type="text"
                    value={formData.registrar}
                    onChange={(e) => setFormData({ ...formData, registrar: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Registration Date</label>
                  <input
                    type="date"
                    value={formData.registrationDate}
                    onChange={(e) => setFormData({ ...formData, registrationDate: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Expiration Date</label>
                  <input
                    type="date"
                    value={formData.expirationDate}
                    onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Renewal Date</label>
                  <input
                    type="date"
                    value={formData.renewalDate}
                    onChange={(e) => setFormData({ ...formData, renewalDate: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">DNS Provider</label>
                <input
                  type="text"
                  value={formData.dnsProvider}
                  onChange={(e) => setFormData({ ...formData, dnsProvider: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
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
                  {submitting ? 'Updating...' : 'Update Domain'}
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
        title="Delete Domain"
        message={`Are you sure you want to delete the domain "${deletingDomain?.domain}"? This action cannot be undone.`}
      />

      <ToastContainer />
    </div>
  );
}
