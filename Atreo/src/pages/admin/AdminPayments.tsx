import { useState, useEffect, useMemo } from 'react';
import { 
  FiDollarSign, 
  FiUpload, 
  FiDownload, 
  FiSearch, 
  FiRefreshCw,
    FiUser,
    FiFileText,
    FiTrash2,
    FiPlus
  } from 'react-icons/fi';
  import { apiClient } from '../../services/api';
  import { useToast } from '../../hooks/useToast';
  import { useAuth } from '../../context/AuthContext';
  import ConfirmModal from '../../components/shared/ConfirmModal';
  import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FILE_UPLOAD } from '@/constants';

interface PaymentRecord {
  id: string;
  month: string;
  name: string;
  role: string;
  contractHours: number;
  fulfilledHours: number;
  amount: number;
  invoiceNumber?: string;
  billingDate?: string;
}

interface PaymentSummary {
  totalAmount: number;
  totalRecords: number;
  totalContractHours: number;
  totalFulfilledHours: number;
  byMonth: { [key: string]: { amount: number; count: number } };
  byRole: { [key: string]: { amount: number; count: number } };
}

const MONTH_ORDER: { [key: string]: number } = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12
};

const getMonthValue = (monthStr: string) => {
  if (!monthStr) return 0;
  const parts = monthStr.toLowerCase().split(' ');
  const monthName = parts[0];
  const year = parts[1] ? parseInt(parts[1]) : 0;
  const monthIdx = MONTH_ORDER[monthName] || 0;
  return (year * 10000) + monthIdx;
};

export default function AdminPayments() {
    const { showToast } = useToast();
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    const [payments, setPayments] = useState<PaymentRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);
    const [clearingAll, setClearingAll] = useState(false);
    const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newRecord, setNewRecord] = useState({
      name: '',
      amount: '',
      month: '',
      role: '',
      contractHours: '',
      fulfilledHours: ''
    });
    const [searchQuery, setSearchQuery] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [sortBy, setSortBy] = useState<'month' | 'name' | 'role' | 'amount'>('month');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [groupBy, setGroupBy] = useState<'none' | 'month' | 'role' | 'employee'>('none');

  // Fetch payment data from employee invoices
  const loadPayments = async () => {
    try {
      setLoading(true);
      // Use dedicated payments endpoint that fetches employee invoices from MongoDB
      const invoices = await apiClient.getPayments();
      
      console.log('📊 Total employee invoices fetched from MongoDB:', invoices.length);
      
      // Filter and transform employee invoices
      const employeePayments: PaymentRecord[] = [];
      let invoicesWithNotes = 0;
      let invoicesWithEmployeeType = 0;
      
      for (const invoice of invoices) {
        try {
          // Check if invoice has employee/contractor data in notes
          if (invoice.notes) {
            invoicesWithNotes++;
            let notes;
            // Try to parse notes - it might be a string or already an object
            if (typeof invoice.notes === 'string') {
              try {
                notes = JSON.parse(invoice.notes);
              } catch (e) {
                console.warn('Failed to parse notes as JSON for invoice:', invoice.id, invoice.notes?.substring(0, 50));
                continue;
              }
            } else {
              notes = invoice.notes;
            }
            
            // Check if it's an employee/contractor invoice
            if (notes && notes.type === 'employee_contractor') {
              invoicesWithEmployeeType++;
              employeePayments.push({
                id: invoice.id,
                month: notes.month || '',
                name: invoice.provider || '',
                role: invoice.category || notes.role || '',
                contractHours: notes.contractHours || 0,
                fulfilledHours: notes.fulfilledHours || 0,
                amount: invoice.amount || 0,
                invoiceNumber: invoice.invoiceNumber,
                billingDate: invoice.billingDate
              });
            }
          }
        } catch (e) {
          console.warn('Error processing invoice:', invoice.id, e);
        }
      }
      
      console.log('✅ Employee payments found:', employeePayments.length);
      console.log('📝 Invoices with notes:', invoicesWithNotes);
      console.log('👤 Invoices with employee_contractor type:', invoicesWithEmployeeType);
      
      setPayments(employeePayments);
      
      if (employeePayments.length === 0 && invoices.length > 0) {
        // Debug: Check first few invoices to see their structure
        const sampleInvoices = invoices.slice(0, 5);
        console.warn('⚠️ No employee payments found. Sample invoices:', sampleInvoices.map(inv => ({
          id: inv.id,
          provider: inv.provider,
          category: inv.category,
          amount: inv.amount,
          hasNotes: !!inv.notes,
          notesType: typeof inv.notes,
          notesPreview: inv.notes ? (typeof inv.notes === 'string' ? inv.notes.substring(0, 150) : JSON.stringify(inv.notes).substring(0, 150)) : null
        })));
      }
    } catch (error: any) {
      console.error('Failed to load payments', error);
      showToast('Failed to load payment data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  // Handle Excel import
  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.')) as '.xlsx' | '.xls' | '.csv';

    if (!FILE_UPLOAD.EXCEL_FILE_TYPES.includes(file.type as any) && !FILE_UPLOAD.EXCEL_FILE_EXTENSIONS.includes(fileExtension)) {
      showToast('Please upload an Excel file (.xlsx, .xls) or CSV file', 'error');
      e.target.value = '';
      return;
    }

    setImporting(true);
    try {
      showToast('Importing payment data from Excel...', 'info');
      const result = await apiClient.importPaymentsExcel(file);
      
      console.log('📥 Import result:', result);
      
      if (result.success) {
        let message = `Successfully imported ${result.imported} payment record(s)`;
        if (result.skipped > 0) message += `. Note: ${result.skipped} rows were skipped (missing name/amount/month).`;
        if (result.errors > 0) message += ` and ${result.errors} errors occurred.`;
        
        showToast(message, result.errors > 0 ? 'warning' : 'success');
        
        console.log(`✅ Import result: ${result.imported} records saved to MongoDB`);
        console.log(`📊 Imported invoices:`, result.payments?.length || 0);
        
        // Force reload payments immediately
        console.log('🔄 Reloading payments from MongoDB...');
        await loadPayments();
        
        // Also reload after a short delay to ensure all data is available
        setTimeout(async () => {
          console.log('🔄 Second reload to ensure all data is loaded from MongoDB...');
          await loadPayments();
        }, 1000);
      } else {
        showToast(result.message || 'Import completed with errors', 'warning');
        // Still try to reload in case some data was imported
        await loadPayments();
      }
    } catch (error: any) {
      console.error('❌ Failed to import Excel file', error);
      showToast(error.message || 'Failed to import Excel file', 'error');
      } finally {
        setImporting(false);
        e.target.value = '';
      }
    };
  
    const handleClearAll = async () => {
      setClearingAll(true);
      try {
        const result = await apiClient.clearAllPayments();
        showToast(result.message || 'Successfully cleared all payment records', 'success');
        await loadPayments();
        setShowClearAllConfirm(false);
      } catch (error: any) {
        console.error('Failed to clear payments', error);
        showToast(error.message || 'Failed to clear payments', 'error');
      } finally {
        setClearingAll(false);
      }
    };

    const handleAddRecord = async () => {
      if (!newRecord.name || !newRecord.amount || !newRecord.month) {
        showToast('Name, Amount, and Month are required', 'warning');
        return;
      }

      setLoading(true);
      try {
        await apiClient.createPayment({
          name: newRecord.name,
          amount: parseFloat(newRecord.amount),
          month: newRecord.month,
          role: newRecord.role,
          contractHours: parseFloat(newRecord.contractHours) || 0,
          fulfilledHours: parseFloat(newRecord.fulfilledHours) || 0
        });

        showToast('Payment record added successfully', 'success');
        setShowAddModal(false);
        setNewRecord({
          name: '',
          amount: '',
          month: '',
          role: '',
          contractHours: '',
          fulfilledHours: ''
        });
        await loadPayments();
      } catch (error: any) {
        console.error('Failed to add payment record', error);
        showToast(error.message || 'Failed to add payment record', 'error');
      } finally {
        setLoading(false);
      }
    };

  // Get unique months and roles for filters
  const uniqueMonths = useMemo(() => {
    const months = [...new Set(payments.map(p => p.month))].sort((a, b) => {
      return getMonthValue(a) - getMonthValue(b);
    });
    return months;
  }, [payments]);

  const uniqueRoles = useMemo(() => {
    const roles = [...new Set(payments.map(p => p.role))].sort();
    return roles;
  }, [payments]);

  // Filter and sort payments
  const filteredPayments = useMemo(() => {
    let filtered = [...payments];

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.role.toLowerCase().includes(query) ||
        p.month.toLowerCase().includes(query)
      );
    }

    // Apply month filter
    if (filterMonth) {
      filtered = filtered.filter(p => p.month === filterMonth);
    }

    // Apply role filter
    if (filterRole) {
      filtered = filtered.filter(p => p.role === filterRole);
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: any = a[sortBy];
      let bVal: any = b[sortBy];
      
      if (sortBy === 'month') {
        aVal = getMonthValue(a.month);
        bVal = getMonthValue(b.month);
      } else if (sortBy === 'amount') {
        aVal = a.amount;
        bVal = b.amount;
      } else if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  }, [payments, searchQuery, filterMonth, filterRole, sortBy, sortOrder]);

  // Group payments
  const groupedPayments = useMemo(() => {
    if (groupBy === 'none') return null;

    const groups: { [key: string]: PaymentRecord[] } = {};

    filteredPayments.forEach(payment => {
      let key = '';
      if (groupBy === 'month') key = payment.month;
      else if (groupBy === 'role') key = payment.role;
      else if (groupBy === 'employee') key = payment.name;

      if (!groups[key]) groups[key] = [];
      groups[key].push(payment);
    });

    return groups;
  }, [filteredPayments, groupBy]);

  // Calculate summary statistics
  const summary: PaymentSummary = useMemo(() => {
    const byMonth: { [key: string]: { amount: number; count: number } } = {};
    const byRole: { [key: string]: { amount: number; count: number } } = {};

    let totalAmount = 0;
    let totalContractHours = 0;
    let totalFulfilledHours = 0;

    payments.forEach(payment => {
      totalAmount += payment.amount;
      totalContractHours += payment.contractHours;
      totalFulfilledHours += payment.fulfilledHours;

      // By month
      if (!byMonth[payment.month]) {
        byMonth[payment.month] = { amount: 0, count: 0 };
      }
      byMonth[payment.month].amount += payment.amount;
      byMonth[payment.month].count += 1;

      // By role
      if (!byRole[payment.role]) {
        byRole[payment.role] = { amount: 0, count: 0 };
      }
      byRole[payment.role].amount += payment.amount;
      byRole[payment.role].count += 1;
    });

    return {
      totalAmount,
      totalRecords: payments.length,
      totalContractHours,
      totalFulfilledHours,
      byMonth,
      byRole
    };
  }, [payments]);

    // Calculate fulfillment rate
    
    if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-muted-foreground">Loading payment data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-background min-h-screen p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-foreground">Payments</h1>
          <button
            onClick={loadPayments}
            disabled={loading}
            className={`p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors ${loading ? 'animate-spin' : ''}`}
            title="Refresh"
          >
            <FiRefreshCw className="h-4 w-4" />
          </button>
          </div>
            <div className="flex items-center gap-2">
              {/* Add Record Button */}
              <Button
                onClick={() => setShowAddModal(true)}
                variant="default"
                className="inline-flex items-center"
              >
                <FiPlus className="h-4 w-4 mr-2" />
                Add Record
              </Button>
              {/* Clear All Button */}
              {isAdmin && (

              <button
                onClick={() => setShowClearAllConfirm(true)}
                disabled={clearingAll || payments.length === 0}
                className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md shadow-sm text-red-600 bg-card hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors disabled:opacity-50"
              >
                <FiTrash2 className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Clear All</span>
              </button>
            )}
            {/* Import Button */}
            <label className="inline-flex items-center px-4 py-2 border border-border text-sm font-medium rounded-md shadow-sm text-foreground bg-card hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors cursor-pointer">
            <FiUpload className="h-4 w-4 mr-2" />
            {importing ? 'Importing...' : 'Import Excel'}
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleImportExcel}
              disabled={importing}
              className="hidden"
            />
          </label>
          {/* Export Button */}
          <button
            className="inline-flex items-center px-4 py-2 border border-border text-sm font-medium rounded-md shadow-sm text-foreground bg-card hover:bg-accent transition-colors"
          >
            <FiDownload className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
            <FiDollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground mt-1">{summary.totalRecords} records</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
            <FiUser className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{new Set(payments.map(p => p.name)).size}</div>
            <p className="text-xs text-muted-foreground mt-1">Unique employees</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Filters & Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative lg:col-span-2">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="h-5 w-5 text-muted-foreground" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, role, or month..."
                className="block w-full pl-10 pr-3 py-2 border border-border rounded-md leading-5 bg-card placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
              />
            </div>

            {/* Month Filter */}
            <div>
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="block w-full px-3 py-2 border border-border rounded-md bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
              >
                <option value="">All Months</option>
                {uniqueMonths.map(month => (
                  <option key={month} value={month}>{month}</option>
                ))}
              </select>
            </div>

            {/* Role Filter */}
            <div>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="block w-full px-3 py-2 border border-border rounded-md bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
              >
                <option value="">All Roles</option>
                {uniqueRoles.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>

            {/* Group By */}
            <div>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as any)}
                className="block w-full px-3 py-2 border border-border rounded-md bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
              >
                <option value="none">No Grouping</option>
                <option value="month">Group by Month</option>
                <option value="role">Group by Role</option>
                <option value="employee">Group by Employee</option>
              </select>
            </div>
          </div>

          {/* Sort Controls */}
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-1.5 border border-border rounded-md bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm"
              >
                <option value="month">Month</option>
                <option value="name">Name</option>
                <option value="role">Role</option>
                <option value="amount">Amount</option>
              </select>
            </div>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-1.5 border border-border rounded-md bg-card text-foreground hover:bg-accent transition-colors text-sm"
            >
              {sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Records ({filteredPayments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {groupedPayments ? (
            // Grouped View
            <div className="space-y-6">
              {Object.entries(groupedPayments)
                .sort(([aKey], [bKey]) => {
                  if (groupBy === 'month') {
                    return getMonthValue(aKey) - getMonthValue(bKey);
                  }
                  return aKey.localeCompare(bKey);
                })
                .map(([groupKey, groupPayments]) => {
                const groupTotal = groupPayments.reduce((sum, p) => sum + p.amount, 0);
                return (
                  <div key={groupKey} className="border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-border">
                      <h3 className="text-lg font-semibold text-foreground">{groupKey}</h3>
                      <Badge variant="default" className="text-sm">
                        {groupPayments.length} records • ${groupTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Badge>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-border">
                        <thead className="bg-muted">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">Name</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">Role</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">Contract Hours</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">Fulfilled Hours</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="bg-card divide-y divide-border">
                          {groupPayments.map((payment) => (
                            <tr key={payment.id} className="hover:bg-muted/50">
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground">{payment.name}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground">{payment.role}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground">{payment.contractHours}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground">
                                {payment.fulfilledHours || 0}
                                {payment.contractHours > 0 && (
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    ({((payment.fulfilledHours / payment.contractHours) * 100).toFixed(0)}%)
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-foreground">
                                ${payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Regular Table View
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">Month</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">Contract Hours</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">Fulfilled Hours</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">Amount</th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {filteredPayments.length > 0 ? (
                    filteredPayments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-muted/50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground">{payment.month}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-foreground">{payment.name}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground">{payment.role}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground">{payment.contractHours}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground">
                          {payment.fulfilledHours || 0}
                          {payment.contractHours > 0 && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({((payment.fulfilledHours / payment.contractHours) * 100).toFixed(0)}%)
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-foreground">
                          ${payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <FiFileText className="h-12 w-12 text-muted-foreground" />
                          <p>No payment records found</p>
                          <p className="text-sm">Import an Excel file to get started</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          </CardContent>
        </Card>

        {/* Add Record Modal */}
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Payment Record</DialogTitle>
              <DialogDescription>
                Manually enter a new employee payment record.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name</Label>
                <Input
                  id="name"
                  value={newRecord.name}
                  onChange={(e) => setNewRecord({ ...newRecord, name: e.target.value })}
                  className="col-span-3"
                  placeholder="Employee Name"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">Amount ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={newRecord.amount}
                  onChange={(e) => setNewRecord({ ...newRecord, amount: e.target.value })}
                  className="col-span-3"
                  placeholder="0.00"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="month" className="text-right">Month</Label>
                <Input
                  id="month"
                  value={newRecord.month}
                  onChange={(e) => setNewRecord({ ...newRecord, month: e.target.value })}
                  className="col-span-3"
                  placeholder="e.g. February 2025"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">Role</Label>
                <Input
                  id="role"
                  value={newRecord.role}
                  onChange={(e) => setNewRecord({ ...newRecord, role: e.target.value })}
                  className="col-span-3"
                  placeholder="Job Title"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="contractHours" className="text-right">Contract Hrs</Label>
                <Input
                  id="contractHours"
                  type="number"
                  value={newRecord.contractHours}
                  onChange={(e) => setNewRecord({ ...newRecord, contractHours: e.target.value })}
                  className="col-span-3"
                  placeholder="160"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="fulfilledHours" className="text-right">Fulfilled Hrs</Label>
                <Input
                  id="fulfilledHours"
                  type="number"
                  value={newRecord.fulfilledHours}
                  onChange={(e) => setNewRecord({ ...newRecord, fulfilledHours: e.target.value })}
                  className="col-span-3"
                  placeholder="160"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button onClick={handleAddRecord} disabled={loading}>
                {loading ? 'Adding...' : 'Add Record'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Clear All Confirmation Modal */}
        <ConfirmModal
          isOpen={showClearAllConfirm}
          onClose={() => setShowClearAllConfirm(false)}
          onConfirm={handleClearAll}
          title="Clear All Payments"
          message="Are you sure you want to delete ALL employee payment records? This action cannot be undone and will not affect regular invoices."
          confirmText={clearingAll ? 'Clearing...' : 'Clear All'}
          type="danger"
        />
      </div>
    );
  }