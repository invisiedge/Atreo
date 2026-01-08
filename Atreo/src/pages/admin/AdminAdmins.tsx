import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiShield } from 'react-icons/fi';
import { AdminService } from '../../services/adminService';
import { type Admin, type CreateAdminRequest, type UpdateAdminRequest } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import ConfirmModal from '../../components/shared/ConfirmModal';
import { logger } from '../../lib/logger';

export default function AdminAdmins() {
  const { showToast, ToastContainer } = useToast();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAdminId, setConfirmAdminId] = useState<string | null>(null);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'admin' as 'admin' | 'super-admin'
  });

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const adminData = await AdminService.getAdmins();
      // Ensure each admin has an id property (mapped from _id if necessary)
      const mappedAdmins = adminData.map((admin: any) => ({
        ...admin,
        id: admin.id || admin._id
      }));
      setAdmins(mappedAdmins);
    } catch (error) {
      logger.error('Failed to fetch admins:', error);
      setError(error instanceof Error ? error.message : 'Failed to load admins');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdmin = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'admin'
    });
    setIsModalOpen(true);
  };

  const handleEditAdmin = (admin: Admin) => {
    setEditingAdmin(admin);
    setFormData({
      name: admin.name,
      email: admin.email,
      password: '',
      confirmPassword: '',
      role: admin.role
    });
    setIsEditModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsEditModalOpen(false);
    setEditingAdmin(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'admin'
    });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      if (editingAdmin) {
        const updateData: UpdateAdminRequest = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          ...(formData.password && { password: formData.password })
        };
        await AdminService.updateAdmin(editingAdmin.id, updateData);
      } else {
        const createData: CreateAdminRequest = {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role
        };
        await AdminService.createAdmin(createData);
      }
      
      handleCloseModal();
      fetchAdmins();
    } catch (error) {
      logger.error('Failed to save admin:', error);
      setError(error instanceof Error ? error.message : 'Failed to save admin');
    }
  };

  const handleDeleteClick = (adminId: string) => {
    setConfirmAdminId(adminId);
    setShowConfirmModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!confirmAdminId) return;

    try {
      await AdminService.deleteAdmin(confirmAdminId);
      showToast('Admin deleted successfully', 'success');
      setShowConfirmModal(false);
      setConfirmAdminId(null);
      fetchAdmins();
    } catch (error) {
      logger.error('Failed to delete admin:', error);
      showToast(error instanceof Error ? error.message : 'Failed to delete admin', 'error');
      setShowConfirmModal(false);
      setConfirmAdminId(null);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super-admin':
        return 'bg-purple-100 text-purple-800';
      case 'admin':
        return 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-400';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-400';
      case 'inactive':
        return 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-400';
      case 'suspended':
        return 'bg-yellow-100 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-400';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-foreground';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Admin Management</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage system administrators and their permissions.
          </p>
        </div>
        <button
          onClick={handleAddAdmin}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <FiPlus className="h-4 w-4" />
          Add Admin
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <FiShield className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admins Table */}
      <div className="bg-card shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-foreground">System Administrators</h3>
          <p className="mt-1 text-sm text-gray-500">
            View and manage all system administrators.
          </p>
        </div>
        
        {admins.length === 0 ? (
          <div className="text-center py-12">
            <FiShield className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-foreground">No admins found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by adding a new administrator.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Admin
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Admin ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
                <tbody className="bg-card divide-y divide-gray-200">
                  {admins.map((admin, index) => (
                    <tr key={admin.id || index}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600">
                              {admin.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-foreground">{admin.name}</div>
                          <div className="text-sm text-gray-500">{admin.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {admin.adminId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(admin.role)}`}>
                        {admin.role === 'super-admin' ? 'Super Admin' : 'Admin'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(admin.status)}`}>
                        {admin.status.charAt(0).toUpperCase() + admin.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(admin.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {admin.lastLogin ? new Date(admin.lastLogin).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditAdmin(admin)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit Admin"
                        >
                          <FiEdit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(admin.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete Admin"
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Admin Modal */}
      {(isModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-foreground">
                {editingAdmin ? 'Edit Admin' : 'Add New Admin'}
              </h3>
            </div>
            
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'super-admin' })}
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="admin">Admin</option>
                  <option value="super-admin">Super Admin</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required={!editingAdmin}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required={!editingAdmin}
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-md hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-blue-700 transition-colors"
                >
                  {editingAdmin ? 'Update Admin' : 'Create Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Container */}
      <ToastContainer />

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setConfirmAdminId(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Admin"
        message="Are you sure you want to delete this admin? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
}
