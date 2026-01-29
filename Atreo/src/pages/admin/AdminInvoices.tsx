import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  FiFileText, 
  FiPlus, 
  FiDownload, 
  FiCheck, 
  FiX, 
  FiTrash2,
  FiRefreshCw,
  FiFilter,
  FiArrowUp,
  FiArrowDown,
  FiSearch,
  FiUpload,
  FiEdit2,
  FiEye
} from 'react-icons/fi';
import { apiClient, type Invoice, type InvoiceSummary, type Organization, type Tool } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import ConfirmModal from '../../components/shared/ConfirmModal';
import { useAuth } from '../../context/AuthContext';
import InvoiceSummaryCards from '../../components/admin/InvoiceSummaryCards';
import { logger } from '../../lib/logger';
import { TIMEOUTS, FILE_UPLOAD } from '@/constants';

export default function AdminInvoices() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    provider: '',
    startDate: '',
    endDate: '',
    filterMonth: '' // e.g. '2026-01' for Jan 2026, '' = All
  });
  // Applied filters (sent to API) – only updated when user clicks "Apply filters"
  const [appliedFilters, setAppliedFilters] = useState<{
    status?: string;
    provider?: string;
    startDate?: string;
    endDate?: string;
  }>({});
  const [sortBy, setSortBy] = useState<'billingDate' | 'amount' | 'provider' | 'status' | 'invoiceNumber' | 'organizationName'>('billingDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [editFormData, setEditFormData] = useState({
    invoiceNumber: '',
    amount: '',
    provider: '',
    billingDate: '',
    dueDate: '',
    category: '',
    organizationId: ''
  });
  const [createFormData, setCreateFormData] = useState({
    invoiceNumber: '',
    amount: '',
    provider: '',
    billingDate: '',
    dueDate: '',
    category: '',
    organizationId: '',
    toolIds: [] as string[],
    subscriptionDescription: ''
  });
  const [createFile, setCreateFile] = useState<File | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [allTools, setAllTools] = useState<Tool[]>([]);
  const [toolSearchQuery, setToolSearchQuery] = useState('');
  const [showToolDropdown, setShowToolDropdown] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [summary, setSummary] = useState<InvoiceSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
    const [importingExcel, setImportingExcel] = useState(false);
    const [exportingCSV, setExportingCSV] = useState(false);
    const [clearingAll, setClearingAll] = useState(false);
    const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
    const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    imported: number;
    skipped: number;
    errors: number;
    errorDetails: Array<{ row: number; error: string }>;
  } | null>(null);

  const loadSummary = useCallback(async () => {
    try {
      setSummaryLoading(true);
      const data = await apiClient.getInvoicesSummary();
      setSummary(data);
    } catch (error: any) {
      logger.error('Failed to load invoice summary', error);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const loadInvoices = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setIsRefreshing(true);

      logger.debug('Loading invoices with filters:', appliedFilters);

      const data = await apiClient.getInvoices({
        status: appliedFilters.status || undefined,
        provider: appliedFilters.provider || undefined,
        startDate: appliedFilters.startDate || undefined,
        endDate: appliedFilters.endDate || undefined
      });

      const mappedData = (data || []).map((inv: any) => ({
        ...inv,
        id: inv.id || inv._id
      }));

      logger.debug(`Loaded ${mappedData.length} invoices`);

      setInvoices(mappedData);
      setLastUpdated(new Date());

      if (data && data.length > 0) {
        showToast(`Loaded ${data.length} invoice${data.length === 1 ? '' : 's'}`, 'success');
      } else {
        showToast('No invoices found', 'info');
      }

      loadSummary();
    } catch (error: any) {
      logger.error('Failed to load invoices', error);

      if (error.status === 401) {
        showToast('Session expired. Please log in again.', 'error');
      } else if (error.status === 403) {
        showToast('You do not have permission to view invoices', 'error');
      } else if (error.status === 404) {
        showToast('Invoices endpoint not found. Check backend API.', 'error');
      } else if (error.name === 'NetworkError') {
        showToast('Cannot connect to server. Check if backend is running.', 'error');
      } else {
        showToast(error.message || 'Failed to load invoices', 'error');
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [appliedFilters, showToast, loadSummary]);

  useEffect(() => {
    loadInvoices();
    if (isAdmin) {
      loadOrganizations();
    }
  }, [loadInvoices, isAdmin]);

  const loadOrganizations = async () => {
    try {
      const data = await apiClient.getOrganizations();
      setOrganizations(data);
    } catch (error: any) {
      logger.error('Failed to load organizations', error);
    }
  };

  const loadTools = async () => {
    try {
      const data = await apiClient.getTools();
      setAllTools(data);
    } catch (error: any) {
      logger.error('Failed to load tools', error);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadTools();
    }
  }, [isAdmin]);

  const handleView = (invoice: Invoice) => {
    setViewingInvoice(invoice);
    setShowViewModal(true);
  };

  const handleEdit = (invoice: Invoice) => {
    // Check if invoice can be edited
    if (invoice.status === 'approved' && !isAdmin) {
      showToast('Cannot edit approved invoices', 'error');
      return;
    }
    
    setEditingInvoice(invoice);
    // Format dates for input fields (YYYY-MM-DD)
    const formatDateForInput = (dateStr: string | null | undefined): string => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      return date.toISOString().split('T')[0];
    };
    
    setEditFormData({
      invoiceNumber: invoice.invoiceNumber || '',
      amount: invoice.amount?.toString() || '',
      provider: invoice.provider || '',
      billingDate: formatDateForInput(invoice.billingDate),
      dueDate: formatDateForInput(invoice.dueDate),
      category: invoice.category || '',
      organizationId: invoice.organizationId || ''
    });
    setShowEditModal(true);
  };

  const handleUpdateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvoice) return;
    
    setSubmitting(true);

    try {
      if (!editFormData.invoiceNumber || !editFormData.amount || !editFormData.provider || !editFormData.billingDate) {
        showToast('Please fill all required fields', 'error');
        setSubmitting(false);
        return;
      }

      const amountValue = parseFloat(editFormData.amount);
      if (isNaN(amountValue) || amountValue <= 0) {
        showToast('Please enter a valid amount', 'error');
        setSubmitting(false);
        return;
      }

      await apiClient.updateInvoice(editingInvoice.id, {
        invoiceNumber: editFormData.invoiceNumber,
        amount: amountValue,
        provider: editFormData.provider,
        billingDate: editFormData.billingDate,
        dueDate: editFormData.dueDate || undefined,
        category: editFormData.category || undefined,
        organizationId: editFormData.organizationId || undefined
      });

      showToast('Invoice updated successfully!', 'success');
      setShowEditModal(false);
      setEditingInvoice(null);
      setEditFormData({
        invoiceNumber: '',
        amount: '',
        provider: '',
        billingDate: '',
        dueDate: '',
        category: '',
        organizationId: ''
      });
      loadInvoices(false);
    } catch (error: any) {
      logger.error('Failed to update invoice', error);
      showToast(error.message || 'Failed to update invoice', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (!createFormData.invoiceNumber || !createFormData.amount || !createFormData.provider || !createFormData.billingDate) {
        showToast('Please fill all required fields', 'error');
        setSubmitting(false);
        return;
      }

      const amountValue = parseFloat(createFormData.amount);
      if (isNaN(amountValue) || amountValue <= 0) {
        showToast('Please enter a valid amount', 'error');
        setSubmitting(false);
        return;
      }

      await apiClient.createInvoice({
        invoiceNumber: createFormData.invoiceNumber.trim(),
        amount: amountValue,
        provider: createFormData.provider.trim(),
        billingDate: createFormData.billingDate,
        dueDate: createFormData.dueDate || undefined,
        category: createFormData.category || undefined,
        organizationId: createFormData.organizationId || undefined,
        toolIds: createFormData.toolIds.length > 0 ? createFormData.toolIds : undefined,
        subscriptionDescription: createFormData.subscriptionDescription.trim() || undefined,
        file: createFile || undefined
      });

      showToast('Invoice uploaded successfully!', 'success');
      setShowCreateModal(false);
      setCreateFormData({
        invoiceNumber: '',
        amount: '',
        provider: '',
        billingDate: '',
        dueDate: '',
        category: '',
        organizationId: '',
        toolIds: [],
        subscriptionDescription: ''
      });
      setCreateFile(null);
      setAutoFilled(false);
      loadInvoices(false);
    } catch (error: any) {
      logger.error('Failed to upload invoice', error);
      showToast(error.message || 'Failed to upload invoice', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    if (selectedFile) {
      if (!FILE_UPLOAD.INVOICE_FILE_TYPES.includes(selectedFile.type) && !selectedFile.name.toLowerCase().endsWith('.pdf')) {
        showToast('Please upload a PDF or image file', 'error');
        e.target.value = ''; // Reset file input
        return;
      }
      
      // Set file first
      setCreateFile(selectedFile);
      setAutoFilled(false); // Reset auto-filled state

      // Auto-detect invoice details immediately
      setParsing(true);
      try {
        logger.debug('Starting invoice parsing', {
          name: selectedFile.name,
          type: selectedFile.type,
          size: selectedFile.size
        });

        showToast('Extracting invoice data using AI...', 'info');

        // Add timeout to prevent hanging
        const parsePromise = apiClient.parseInvoice(selectedFile);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Parsing timeout - took too long')), TIMEOUTS.INVOICE_PARSE)
        );

        const detectedData = await Promise.race([parsePromise, timeoutPromise]) as any;

        logger.debug('Invoice parsing response received', detectedData);
        
        if (detectedData) {
          const updatedData: any = {};
          
          if (detectedData.invoiceNumber) {
            updatedData.invoiceNumber = detectedData.invoiceNumber;
          }
          if (detectedData.amount) {
            updatedData.amount = detectedData.amount.toString();
          }
          if (detectedData.provider) {
            updatedData.provider = detectedData.provider;
          }
          // Helper function to convert date format
          const convertDateForInput = (dateStr: string | undefined): string => {
            if (!dateStr) return '';
            
            // If already in YYYY-MM-DD format, return as is
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
              return dateStr;
            }
            
            // If in DD/MM/YYYY format, convert to YYYY-MM-DD
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
              const [day, month, year] = dateStr.split('/');
              return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
            
            // If in MM/DD/YYYY format, convert to YYYY-MM-DD
            if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
              const parts = dateStr.split('/');
              try {
                const date1 = new Date(`${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`);
                const date2 = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
                // Use the one that makes sense (month <= 12)
                if (parseInt(parts[0]) <= 12) {
                  return date1.toISOString().split('T')[0];
                } else {
                  return date2.toISOString().split('T')[0];
                }
              } catch {
                // Fallback
              }
            }
            
            // Try to parse as Date and format
            try {
              const date = new Date(dateStr);
              if (!isNaN(date.getTime())) {
                return date.toISOString().split('T')[0];
              }
            } catch {
              // If parsing fails, return original
            }
            
            return dateStr;
          };

          if (detectedData.billingDate) {
            const convertedBillingDate = convertDateForInput(detectedData.billingDate);
            if (convertedBillingDate) {
              updatedData.billingDate = convertedBillingDate;
            }
          }
          if (detectedData.dueDate) {
            const convertedDueDate = convertDateForInput(detectedData.dueDate);
            if (convertedDueDate) {
              updatedData.dueDate = convertedDueDate;
            }
          }
          if (detectedData.category) {
            updatedData.category = detectedData.category;
          }

          setCreateFormData(prev => ({
            ...prev,
            ...updatedData
          }));

          const detectedFields = Object.keys(updatedData).filter(key => updatedData[key]);
          logger.debug(`Auto-filled ${detectedFields.length} fields:`, detectedFields);

          if (detectedFields.length > 0) {
            setAutoFilled(true);
            const fieldLabels: { [key: string]: string } = {
              invoiceNumber: 'Invoice Number',
              amount: 'Amount',
              provider: 'Provider',
              billingDate: 'Billing Date',
              dueDate: 'Due Date',
              category: 'Category'
            };
            const fieldNames = detectedFields.map(f => fieldLabels[f] || f).join(', ');
            showToast(`Invoice details detected! Found: ${fieldNames}. Please review and update if needed.`, 'success');
          } else {
            showToast('Could not detect invoice details from file. The file might be image-based or corrupted. Please fill manually.', 'warning');
          }
        } else {
          showToast('No data extracted from invoice file. Please fill manually.', 'warning');
        }
      } catch (error: any) {
        logger.error('Invoice parsing failed', error);

        if (error.status === 404) {
          showToast('Invoice parsing endpoint not found. Please check backend API.', 'error');
        } else if (error.status === 500) {
          showToast('Server error during invoice parsing. Check backend logs.', 'error');
        } else if (error.name === 'NetworkError' || error.name === 'TimeoutError') {
          showToast(error.message, 'error');
        } else {
          showToast('Could not auto-detect invoice details. Please fill manually. Error: ' + (error.message || 'Unknown'), 'warning');
        }
      } finally {
        setParsing(false);
      }
    }
  };

  const filteredAndSortedInvoices = useMemo(() => {
    let data = [...invoices];
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      data = data.filter(inv => 
        inv.invoiceNumber?.toLowerCase().includes(query) ||
        inv.provider?.toLowerCase().includes(query) ||
        inv.amount?.toString().includes(query) ||
        inv.category?.toLowerCase().includes(query) ||
        inv.status?.toLowerCase().includes(query)
      );
    }
    
    // Sort
    data.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortBy) {
        case 'billingDate':
          aVal = new Date(a.billingDate).getTime();
          bVal = new Date(b.billingDate).getTime();
          break;
        case 'amount':
          aVal = a.amount || 0;
          bVal = b.amount || 0;
          break;
        case 'provider':
          aVal = a.provider?.toLowerCase() || '';
          bVal = b.provider?.toLowerCase() || '';
          break;
        case 'status':
          aVal = a.status || '';
          bVal = b.status || '';
          break;
        case 'invoiceNumber':
          aVal = a.invoiceNumber?.toLowerCase() || '';
          bVal = b.invoiceNumber?.toLowerCase() || '';
          break;
        case 'organizationName':
          aVal = (a.organization?.name || '').toLowerCase();
          bVal = (b.organization?.name || '').toLowerCase();
          break;
        default:
          aVal = new Date(a.billingDate).getTime();
          bVal = new Date(b.billingDate).getTime();
      }
      
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    
    return data;
  }, [invoices, searchQuery, sortBy, sortOrder]);

  const handleApprove = async (invoiceId: string) => {
    try {
      await apiClient.approveInvoice(invoiceId);
      showToast('Invoice approved successfully', 'success');
      loadInvoices(false);
    } catch (error: any) {
      logger.error('Failed to approve invoice', error);
      showToast(error.message || 'Failed to approve invoice', 'error');
    }
  };

  const handleReject = async (invoiceId: string, invoiceNumber: string) => {
    const reason = prompt(`Please provide a reason for rejecting invoice "${invoiceNumber}":`);
    if (!reason) return;

    try {
      await apiClient.rejectInvoice(invoiceId, reason);
      showToast('Invoice rejected', 'success');
      loadInvoices(false);
    } catch (error: any) {
      logger.error('Failed to reject invoice', error);
      showToast(error.message || 'Failed to reject invoice', 'error');
    }
  };

  const handleDownload = async (invoice: Invoice) => {
    try {
      const { url } = await apiClient.getInvoiceDownloadUrl(invoice.id);
      window.open(url, '_blank');
      showToast('Opening invoice file...', 'success');
    } catch (error: any) {
      logger.error('Failed to download invoice', error);
      showToast(error.message || 'Failed to download invoice', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deletingInvoice) return;
    try {
      await apiClient.deleteInvoice(deletingInvoice.id);
      showToast('Invoice deleted successfully', 'success');
      setShowDeleteConfirm(false);
      setDeletingInvoice(null);
      loadInvoices(false);
    } catch (error: any) {
      logger.error('Failed to delete invoice', error);
      showToast(error.message || 'Failed to delete invoice', 'error');
    }
  };

    const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
  
      // Validate file type
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  
      if (!FILE_UPLOAD.EXCEL_FILE_TYPES.includes(file.type as any) && !FILE_UPLOAD.EXCEL_FILE_EXTENSIONS.includes(fileExtension)) {
        showToast('Please upload an Excel file (.xlsx, .xls) or CSV file', 'error');
        e.target.value = '';
        return;
      }
  
      setImportingExcel(true);
      setImportResult(null);
  
      try {
        showToast('Importing invoices from Excel...', 'info');
        const result = await apiClient.importExcel(file);
  
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
          // Reload invoices and summary
          await loadInvoices(false);
          await loadSummary();
        } else {
          showToast(result.message || 'Import completed with errors', 'warning');
        }
      } catch (error: any) {
        logger.error('Failed to import Excel file', error);
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
  
    const handleClearAll = async () => {
      setClearingAll(true);
      try {
        const result = await apiClient.clearAllInvoices();
        showToast(result.message || 'Successfully cleared all invoices', 'success');
        await loadInvoices(false);
        setShowClearAllConfirm(false);
      } catch (error: any) {
        logger.error('Failed to clear invoices', error);
        showToast(error.message || 'Failed to clear invoices', 'error');
      } finally {
        setClearingAll(false);
      }
    };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-400';
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-400';
      case 'rejected':
        return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-foreground';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleExportToCSV = async () => {
    try {
      // Get the filtered and sorted invoices
      const dataToExport = filteredAndSortedInvoices;

      if (dataToExport.length === 0) {
        showToast('No invoices to export', 'warning');
        return;
      }

      setExportingCSV(true);
      showToast('Exporting...', 'info');

      // CSV Headers (no File Link / csv column)
      const headers = ['Invoice Number', 'Billing Date', 'Provider/Vendor', 'Amount', 'Subscription Description', 'Tools'];

      // Convert invoices to CSV rows
      const escapeCSV = (value: string) => {
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      };

      const csvRows = dataToExport.map(invoice => {
        const invoiceNumber = invoice.invoiceNumber || '';
        const billingDate = invoice.billingDate ? formatDate(invoice.billingDate) : '';
        const provider = invoice.provider || '';
        const amount = invoice.amount ? formatCurrency(invoice.amount) : '';
        const subscriptionDescription = invoice.subscriptionDescription || '';
        
        // Format tools with names and descriptions
        let toolsText = '';
        if (invoice.tools && Array.isArray(invoice.tools) && invoice.tools.length > 0) {
          toolsText = invoice.tools.map((tool: any) => {
            const toolName = typeof tool === 'string' ? tool : (tool.name || tool.id || 'Unknown');
            const toolDesc = typeof tool === 'object' && tool.description 
              ? tool.description 
              : '';
            return toolDesc ? `${toolName}: ${toolDesc}` : toolName;
          }).join('; ');
        }
        
        return [
          escapeCSV(invoiceNumber),
          escapeCSV(billingDate),
          escapeCSV(provider),
          escapeCSV(amount),
          escapeCSV(subscriptionDescription),
          escapeCSV(toolsText)
        ].join(',');
      });

      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...csvRows
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `invoices_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showToast(`Exported ${dataToExport.length} invoice(s) to CSV`, 'success');
    } catch (error: any) {
      logger.error('Failed to export invoices to CSV', error);
      showToast('Failed to export invoices to CSV', 'error');
    } finally {
      setExportingCSV(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading invoices...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-background min-h-screen p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
          <button
            type="button"
            onClick={() => loadInvoices(false)}
            disabled={isRefreshing}
            className={`p-1.5 rounded-md text-muted-foreground hover:text-gray-700 hover:bg-muted transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
            title="Refresh"
          >
            <FiRefreshCw className="h-4 w-4" />
          </button>
          {lastUpdated && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Search */}
          <div className="relative flex-1 sm:flex-initial sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search invoices..."
              className="block w-full pl-10 pr-3 py-2 border border-border rounded-md leading-5 bg-card placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          {/* Sort */}
          <div className="flex items-center gap-2 border border-border rounded-md bg-card">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 text-sm font-medium text-foreground bg-transparent border-0 focus:outline-none focus:ring-0 cursor-pointer"
            >
              <option value="billingDate">Date</option>
              <option value="amount">Amount</option>
              <option value="provider">Provider</option>
              <option value="status">Status</option>
              <option value="invoiceNumber">Invoice #</option>
              <option value="organizationName">Name</option>
            </select>
            <button
              type="button"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-2 py-2 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors border-l border-gray-300"
            >
              {sortOrder === 'asc' ? <FiArrowUp className="h-4 w-4" /> : <FiArrowDown className="h-4 w-4" />}
            </button>
          </div>
            {/* Clear All Button */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowClearAllConfirm(true)}
                disabled={clearingAll || invoices.length === 0}
                className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md shadow-sm text-red-600 bg-card hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors disabled:opacity-50"
              >
                <FiTrash2 className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Clear All</span>
              </button>
            )}
            {/* Export CSV Button */}
            <button
              type="button"
              onClick={handleExportToCSV}
              disabled={filteredAndSortedInvoices.length === 0 || exportingCSV}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-foreground bg-card hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exportingCSV ? (
                <FiRefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FiDownload className="h-4 w-4 mr-2" />
              )}
              <span className="hidden sm:inline">{exportingCSV ? 'Generating...' : 'Export CSV'}</span>
              <span className="sm:hidden">{exportingCSV ? '...' : 'Export'}</span>
            </button>
            {/* Import Excel Button */}
            <label className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-foreground bg-card hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors cursor-pointer">
            <FiUpload className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Import Excel</span>
            <span className="sm:hidden">Import</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleImportExcel}
              disabled={importingExcel}
              className="hidden"
            />
          </label>
          {/* Create Button */}
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <FiPlus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Upload Invoice</span>
            <span className="sm:hidden">Upload</span>
          </button>
        </div>
      </div>

      {/* Import Result */}
      {importResult && (
        <div className={`rounded-lg p-4 border ${
          importResult.success 
            ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
            : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
        }`}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className={`text-sm font-medium mb-2 ${
                importResult.success 
                  ? 'text-green-800 dark:text-green-200' 
                  : 'text-yellow-800 dark:text-yellow-200'
              }`}>
                {importResult.message}
              </h3>
              <div className="text-sm space-y-1">
                <p className={`${
                  importResult.success 
                    ? 'text-green-700 dark:text-green-300' 
                    : 'text-yellow-700 dark:text-yellow-300'
                }`}>
                  ✓ Imported: {importResult.imported} invoice(s)
                </p>
                {importResult.skipped > 0 && (
                  <p className={`${
                    importResult.success 
                      ? 'text-green-700 dark:text-green-300' 
                      : 'text-yellow-700 dark:text-yellow-300'
                  }`}>
                    ⊘ Skipped: {importResult.skipped} duplicate(s) or invalid row(s)
                  </p>
                )}
                {importResult.errors > 0 && (
                  <p className="text-red-700 dark:text-red-300">
                    ✗ Errors: {importResult.errors} row(s)
                  </p>
                )}
              </div>
              {importResult.errorDetails && importResult.errorDetails.length > 0 && (
                <details className="mt-3">
                  <summary className="text-sm font-medium cursor-pointer text-red-700 dark:text-red-300">
                    View Error Details ({importResult.errorDetails.length})
                  </summary>
                  <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                    {importResult.errorDetails.map((error, idx) => (
                      <p key={idx} className="text-xs text-red-600 dark:text-red-400">
                        Row {error.row}: {error.error}
                      </p>
                    ))}
                  </div>
                </details>
              )}
            </div>
            <button
              type="button"
              onClick={() => setImportResult(null)}
              className="ml-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Loading indicator for Excel import */}
      {importingExcel && (
        <div className="rounded-lg p-4 border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
          <div className="flex items-center gap-3">
            <FiRefreshCw className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Importing invoices from Excel file...
            </p>
          </div>
        </div>
      )}

      {/* Invoice Summary Cards */}
      <InvoiceSummaryCards summary={summary} loading={summaryLoading} />

      {/* Filters – always visible, no reload until Apply */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <FiFilter className="h-4 w-4 text-muted-foreground" />
          Filters
        </div>
        <div className="flex flex-wrap items-end gap-3 p-4 rounded-lg bg-muted/50 border border-border">
          <div className="min-w-[140px]">
            <label className="block text-xs font-medium text-muted-foreground mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div className="min-w-[160px]">
            <label className="block text-xs font-medium text-muted-foreground mb-1">Provider</label>
            <input
              type="text"
              value={filters.provider}
              onChange={(e) => setFilters({ ...filters, provider: e.target.value })}
              placeholder="Provider name"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <div className="min-w-[140px]">
            <label className="block text-xs font-medium text-muted-foreground mb-1">Start date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <div className="min-w-[140px]">
            <label className="block text-xs font-medium text-muted-foreground mb-1">End date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <div className="min-w-[160px]">
            <label className="block text-xs font-medium text-muted-foreground mb-1">By month</label>
            <select
              value={filters.filterMonth}
              onChange={(e) => setFilters({ ...filters, filterMonth: e.target.value })}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All months</option>
              {(() => {
                const opts: { value: string; label: string }[] = [];
                const now = new Date();
                for (let i = 0; i < 24; i++) {
                  const d = new Date(now.getFullYear(), now.getMonth() - 23 + i, 1);
                  const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                  const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                  opts.push({ value, label });
                }
                return opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>);
              })()}
            </select>
          </div>
          <button
            type="button"
            onClick={() => {
              let startDate = filters.startDate || undefined;
              let endDate = filters.endDate || undefined;
              if (filters.filterMonth) {
                const [y, m] = filters.filterMonth.split('-').map(Number);
                const first = new Date(y, m - 1, 1);
                const last = new Date(y, m, 0);
                startDate = first.toISOString().slice(0, 10);
                endDate = last.toISOString().slice(0, 10);
              }
              setAppliedFilters({
                status: filters.status || undefined,
                provider: filters.provider?.trim() || undefined,
                startDate,
                endDate
              });
            }}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-4 py-2 h-9 text-sm font-medium rounded-md border border-transparent bg-primary text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRefreshing ? <FiRefreshCw className="h-4 w-4 animate-spin" /> : 'Apply filters'}
          </button>
          <button
            type="button"
            onClick={() => {
              setFilters({ status: '', provider: '', startDate: '', endDate: '', filterMonth: '' });
              setAppliedFilters({});
            }}
            disabled={isRefreshing}
            className="inline-flex items-center px-4 py-2 h-9 text-sm font-medium rounded-md border border-border bg-card text-foreground hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear filters
          </button>
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-card shadow-sm border border-border overflow-hidden sm:rounded-lg">
        <ul className="divide-y divide-gray-200">
          {filteredAndSortedInvoices.map((invoice, index) => (
            <li key={invoice.id || index} className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${invoice.status === 'pending' && invoice.fileUrl ? 'bg-blue-50/50 dark:bg-blue-950/50 border-l-4 border-blue-400' : ''}`}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center min-w-0 flex-1">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100">
                      <FiFileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="ml-4 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="text-base sm:text-lg font-semibold text-foreground truncate">
                          {invoice.invoiceNumber}
                        </h3>
                        {invoice.status === 'pending' && invoice.fileUrl && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-400 border border-yellow-200 whitespace-nowrap">
                            File Ready for Review
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        {invoice.provider} • {formatDate(invoice.billingDate)}
                        {invoice.organization && (
                          <span className="ml-2 text-gray-400">• {invoice.organization.name}</span>
                        )}
                      </p>
                      {invoice.fileUrl && (
                        <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                          <FiDownload className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                          <span className="text-xs text-primary font-medium truncate max-w-[200px]">
                            {invoice.fileName || 'Invoice file attached'}
                          </span>
                          {invoice.fileSize && (
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              ({(invoice.fileSize / 1024).toFixed(1)} KB)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between sm:justify-end gap-3 flex-shrink-0">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                      <span className="text-base sm:text-lg font-semibold text-foreground whitespace-nowrap">
                        {formatCurrency(invoice.amount)}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleView(invoice)}
                        className="text-blue-600 hover:text-blue-700 p-1.5 sm:p-1 rounded-md hover:bg-blue-50 transition-colors"
                        title="View invoice details"
                      >
                        <FiEye className="h-4 w-4 sm:h-5 sm:w-5" />
                      </button>
                      {invoice.fileUrl && (
                        <button
                          type="button"
                          onClick={() => handleDownload(invoice)}
                          className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-md transition-colors shadow-sm ${
                            invoice.status === 'pending'
                              ? 'text-yellow-900 bg-yellow-100 border border-yellow-400 hover:bg-yellow-200'
                              : 'text-blue-700 bg-primary/10 border border-blue-200 hover:bg-blue-100'
                          }`}
                        >
                          <FiDownload className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          <span className="hidden sm:inline">
                            {invoice.status === 'pending' ? 'Review File' : 'View File'}
                          </span>
                          <span className="sm:hidden">File</span>
                        </button>
                      )}
                      {isAdmin && invoice.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleApprove(invoice.id)}
                            className="text-green-600 hover:text-green-700 p-1.5 sm:p-1 rounded-md hover:bg-green-50 transition-colors"
                            title="Approve invoice"
                          >
                            <FiCheck className="h-4 w-4 sm:h-5 sm:w-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReject(invoice.id, invoice.invoiceNumber)}
                            className="text-red-600 hover:text-red-700 p-1.5 sm:p-1 rounded-md hover:bg-red-50 transition-colors"
                            title="Reject invoice"
                          >
                            <FiX className="h-4 w-4 sm:h-5 sm:w-5" />
                          </button>
                        </>
                      )}
                      {(isAdmin || invoice.uploadedBy?.id === user?.id) && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleEdit(invoice)}
                            className="text-indigo-600 hover:text-indigo-700 p-1.5 sm:p-1 rounded-md hover:bg-indigo-50 transition-colors"
                            title="Edit invoice"
                            disabled={invoice.status === 'approved' && !isAdmin}
                          >
                            <FiEdit2 className="h-4 w-4 sm:h-5 sm:w-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeletingInvoice(invoice);
                              setShowDeleteConfirm(true);
                            }}
                            className="text-red-600 hover:text-red-700 p-1.5 sm:p-1 rounded-md hover:bg-red-50 transition-colors"
                            title="Delete invoice"
                          >
                            <FiTrash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {filteredAndSortedInvoices.length === 0 && (
        <div className="text-center py-12">
          <FiFileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-foreground">No invoices</h3>
          <p className="mt-1 text-sm text-muted-foreground mb-4">
            Get started by uploading an invoice.
          </p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-blue-700"
          >
            <FiPlus className="h-4 w-4 mr-2" />
            Upload Your First Invoice
          </button>
        </div>
      )}

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">Upload New Invoice</h2>
            <button
              type="button"
              onClick={() => {
                setShowCreateModal(false);
                  setToolSearchQuery('');
                  setShowToolDropdown(false);
                  setCreateFormData({
                    invoiceNumber: '',
                    amount: '',
                    provider: '',
                    billingDate: '',
                    dueDate: '',
                    category: '',
                    organizationId: '',
                    toolIds: [],
                    subscriptionDescription: ''
                  });
                  setCreateFile(null);
                  setAutoFilled(false);
                }}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateInvoice} className="p-6 space-y-6">
              {isAdmin && organizations.length > 0 && (
                <div>
                  <label htmlFor="organizationId" className="block text-sm font-medium text-foreground mb-2">
                    Organization
                  </label>
                  <select
                    id="organizationId"
                    value={createFormData.organizationId}
                    onChange={(e) => setCreateFormData({ ...createFormData, organizationId: e.target.value })}
                    className="block w-full rounded-md border-border shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                  >
                    <option value="">Select Organization (optional)</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name} ({org.domain})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="invoiceNumber" className="block text-sm font-medium text-foreground mb-2">
                  Invoice Number <span className="text-red-500">*</span>
                </label>
                <input
                  id="invoiceNumber"
                  type="text"
                  required
                  value={createFormData.invoiceNumber}
                  onChange={(e) => setCreateFormData({ ...createFormData, invoiceNumber: e.target.value })}
                  className="block w-full rounded-md border-border shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                  placeholder="e.g., INV-2024-001"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="amount" className="block text-sm font-medium text-foreground mb-2">
                    Amount <span className="text-red-500">*</span>
                    {autoFilled && createFormData.amount && (
                      <span className="ml-2 text-xs text-primary font-normal">✓ Auto-detected</span>
                    )}
                  </label>
                  <input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={createFormData.amount}
                    onChange={(e) => {
                      setCreateFormData({ ...createFormData, amount: e.target.value });
                      setAutoFilled(false);
                    }}
                    className={`block w-full rounded-md border-border shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border ${
                      autoFilled && createFormData.amount ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label htmlFor="currency" className="block text-sm font-medium text-foreground mb-2">
                    Currency
                  </label>
                  <input
                    id="currency"
                    type="text"
                    value="USD ($) - US Dollar"
                    disabled
                    className="block w-full rounded-md border-border shadow-sm bg-background text-muted-foreground cursor-not-allowed sm:text-sm px-3 py-2 border"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="provider" className="block text-sm font-medium text-foreground mb-2">
                  Provider/Vendor <span className="text-red-500">*</span>
                  {autoFilled && createFormData.provider && (
                    <span className="ml-2 text-xs text-primary font-normal">✓ Auto-detected</span>
                  )}
                </label>
                <input
                  id="provider"
                  type="text"
                  required
                  value={createFormData.provider}
                  onChange={(e) => {
                    setCreateFormData({ ...createFormData, provider: e.target.value });
                    setAutoFilled(false);
                  }}
                  className={`block w-full rounded-md border-border shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border ${
                    autoFilled && createFormData.provider ? 'bg-green-50 border-green-200' : ''
                  }`}
                  placeholder="e.g., AWS, GitHub, Stripe"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="billingDate" className="block text-sm font-medium text-foreground mb-2">
                    Billing Date <span className="text-red-500">*</span>
                    {autoFilled && createFormData.billingDate && (
                      <span className="ml-2 text-xs text-primary font-normal">✓ Auto-detected</span>
                    )}
                  </label>
                  <input
                    id="billingDate"
                    type="date"
                    required
                    value={createFormData.billingDate}
                    onChange={(e) => {
                      setCreateFormData({ ...createFormData, billingDate: e.target.value });
                      setAutoFilled(false);
                    }}
                    className={`block w-full rounded-md border-border shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border ${
                      autoFilled && createFormData.billingDate ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                  />
                </div>
                <div>
                  <label htmlFor="dueDate" className="block text-sm font-medium text-foreground mb-2">
                    Due Date (Optional)
                    {autoFilled && createFormData.dueDate && (
                      <span className="ml-2 text-xs text-primary font-normal">✓ Auto-detected</span>
                    )}
                  </label>
                  <input
                    id="dueDate"
                    type="date"
                    value={createFormData.dueDate}
                    onChange={(e) => {
                      setCreateFormData({ ...createFormData, dueDate: e.target.value });
                      setAutoFilled(false);
                    }}
                    className={`block w-full rounded-md border-border shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border ${
                      autoFilled && createFormData.dueDate ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-foreground mb-2">
                  Category (Optional)
                  {autoFilled && createFormData.category && (
                    <span className="ml-2 text-xs text-primary font-normal">✓ Auto-detected</span>
                  )}
                </label>
                <input
                  id="category"
                  type="text"
                  value={createFormData.category}
                  onChange={(e) => {
                    setCreateFormData({ ...createFormData, category: e.target.value });
                    setAutoFilled(false);
                  }}
                  className={`block w-full rounded-md border-border shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border ${
                    autoFilled && createFormData.category ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                  placeholder="e.g., Cloud Services, Software Licenses"
                />
              </div>

              <div>
                <label htmlFor="subscriptionDescription" className="block text-sm font-medium text-foreground mb-2">
                  Subscription Description (Optional)
                </label>
                <textarea
                  id="subscriptionDescription"
                  rows={3}
                  value={createFormData.subscriptionDescription}
                  onChange={(e) => setCreateFormData({ ...createFormData, subscriptionDescription: e.target.value })}
                  className="block w-full rounded-md border-border shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border resize-none"
                  placeholder="Enter a 2-line description about the service/tool (e.g., 'AI-powered language model service\nOpenAI provides GPT models and AI assistants')"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Leave empty to auto-generate based on provider name
                </p>
              </div>

              <div className="relative">
                <label htmlFor="toolIds" className="block text-sm font-medium text-foreground mb-2">
                  Link to Tools (Optional)
                </label>
                
                {/* Search Input */}
                <div className="relative mb-2">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiSearch className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={toolSearchQuery}
                    onChange={(e) => {
                      setToolSearchQuery(e.target.value);
                      setShowToolDropdown(true);
                    }}
                    onFocus={() => setShowToolDropdown(true)}
                    placeholder="Search tools by name or category..."
                    className="block w-full pl-10 pr-3 py-2 border border-border rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>

                {/* Tool Dropdown */}
                {showToolDropdown && (
                  <div className="relative z-50">
                    <div className="absolute w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-auto">
                      {allTools
                        .filter((tool) => {
                          if (!toolSearchQuery) return true;
                          const query = toolSearchQuery.toLowerCase();
                          const nameMatch = tool.name?.toLowerCase().includes(query);
                          const categoryMatch = tool.category?.toLowerCase().includes(query);
                          return nameMatch || categoryMatch;
                        })
                        .map((tool) => {
                          const isSelected = createFormData.toolIds.includes(tool.id);
                          return (
                            <div
                              key={tool.id}
                              onClick={() => {
                                if (isSelected) {
                                  setCreateFormData({
                                    ...createFormData,
                                    toolIds: createFormData.toolIds.filter(id => id !== tool.id)
                                  });
                                } else {
                                  setCreateFormData({
                                    ...createFormData,
                                    toolIds: [...createFormData.toolIds, tool.id]
                                  });
                                }
                              }}
                              className={`px-4 py-2 cursor-pointer hover:bg-accent transition-colors ${
                                isSelected ? 'bg-primary/10 text-primary font-medium' : 'text-foreground'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span>
                                  {tool.name} {tool.category ? <span className="text-gray-500">({tool.category})</span> : ''}
                                </span>
                                {isSelected && (
                                  <FiCheck className="h-4 w-4 text-primary" />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      {allTools.filter((tool) => {
                        if (!toolSearchQuery) return false;
                        const query = toolSearchQuery.toLowerCase();
                        const nameMatch = tool.name?.toLowerCase().includes(query);
                        const categoryMatch = tool.category?.toLowerCase().includes(query);
                        return nameMatch || categoryMatch;
                      }).length === 0 && toolSearchQuery && (
                        <div className="px-4 py-2 text-sm text-gray-500 text-center">
                          No tools found matching "{toolSearchQuery}"
                        </div>
                      )}
                      {!toolSearchQuery && allTools.length === 0 && (
                        <div className="px-4 py-2 text-sm text-gray-500 text-center">
                          No tools available
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Selected Tools Display */}
                {createFormData.toolIds.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {createFormData.toolIds.map((toolId) => {
                      const tool = allTools.find(t => t.id === toolId);
                      return tool ? (
                        <span 
                          key={toolId} 
                          className="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium bg-primary/20 text-primary border border-primary/30"
                        >
                          {tool.name}
                          {tool.category && <span className="ml-1 text-gray-600">({tool.category})</span>}
                          <button
                            type="button"
                            onClick={() => {
                              setCreateFormData({
                                ...createFormData,
                                toolIds: createFormData.toolIds.filter(id => id !== toolId)
                              });
                            }}
                            className="ml-2 text-primary hover:text-primary/70 font-bold"
                          >
                            ×
                          </button>
                        </span>
                      ) : null;
                    })}
                  </div>
                )}

                {/* Click outside to close dropdown */}
                {showToolDropdown && (
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowToolDropdown(false)}
                  />
                )}
              </div>

              <div>
                <label htmlFor="file" className="block text-sm font-medium text-foreground mb-2">
                  Invoice File (Optional)
                  <span className="ml-2 text-xs text-primary font-normal">
                    {parsing ? 'Detecting details...' : autoFilled ? '✓ Details detected' : 'Auto-detect enabled'}
                  </span>
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-border border-dashed rounded-md hover:border-blue-400 transition-colors">
                  <div className="space-y-1 text-center">
                    {parsing ? (
                      <>
                        <FiRefreshCw className="mx-auto h-12 w-12 text-primary animate-spin" />
                        <p className="text-sm text-muted-foreground mt-2">Analyzing invoice...</p>
                      </>
                    ) : createFile ? (
                      <>
                        <FiFileText className="mx-auto h-12 w-12 text-blue-600" />
                        <p className="text-sm text-foreground mt-2">{createFile.name}</p>
                        {autoFilled && (
                          <div className="mt-2 p-2 bg-primary/10 border border-blue-200 rounded-md">
                            <p className="text-xs text-blue-800 font-medium">Invoice details auto-detected!</p>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setCreateFile(null);
                            setAutoFilled(false);
                            // Reset form data when file is removed
                            setCreateFormData({
                              invoiceNumber: '',
                              amount: '',
                              provider: '',
                              billingDate: '',
                              dueDate: '',
                              category: '',
                              organizationId: createFormData.organizationId,
                              toolIds: [] as string[],
                              subscriptionDescription: ''
                            });
                          }}
                          className="text-sm text-destructive hover:text-red-700"
                        >
                          Remove file
                        </button>
                      </>
                    ) : (
                      <>
                        <FiFileText className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="flex text-sm text-gray-600 dark:text-gray-400">
                          <label
                            htmlFor="file"
                            className="relative cursor-pointer bg-card rounded-md font-medium text-primary hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                          >
                            <span>Upload a file</span>
                            <input
                              id="file"
                              name="file"
                              type="file"
                              accept=".pdf,.png,.jpg,.jpeg"
                              className="sr-only"
                              onChange={handleFileChange}
                            />
                          </label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-gray-500">PDF, PNG, JPG up to 10MB</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                  setToolSearchQuery('');
                  setShowToolDropdown(false);
                    setCreateFormData({
                      invoiceNumber: '',
                      amount: '',
                      provider: '',
                      billingDate: '',
                      dueDate: '',
                      category: '',
                      organizationId: '',
                      toolIds: [] as string[],
                      subscriptionDescription: ''
                    });
                    setCreateFile(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-md hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? 'Uploading...' : 'Upload Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Invoice Modal */}
      {showEditModal && editingInvoice && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-80" onClick={() => setShowEditModal(false)}></div>
            <div className="inline-block align-bottom bg-card rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <form onSubmit={handleUpdateInvoice}>
                <div className="bg-card px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-foreground">Edit Invoice</h3>
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditModal(false);
                        setEditingInvoice(null);
                        setEditFormData({
                          invoiceNumber: '',
                          amount: '',
                          provider: '',
                          billingDate: '',
                          dueDate: '',
                          category: '',
                          organizationId: ''
                        });
                      }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      ×
                    </button>
                  </div>

                  <div className="space-y-4">
                    {isAdmin && organizations.length > 0 && (
                      <div>
                        <label htmlFor="edit-organizationId" className="block text-sm font-medium text-foreground mb-2">
                          Organization
                        </label>
                        <select
                          id="edit-organizationId"
                          value={editFormData.organizationId}
                          onChange={(e) => setEditFormData({ ...editFormData, organizationId: e.target.value })}
                          className="block w-full rounded-md border-border shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                        >
                          <option value="">Select Organization (optional)</option>
                          {organizations.map((org) => (
                            <option key={org.id} value={org.id}>
                              {org.name} ({org.domain})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label htmlFor="edit-invoiceNumber" className="block text-sm font-medium text-foreground mb-2">
                        Invoice Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="edit-invoiceNumber"
                        type="text"
                        required
                        value={editFormData.invoiceNumber}
                        onChange={(e) => setEditFormData({ ...editFormData, invoiceNumber: e.target.value })}
                        className="block w-full rounded-md border-border shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                        placeholder="e.g., INV-2024-001"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="edit-amount" className="block text-sm font-medium text-foreground mb-2">
                          Amount <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="edit-amount"
                          type="number"
                          step="0.01"
                          min="0.01"
                          required
                          value={editFormData.amount}
                          onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })}
                          className="block w-full rounded-md border-border shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label htmlFor="edit-currency" className="block text-sm font-medium text-foreground mb-2">
                          Currency
                        </label>
                        <input
                          id="edit-currency"
                          type="text"
                          value="USD ($) - US Dollar"
                          disabled
                          className="block w-full rounded-md border-border shadow-sm bg-background text-muted-foreground cursor-not-allowed sm:text-sm px-3 py-2 border"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="edit-provider" className="block text-sm font-medium text-foreground mb-2">
                        Provider/Vendor <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="edit-provider"
                        type="text"
                        required
                        value={editFormData.provider}
                        onChange={(e) => setEditFormData({ ...editFormData, provider: e.target.value })}
                        className="block w-full rounded-md border-border shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                        placeholder="e.g., AWS, GitHub, Stripe"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="edit-billingDate" className="block text-sm font-medium text-foreground mb-2">
                          Billing Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="edit-billingDate"
                          type="date"
                          required
                          value={editFormData.billingDate}
                          onChange={(e) => setEditFormData({ ...editFormData, billingDate: e.target.value })}
                          className="block w-full rounded-md border-border shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                        />
                      </div>
                      <div>
                        <label htmlFor="edit-dueDate" className="block text-sm font-medium text-foreground mb-2">
                          Due Date
                        </label>
                        <input
                          id="edit-dueDate"
                          type="date"
                          value={editFormData.dueDate}
                          onChange={(e) => setEditFormData({ ...editFormData, dueDate: e.target.value })}
                          className="block w-full rounded-md border-border shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="edit-category" className="block text-sm font-medium text-foreground mb-2">
                        Category
                      </label>
                      <input
                        id="edit-category"
                        type="text"
                        value={editFormData.category}
                        onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                        className="block w-full rounded-md border-border shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                        placeholder="e.g., Cloud Services, Software Licenses"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-4 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditModal(false);
                        setEditingInvoice(null);
                        setEditFormData({
                          invoiceNumber: '',
                          amount: '',
                          provider: '',
                          billingDate: '',
                          dueDate: '',
                          category: '',
                          organizationId: ''
                        });
                      }}
                      className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-md hover:bg-accent transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {submitting ? 'Updating...' : 'Update Invoice'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Invoice Details Modal */}
      {showViewModal && viewingInvoice && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div 
              className="fixed inset-0 transition-opacity bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-80" 
              onClick={() => {
                setShowViewModal(false);
                setViewingInvoice(null);
              }}
            />
            <div className="inline-block align-bottom bg-card rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
              <div className="bg-card px-6 pt-6 pb-4">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100">
                      <FiFileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-foreground">Invoice Details</h3>
                      <p className="text-sm text-muted-foreground">{viewingInvoice.invoiceNumber}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowViewModal(false);
                      setViewingInvoice(null);
                    }}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <FiX className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Invoice Number</label>
                      <p className="mt-1 text-sm font-medium text-foreground">{viewingInvoice.invoiceNumber}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Provider/Vendor</label>
                      <p className="mt-1 text-sm text-foreground">{viewingInvoice.provider || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</label>
                      <p className="mt-1 text-lg font-bold text-foreground">
                        {formatCurrency(viewingInvoice.amount)}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</label>
                      <p className="mt-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(viewingInvoice.status)}`}>
                          {viewingInvoice.status}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Dates & Additional Info */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Billing Date</label>
                      <p className="mt-1 text-sm text-foreground">{formatDate(viewingInvoice.billingDate)}</p>
                    </div>
                    {viewingInvoice.dueDate && (
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Due Date</label>
                        <p className="mt-1 text-sm text-foreground">{formatDate(viewingInvoice.dueDate)}</p>
                      </div>
                    )}
                    {viewingInvoice.category && (
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Category</label>
                        <p className="mt-1 text-sm text-foreground">{viewingInvoice.category}</p>
                      </div>
                    )}
                    {viewingInvoice.organization && (
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Organization</label>
                        <p className="mt-1 text-sm text-foreground">{viewingInvoice.organization.name}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Subscription Description */}
                {viewingInvoice.subscriptionDescription && (
                  <div className="mt-6 pt-6 border-t border-border">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 block">Subscription Description</label>
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                      <p className="text-sm text-foreground whitespace-pre-line">{viewingInvoice.subscriptionDescription}</p>
                    </div>
                  </div>
                )}

                {/* Linked Tools */}
                {viewingInvoice.tools && viewingInvoice.tools.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-border">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 block">Linked Tools</label>
                    <div className="space-y-3">
                      {viewingInvoice.tools.map((tool: any) => {
                        const toolName = typeof tool === 'string' ? tool : (tool.name || tool.id || 'Unknown Tool');
                        const toolDescription = typeof tool === 'object' && tool.description ? tool.description : null;
                        const toolCategory = typeof tool === 'object' && tool.category ? tool.category : null;
                        
                        return (
                          <div 
                            key={tool.id || tool} 
                            className="bg-primary/5 border border-primary/20 rounded-lg p-3"
                          >
                            <div className="flex items-start gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="text-sm font-semibold text-foreground">{toolName}</h4>
                                  {toolCategory && (
                                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                      {toolCategory}
                                    </span>
                                  )}
                                </div>
                                {toolDescription && (
                                  <p className="text-xs text-muted-foreground mt-1">{toolDescription}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* File Information */}
                {viewingInvoice.fileUrl && (
                  <div className="mt-6 pt-6 border-t border-border">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 block">Attached File</label>
                    <div className="flex items-center gap-3">
                      <FiFileText className="h-5 w-5 text-primary" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {viewingInvoice.fileName || 'Invoice file'}
                        </p>
                        {viewingInvoice.fileSize && (
                          <p className="text-xs text-muted-foreground">
                            {(viewingInvoice.fileSize / 1024).toFixed(1)} KB
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownload(viewingInvoice)}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                      >
                        <FiDownload className="h-4 w-4" />
                        Download
                      </button>
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div className="mt-6 pt-6 border-t border-border">
                  <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                    {viewingInvoice.createdAt && (
                      <div>
                        <span className="font-medium">Created:</span> {formatDate(viewingInvoice.createdAt)}
                      </div>
                    )}
                    {viewingInvoice.updatedAt && (
                      <div>
                        <span className="font-medium">Last Updated:</span> {formatDate(viewingInvoice.updatedAt)}
                      </div>
                    )}
                    {viewingInvoice.uploadedBy && (
                      <div>
                        <span className="font-medium">Uploaded By:</span> {viewingInvoice.uploadedBy.name || viewingInvoice.uploadedBy.email}
                      </div>
                    )}
                    {viewingInvoice.approvedBy && (
                      <div>
                        <span className="font-medium">Approved By:</span> {viewingInvoice.approvedBy.name || viewingInvoice.approvedBy.email}
                      </div>
                    )}
                    {viewingInvoice.approvedAt && (
                      <div>
                        <span className="font-medium">Approved At:</span> {formatDate(viewingInvoice.approvedAt)}
                      </div>
                    )}
                    {viewingInvoice.rejectionReason && (
                      <div className="col-span-2">
                        <span className="font-medium">Rejection Reason:</span> {viewingInvoice.rejectionReason}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowViewModal(false);
                    setViewingInvoice(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-md hover:bg-accent transition-colors"
                >
                  Close
                </button>
                {viewingInvoice.fileUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      handleDownload(viewingInvoice);
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                  >
                    <FiDownload className="h-4 w-4" />
                    Download File
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Invoice Details Modal */}
      {showViewModal && viewingInvoice && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div 
              className="fixed inset-0 transition-opacity bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-80" 
              onClick={() => {
                setShowViewModal(false);
                setViewingInvoice(null);
              }}
            />
            <div className="inline-block align-bottom bg-card rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
              <div className="bg-card px-6 pt-6 pb-4">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100">
                      <FiFileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-foreground">Invoice Details</h3>
                      <p className="text-sm text-muted-foreground">{viewingInvoice.invoiceNumber}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowViewModal(false);
                      setViewingInvoice(null);
                    }}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <FiX className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Invoice Number</label>
                      <p className="mt-1 text-sm font-medium text-foreground">{viewingInvoice.invoiceNumber}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Provider/Vendor</label>
                      <p className="mt-1 text-sm text-foreground">{viewingInvoice.provider || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</label>
                      <p className="mt-1 text-lg font-bold text-foreground">
                        {formatCurrency(viewingInvoice.amount)}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</label>
                      <p className="mt-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(viewingInvoice.status)}`}>
                          {viewingInvoice.status}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Dates & Additional Info */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Billing Date</label>
                      <p className="mt-1 text-sm text-foreground">{formatDate(viewingInvoice.billingDate)}</p>
                    </div>
                    {viewingInvoice.dueDate && (
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Due Date</label>
                        <p className="mt-1 text-sm text-foreground">{formatDate(viewingInvoice.dueDate)}</p>
                      </div>
                    )}
                    {viewingInvoice.category && (
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Category</label>
                        <p className="mt-1 text-sm text-foreground">{viewingInvoice.category}</p>
                      </div>
                    )}
                    {viewingInvoice.organization && (
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Organization</label>
                        <p className="mt-1 text-sm text-foreground">{viewingInvoice.organization.name}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Subscription Description */}
                {viewingInvoice.subscriptionDescription && (
                  <div className="mt-6 pt-6 border-t border-border">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 block">Subscription Description</label>
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                      <p className="text-sm text-foreground whitespace-pre-line">{viewingInvoice.subscriptionDescription}</p>
                    </div>
                  </div>
                )}

                {/* Linked Tools */}
                {viewingInvoice.tools && viewingInvoice.tools.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-border">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 block">Linked Tools</label>
                    <div className="space-y-3">
                      {viewingInvoice.tools.map((tool: any) => {
                        const toolName = typeof tool === 'string' ? tool : (tool.name || tool.id || 'Unknown Tool');
                        const toolDescription = typeof tool === 'object' && tool.description ? tool.description : null;
                        const toolCategory = typeof tool === 'object' && tool.category ? tool.category : null;
                        
                        return (
                          <div 
                            key={tool.id || tool} 
                            className="bg-primary/5 border border-primary/20 rounded-lg p-3"
                          >
                            <div className="flex items-start gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="text-sm font-semibold text-foreground">{toolName}</h4>
                                  {toolCategory && (
                                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                      {toolCategory}
                                    </span>
                                  )}
                                </div>
                                {toolDescription && (
                                  <p className="text-xs text-muted-foreground mt-1">{toolDescription}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* File Information */}
                {viewingInvoice.fileUrl && (
                  <div className="mt-6 pt-6 border-t border-border">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 block">Attached File</label>
                    <div className="flex items-center gap-3">
                      <FiFileText className="h-5 w-5 text-primary" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {viewingInvoice.fileName || 'Invoice file'}
                        </p>
                        {viewingInvoice.fileSize && (
                          <p className="text-xs text-muted-foreground">
                            {(viewingInvoice.fileSize / 1024).toFixed(1)} KB
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownload(viewingInvoice)}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                      >
                        <FiDownload className="h-4 w-4" />
                        Download
                      </button>
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div className="mt-6 pt-6 border-t border-border">
                  <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                    {viewingInvoice.createdAt && (
                      <div>
                        <span className="font-medium">Created:</span> {formatDate(viewingInvoice.createdAt)}
                      </div>
                    )}
                    {viewingInvoice.updatedAt && (
                      <div>
                        <span className="font-medium">Last Updated:</span> {formatDate(viewingInvoice.updatedAt)}
                      </div>
                    )}
                    {viewingInvoice.uploadedBy && (
                      <div>
                        <span className="font-medium">Uploaded By:</span> {viewingInvoice.uploadedBy.name || viewingInvoice.uploadedBy.email}
                      </div>
                    )}
                    {viewingInvoice.approvedBy && (
                      <div>
                        <span className="font-medium">Approved By:</span> {viewingInvoice.approvedBy.name || viewingInvoice.approvedBy.email}
                      </div>
                    )}
                    {viewingInvoice.approvedAt && (
                      <div>
                        <span className="font-medium">Approved At:</span> {formatDate(viewingInvoice.approvedAt)}
                      </div>
                    )}
                    {viewingInvoice.rejectionReason && (
                      <div className="col-span-2">
                        <span className="font-medium">Rejection Reason:</span> {viewingInvoice.rejectionReason}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowViewModal(false);
                    setViewingInvoice(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-md hover:bg-accent transition-colors"
                >
                  Close
                </button>
                {viewingInvoice.fileUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      handleDownload(viewingInvoice);
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                  >
                    <FiDownload className="h-4 w-4" />
                    Download File
                  </button>
                )}
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
          setDeletingInvoice(null);
        }}
        onConfirm={handleDelete}
        title="Delete Invoice"
        message={
          deletingInvoice
            ? `Are you sure you want to delete invoice "${deletingInvoice.invoiceNumber}"? This action cannot be undone.`
            : ''
        }
        confirmText="Delete"
      />

      {/* Clear All Confirmation Modal */}
      <ConfirmModal
        isOpen={showClearAllConfirm}
        onClose={() => setShowClearAllConfirm(false)}
        onConfirm={handleClearAll}
        title="Clear All Invoices"
        message="Are you sure you want to delete ALL regular invoices? This action cannot be undone and will not affect employee payments."
        confirmText={clearingAll ? 'Clearing...' : 'Clear All'}
        type="danger"
      />
    </div>
  );
}
