import { useState, useEffect, useMemo } from 'react';
import { FiTool, FiPlus, FiTrash2, FiEye, FiEyeOff, FiRefreshCw, FiDollarSign, FiShield, FiCreditCard, FiX, FiDownload, FiChevronDown, FiKey, FiShare2, FiUsers, FiUpload, FiActivity, FiSearch } from 'react-icons/fi';
import { apiClient } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import ConfirmModal from '../../components/shared/ConfirmModal';
import SummaryCard from '@/components/shared/SummaryCard';
import { Skeleton } from '@/components/ui/skeleton';

// Service Type Categories
const SERVICE_CATEGORIES = [
  { id: 'all', name: 'All Tools' },
  { id: 'social-media', name: 'Social Media' },
  { id: 'communication', name: 'Communication' },
  { id: 'development', name: 'Development' },
  { id: 'design', name: 'Design' },
  { id: 'ai-tools', name: 'AI Tools' },
  { id: 'marketing', name: 'Marketing' },
  { id: 'property-management', name: 'Property Management' },
  { id: 'other', name: 'Other' }
];

interface AdminToolsProps {
  readOnly?: boolean;
}

export default function AdminTools({ readOnly = false }: AdminToolsProps) {
  const { showToast, ToastContainer } = useToast();
  const [tools, setTools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterDate, setFilterDate] = useState('all');
  const [filterPaid, setFilterPaid] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>('all');
  const [filterBillingPeriod, setFilterBillingPeriod] = useState<string>('all');
  const [filterOrganizationName, setFilterOrganizationName] = useState<string>('all');
  const [showCreateCategoryDropdown, setShowCreateCategoryDropdown] = useState(false);
  const [showEditCategoryDropdown, setShowEditCategoryDropdown] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ toolId: string; toolName: string } | null>(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [selectedTool, setSelectedTool] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [importingExcel, setImportingExcel] = useState(false);
  const [exportingCredentials, setExportingCredentials] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    imported: number;
    skipped: number;
    errors: number;
    errorDetails: Array<{ row: number; toolName: string; error: string }>;
  } | null>(null);
  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [shareData, setShareData] = useState({ userId: '', permission: 'view' as 'view' | 'edit' });
  type ToolFormData = {
    name: string;
    description: string;
    category: string;
    organizationId: string;
    username: string;
    password: string;
    apiKey: string;
    notes: string;
    tags: string;
    isPaid: boolean;
    hasAutopay: boolean;
    price: number;
    billingPeriod: 'monthly' | 'yearly';
    has2FA: boolean;
    twoFactorMethod: '' | 'mobile' | 'email';
    paymentMethod: 'card' | 'bank' | 'paypal' | 'other' | '';
    cardLast4Digits: string;
    status: 'active' | 'inactive';
  };

  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string }>>([]);
  const [formData, setFormData] = useState<ToolFormData>({
    name: '',
    description: '',
    category: '',
    organizationId: '',
    username: '',
    password: '',
    apiKey: '',
    notes: '',
    tags: '',
    isPaid: false,
    hasAutopay: false,
    price: 0,
    billingPeriod: 'monthly',
    has2FA: false,
    twoFactorMethod: '',
    paymentMethod: 'card',
    cardLast4Digits: '',
    status: 'active'
  });
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  // Template definitions
  const templates = {
    ai: {
      name: 'AI Service',
      description: 'AI/ML service platform',
      category: 'AI & Machine Learning',
      tags: 'ai, machine-learning, automation',
      isPaid: true,
      price: 29.99,
      billingPeriod: 'monthly' as const,
      has2FA: true,
      twoFactorMethod: 'email' as const,
      notes: 'AI service platform for machine learning and automation'
    },
    deployment: {
      name: 'Deployment Platform',
      description: 'Cloud deployment and hosting service',
      category: 'Deployment & DevOps',
      tags: 'deployment, cloud, devops, hosting',
      isPaid: true,
      price: 49.99,
      billingPeriod: 'monthly' as const,
      has2FA: true,
      twoFactorMethod: 'mobile' as const,
      notes: 'Cloud deployment platform for applications and services'
    },
    database: {
      name: 'Database Service',
      description: 'Cloud database management service',
      category: 'Database',
      tags: 'database, cloud, storage',
      isPaid: true,
      price: 39.99,
      billingPeriod: 'monthly' as const,
      has2FA: false,
      twoFactorMethod: '' as const,
      notes: 'Managed database service'
    },
    monitoring: {
      name: 'Monitoring Tool',
      description: 'Application and infrastructure monitoring',
      category: 'Monitoring & Analytics',
      tags: 'monitoring, analytics, logging',
      isPaid: true,
      price: 19.99,
      billingPeriod: 'monthly' as const,
      has2FA: true,
      twoFactorMethod: 'email' as const,
      notes: 'Real-time monitoring and analytics platform'
    },
    security: {
      name: 'Security Service',
      description: 'Security and compliance platform',
      category: 'Security',
      tags: 'security, compliance, encryption',
      isPaid: true,
      price: 59.99,
      billingPeriod: 'monthly' as const,
      has2FA: true,
      twoFactorMethod: 'mobile' as const,
      notes: 'Enterprise security and compliance solution'
    }
  };

  const applyTemplate = (templateKey: string) => {
    const template = templates[templateKey as keyof typeof templates];
    if (template) {
      setFormData(prev => ({
        ...prev,
        name: template.name,
        description: template.description,
        category: template.category,
        tags: template.tags,
        isPaid: template.isPaid,
        price: template.price,
        billingPeriod: template.billingPeriod,
        has2FA: template.has2FA,
        twoFactorMethod: template.twoFactorMethod,
        notes: template.notes
      }));
      setSelectedTemplate(templateKey);
    }
  };

  const loadTools = async () => {
    try {
      setLoading(true);
      setError(null);
      // Both admin and accountant roles fetch the same data from the backend
      // The backend returns all tools/credentials for both roles (see routes/tools.js)
      // The readOnly prop controls UI visibility of edit/delete actions
      console.log('=== LOADING TOOLS ===');
      console.log('ReadOnly mode:', readOnly);
      console.log('API Client:', apiClient);
      console.log('API Endpoint:', '/api/tools');
      
      // Check authentication token
      const token = localStorage.getItem('token');
      console.log('Token exists:', !!token);
      if (token) {
        try {
          const tokenPayload = JSON.parse(atob(token.split('.')[1]));
          console.log('Token payload:', tokenPayload);
          console.log('Token role:', tokenPayload.role);
        } catch (e) {
          console.warn('Could not parse token:', e);
        }
      }
      
      const data = await apiClient.getTools();
      console.log('=== TOOLS DATA RECEIVED ===');
      console.log('Raw data:', data);
      console.log('Data type:', typeof data);
      console.log('Is array?', Array.isArray(data));
      console.log('Data length:', Array.isArray(data) ? data.length : 'N/A');
      if (Array.isArray(data) && data.length > 0) {
        console.log('First tool sample:', data[0]);
      } else if (Array.isArray(data) && data.length === 0) {
        console.warn('⚠️ API returned empty array - no tools in database or role issue');
      }
      
      // Handle both array and object responses
      let toolsArray: any[] = [];
      if (Array.isArray(data)) {
        toolsArray = data;
      } else if (data && typeof data === 'object' && 'tools' in data) {
        toolsArray = (data as any).tools || [];
      } else if (data && typeof data === 'object' && 'data' in data) {
        toolsArray = (data as any).data || [];
      } else {
        console.warn('Unexpected data format:', data);
        toolsArray = [];
      }
      
      // Ensure each tool has an id property (mapped from _id if necessary)
      const mappedData = toolsArray.map((tool: any) => ({
        ...tool,
        id: tool.id || tool._id || tool._id?.toString()
      }));
      console.log('Mapped tools:', mappedData);
      console.log('Final tools count:', mappedData.length);
      setTools(mappedData);
      setLastUpdated(new Date());
      
      if (mappedData.length === 0) {
        console.warn('No tools found. This could mean:');
        console.warn('1. No credentials exist in the database');
        console.warn('2. User role is not admin/accountant');
        console.warn('3. Backend is not returning data correctly');
      }
    } catch (err: any) {
      console.error('Error loading tools:', err);
      console.error('Error details:', {
        message: err.message,
        status: (err as any).status,
        response: (err as any).response
      });
      setError(err.message || 'Failed to load tools');
      showToast(err.message || 'Failed to load credentials', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTools();
    if (!readOnly) {
      loadUsers();
    }
  }, [readOnly]);

  useEffect(() => {
    const loadOrganizations = async () => {
      try {
        const list = await apiClient.getOrganizations();
        setOrganizations(list.map((o: any) => ({ id: o.id || o._id, name: o.name || '' })));
      } catch (err) {
        console.error('Error loading organizations:', err);
      }
    };
    loadOrganizations();
  }, []);

  // Close dropdown when clicking outside (create/edit category only)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showCreateCategoryDropdown && !target.closest('.create-category-dropdown')) {
        setShowCreateCategoryDropdown(false);
      }
      if (showEditCategoryDropdown && !target.closest('.edit-category-dropdown')) {
        setShowEditCategoryDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCreateCategoryDropdown, showEditCategoryDropdown]);

  const loadUsers = async () => {
    try {
      const userList = await apiClient.getUsersForSharing();
      setUsers(userList);
    } catch (err: any) {
      console.error('Error loading users:', err);
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ];
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
      showToast('Please upload an Excel file (.xlsx, .xls) or CSV file', 'error');
      e.target.value = '';
      return;
    }

    setImportingExcel(true);
    setImportResult(null);

    try {
      showToast('Importing tools from Excel...', 'info');
      const result = await apiClient.importToolsExcel(file);

      setImportResult({
        success: result.success,
        message: result.message,
        imported: result.imported,
        skipped: result.skipped,
        errors: result.errors,
        errorDetails: result.errorDetails || []
      });

      if (result.success) {
        showToast(result.message, 'success');
        // Reload tools
        await loadTools();
      } else {
        showToast(result.message || 'Import completed with errors', 'warning');
      }
    } catch (error: any) {
      console.error('Error importing Excel:', error);
      showToast(error.message || 'Failed to import Excel file', 'error');
      setImportResult({
        success: false,
        message: error.message || 'Failed to import Excel file',
        imported: 0,
        skipped: 0,
        errors: 0,
        errorDetails: []
      });
    } finally {
      setImportingExcel(false);
      e.target.value = ''; // Reset file input
    }
  };

  const handleExportCredentials = () => {
    const dataToExport = filteredTools;
    if (dataToExport.length === 0) {
      showToast('No credentials to export', 'warning');
      return;
    }
    setExportingCredentials(true);
    try {
      const escapeCsv = (val: string) => {
        const s = String(val ?? '');
        if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
        return s;
      };
      const headers = ['Tool Name', 'Organization Name', 'Category', 'Description', 'Username', 'Password', '2FA Enabled', '2FA Method', 'Payment Method (Pricing)', 'Paid/Free', 'Comments'];
      const rows = dataToExport.map((tool: any) => {
        const orgName = tool.organizationId && typeof tool.organizationId === 'object' && 'name' in tool.organizationId
          ? String((tool.organizationId as { name?: string }).name ?? '')
          : '';
        const paymentInfo = tool.isPaid && tool.price
          ? `${tool.paymentMethod || 'other'} $${tool.price} ${tool.billingPeriod === 'yearly' ? 'yearly' : 'monthly'}`
          : '';
        const paidFree = tool.isPaid ? 'Paid' : 'Free';
        const twoFA = tool.has2FA ? 'Yes' : 'No';
        const twoFAMethod = tool.twoFactorMethod || '';
        return [
          escapeCsv(tool.name ?? ''),
          escapeCsv(orgName),
          escapeCsv(tool.category ?? ''),
          escapeCsv(tool.description ?? ''),
          escapeCsv(tool.username ?? ''),
          escapeCsv(tool.password ?? ''),
          escapeCsv(twoFA),
          escapeCsv(twoFAMethod),
          escapeCsv(paymentInfo),
          escapeCsv(paidFree),
          escapeCsv(tool.notes ?? '')
        ].join(',');
      });
      const csv = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `credentials_export_${new Date().toISOString().slice(0, 10)}.csv`;
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      showToast(`Exported ${dataToExport.length} credential(s) to CSV`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Export failed', 'error');
    } finally {
      setExportingCredentials(false);
    }
  };

  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Validation for mandatory fields
      if (!formData.username || formData.username.trim() === '') {
        showToast('Username is required', 'warning');
        return;
      }
      if (!formData.password || formData.password.trim() === '') {
        showToast('Password is required', 'warning');
        return;
      }
      if (!formData.price || formData.price <= 0) {
        showToast('Price is required and must be greater than 0', 'warning');
        return;
      }
      if (formData.has2FA && !formData.twoFactorMethod) {
        showToast('Please select a 2FA method', 'warning');
        return;
      }

      await apiClient.createTool({
        ...formData,
        organizationId: formData.organizationId || undefined,
        twoFactorMethod: formData.twoFactorMethod || null,
        paymentMethod: formData.paymentMethod || null,
        tags: [], // Tags removed - not displayed
      });
      
      setShowCreateModal(false);
      setFormData({
        name: '',
        description: '',
        category: '',
        organizationId: '',
        username: '',
        password: '',
        apiKey: '',
        notes: '',
        tags: '',
        isPaid: false,
        hasAutopay: false,
        price: 0,
        billingPeriod: 'monthly',
        has2FA: false,
        twoFactorMethod: '',
        paymentMethod: 'card',
        cardLast4Digits: '',
        status: 'active'
      });
      setSelectedTemplate(null);
      loadTools();
    } catch (err: any) {
      console.error('Error creating tool:', err);
      showToast(err.message || 'Failed to create tool', 'error');
    }
  };

  const handleEdit = (tool: any) => {
    setSelectedTool(tool);
    const orgId = tool.organizationId
      ? (typeof tool.organizationId === 'object' ? (tool.organizationId as any).id ?? (tool.organizationId as any)._id : tool.organizationId)
      : '';
    setFormData({
      name: tool.name || '',
      description: tool.description || '',
      category: tool.category || '',
      organizationId: orgId || '',
      username: tool.username || '',
      password: tool.password || '',
      apiKey: tool.apiKey || '',
      notes: tool.notes || '',
      tags: '', // Tags removed - not displayed
      isPaid: tool.isPaid || false,
      hasAutopay: tool.hasAutopay || false,
      price: tool.price || 0,
      billingPeriod: (tool.billingPeriod as 'monthly' | 'yearly') || 'monthly',
      has2FA: tool.has2FA || false,
      twoFactorMethod: (tool.twoFactorMethod as '' | 'mobile' | 'email') || '',
      paymentMethod: (tool.paymentMethod as ToolFormData['paymentMethod']) || 'card',
      cardLast4Digits: tool.cardLast4Digits || '',
      status: (tool.status as ToolFormData['status']) || 'active'
    });
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTool) return;

    try {
      if (formData.isPaid && (!formData.price || formData.price <= 0)) {
        showToast('Please enter a valid price for paid tools', 'warning');
        return;
      }
      if (formData.has2FA && !formData.twoFactorMethod) {
        showToast('Please select a 2FA method', 'warning');
        return;
      }
      if (formData.paymentMethod === 'card' && (!formData.cardLast4Digits || formData.cardLast4Digits.length !== 4)) {
        showToast('Please enter last 4 digits of the card', 'warning');
        return;
      }

      await apiClient.updateTool(selectedTool.id, {
        ...formData,
        organizationId: formData.organizationId || undefined,
        twoFactorMethod: formData.twoFactorMethod || null,
        paymentMethod: formData.paymentMethod || null,
        tags: [], // Tags removed - not displayed
      });
      
      setShowEditModal(false);
      setSelectedTool(null);
      loadTools();
    } catch (err: any) {
      console.error('Error updating tool:', err);
      showToast(err.message || 'Failed to update tool', 'error');
    }
  };

  const handleDeleteClick = (toolId: string, toolName: string) => {
    setConfirmAction({ toolId, toolName });
    setShowConfirmModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!confirmAction) return;

    try {
      await apiClient.deleteTool(confirmAction.toolId);
      showToast(`"${confirmAction.toolName}" deleted successfully`, 'success');
      setShowConfirmModal(false);
      setConfirmAction(null);
      loadTools();
    } catch (err: any) {
      console.error('Error deleting tool:', err);
      showToast(err.message || 'Failed to delete tool', 'error');
      setShowConfirmModal(false);
      setConfirmAction(null);
    }
  };

  const handleDeleteAllConfirm = async () => {
    try {
      setDeletingAll(true);
      const result = await apiClient.deleteAllTools();
      showToast(result.message || `Successfully deleted ${result.deletedCount} credential(s)`, 'success');
      setShowDeleteAllModal(false);
      loadTools();
    } catch (err: any) {
      console.error('Error deleting all tools:', err);
      showToast(err.message || 'Failed to delete all credentials', 'error');
    } finally {
      setDeletingAll(false);
    }
  };

  const handleView = (tool: any) => {
    setSelectedTool(tool);
    setShowPassword(false); // Reset password visibility when opening view modal
    setShowViewModal(true);
  };

  const handleShare = (tool: any) => {
    setSelectedTool(tool);
    setShareData({ userId: '', permission: 'view' });
    setShowShareModal(true);
  };

  const handleShareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareData.userId) {
      showToast('Please select a user to share with', 'warning');
      return;
    }

    try {
      await apiClient.shareTool(selectedTool.id, {
        userId: shareData.userId,
        permission: shareData.permission
      });
      
      showToast('Credential shared successfully! The user will receive an email notification.', 'success');
      setShowShareModal(false);
      setShareData({ userId: '', permission: 'view' });
      loadTools(); // Refresh tools list
    } catch (err: any) {
      showToast(err.message || 'Failed to share credential', 'error');
    }
  };

    const filteredTools = tools.filter(tool => {
    // Global search - search across all relevant fields
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
      tool.name?.toLowerCase().includes(searchLower) ||
      tool.description?.toLowerCase().includes(searchLower) ||
      tool.category?.toLowerCase().includes(searchLower) ||
      tool.username?.toLowerCase().includes(searchLower) ||
      tool.notes?.toLowerCase().includes(searchLower) ||
      (Array.isArray(tool.tags) && tool.tags.some((tag: string) => tag.toLowerCase().includes(searchLower))) ||
      tool.project?.toLowerCase().includes(searchLower) ||
      tool.department?.toLowerCase().includes(searchLower) ||
      tool.client?.toLowerCase().includes(searchLower) ||
      (tool.createdBy && typeof tool.createdBy === 'object' && 'name' in tool.createdBy && 
       (tool.createdBy.name as string)?.toLowerCase().includes(searchLower)) ||
      (tool.createdBy && typeof tool.createdBy === 'object' && 'email' in tool.createdBy && 
       (tool.createdBy.email as string)?.toLowerCase().includes(searchLower)) ||
      (tool.organizationId && typeof tool.organizationId === 'object' && 'name' in tool.organizationId && 
       (tool.organizationId.name as string)?.toLowerCase().includes(searchLower));

    // Category filter
    const matchesCategory = filterCategory === 'all' ||
                           (tool.category && tool.category.toLowerCase().replace(/\s+/g, '-') === filterCategory);

    // Date filter
    let matchesDate = true;
    if (filterDate !== 'all' && tool.createdAt) {
      const toolDate = new Date(tool.createdAt);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      switch (filterDate) {
        case 'today':
          matchesDate = toolDate >= today;
          break;
        case 'this-week':
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          matchesDate = toolDate >= weekAgo;
          break;
        case 'this-month':
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          matchesDate = toolDate >= monthAgo;
          break;
        case 'last-30-days':
          const thirtyDaysAgo = new Date(today);
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          matchesDate = toolDate >= thirtyDaysAgo;
          break;
        case 'last-90-days':
          const ninetyDaysAgo = new Date(today);
          ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
          matchesDate = toolDate >= ninetyDaysAgo;
          break;
        case 'this-year':
          const yearStart = new Date(now.getFullYear(), 0, 1);
          matchesDate = toolDate >= yearStart;
          break;
        default:
          matchesDate = true;
      }
    }

    // Paid / Unpaid filter
    const matchesPaid =
      filterPaid === 'all' ||
      (filterPaid === 'paid' && tool.isPaid) ||
      (filterPaid === 'unpaid' && !tool.isPaid);

    // Status filter (active / inactive)
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && (tool.status === 'active' || !tool.status)) ||
      (filterStatus === 'inactive' && tool.status === 'inactive');

    // Payment method filter
    const matchesPaymentMethod =
      filterPaymentMethod === 'all' ||
      (tool.paymentMethod && String(tool.paymentMethod).toLowerCase() === filterPaymentMethod);

    // Billing period filter
    const matchesBillingPeriod =
      filterBillingPeriod === 'all' ||
      (tool.billingPeriod && String(tool.billingPeriod).toLowerCase() === filterBillingPeriod);

    // Organization filter (all orgs from tool.organizationId)
    const orgName = tool.organizationId && typeof tool.organizationId === 'object' && 'name' in tool.organizationId
      ? String((tool.organizationId as { name?: string }).name || '').trim()
      : '';
    const matchesOrganization =
      filterOrganizationName === 'all' ||
      (orgName && orgName.toLowerCase() === filterOrganizationName.toLowerCase());

    return matchesSearch && matchesCategory && matchesDate && matchesPaid && matchesStatus && matchesPaymentMethod && matchesBillingPeriod && matchesOrganization;
  });

  const uniqueOrganizationNames = useMemo(() => {
    const names = new Set<string>();
    tools.forEach(t => {
      const n = t.organizationId?.name;
      if (n != null && String(n).trim()) names.add(String(n).trim());
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [tools]);

  const toolStats = useMemo(() => {
    const total = tools.length;
    const active = tools.filter(t => t.status === 'active').length;
    const paid = tools.filter(t => t.isPaid).length;
    const monthlySpend = tools.reduce((acc, t) => {
      if (!t.isPaid || !t.price) return acc;
      return acc + (t.billingPeriod === 'yearly' ? t.price / 12 : t.price);
    }, 0);
    const with2FA = tools.filter(t => t.has2FA).length;

    return { total, active, paid, monthlySpend, with2FA };
  }, [tools]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-[2.5rem]" />
          ))}
        </div>
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <FiX className="h-5 w-5 text-red-600 dark:text-red-400" />
            <div>
              <h3 className="text-sm font-semibold text-red-800 dark:text-red-200">Error Loading Credentials</h3>
              <p className="text-sm text-red-600 dark:text-red-300 mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={() => loadTools()}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Credentials</h1>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <FiRefreshCw className="h-4 w-4" />
          <span>Updated {formatTime(lastUpdated)}</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard 
          title="Total Credentials" 
          value={toolStats.total} 
          subtitle={`${toolStats.active} currently active`}
          icon={<FiKey className="text-white h-6 w-6" />}
          color="from-purple-600 to-indigo-700"
          growth="+3.2%"
        />
        <SummaryCard 
          title="Active Tools" 
          value={toolStats.active} 
          subtitle="Ready for deployment"
          icon={<FiActivity className="text-white h-6 w-6" />}
          color="from-blue-500 to-cyan-600"
          growth="+1.5%"
        />
        <SummaryCard 
          title="Monthly Burn" 
          value={`$${toolStats.monthlySpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} 
          subtitle="Software & SaaS spend"
          icon={<FiDollarSign className="text-white h-6 w-6" />}
          color="from-emerald-500 to-green-600"
          growth="+5.8%"
        />
        <SummaryCard 
          title="Security" 
          value={`${toolStats.with2FA}/${toolStats.total}`} 
          subtitle="Tools with 2FA enabled"
          icon={<FiShield className="text-white h-6 w-6" />}
          color="from-orange-500 to-rose-600"
          growth="+2.1%"
        />
      </div>

      {/* Enhanced Action Bar */}
      <div className="bg-gradient-to-r from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
          {/* Left Section - Filter dropdowns & Search */}
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 shrink-0 hidden sm:inline">Filters:</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="min-w-[120px] px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
            >
              <option value="all">Category</option>
              {SERVICE_CATEGORIES.filter(c => c.id !== 'all').map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            <select
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="min-w-[120px] px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
            >
              <option value="all">Date</option>
              <option value="today">Today</option>
              <option value="this-week">This Week</option>
              <option value="this-month">This Month</option>
              <option value="last-30-days">Last 30 Days</option>
              <option value="last-90-days">Last 90 Days</option>
              <option value="this-year">This Year</option>
            </select>
            <select
              value={filterPaid}
              onChange={(e) => setFilterPaid(e.target.value as 'all' | 'paid' | 'unpaid')}
              className="min-w-[100px] px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
            >
              <option value="all">Payment</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
              className="min-w-[100px] px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
            >
              <option value="all">Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <select
              value={filterPaymentMethod}
              onChange={(e) => setFilterPaymentMethod(e.target.value)}
              className="min-w-[100px] px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
            >
              <option value="all">Pay method</option>
              <option value="card">Card</option>
              <option value="bank">Bank</option>
              <option value="paypal">PayPal</option>
              <option value="other">Other</option>
            </select>
            <select
              value={filterBillingPeriod}
              onChange={(e) => setFilterBillingPeriod(e.target.value)}
              className="min-w-[100px] px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
            >
              <option value="all">Billing</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
            <select
              value={filterOrganizationName}
              onChange={(e) => setFilterOrganizationName(e.target.value)}
              className="min-w-[160px] px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
            >
              <option value="all">Organization</option>
              {uniqueOrganizationNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                setFilterCategory('all');
                setFilterDate('all');
                setFilterPaid('all');
                setFilterStatus('all');
                setFilterPaymentMethod('all');
                setFilterBillingPeriod('all');
                setFilterOrganizationName('all');
              }}
              className="px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors shrink-0"
            >
              Clear filters
            </button>
            <div className="hidden sm:block h-6 w-px bg-gray-300 dark:bg-gray-600 shrink-0" />

            {/* Enhanced Global Search */}
            <div className="relative flex-1 min-w-[280px] max-w-md">
              <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Search by name, username, company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 shadow-sm hover:shadow placeholder-gray-400 dark:placeholder-gray-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <FiX className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Right Section - Actions */}
          {!readOnly && (
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Export Button */}
              <button
                type="button"
                onClick={handleExportCredentials}
                disabled={exportingCredentials || filteredTools.length === 0}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-all duration-200 shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exportingCredentials ? (
                  <FiRefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <FiDownload className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">{exportingCredentials ? 'Exporting...' : 'Export'}</span>
              </button>

              {/* Delete All Button */}
              <button
                onClick={() => setShowDeleteAllModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-red-600 to-red-700 rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <FiTrash2 className="h-4 w-4" />
                <span className="hidden sm:inline">Delete All</span>
              </button>

              {/* Import Excel */}
              <label className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-green-700 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-md hover:shadow-lg cursor-pointer">
                  <FiUpload className="h-4 w-4" />
                  <span className="hidden sm:inline">{importingExcel ? 'Importing...' : 'Import Excel'}</span>
                  <span className="sm:hidden">{importingExcel ? '...' : 'Import'}</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleImportExcel}
                    disabled={importingExcel}
                    className="hidden"
                  />
              </label>

              {/* Add Credential Button */}
              <button
                onClick={() => {
                  setFormData({
                    name: '',
                    description: '',
                    category: '',
                    organizationId: '',
                    username: '',
                    password: '',
                    apiKey: '',
                    notes: '',
                    tags: '',
                    isPaid: false,
                    hasAutopay: false,
                    price: 0,
                    billingPeriod: 'monthly',
                    has2FA: false,
                    twoFactorMethod: '',
                    paymentMethod: '',
                    cardLast4Digits: '',
                    status: 'active'
                  });
                  setSelectedTemplate(null);
                  setShowCreateModal(true);
                }}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <FiPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Credential</span>
                <span className="sm:hidden">Add</span>
              </button>
            </div>
          )}
          
          {/* Read Only Badge */}
          {readOnly && (
            <div className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg shadow-sm">
              <FiShield className="h-4 w-4" />
              <span>View Only</span>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-foreground uppercase tracking-wider">TOOL NAME</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-foreground uppercase tracking-wider">USERNAME</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-foreground uppercase tracking-wider">CATEGORY</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-foreground uppercase tracking-wider">ACTIONS</th>
                </tr>
              </thead>
                <tbody className="bg-card divide-y divide-gray-200">
                  {filteredTools.length > 0 ? (
                    filteredTools.map((tool, index) => (
                      <tr key={tool.id || index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                            <FiKey className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-foreground">{tool.name}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              Created: {formatDate(tool.createdAt || tool.created_at || new Date())}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-foreground">{tool.username || '-'}</div>
                      </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {tool.category ? (
                          <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                            {tool.category}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleView(tool)}
                          className="p-1.5 text-primary hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View"
                        >
                          <FiEye className="h-5 w-5" />
                        </button>
                        {!readOnly && (
                          <>
                            <button
                              onClick={() => handleShare(tool)}
                              className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                              title="Share"
                            >
                              <FiShare2 className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(tool.id, tool.name)}
                              className="p-1.5 text-destructive hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <FiTrash2 className="h-5 w-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <FiTool className="h-12 w-12 text-gray-400" />
                      <div>
                        <h3 className="text-sm font-medium text-foreground mb-1">
                          {loading ? 'Loading credentials...' : error ? 'Error loading credentials' : 'No credentials found'}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {error ? (
                            <span className="text-red-600">{error}</span>
                          ) : searchTerm || filterCategory !== 'all' || filterDate !== 'all' || filterPaid !== 'all' || filterStatus !== 'all' || filterPaymentMethod !== 'all' || filterBillingPeriod !== 'all' || filterOrganizationName !== 'all' ? (
                            'Try adjusting your filters'
                          ) : (
                            readOnly 
                              ? 'No credentials available to view'
                              : 'Get started by adding your first credential'
                          )}
                        </p>
                        {error && (
                          <button
                            onClick={() => loadTools()}
                            className="mt-3 px-4 py-2 text-sm text-primary hover:underline"
                          >
                            Retry
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Import Result */}
      {importResult && (
        <div className={`bg-card rounded-lg border border-border p-4 ${
          importResult.success ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
        }`}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className={`text-sm font-semibold mb-2 ${
                importResult.success ? 'text-green-800' : 'text-yellow-800'
              }`}>
                {importResult.success ? '✓ Import Successful' : '⚠ Import Completed with Errors'}
              </h4>
              <p className="text-sm text-foreground mb-2">{importResult.message}</p>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>Imported: <strong className="text-foreground">{importResult.imported}</strong></span>
                <span>Skipped: <strong className="text-foreground">{importResult.skipped}</strong></span>
                {importResult.errors > 0 && (
                  <span>Errors: <strong className="text-destructive">{importResult.errors}</strong></span>
                )}
              </div>
              {importResult.imported === 0 && importResult.skipped > 0 && (
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800">
                  All rows were skipped (likely duplicates). Ensure your Excel has a column named <strong>Tool Name</strong> (or <strong>Tools Name</strong>).
                </p>
              )}
              {importResult.errorDetails && importResult.errorDetails.length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                    View error details ({importResult.errorDetails.length})
                  </summary>
                  <div className="mt-2 max-h-40 overflow-y-auto text-xs">
                    {importResult.errorDetails.map((error, idx) => (
                      <div key={idx} className="text-destructive mb-1">
                        Row {error.row}: {error.toolName} - {error.error}
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
            <button
              onClick={() => setImportResult(null)}
              className="p-1 text-muted-foreground hover:text-foreground"
            >
              <FiX className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-border bg-gray-50">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Create New Credential</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Add a new tool or credential</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 text-muted-foreground hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <form onSubmit={handleCreate} className="space-y-6">
                {/* Template Selection */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <label className="block text-sm font-semibold text-foreground mb-3">Use Template (Optional)</label>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {Object.entries(templates).map(([key]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => applyTemplate(key)}
                        className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                          selectedTemplate === key
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-foreground border-border hover:bg-blue-50 hover:border-blue-300'
                        }`}
                      >
                        {key.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  {selectedTemplate && (
                    <p className="mt-2 text-xs text-gray-600">
                      Template "{selectedTemplate.toUpperCase()}" applied. Fill in username, password, and price.
                    </p>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Tool Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-background focus:bg-white"
                      placeholder="Enter tool name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none bg-background focus:bg-white"
                      placeholder="Brief description..."
                    />
                  </div>

                  <div className="relative create-category-dropdown">
                    <label className="block text-sm font-semibold text-foreground mb-2">Category</label>
                    <button
                      type="button"
                      onClick={() => setShowCreateCategoryDropdown(!showCreateCategoryDropdown)}
                      className="w-full px-4 py-3 border border-[#e5e9f2] rounded-xl text-left text-base sm:text-lg text-foreground bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow shadow-[0_1px_2px_rgba(16,24,40,0.05)] flex items-center justify-between"
                    >
                      <span className={formData.category ? 'text-foreground' : 'text-gray-400'}>
                        {formData.category || 'e.g., Cloud Services'}
                      </span>
                      <FiChevronDown className={`h-5 w-5 text-gray-500 transition-transform ${showCreateCategoryDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    {showCreateCategoryDropdown && (
                      <div className="absolute z-50 mt-2 w-full bg-white border border-[#e5e9f2] rounded-2xl shadow-xl overflow-hidden max-h-80 overflow-y-auto">
                        {SERVICE_CATEGORIES.map((category) => (
                          <button
                            key={category.id}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, category: category.name });
                              setShowCreateCategoryDropdown(false);
                            }}
                            className={`w-full text-left px-4 py-3 text-base ${
                              formData.category === category.name
                                ? 'bg-blue-50 text-blue-700 font-semibold'
                                : 'text-gray-800 hover:bg-gray-50'
                            }`}
                          >
                            {category.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Organization</label>
                    <select
                      value={formData.organizationId}
                      onChange={(e) => setFormData({ ...formData, organizationId: e.target.value })}
                      className="w-full px-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-background focus:bg-white"
                    >
                      <option value="">Select organization (optional)</option>
                      {organizations.map((org) => (
                        <option key={org.id} value={org.id}>{org.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-4 border-t border-border pt-6">
                  <h4 className="text-sm font-semibold text-foreground mb-4">Credentials</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Username <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        className="w-full px-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-background focus:bg-white"
                        placeholder="Enter username"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Password <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        required
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-background focus:bg-white"
                        placeholder="Enter password"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">API Key</label>
                    <input
                      type="text"
                      value={formData.apiKey}
                      onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                      className="w-full px-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono text-sm bg-background focus:bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-4 border-t border-border pt-6">
                  <h4 className="text-sm font-semibold text-foreground mb-4">Additional Information</h4>
                  
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none bg-background focus:bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-4 border-t border-border pt-6">
                  <h4 className="text-sm font-semibold text-foreground mb-4">Options</h4>
                  
                  <div className="flex flex-wrap items-center gap-6">
                    <label className="flex items-center cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={formData.isPaid}
                        onChange={(e) => setFormData({ ...formData, isPaid: e.target.checked })}
                        className="h-4 w-4 text-primary focus:ring-blue-500 border-border rounded cursor-pointer"
                      />
                      <span className="ml-2.5 text-sm font-medium text-foreground group-hover:text-foreground">Paid Tool</span>
                    </label>
                    <label className="flex items-center cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={formData.hasAutopay}
                        onChange={(e) => setFormData({ ...formData, hasAutopay: e.target.checked })}
                        className="h-4 w-4 text-primary focus:ring-blue-500 border-border rounded cursor-pointer"
                      />
                      <span className="ml-2.5 text-sm font-medium text-foreground group-hover:text-foreground">Autopay Enabled</span>
                    </label>
                    <label className="flex items-center cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={formData.has2FA}
                        onChange={(e) => setFormData({ ...formData, has2FA: e.target.checked, twoFactorMethod: e.target.checked ? formData.twoFactorMethod : '' })}
                        className="h-4 w-4 text-primary focus:ring-blue-500 border-border rounded cursor-pointer"
                      />
                      <span className="ml-2.5 text-sm font-medium text-foreground group-hover:text-foreground">2FA Enabled</span>
                    </label>
                  </div>

                  {formData.has2FA && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <label className="block text-sm font-semibold text-foreground mb-3">2FA Method <span className="text-red-500">*</span></label>
                      <div className="flex gap-6">
                        <label className="flex items-center cursor-pointer">
                            <input
                              type="radio"
                              name="twoFactorMethod"
                              value="mobile"
                              checked={formData.twoFactorMethod === 'mobile'}
                              onChange={(e) => setFormData({ ...formData, twoFactorMethod: e.target.value as ToolFormData['twoFactorMethod'] })}
                            className="h-4 w-4 text-primary focus:ring-blue-500 border-border cursor-pointer"
                          />
                          <span className="ml-2.5 text-sm text-gray-700">Mobile</span>
                        </label>
                        <label className="flex items-center cursor-pointer">
                            <input
                              type="radio"
                              name="twoFactorMethod"
                              value="email"
                              checked={formData.twoFactorMethod === 'email'}
                              onChange={(e) => setFormData({ ...formData, twoFactorMethod: e.target.value as ToolFormData['twoFactorMethod'] })}
                            className="h-4 w-4 text-primary focus:ring-blue-500 border-border cursor-pointer"
                          />
                          <span className="ml-2.5 text-sm text-gray-700">Email</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Price is always mandatory */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <h5 className="text-sm font-semibold text-foreground mb-4">Pricing Information</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-foreground mb-2">
                          Price <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-muted-foreground font-medium">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            value={formData.price}
                            onChange={(e) => {
                              const price = parseFloat(e.target.value) || 0;
                              setFormData({ ...formData, price, isPaid: price > 0 });
                            }}
                            className="w-full pl-8 pr-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-foreground mb-2">
                          Billing Period <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-4">
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="radio"
                              name="billingPeriod"
                              value="monthly"
                              checked={formData.billingPeriod === 'monthly'}
                              onChange={(e) => setFormData({ ...formData, billingPeriod: e.target.value as ToolFormData['billingPeriod'] })}
                              className="h-4 w-4 text-primary focus:ring-blue-500 border-border cursor-pointer"
                            />
                            <span className="ml-2.5 text-sm text-gray-700">Monthly</span>
                          </label>
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="radio"
                              name="billingPeriod"
                              value="yearly"
                              checked={formData.billingPeriod === 'yearly'}
                              onChange={(e) => setFormData({ ...formData, billingPeriod: e.target.value as ToolFormData['billingPeriod'] })}
                              className="h-4 w-4 text-primary focus:ring-blue-500 border-border cursor-pointer"
                            />
                            <span className="ml-2.5 text-sm text-gray-700">Yearly</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <h5 className="text-sm font-semibold text-foreground mb-4">Payment Method</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-foreground mb-2">
                          Payment Method
                        </label>
                        <select
                          value={formData.paymentMethod}
                          onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any, cardLast4Digits: e.target.value !== 'card' ? '' : formData.cardLast4Digits })}
                          className="w-full px-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                        >
                          <option value="">Select Payment Method</option>
                          <option value="card">Card</option>
                          <option value="bank">Bank Transfer</option>
                          <option value="paypal">PayPal</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      {formData.paymentMethod === 'card' && (
                        <div>
                          <label className="block text-sm font-semibold text-foreground mb-2">
                            Last 4 Digits <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <FiCreditCard className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                            <input
                              type="text"
                              maxLength={4}
                              value={formData.cardLast4Digits}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                                setFormData({ ...formData, cardLast4Digits: value });
                              }}
                              className="w-full pl-11 pr-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                              placeholder="1234"
                            />
                          </div>
                          <p className="mt-1.5 text-xs text-gray-500">Enter last 4 digits of the card</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-5 py-2.5 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    Create Credential
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal - Similar structure to Create Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-border bg-gray-50">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Edit Credential</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Update credential information</p>
              </div>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedTool(null);
                }}
                className="p-2 text-muted-foreground hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <form onSubmit={handleUpdate} className="space-y-6">
                {/* Same form structure as Create Modal - keeping it concise */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Tool Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-background focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none bg-background focus:bg-white"
                    />
                  </div>

                  <div className="relative edit-category-dropdown">
                    <label className="block text-sm font-semibold text-foreground mb-2">Category</label>
                    <button
                      type="button"
                      onClick={() => setShowEditCategoryDropdown(!showEditCategoryDropdown)}
                      className="w-full px-4 py-3 border border-[#e5e9f2] rounded-xl text-left text-base sm:text-lg text-foreground bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow shadow-[0_1px_2px_rgba(16,24,40,0.05)] flex items-center justify-between"
                    >
                      <span className={formData.category ? 'text-foreground' : 'text-gray-400'}>
                        {formData.category || 'e.g., Cloud Services'}
                      </span>
                      <FiChevronDown className={`h-5 w-5 text-gray-500 transition-transform ${showEditCategoryDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    {showEditCategoryDropdown && (
                      <div className="absolute z-50 mt-2 w-full bg-white border border-[#e5e9f2] rounded-2xl shadow-xl overflow-hidden max-h-80 overflow-y-auto">
                        {SERVICE_CATEGORIES.map((category) => (
                          <button
                            key={category.id}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, category: category.name });
                              setShowEditCategoryDropdown(false);
                            }}
                            className={`w-full text-left px-4 py-3 text-base ${
                              formData.category === category.name
                                ? 'bg-blue-50 text-blue-700 font-semibold'
                                : 'text-gray-800 hover:bg-gray-50'
                            }`}
                          >
                            {category.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Organization</label>
                    <select
                      value={formData.organizationId}
                      onChange={(e) => setFormData({ ...formData, organizationId: e.target.value })}
                      className="w-full px-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-background focus:bg-white"
                    >
                      <option value="">Select organization (optional)</option>
                      {organizations.map((org) => (
                        <option key={org.id} value={org.id}>{org.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-4 border-t border-border pt-6">
                  <h4 className="text-sm font-semibold text-foreground mb-4">Credentials</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">Username</label>
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        className="w-full px-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-background focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">Password</label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-background focus:bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">API Key</label>
                    <input
                      type="text"
                      value={formData.apiKey}
                      onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                      className="w-full px-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono text-sm bg-background focus:bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-4 border-t border-border pt-6">
                  <h4 className="text-sm font-semibold text-foreground mb-4">Additional Information</h4>
                  
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none bg-background focus:bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-4 border-t border-border pt-6">
                  <h4 className="text-sm font-semibold text-foreground mb-4">Options</h4>
                  
                  <div className="flex flex-wrap items-center gap-6">
                    <label className="flex items-center cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={formData.isPaid}
                        onChange={(e) => setFormData({ ...formData, isPaid: e.target.checked, price: e.target.checked ? formData.price : 0 })}
                        className="h-4 w-4 text-primary focus:ring-blue-500 border-border rounded cursor-pointer"
                      />
                      <span className="ml-2.5 text-sm font-medium text-foreground group-hover:text-foreground">Paid Tool</span>
                    </label>
                    <label className="flex items-center cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={formData.hasAutopay}
                        onChange={(e) => setFormData({ ...formData, hasAutopay: e.target.checked })}
                        className="h-4 w-4 text-primary focus:ring-blue-500 border-border rounded cursor-pointer"
                      />
                      <span className="ml-2.5 text-sm font-medium text-foreground group-hover:text-foreground">Autopay Enabled</span>
                    </label>
                    <label className="flex items-center cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={formData.has2FA}
                        onChange={(e) => setFormData({ ...formData, has2FA: e.target.checked, twoFactorMethod: e.target.checked ? formData.twoFactorMethod : '' })}
                        className="h-4 w-4 text-primary focus:ring-blue-500 border-border rounded cursor-pointer"
                      />
                      <span className="ml-2.5 text-sm font-medium text-foreground group-hover:text-foreground">2FA Enabled</span>
                    </label>
                  </div>

                  {formData.has2FA && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <label className="block text-sm font-semibold text-foreground mb-3">2FA Method <span className="text-red-500">*</span></label>
                      <div className="flex gap-6">
                        <label className="flex items-center cursor-pointer">
                          <input
                                type="radio"
                                name="twoFactorMethodEdit"
                                value="mobile"
                                checked={formData.twoFactorMethod === 'mobile'}
                                onChange={(e) => setFormData({ ...formData, twoFactorMethod: e.target.value as ToolFormData['twoFactorMethod'] })}
                            className="h-4 w-4 text-primary focus:ring-blue-500 border-border cursor-pointer"
                          />
                          <span className="ml-2.5 text-sm text-gray-700">Mobile</span>
                        </label>
                        <label className="flex items-center cursor-pointer">
                          <input
                                type="radio"
                                name="twoFactorMethodEdit"
                                value="email"
                                checked={formData.twoFactorMethod === 'email'}
                                onChange={(e) => setFormData({ ...formData, twoFactorMethod: e.target.value as ToolFormData['twoFactorMethod'] })}
                            className="h-4 w-4 text-primary focus:ring-blue-500 border-border cursor-pointer"
                          />
                          <span className="ml-2.5 text-sm text-gray-700">Email</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {formData.isPaid && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                      <h5 className="text-sm font-semibold text-foreground mb-4">Pricing Information</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-foreground mb-2">
                            Price <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-muted-foreground font-medium">$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              required={formData.isPaid}
                              value={formData.price}
                              onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                              className="w-full pl-8 pr-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-foreground mb-2">
                            Billing Period <span className="text-red-500">*</span>
                          </label>
                          <div className="flex gap-4">
                            <label className="flex items-center cursor-pointer">
                              <input
                                type="radio"
                                name="billingPeriodEdit"
                                value="monthly"
                                checked={formData.billingPeriod === 'monthly'}
                                onChange={(e) => setFormData({ ...formData, billingPeriod: e.target.value as ToolFormData['billingPeriod'] })}
                                className="h-4 w-4 text-primary focus:ring-blue-500 border-border cursor-pointer"
                              />
                              <span className="ml-2.5 text-sm text-gray-700">Monthly</span>
                            </label>
                            <label className="flex items-center cursor-pointer">
                              <input
                                type="radio"
                                name="billingPeriodEdit"
                                value="yearly"
                                checked={formData.billingPeriod === 'yearly'}
                                onChange={(e) => setFormData({ ...formData, billingPeriod: e.target.value as ToolFormData['billingPeriod'] })}
                                className="h-4 w-4 text-primary focus:ring-blue-500 border-border cursor-pointer"
                              />
                              <span className="ml-2.5 text-sm text-gray-700">Yearly</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Payment Method */}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <h5 className="text-sm font-semibold text-foreground mb-4">Payment Method</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-foreground mb-2">
                          Payment Method
                        </label>
                        <select
                          value={formData.paymentMethod}
                          onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any, cardLast4Digits: e.target.value !== 'card' ? '' : formData.cardLast4Digits })}
                          className="w-full px-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                        >
                          <option value="">Select Payment Method</option>
                          <option value="card">Card</option>
                          <option value="bank">Bank Transfer</option>
                          <option value="paypal">PayPal</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      {formData.paymentMethod === 'card' && (
                        <div>
                          <label className="block text-sm font-semibold text-foreground mb-2">
                            Last 4 Digits <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <FiCreditCard className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                            <input
                              type="text"
                              maxLength={4}
                              value={formData.cardLast4Digits}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                                setFormData({ ...formData, cardLast4Digits: value });
                              }}
                              className="w-full pl-11 pr-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                              placeholder="1234"
                            />
                          </div>
                          <p className="mt-1.5 text-xs text-gray-500">Enter last 4 digits of the card</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as ToolFormData['status'] })}
                      className="w-full px-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-background focus:bg-white"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedTool(null);
                    }}
                    className="px-5 py-2.5 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    Update Credential
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedTool && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-border bg-gray-50">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Credential Details</h3>
                <p className="text-sm text-muted-foreground mt-0.5">View complete information</p>
              </div>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedTool(null);
                }}
                className="p-2 text-muted-foreground hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
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
                            {selectedTool.apiKey.substring(0, 40)}...
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {Array.isArray(selectedTool.tags) && selectedTool.tags.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Tags</label>
                    <div className="flex flex-wrap gap-2">
                      {selectedTool.tags.map((tag: string, idx: number) => (
                        <span key={idx} className="inline-flex px-3 py-1 text-sm font-medium rounded-full bg-muted text-foreground border border-gray-200">
                          {tag}
                        </span>
                      ))}
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

                {selectedTool.paymentMethod && (
                  <div className="border-t border-border pt-6">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Payment Information</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Payment Method</label>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-primary/20 text-blue-800 border border-blue-200 capitalize">
                          <FiCreditCard className="h-4 w-4" />
                          {selectedTool.paymentMethod}
                        </span>
                      </div>
                      {selectedTool.paymentMethod === 'card' && selectedTool.cardLast4Digits && (
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Card Last 4 Digits</label>
                          <p className="text-sm font-mono text-foreground bg-background px-3 py-2 rounded-lg border border-gray-200">
                            •••• {selectedTool.cardLast4Digits}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-border bg-gray-50">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedTool(null);
                }}
                className="px-5 py-2.5 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-accent transition-colors"
              >
                Close
              </button>
              {!readOnly && (
                <>
                  <button
                    onClick={() => {
                      setShowViewModal(false);
                      handleShare(selectedTool);
                    }}
                    className="px-5 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-sm flex items-center gap-2"
                  >
                    <FiShare2 className="h-4 w-4" />
                    Share Credential
                  </button>
                  <button
                    onClick={() => {
                      setShowViewModal(false);
                      handleEdit(selectedTool);
                    }}
                    className="px-5 py-2.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    Edit Credential
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && selectedTool && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-border bg-gray-50">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Share Credential</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Share "{selectedTool.name}" with a user</p>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-2 text-muted-foreground hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleShareSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Select User <span className="text-red-500">*</span>
                </label>
                <select
                  value={shareData.userId}
                  onChange={(e) => setShareData({ ...shareData, userId: e.target.value })}
                  className="w-full px-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-background focus:bg-white"
                  required
                >
                  <option value="">Choose a user...</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-3">
                  Permission Level
                </label>
                <div className="space-y-2">
                  <label className="flex items-center cursor-pointer group">
                    <input
                      type="radio"
                      name="permission"
                      value="view"
                      checked={shareData.permission === 'view'}
                      onChange={(e) => setShareData({ ...shareData, permission: e.target.value as 'view' | 'edit' })}
                      className="h-4 w-4 text-primary focus:ring-blue-500 border-border cursor-pointer"
                    />
                    <div className="ml-3">
                      <span className="text-sm font-medium text-foreground group-hover:text-foreground">View Only</span>
                      <p className="text-xs text-gray-500">User can view the credential but cannot edit</p>
                    </div>
                  </label>
                  <label className="flex items-center cursor-pointer group">
                    <input
                      type="radio"
                      name="permission"
                      value="edit"
                      checked={shareData.permission === 'edit'}
                      onChange={(e) => setShareData({ ...shareData, permission: e.target.value as 'view' | 'edit' })}
                      className="h-4 w-4 text-primary focus:ring-blue-500 border-border cursor-pointer"
                    />
                    <div className="ml-3">
                      <span className="text-sm font-medium text-foreground group-hover:text-foreground">Edit</span>
                      <p className="text-xs text-gray-500">User can view and edit the credential</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <FiUsers className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Email Notification</p>
                    <p className="text-xs text-primary mt-1">
                      The selected user will receive an email notification when you share this credential.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowShareModal(false)}
                  className="px-5 py-2.5 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
                >
                  <FiShare2 className="h-4 w-4" />
                  Share Credential
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
          setConfirmAction(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Credential"
        message={`Are you sure you want to delete "${confirmAction?.toolName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      {/* Confirm Delete All Modal */}
      <ConfirmModal
        isOpen={showDeleteAllModal}
        onClose={() => setShowDeleteAllModal(false)}
        onConfirm={handleDeleteAllConfirm}
        title="Delete All Credentials"
        message={`Are you sure you want to delete ALL ${tools.length} credential(s)? This action cannot be undone and will permanently remove all credentials from the system.`}
        confirmText={deletingAll ? "Deleting..." : "Delete All"}
        cancelText="Cancel"
        type="danger"
        disabled={deletingAll}
      />
    </div>
  );
}
