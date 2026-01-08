import { useState, useEffect } from 'react';
import {
  FiBriefcase,
  FiUsers,
  FiTool,
  FiFileText,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiX,
  FiArrowUp,
  FiArrowDown,
  FiEye,
    FiEyeOff,
    FiDollarSign,
    FiShield,
    FiCreditCard
  } from 'react-icons/fi';
import { apiClient, type Organization, type OrganizationDetails, type User, type Tool } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { logger } from '../../lib/logger';
import ConfirmModal from '../../components/shared/ConfirmModal';

export default function AdminOrganizations() {
  const { showToast } = useToast();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [orgDetails, setOrgDetails] = useState<OrganizationDetails | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showAddToolModal, setShowAddToolModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingOrg, setDeletingOrg] = useState<Organization | null>(null);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [formData, setFormData] = useState({ name: '', domain: '' });
  const [submitting, setSubmitting] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'createdAt' | 'userCount' | 'toolCount' | 'invoiceCount'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allTools, setAllTools] = useState<Tool[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
    const [selectedToolId, setSelectedToolId] = useState('');
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [showToolViewModal, setShowToolViewModal] = useState(false);
    const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
    const [loadingToolDetails, setLoadingToolDetails] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    loadOrganizations();
  }, [sortBy, sortOrder]);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getOrganizations();
      
      // Ensure each organization has an id property (mapped from _id if necessary)
      const mappedData = (data || []).map((org: any) => ({
        ...org,
        id: org.id || org._id
      }));

      // Sort data
      const sorted = [...mappedData].sort((a, b) => {
        let aVal: any, bVal: any;
        switch (sortBy) {
          case 'name':
            aVal = a.name?.toLowerCase() || '';
            bVal = b.name?.toLowerCase() || '';
            break;
          case 'createdAt':
            aVal = new Date(a.createdAt || '').getTime();
            bVal = new Date(b.createdAt || '').getTime();
            break;
          case 'userCount':
            aVal = a.userCount || 0;
            bVal = b.userCount || 0;
            break;
          case 'toolCount':
            aVal = a.toolCount || 0;
            bVal = b.toolCount || 0;
            break;
          case 'invoiceCount':
            aVal = a.invoiceCount || 0;
            bVal = b.invoiceCount || 0;
            break;
          default:
            aVal = new Date(a.createdAt || '').getTime();
            bVal = new Date(b.createdAt || '').getTime();
        }
        
        if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });

      setOrganizations(sorted);
    } catch (error: any) {
      logger.error('Failed to load organizations', error);
      showToast('Failed to load organizations', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadOrganizationDetails = async (orgId: string) => {
    setLoadingDetails(true);
    setOrgDetails(null);
    try {
      const details = await apiClient.getOrganizationDetails(orgId);
      setOrgDetails(details);
      
        // Load all users and tools for add modals
        const [usersResponse, tools] = await Promise.all([
          apiClient.getUsers(),
          apiClient.getTools()
        ]);
        setAllUsers(usersResponse.users);
      setAllTools(tools);
    } catch (error: any) {
      logger.error('Failed to load organization details', error);
      showToast('Failed to load organization details', 'error');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.createOrganization(formData);
      showToast('Organization created successfully', 'success');
      setShowCreateModal(false);
      setFormData({ name: '', domain: '' });
      loadOrganizations();
    } catch (error: any) {
      logger.error('Failed to create organization', error);
      showToast(error.message || 'Failed to create organization', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (org: Organization) => {
    setEditingOrg(org);
    setFormData({ name: org.name, domain: org.domain });
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrg) return;
    setSubmitting(true);
    try {
      await apiClient.updateOrganization(editingOrg.id, formData);
      showToast('Organization updated successfully', 'success');
      setShowEditModal(false);
      setEditingOrg(null);
      setFormData({ name: '', domain: '' });
      loadOrganizations();
      if (selectedOrg === editingOrg.id) {
        loadOrganizationDetails(editingOrg.id);
      }
    } catch (error: any) {
      logger.error('Failed to update organization', error);
      showToast(error.message || 'Failed to update organization', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingOrg) return;
    setSubmitting(true);
    try {
      await apiClient.deleteOrganization(deletingOrg.id);
      showToast('Organization deleted successfully', 'success');
      setShowDeleteConfirm(false);
      setDeletingOrg(null);
      if (selectedOrg === deletingOrg.id) {
        setSelectedOrg(null);
        setOrgDetails(null);
        setShowDetailsModal(false);
      }
      loadOrganizations();
    } catch (error: any) {
      logger.error('Failed to delete organization', error);
      showToast(error.message || 'Failed to delete organization', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddUser = async () => {
    if (!selectedUserId || !selectedOrg) return;
    setSubmitting(true);
    try {
      await apiClient.addUserToOrganization(selectedOrg, selectedUserId);
      showToast('User added to organization successfully', 'success');
      setShowAddUserModal(false);
      setSelectedUserId('');
      await loadOrganizationDetails(selectedOrg);
      loadOrganizations();
    } catch (error: any) {
      logger.error('Failed to add user to organization', error);
      showToast(error.message || 'Failed to add user to organization', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveUser = async (userId: string, userName: string) => {
    if (!selectedOrg) return;
    try {
      await apiClient.removeUserFromOrganization(selectedOrg, userId);
      showToast(`User "${userName}" removed from organization`, 'success');
      await loadOrganizationDetails(selectedOrg);
      loadOrganizations();
    } catch (error: any) {
      logger.error('Failed to remove user from organization', error);
      showToast(error.message || 'Failed to remove user from organization', 'error');
    }
  };

  const handleAddTool = async () => {
    if (!selectedToolId || !selectedOrg) return;
    setSubmitting(true);
    try {
      await apiClient.addToolToOrganization(selectedOrg, selectedToolId);
      showToast('Tool added to organization successfully', 'success');
      setShowAddToolModal(false);
      setSelectedToolId('');
      await loadOrganizationDetails(selectedOrg);
      loadOrganizations();
    } catch (error: any) {
      logger.error('Failed to add tool to organization', error);
      showToast(error.message || 'Failed to add tool to organization', 'error');
    } finally {
      setSubmitting(false);
    }
  };

    const handleRemoveTool = async (toolId: string, toolName: string) => {
      if (!selectedOrg) return;
      try {
        await apiClient.removeToolFromOrganization(selectedOrg, toolId);
        showToast(`Tool "${toolName}" removed from organization`, 'success');
        await loadOrganizationDetails(selectedOrg);
        loadOrganizations();
      } catch (error: any) {
        logger.error('Failed to remove tool from organization', error);
        showToast(error.message || 'Failed to remove tool from organization', 'error');
      }
    };

    const handleToolView = async (tool: Tool) => {
      setLoadingToolDetails(true);
      setShowToolViewModal(true);
      setShowPassword(false);
      
      try {
        // Fetch full tool details
        const fullToolDetails = await apiClient.getToolById(tool.id);
        setSelectedTool(fullToolDetails);
      } catch (error: any) {
        logger.error('Failed to load tool details', error);
        showToast('Failed to load tool details', 'error');
        // Fallback to using the tool from the list
        setSelectedTool(tool);
      } finally {
        setLoadingToolDetails(false);
      }
    };

  const openDetailsModal = (orgId: string) => {
    setSelectedOrg(orgId);
    setShowDetailsModal(true);
    void loadOrganizationDetails(orgId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Loading organizations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-background min-h-screen p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-foreground">Organizations</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setFormData({ name: '', domain: '' });
              setShowCreateModal(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <FiPlus className="h-4 w-4 mr-2" />
            Create Organization
          </button>
          <div className="flex items-center gap-2 border border-border rounded-md bg-white dark:bg-gray-900">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 text-sm font-medium text-foreground bg-transparent border-0 focus:outline-none focus:ring-0 cursor-pointer"
            >
              <option value="createdAt">Date</option>
              <option value="name">Name</option>
              <option value="userCount">Users</option>
              <option value="toolCount">Tools</option>
              <option value="invoiceCount">Invoices</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-2 py-2 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors border-l border-gray-300"
              title={`Sort ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
            >
              {sortOrder === 'asc' ? (
                <FiArrowUp className="h-4 w-4" />
              ) : (
                <FiArrowDown className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Organizations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {organizations.map((org) => (
          <div
            key={org.id}
            className={`bg-white dark:bg-gray-900 rounded-lg border-2 p-6 cursor-pointer transition-all ${
              selectedOrg === org.id
                ? 'border-blue-500 shadow-lg'
                : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
            }`}
            onClick={() => openDetailsModal(org.id)}
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                <FiBriefcase className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-foreground truncate">{org.name}</h3>
                <p className="text-sm text-muted-foreground truncate">{org.domain}</p>
              </div>
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => handleEdit(org)}
                  className="p-2 text-primary hover:bg-blue-50 rounded-md transition-colors"
                  title="Edit organization"
                >
                  <FiEdit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    setDeletingOrg(org);
                    setShowDeleteConfirm(true);
                  }}
                  className="p-2 text-destructive hover:bg-red-50 rounded-md transition-colors"
                  title="Delete organization"
                >
                  <FiTrash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <FiUsers className="h-4 w-4" />
                </div>
                <p className="text-2xl font-bold text-foreground">{org.userCount || 0}</p>
                <p className="text-xs text-gray-500">Users</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <FiTool className="h-4 w-4" />
                </div>
                <p className="text-2xl font-bold text-foreground">{org.toolCount || 0}</p>
                <p className="text-xs text-gray-500">Tools</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <FiFileText className="h-4 w-4" />
                </div>
                <p className="text-2xl font-bold text-foreground">{org.invoiceCount || 0}</p>
                <p className="text-xs text-gray-500">Invoices</p>
              </div>
            </div>
            {org.createdAt && (
              <p className="text-xs text-muted-foreground mt-4 text-center">
                Created: {new Date(org.createdAt).toLocaleDateString()}
              </p>
            )}
          </div>
        ))}
      </div>

      {organizations.length === 0 && !loading && (
        <div className="text-center py-12 bg-card rounded-lg border border-gray-200">
          <FiBriefcase className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-gray-500">No organizations found</p>
          <button
            onClick={() => {
              setFormData({ name: '', domain: '' });
              setShowCreateModal(true);
            }}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-blue-700"
          >
            <FiPlus className="h-4 w-4 mr-2" />
            Create First Organization
          </button>
        </div>
      )}

      {/* Organization Details Modal */}
      {showDetailsModal && selectedOrg && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">
                {orgDetails?.organization.name || 'Organization Details'}
              </h2>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedOrg(null);
                  setOrgDetails(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {loadingDetails || !orgDetails ? (
                <div className="py-12 text-center">
                  <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
                  <p className="mt-4 text-sm text-muted-foreground">
                    {loadingDetails ? 'Loading organization details...' : 'Unable to load organization details.'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Organization Info */}
                  <div className="bg-background rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Domain</p>
                        <p className="text-base text-foreground">{orgDetails.organization.domain}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Created</p>
                        <p className="text-base text-foreground">
                          {new Date(orgDetails.organization.createdAt || '').toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

              {/* Users Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <FiUsers className="h-5 w-5" />
                    Users ({orgDetails.users.length})
                  </h3>
                  <button
                    onClick={() => {
                      setSelectedUserId('');
                      setShowAddUserModal(true);
                    }}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-primary bg-primary/10 hover:bg-blue-100 transition-colors"
                  >
                    <FiPlus className="h-3 w-3 mr-1" />
                    Add User
                  </button>
                </div>
                {orgDetails.users.length === 0 ? (
                  <div className="text-center py-8 bg-background rounded-lg">
                    <FiUsers className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No users found for this organization</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {orgDetails.users.map((user) => (
                      <div
                        key={user.id}
                        className="p-4 bg-background rounded-lg border border-border hover:border-blue-300 transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">{user.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/20 text-blue-800 mt-2">
                              {user.role}
                            </span>
                          </div>
                          <button
                            onClick={() => handleRemoveUser(user.id, user.name)}
                            className="ml-2 p-1.5 text-destructive hover:bg-red-50 rounded-md transition-colors flex-shrink-0"
                            title="Remove user from organization"
                          >
                            <FiTrash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Credentials (Tools) Section */}
              <div className="border-t border-border pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <FiTool className="h-5 w-5 text-primary" />
                    All Credentials ({orgDetails.tools.length})
                  </h3>
                  <button
                    onClick={() => {
                      setSelectedToolId('');
                      setShowAddToolModal(true);
                    }}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-primary bg-primary/10 hover:bg-blue-100 transition-colors"
                  >
                    <FiPlus className="h-3 w-3 mr-1" />
                    Add Tool
                  </button>
                </div>
                {orgDetails.tools.length === 0 ? (
                  <div className="text-center py-8 bg-background rounded-lg border border-border">
                    <FiTool className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No credentials found for this organization</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                    {orgDetails.tools.map((tool) => (
                        <div
                          key={tool.id}
                          className="p-4 bg-background rounded-lg border border-border hover:border-blue-300 hover:shadow-md transition-all group cursor-pointer"
                          onClick={() => handleToolView(tool)}
                        >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <FiTool className="h-4 w-4 text-primary flex-shrink-0" />
                              <p className="text-sm font-semibold text-foreground truncate group-hover:text-blue-600" title={tool.name}>
                                {tool.name}
                              </p>
                            </div>
                            {tool.description && (
                              <p className="text-xs text-muted-foreground mb-2 line-clamp-2" title={tool.description}>
                                {tool.description}
                              </p>
                            )}
                            {tool.category && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-400 mb-2">
                                {tool.category}
                              </span>
                            )}
                            <div className="flex items-center gap-2 flex-wrap">
                              {tool.isPaid && tool.price && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-400">
                                  ${tool.price.toFixed(2)}
                                </span>
                              )}
                              {tool.status && (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                  tool.status === 'active' ? 'bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-800 text-foreground'
                                }`}>
                                  {tool.status}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveTool(tool.id, tool.name);
                            }}
                            className="ml-2 p-1.5 text-destructive hover:bg-red-50 rounded-md transition-colors flex-shrink-0"
                            title="Remove tool from organization"
                          >
                            <FiTrash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Related Invoices Section */}
              <div className="border-t border-border pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <FiFileText className="h-5 w-5 text-primary" />
                    All Related Invoices ({orgDetails.invoices.length})
                  </h3>
                </div>
                {orgDetails.invoices.length === 0 ? (
                  <div className="text-center py-8 bg-background rounded-lg border border-border">
                    <FiFileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No invoices found for this organization</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                    {orgDetails.invoices.map((invoice) => {
                      const getStatusColor = (status: string) => {
                        switch (status) {
                          case 'approved':
                            return 'bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-400 dark:bg-green-900 dark:text-green-200';
                          case 'pending':
                            return 'bg-yellow-100 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-400 dark:bg-yellow-900 dark:text-yellow-200';
                          case 'rejected':
                            return 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-400 dark:bg-red-900 dark:text-red-200';
                          default:
                            return 'bg-gray-100 text-foreground dark:bg-gray-700';
                        }
                      };

                      return (
                        <div
                          key={invoice.id}
                          className="p-4 bg-background rounded-lg border border-border hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                        >
                          <div className="flex flex-col gap-2">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <FiFileText className="h-4 w-4 text-primary flex-shrink-0" />
                                <p className="text-sm font-semibold text-foreground truncate" title={invoice.invoiceNumber}>
                                  {invoice.invoiceNumber}
                                </p>
                              </div>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(invoice.status || 'pending')}`}>
                                {invoice.status || 'pending'}
                              </span>
                            </div>
                            
                            {invoice.provider && (
                              <p className="text-xs text-muted-foreground truncate" title={invoice.provider}>
                                Provider: {invoice.provider}
                              </p>
                            )}
                            
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-foreground">
                                {invoice.currency || 'USD'} {(invoice.amount || 0).toLocaleString('en-US', { 
                                  minimumFractionDigits: 0, 
                                  maximumFractionDigits: 0 
                                })}
                              </span>
                            </div>
                            
                            {invoice.billingDate && (
                              <p className="text-xs text-muted-foreground">
                                Date: {new Date(invoice.billingDate).toLocaleDateString()}
                              </p>
                            )}
                            
                            {invoice.tools && Array.isArray(invoice.tools) && invoice.tools.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-border">
                                <p className="text-xs font-medium text-muted-foreground mb-1">Related Tools:</p>
                                <div className="flex flex-wrap gap-1">
                                  {invoice.tools.map((tool: any, idx: number) => (
                                    <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/20 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                      {tool.name || tool}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Organization Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">Create Organization</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setFormData({ name: '', domain: '' });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                  Organization Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="block w-full rounded-md border-border shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                  placeholder="e.g., Acme Corporation"
                />
              </div>
              <div>
                <label htmlFor="domain" className="block text-sm font-medium text-foreground mb-2">
                  Domain <span className="text-red-500">*</span>
                </label>
                <input
                  id="domain"
                  type="text"
                  required
                  value={formData.domain}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                  className="block w-full rounded-md border-border shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                  placeholder="e.g., acme.com"
                />
                <p className="mt-1 text-xs text-gray-500">Must be a valid domain name</p>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({ name: '', domain: '' });
                  }}
                  className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-md hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Organization Modal */}
      {showEditModal && editingOrg && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">Edit Organization</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingOrg(null);
                  setFormData({ name: '', domain: '' });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div>
                <label htmlFor="edit-name" className="block text-sm font-medium text-foreground mb-2">
                  Organization Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="edit-name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="block w-full rounded-md border-border shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                  placeholder="e.g., Acme Corporation"
                />
              </div>
              <div>
                <label htmlFor="edit-domain" className="block text-sm font-medium text-foreground mb-2">
                  Domain <span className="text-red-500">*</span>
                </label>
                <input
                  id="edit-domain"
                  type="text"
                  required
                  value={formData.domain}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                  className="block w-full rounded-md border-border shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                  placeholder="e.g., acme.com"
                />
                <p className="mt-1 text-xs text-gray-500">Must be a valid domain name</p>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingOrg(null);
                    setFormData({ name: '', domain: '' });
                  }}
                  className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-md hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? 'Updating...' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && selectedOrg && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">Add User to Organization</h2>
              <button
                onClick={() => {
                  setShowAddUserModal(false);
                  setSelectedUserId('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label htmlFor="user-select" className="block text-sm font-medium text-foreground mb-2">
                  Select User <span className="text-red-500">*</span>
                </label>
                <select
                  id="user-select"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="block w-full rounded-md border-border shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                >
                  <option value="">Choose a user...</option>
                  {allUsers
                    .filter((user) => {
                      // Show users that don't belong to this organization or belong to another
                      if (!orgDetails) return true;
                      const userOrg = orgDetails.users.find(u => u.id === user.id);
                      return !userOrg;
                    })
                    .map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                </select>
                {allUsers.filter((user) => {
                  if (!orgDetails) return false;
                  const userOrg = orgDetails.users.find(u => u.id === user.id);
                  return !userOrg;
                }).length === 0 && (
                  <p className="mt-2 text-xs text-gray-500">All users are already in this organization</p>
                )}
              </div>
              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddUserModal(false);
                    setSelectedUserId('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-md hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddUser}
                  disabled={submitting || !selectedUserId}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? 'Adding...' : 'Add User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Tool Modal */}
      {showAddToolModal && selectedOrg && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">Add Tool to Organization</h2>
              <button
                onClick={() => {
                  setShowAddToolModal(false);
                  setSelectedToolId('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label htmlFor="tool-select" className="block text-sm font-medium text-foreground mb-2">
                  Select Tool <span className="text-red-500">*</span>
                </label>
                <select
                  id="tool-select"
                  value={selectedToolId}
                  onChange={(e) => setSelectedToolId(e.target.value)}
                  className="block w-full rounded-md border-border shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                >
                  <option value="">Choose a tool...</option>
                  {allTools
                    .filter((tool) => {
                      // Show tools that don't belong to this organization
                      if (!orgDetails) return true;
                      const toolOrg = orgDetails.tools.find(t => t.id === tool.id);
                      return !toolOrg;
                    })
                    .map((tool) => (
                      <option key={tool.id} value={tool.id}>
                        {tool.name} {tool.category ? `(${tool.category})` : ''}
                      </option>
                    ))}
                </select>
                {allTools.filter((tool) => {
                  if (!orgDetails) return false;
                  const toolOrg = orgDetails.tools.find(t => t.id === tool.id);
                  return !toolOrg;
                }).length === 0 && (
                  <p className="mt-2 text-xs text-gray-500">All tools are already in this organization</p>
                )}
              </div>
              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddToolModal(false);
                    setSelectedToolId('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-md hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddTool}
                  disabled={submitting || !selectedToolId}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? 'Adding...' : 'Add Tool'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={showDeleteConfirm}
          onClose={() => {
            setShowDeleteConfirm(false);
            setDeletingOrg(null);
          }}
          onConfirm={handleDelete}
          title="Delete Organization"
          message={
            deletingOrg
              ? `Are you sure you want to delete "${deletingOrg.name}"? This will move all associated users, tools, and submissions to another organization. This action cannot be undone.`
              : ''
          }
          confirmText="Delete"
        />

        {/* Tool View Modal */}
        {showToolViewModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-card rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-border bg-gray-50">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Credential Details</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">View complete information</p>
                </div>
                <button
                  onClick={() => {
                    setShowToolViewModal(false);
                    setSelectedTool(null);
                    setLoadingToolDetails(false);
                  }}
                  className="p-2 text-muted-foreground hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <FiX className="h-5 w-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6">
                {loadingToolDetails ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex flex-col items-center gap-4">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                      <p className="text-gray-600">Loading tool details...</p>
                    </div>
                  </div>
                ) : selectedTool ? (
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Name</label>
                    <p className="text-lg font-semibold text-foreground">{selectedTool.name}</p>
                  </div>

                  {selectedTool.description && (
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Description</label>
                      <p className="text-sm text-foreground leading-relaxed">{selectedTool.description}</p>
                    </div>
                  )}

                  {selectedTool.category && (
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Category</label>
                      <span className="inline-flex px-3 py-1.5 text-sm font-medium rounded-lg bg-muted text-foreground border border-gray-200">
                        {selectedTool.category}
                      </span>
                    </div>
                  )}

                  {(selectedTool.username || selectedTool.password || selectedTool.apiKey) && (
                    <div className="border-t border-border pt-6">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Credentials</h4>
                      <div className="space-y-3">
                        {selectedTool.username && (
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Username</label>
                            <p className="text-sm font-mono text-foreground bg-background px-3 py-2 rounded-lg border border-gray-200">{selectedTool.username}</p>
                          </div>
                        )}
                        {selectedTool.password && (
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Password</label>
                            <div className="relative">
                              <p className="text-sm font-mono text-foreground bg-background px-3 py-2 pr-10 rounded-lg border border-gray-200">
                                {showPassword ? selectedTool.password : '••••••••'}
                              </p>
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 text-muted-foreground hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                                title={showPassword ? 'Hide password' : 'Show password'}
                              >
                                {showPassword ? (
                                  <FiEyeOff className="h-4 w-4" />
                                ) : (
                                  <FiEye className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                        {selectedTool.apiKey && (
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1.5">API Key</label>
                            <p className="text-sm font-mono text-foreground bg-background px-3 py-2 rounded-lg border border-border break-all">
                              {selectedTool.apiKey}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedTool.notes && (
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Notes</label>
                      <p className="text-sm text-foreground bg-background px-4 py-3 rounded-lg border border-border whitespace-pre-wrap leading-relaxed">{selectedTool.notes}</p>
                    </div>
                  )}

                  <div className="border-t border-border pt-6">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Status & Features</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedTool.isPaid && selectedTool.price && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200">
                          <FiDollarSign className="h-4 w-4" />
                          ${selectedTool.price.toFixed(2)}/{selectedTool.billingPeriod === 'yearly' ? 'yr' : 'mo'}
                        </span>
                      )}
                      {selectedTool.hasAutopay && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                          <FiCreditCard className="h-4 w-4" />
                          Autopay
                        </span>
                      )}
                      {selectedTool.has2FA && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                          <FiShield className="h-4 w-4" />
                          2FA: {selectedTool.twoFactorMethod || 'N/A'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No tool details available</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t border-border bg-gray-50">
                <button
                  onClick={() => {
                    setShowToolViewModal(false);
                    setSelectedTool(null);
                    setLoadingToolDetails(false);
                  }}
                  className="px-5 py-2.5 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-accent transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
