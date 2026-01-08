import { useState, useEffect } from 'react';
import { FiX, FiDownload, FiSearch, FiRefreshCw, FiUpload, FiFileText } from 'react-icons/fi';
import { SubmissionService } from '../../services/submissionService';
import { apiClient, type Submission, type Employee } from '../../services/api';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import JSZip from 'jszip';
import { logger } from '../../lib/logger';
import AlertModal from '../../components/shared/AlertModal';

export default function Payroll() {
  
  
  
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isLoadingEmployee, setIsLoadingEmployee] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [submissionToReject, setSubmissionToReject] = useState<Submission | null>(null);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [submissionToApprove, setSubmissionToApprove] = useState<Submission | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportDateRange, setExportDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedRole, setSelectedRole] = useState('all');
  const [grouping, setGrouping] = useState('none');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await SubmissionService.getSubmissions();
      setSubmissions(data);
    } catch (err) {
      logger.error('Failed to fetch submissions', err);
      setError('Failed to load submissions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch submissions on component mount
  useEffect(() => {
    void fetchSubmissions();
  }, []);

  const handleViewSubmission = async (submission: Submission) => {
    setSelectedSubmission(submission);
    setIsLoadingEmployee(true);
    
    // Fetch employee data for invoice footer
    try {
      const employee = await apiClient.getEmployeeByEmployeeId(submission.employeeId);
      setSelectedEmployee(employee);
    } catch (error) {
      logger.error('Failed to fetch employee data', error);
      setSelectedEmployee(null);
    } finally {
      setIsLoadingEmployee(false);
    }
  };

  const handleCloseViewModal = () => {
    setSelectedSubmission(null);
    setSelectedEmployee(null);
  };

  const handleApproveSubmission = (submissionId: string) => {
    const submission = submissions.find(s => s.id === submissionId);
    if (submission) {
      setSubmissionToApprove(submission);
      setIsApproveModalOpen(true);
    } else {
      logger.error('Submission not found', { submissionId });
    }
  };

  const confirmApproveSubmission = async () => {
    
    if (submissionToApprove) {
      try {
        
        // Update via API
        const updatedSubmission = await SubmissionService.updateSubmissionStatus(submissionToApprove.id, 'approved', 'admin');
        
        // Update local state using the response from API
        setSubmissions(prevSubmissions => {
          const updated = prevSubmissions.map(submission => {
            return submission.id === submissionToApprove.id 
              ? updatedSubmission  // Use the response from API
              : submission;
          });
          return updated;
        });
        
        // If the approved submission is currently being viewed, update the modal
        if (selectedSubmission && selectedSubmission.id === submissionToApprove.id) {
          setSelectedSubmission(updatedSubmission);
        }
        
        // Close the approval modal
        setIsApproveModalOpen(false);
        setSubmissionToApprove(null);
      } catch (err) {
        logger.error('Failed to approve submission', err);
        setError('Failed to approve submission. Please try again.');
        // Don't close modal on error
      }
    } else {
      logger.error('No submission to approve');
    }
  };

  const cancelApproveSubmission = () => {
    setIsApproveModalOpen(false);
    setSubmissionToApprove(null);
  };

  const handleRejectSubmission = (submissionId: string) => {
    const submission = submissions.find(s => s.id === submissionId);
    if (submission) {
      setSubmissionToReject(submission);
      setIsRejectModalOpen(true);
    } else {
      logger.error('Submission not found', { submissionId });
    }
  };

  const confirmRejectSubmission = async () => {
    
    if (submissionToReject) {
      if (!rejectionReason.trim()) {
        setAlertModal({
          isOpen: true,
          type: 'warning',
          title: 'Rejection Reason Required',
          message: 'Please provide a reason for rejection.',
        });
        return;
      }
      
      try {
        
        // Update via API
        const updatedSubmission = await SubmissionService.updateSubmissionStatus(submissionToReject.id, 'rejected', 'admin', rejectionReason);
        
        // Update local state using the response from API
        setSubmissions(prevSubmissions => {
          const updated = prevSubmissions.map(submission => {
            return submission.id === submissionToReject.id 
              ? updatedSubmission  // Use the response from API
              : submission;
          });
          return updated;
        });
        
        // If the rejected submission is currently being viewed, update the modal
        if (selectedSubmission && selectedSubmission.id === submissionToReject.id) {
          setSelectedSubmission(updatedSubmission);
        }
        
        // Close the rejection modal
        setIsRejectModalOpen(false);
        setSubmissionToReject(null);
        setRejectionReason(''); // Clear the rejection reason
      } catch (err) {
        logger.error('Failed to reject submission', err);
        setError('Failed to reject submission. Please try again.');
        // Don't close modal on error
      }
    } else {
      logger.error('No submission to reject');
    }
  };

  const cancelRejectSubmission = () => {
    setIsRejectModalOpen(false);
    setSubmissionToReject(null);
    setRejectionReason(''); // Clear the rejection reason
  };

  const generateInvoiceHTML = (submission: Submission, employee?: Employee | null) => {
    const phone = employee?.phone || 'N/A';
    const email = employee?.email || 'N/A';
    const address = employee?.address 
      ? (() => {
          const addrParts: string[] = [];
          if (employee.address.street) addrParts.push(employee.address.street);
          if (employee.address.city) addrParts.push(employee.address.city);
          if (employee.address.state) addrParts.push(employee.address.state);
          if (employee.address.zipCode) addrParts.push(employee.address.zipCode);
          if (employee.address.country) addrParts.push(employee.address.country);
          return addrParts.length > 0 ? addrParts.join(', ') : 'N/A';
        })()
      : 'N/A';

    return `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto;">
        <!-- Invoice Header -->
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 30px;">
          <div>
            <h1 style="font-size: 32px; font-weight: bold; color: #1f2937; margin: 0;">INVOICE</h1>
          </div>
          <div style="text-align: right; font-size: 14px; color: #6b7280;">
            <div>Date: ${new Date(submission.submittedAt).toLocaleDateString()}</div>
            <div>Invoice No: ${submission.invoiceNumber || 'N/A'}</div>
          </div>
        </div>

        <!-- Bill To -->
        <div style="margin-bottom: 30px;">
          <h3 style="font-size: 14px; font-weight: 500; color: #1f2937; margin-bottom: 8px;">Bill To:</h3>
          <div style="font-size: 14px; color: #374151;">
            <div>Invisiedge LLC.</div>
            <div>1145 Compaq Center W. Drive, <br /> CCA6, Houston, TX 77070</div>
          </div>
        </div>

        <!-- Employee Info -->
        <div style="margin-bottom: 30px;">
          <h3 style="font-size: 14px; font-weight: 500; color: #1f2937; margin-bottom: 8px;">Employee Information:</h3>
          <div style="font-size: 14px; color: #374151;">
            <div><strong>Name:</strong> ${submission.employeeName}</div>
            <div><strong>Employee ID:</strong> ${submission.employeeId}</div>
            <div><strong>Position:</strong> Employee</div>
          </div>
        </div>

        <!-- Bank Details -->
        <div style="margin-bottom: 30px;">
          <h3 style="font-size: 14px; font-weight: 500; color: #1f2937; margin-bottom: 8px;">Bank Details:</h3>
          <div style="font-size: 14px; color: #374151;">
            <div><strong>Bank:</strong> ${submission.bankDetails.bankName}</div>
            <div><strong>Account:</strong> ${submission.bankDetails.fullAccountNumber}</div>
            <div><strong>Swift Code:</strong> ${submission.bankDetails.swiftCode}</div>
          </div>
        </div>

        <!-- Work Details Table -->
        <div style="margin-bottom: 30px;">
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #d1d5db;">
            <thead>
              <tr style="background-color: #f9fafb;">
                <th style="border: 1px solid #d1d5db; padding: 12px; text-align: left; font-size: 14px; font-weight: 500; color: #6b7280; text-transform: uppercase; width: 25%;">Date</th>
                <th style="border: 1px solid #d1d5db; padding: 12px; text-align: left; font-size: 14px; font-weight: 500; color: #6b7280; text-transform: uppercase; width: 50%;">Item Description</th>
                <th style="border: 1px solid #d1d5db; padding: 12px; text-align: left; font-size: 14px; font-weight: 500; color: #6b7280; text-transform: uppercase; width: 25%;">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="border: 1px solid #d1d5db; padding: 12px; font-size: 14px; color: #1f2937; vertical-align: top;">
                  ${submission.workPeriod}
                </td>
                <td style="border: 1px solid #d1d5db; padding: 12px; font-size: 14px; color: #1f2937; vertical-align: top; word-wrap: break-word;">
                  ${submission.description}
                </td>
                <td style="border: 1px solid #d1d5db; padding: 12px; font-size: 14px; color: #1f2937; vertical-align: top;">
                  ${submission.totalAmount} USD
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Total -->
        <div style="text-align: right;">
          <div style="font-size: 18px; font-weight: 600; color: #1f2937;">
            TOTAL = ${submission.totalAmount} USD
          </div>
        </div>

        <!-- Footer -->
        <div style="margin-top: 40px;">
          <div style="font-size: 18px; font-weight: bold; color: #1f2937; margin-bottom: 16px;">THANK YOU!</div>
          <div style="font-size: 14px; color: #6b7280;">
            <div>Phone No.: ${phone}</div>
            <div>Email: ${email}</div>
            <div>Home Address: ${address}</div>
          </div>
        </div>
      </div>
    `;
  };

  const generatePDF = async (submission: Submission): Promise<Blob> => {
    // Fetch employee data for invoice footer
    let employee: Employee | null = null;
    try {
      employee = await apiClient.getEmployeeByEmployeeId(submission.employeeId);
    } catch (error) {
      logger.error('Failed to fetch employee data for PDF', error);
    }
    
    const htmlContent = generateInvoiceHTML(submission, employee);
    
    // Create a temporary div element
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '-9999px';
    document.body.appendChild(tempDiv);

    try {
      // Generate canvas from HTML
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      // Create PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      return pdf.output('blob');
    } finally {
      // Clean up
      document.body.removeChild(tempDiv);
    }
  };

  const handleBulkExport = async (dateRange?: { startDate: string; endDate: string }) => {
    let submissionsToExport = filteredSubmissions;
    
    // Filter by date range if provided
    if (dateRange && dateRange.startDate && dateRange.endDate) {
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      endDate.setHours(23, 59, 59, 999); // Include the entire end date
      
      submissionsToExport = filteredSubmissions.filter(submission => {
        const submissionDate = new Date(submission.submittedAt);
        return submissionDate >= startDate && submissionDate <= endDate;
      });
    }

    if (submissionsToExport.length === 0) {
      setAlertModal({
        isOpen: true,
        type: 'warning',
        title: 'No Submissions Found',
        message: 'No submissions found for the selected date range.',
      });
      return;
    }

    setIsExporting(true);
    
    try {
      const zip = new JSZip();
      
      // Generate PDFs for each submission
      for (let i = 0; i < submissionsToExport.length; i++) {
        const submission = submissionsToExport[i];
        const pdfBlob = await generatePDF(submission);
        
        // Create filename
        const filename = `Invoice_${submission.employeeName.replace(/\s+/g, '_')}_${submission.invoiceNumber || submission.id}.pdf`;
        
        // Add PDF to zip
        zip.file(filename, pdfBlob);
      }

      // Generate and download zip file
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      
      // Create download link
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `All_Invoices_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setAlertModal({
        isOpen: true,
        type: 'success',
        title: 'Export Successful',
        message: `Successfully exported ${submissionsToExport.length} invoices as PDFs!`,
      });
    } catch (error) {
      logger.error('Bulk export failed', error);
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'Export Failed',
        message: 'Failed to export invoices. Please try again.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const filteredSubmissions = submissions
    .filter(submission => {
      const matchesStatus = (() => {
        switch (activeTab) {
          case 'pending':
            return submission.status === 'pending';
          case 'approved':
            return submission.status === 'approved';
          case 'rejected':
            return submission.status === 'rejected';
          default:
            return true; // 'all' tab shows all submissions
        }
      })();

      const query = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !query ||
        submission.employeeName.toLowerCase().includes(query) ||
        submission.employeeId.toLowerCase().includes(query) ||
        submission.workPeriod.toLowerCase().includes(query);

      const matchesMonth =
        selectedMonth === 'all' ||
        new Date(submission.submittedAt).getMonth().toString() === selectedMonth;

      return matchesStatus && matchesSearch && matchesMonth;
    })
    .sort((a, b) => {
      const diff =
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
      return sortDirection === 'desc' ? diff : -diff;
    });

  // Get counts for each tab
  // Pagination logic
  const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSubmissions = filteredSubmissions.slice(startIndex, endIndex);

  // Reset to first page when search or month changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedMonth]);

  // Date range helper functions
  const getDateRangePresets = () => {
    const today = new Date();
    const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);
    const last30Days = new Date(today);
    last30Days.setDate(today.getDate() - 30);

    return {
      thisMonth: {
        label: 'This Month',
        startDate: currentMonth.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0]
      },
      lastMonth: {
        label: 'Last Month',
        startDate: lastMonth.toISOString().split('T')[0],
        endDate: lastMonthEnd.toISOString().split('T')[0]
      },
      lastWeek: {
        label: 'Last 7 Days',
        startDate: lastWeek.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0]
      },
      last30Days: {
        label: 'Last 30 Days',
        startDate: last30Days.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0]
      }
    };
  };

  const handlePresetSelect = (preset: { startDate: string; endDate: string }) => {
    setExportDateRange(preset);
  };

  const handleExportWithDateRange = () => {
    if (!exportDateRange.startDate || !exportDateRange.endDate) {
      setAlertModal({
        isOpen: true,
        type: 'warning',
        title: 'Date Range Required',
        message: 'Please select both start and end dates.',
      });
      return;
    }
    setIsExportModalOpen(false);
    handleBulkExport(exportDateRange);
  };

  const totalPayments = filteredSubmissions.reduce(
    (sum, submission) => sum + (submission.totalAmount || 0),
    0
  );
    const uniqueEmployees = new Set(filteredSubmissions.map((submission) => submission.employeeId)).size;
    
    const formatCurrency = (value: number) =>
    value.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-400';
      case 'rejected': return 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-400';
      case 'pending': return 'bg-yellow-100 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-400';
      default: return 'bg-gray-100 dark:bg-gray-800 text-foreground';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-3xl font-bold text-foreground">Payments</h2>
          <button
            type="button"
            onClick={() => fetchSubmissions()}
            className="inline-flex items-center justify-center rounded-full border border-border bg-white p-2 text-muted-foreground shadow-sm hover:text-foreground"
            title="Refresh payments"
          >
            <FiRefreshCw className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-muted-foreground shadow-sm opacity-70 cursor-not-allowed"
          >
            <FiUpload className="h-4 w-4" />
            Import Excel
          </button>
          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            disabled={isExporting || filteredSubmissions.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isExporting ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Exporting...
              </>
            ) : (
              <>
                <FiDownload className="h-4 w-4" />
                Export
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card px-4 py-4 shadow-sm">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Total Payments</span>
            <span className="text-gray-400">$</span>
          </div>
          <div className="mt-2 text-3xl font-bold text-foreground">{formatCurrency(totalPayments)}</div>
          <div className="mt-1 text-xs text-gray-500">
            {filteredSubmissions.length} {filteredSubmissions.length === 1 ? 'record' : 'records'}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card px-4 py-4 shadow-sm">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Active Employees</span>
            <span className="text-gray-400">👤</span>
          </div>
          <div className="mt-2 text-3xl font-bold text-foreground">{uniqueEmployees}</div>
          <div className="mt-1 text-xs text-gray-500">Unique employees</div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Filters & Search</h3>
        </div>
        <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, role, or month..."
              className="w-full rounded-lg border border-[#e5e9f2] bg-white pl-10 pr-3 py-3 text-sm text-foreground placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full rounded-lg border border-[#e5e9f2] bg-white px-3 py-3 text-sm text-foreground focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Months</option>
            {Array.from({ length: 12 }).map((_, index) => (
              <option key={index} value={index.toString()}>
                {new Date(0, index).toLocaleString('default', { month: 'long' })}
              </option>
            ))}
          </select>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full rounded-lg border border-[#e5e9f2] bg-white px-3 py-3 text-sm text-foreground focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="employee">Employee</option>
            <option value="contractor">Contractor</option>
          </select>
          <select
            value={grouping}
            onChange={(e) => setGrouping(e.target.value)}
            className="w-full rounded-lg border border-[#e5e9f2] bg-white px-3 py-3 text-sm text-foreground focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="none">No Grouping</option>
            <option value="role">Group by Role</option>
            <option value="month">Group by Month</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-2 border-b border-border px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-foreground">
              Payment Records ({filteredSubmissions.length})
            </h3>
            <p className="text-sm text-muted-foreground">Track the status of your payment records.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Sort:</span>
            <select
              value={sortDirection}
              onChange={(e) => setSortDirection(e.target.value as 'asc' | 'desc')}
              className="rounded-lg border border-[#e5e9f2] bg-white px-3 py-2 text-sm text-foreground focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-muted">
              <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
            </div>
            <h3 className="mb-2 text-lg font-medium text-foreground">Loading payments...</h3>
            <p className="text-gray-500">Please wait while we fetch the latest records.</p>
          </div>
        ) : error ? (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-red-100">
              <FiX className="h-12 w-12 text-destructive" />
            </div>
            <h3 className="mb-2 text-lg font-medium text-foreground">Error loading payments</h3>
            <p className="mb-4 text-gray-500">{error}</p>
            <button
              onClick={() => fetchSubmissions()}
              className="rounded-md bg-primary px-4 py-2 text-white transition-colors hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        ) : paginatedSubmissions.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-white shadow-sm">
              <FiFileText className="h-6 w-6 text-blue-500" />
            </div>
            <p className="text-lg font-semibold text-foreground">No payment records found</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Import an Excel file to get started
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Month
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Contract Hours
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Fulfilled Hours
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {paginatedSubmissions.map((submission) => {
                    const monthLabel = new Date(submission.submittedAt).toLocaleString('default', {
                      month: 'short',
                      year: 'numeric'
                    });

                    return (
                      <tr
                        key={submission.id}
                        className="cursor-pointer transition-colors hover:bg-gray-50"
                        onClick={() => handleViewSubmission(submission)}
                      >
                        <td className="px-6 py-4 text-sm text-gray-700">{monthLabel}</td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-foreground">{submission.employeeName}</div>
                          <div className="text-xs text-muted-foreground">{submission.employeeId}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">—</td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {submission.workPeriod || '—'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(submission.status)}`}>
                            {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-foreground">
                          {formatCurrency(submission.totalAmount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredSubmissions.length > itemsPerPage && (
              <div className="border-t border-border bg-card px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredSubmissions.length)} of{' '}
                    {filteredSubmissions.length} results
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <div className="flex space-x-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }

                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`rounded-md px-3 py-2 text-sm font-medium ${
                              currentPage === pageNum
                                ? 'bg-blue-600 text-white'
                                : 'border border-border bg-card text-gray-700 hover:bg-accent'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* View Submission Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 min-h-screen">
          <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-border flex-shrink-0">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-foreground">Payment Submission Details</h3>
                <button
                  onClick={handleCloseViewModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="px-6 py-4 space-y-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-3">Employee Information</h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-gray-500">Name:</span>
                      <span className="ml-2 text-sm text-foreground">{selectedSubmission.employeeName}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Employee ID:</span>
                      <span className="ml-2 text-sm text-foreground">{selectedSubmission.employeeId}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Submitted Date:</span>
                      <span className="ml-2 text-sm text-foreground">{new Date(selectedSubmission.submittedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-3">Bank Details</h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-gray-500">Bank:</span>
                      <span className="ml-2 text-sm text-foreground">{selectedSubmission.bankDetails.bankName}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Account:</span>
                      <span className="ml-2 text-sm text-foreground font-mono">{selectedSubmission.bankDetails.fullAccountNumber}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Swift Code:</span>
                      <span className="ml-2 text-sm text-foreground font-mono">{selectedSubmission.bankDetails.swiftCode || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="border-t border-border pt-6">
                <h4 className="text-sm font-medium text-foreground mb-3">Payment Information</h4>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-gray-500">Amount:</span>
                    <span className="ml-2 text-lg font-semibold text-foreground">${selectedSubmission.totalAmount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Description:</span>
                    <span className="ml-2 text-sm text-foreground">{selectedSubmission.description}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Status:</span>
                    <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedSubmission.status)}`}>
                      {selectedSubmission.status.charAt(0).toUpperCase() + selectedSubmission.status.slice(1)}
                    </span>
                  </div>
                  
                  {/* Show reviewer information for approved/rejected submissions */}
                  {(selectedSubmission.status === 'approved' || selectedSubmission.status === 'rejected') && selectedSubmission.reviewedAt && (
                    <>
                      <div>
                        <span className="text-sm text-gray-500">
                          {selectedSubmission.status === 'approved' ? 'Approved Date:' : 'Rejected Date:'}
                        </span>
                        <span className="ml-2 text-sm text-foreground">
                          {new Date(selectedSubmission.reviewedAt).toLocaleDateString()}
                        </span>
                      </div>
                      {selectedSubmission.reviewerName && (
                        <div>
                          <span className="text-sm text-gray-500">
                            {selectedSubmission.status === 'approved' ? 'Approved By:' : 'Rejected By:'}
                          </span>
                          <span className="ml-2 text-sm text-foreground">{selectedSubmission.reviewerName}</span>
                        </div>
                      )}
                    </>
                  )}
                  
                  {/* Show rejection reason for rejected submissions */}
                  {selectedSubmission.status === 'rejected' && selectedSubmission.rejectionReason && (
                    <div>
                      <span className="text-sm text-gray-500">Rejection Reason:</span>
                      <div className="ml-2 mt-1 p-3 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm text-red-800">{selectedSubmission.rejectionReason}</p>
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <span className="text-sm text-gray-500">Invoice:</span>
                    <span className="ml-2 text-sm text-gray-500">No invoice file attached</span>
                  </div>
                </div>
              </div>
              
              {/* Invoice Section */}
              <div className="border-t border-border pt-6">
                <h4 className="text-sm font-medium text-foreground mb-3">Invoice</h4>
                <div className="bg-card rounded-lg shadow-sm border border-border p-6">
                    {/* Invoice Header */}
                  <div className="flex justify-between items-start mb-6">
                      <div>
                      <h2 className="text-2xl font-bold text-foreground">INVOICE</h2>
                      </div>
                    <div className="text-sm text-muted-foreground text-right">
                      <div>Date: {new Date(selectedSubmission.submittedAt).toLocaleDateString()}</div>
                      <div>Invoice No: {selectedSubmission.invoiceNumber || 'N/A'}</div>
                      </div>
                    </div>

                    {/* Bill To */}
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-foreground mb-2">Bill To:</h3>
                      <div className="text-sm text-gray-700">
                      <div>Invisiedge LLC.</div>
                      <div>1145 Compaq Center W. Drive, <br /> CCA6, Houston, TX 77070</div>
                    </div>
                        </div>

                  {/* Employee Info */}
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-foreground mb-2">Employee Information:</h3>
                    <div className="text-sm text-foreground space-y-1">
                      <div><strong>Name:</strong> {selectedSubmission.employeeName}</div>
                      <div><strong>Employee ID:</strong> {selectedSubmission.employeeId}</div>
                      <div><strong>Position:</strong> Employee</div>
                        </div>
                      </div>

                  {/* Bank Details */}
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-foreground mb-2">Bank Details:</h3>
                    <div className="text-sm text-foreground space-y-1">
                      <div><strong>Bank:</strong> {selectedSubmission.bankDetails.bankName}</div>
                      <div><strong>Account:</strong> {selectedSubmission.bankDetails.fullAccountNumber}</div>
                      <div><strong>Swift Code:</strong> {selectedSubmission.bankDetails.swiftCode}</div>
                    </div>
                  </div>

                  {/* Work Details Table */}
                  <div className="mb-6">
                    <table className="w-full border-collapse border border-border table-fixed">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-900">
                          <th className="border border-border px-4 py-3 text-left text-sm font-medium text-muted-foreground uppercase w-1/4">Date</th>
                          <th className="border border-border px-4 py-3 text-left text-sm font-medium text-muted-foreground uppercase w-1/2">Item Description</th>
                          <th className="border border-border px-4 py-3 text-left text-sm font-medium text-muted-foreground uppercase w-1/4">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-border px-4 py-3 text-sm text-foreground align-top">
                            {selectedSubmission.workPeriod}
                          </td>
                          <td className="border border-border px-4 py-3 text-sm text-foreground whitespace-normal break-words align-top">
                            <div className="max-w-full">
                              {selectedSubmission.description}
                            </div>
                          </td>
                          <td className="border border-border px-4 py-3 text-sm text-foreground align-top">
                            {selectedSubmission.totalAmount} USD
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    </div>

                    {/* Total */}
                  <div className="text-right">
                    <div className="text-lg font-semibold text-foreground">
                      TOTAL = {selectedSubmission.totalAmount} USD
                    </div>
                      </div>

                  {/* Footer */}
                  <div className="mt-8 text-left">
                    <div className="text-lg font-bold text-foreground mb-4">THANK YOU!</div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>Phone No.: {isLoadingEmployee ? 'Loading...' : (selectedEmployee?.phone || 'N/A')}</div>
                      <div>Email: {isLoadingEmployee ? 'Loading...' : (selectedEmployee?.email || 'N/A')}</div>
                      <div>Home Address: {isLoadingEmployee ? 'Loading...' : (
                        selectedEmployee?.address 
                          ? (() => {
                              const addrParts: string[] = [];
                              if (selectedEmployee.address.street) addrParts.push(selectedEmployee.address.street);
                              if (selectedEmployee.address.city) addrParts.push(selectedEmployee.address.city);
                              if (selectedEmployee.address.state) addrParts.push(selectedEmployee.address.state);
                              if (selectedEmployee.address.zipCode) addrParts.push(selectedEmployee.address.zipCode);
                              if (selectedEmployee.address.country) addrParts.push(selectedEmployee.address.country);
                              return addrParts.length > 0 ? addrParts.join(', ') : 'N/A';
                            })()
                          : 'N/A'
                      )}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-background rounded-b-lg flex justify-end space-x-3 flex-shrink-0">
              <button
                onClick={handleCloseViewModal}
                className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-md hover:bg-accent transition-colors"
              >
                Close
              </button>
              <button 
                onClick={() => selectedSubmission && handleApproveSubmission(selectedSubmission.id)}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                disabled={selectedSubmission?.status === 'approved' || selectedSubmission?.status === 'rejected'}
              >
                Approve
              </button>
              <button 
                onClick={() => selectedSubmission && handleRejectSubmission(selectedSubmission.id)}
                className="px-4 py-2 text-sm font-medium text-white bg-destructive border border-transparent rounded-md hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                disabled={selectedSubmission?.status === 'rejected' || selectedSubmission?.status === 'approved'}
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Confirmation Modal */}
      {isRejectModalOpen && submissionToReject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 min-h-screen">
          <div className="bg-card rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-foreground">Confirm Rejection</h3>
                <button
                  onClick={cancelRejectSubmission}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="px-6 py-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <FiX className="h-5 w-5 text-destructive" />
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-foreground mb-2">
                    Are you sure you want to reject this submission?
                  </h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p><strong>Employee:</strong> {submissionToReject.employeeName}</p>
                    <p><strong>Amount:</strong> ${submissionToReject.totalAmount.toLocaleString()}</p>
                    <p><strong>Description:</strong> {submissionToReject.description}</p>
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Reason for Rejection <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Please provide a reason for rejecting this submission..."
                      className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                      rows={3}
                      required
                    />
                    {!rejectionReason.trim() && (
                      <p className="text-red-500 text-xs mt-1">Please provide a reason for rejection</p>
                    )}
                  </div>
                  
                  <p className="text-sm text-destructive mt-3 font-medium">
                    This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-background rounded-b-lg flex justify-end space-x-3">
              <button
                onClick={cancelRejectSubmission}
                className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-md hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmRejectSubmission}
                className="px-4 py-2 text-sm font-medium text-white bg-destructive border border-transparent rounded-md hover:bg-red-700 transition-colors"
              >
                Reject Submission
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approval Confirmation Modal */}
      {isApproveModalOpen && submissionToApprove && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 min-h-screen">
          <div className="bg-card rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-foreground">Confirm Approval</h3>
                <button
                  onClick={cancelApproveSubmission}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="px-6 py-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-gray-700 mb-3">
                    Are you sure you want to approve this submission?
                  </p>
                  <div className="bg-background p-3 rounded-md">
                    <div className="text-sm text-gray-600">
                      <div><strong>Employee:</strong> {submissionToApprove.employeeName}</div>
                      <div><strong>Amount:</strong> ${submissionToApprove.totalAmount}</div>
                      <div><strong>Description:</strong> {submissionToApprove.description}</div>
                    </div>
                  </div>
                  <p className="text-green-600 text-sm mt-2 font-medium">
                    This action will approve the payment request.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-background rounded-b-lg flex justify-end space-x-3">
              <button
                onClick={cancelApproveSubmission}
                className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-md hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmApproveSubmission}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 transition-colors"
              >
                Approve Submission
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Date Range Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 min-h-screen">
          <div className="bg-card rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Export Invoices</h3>
                <button
                  onClick={() => setIsExportModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="px-6 py-4 space-y-6">
              <div>
                <h4 className="text-sm font-medium text-foreground mb-3">Select Date Range</h4>
                
                {/* Preset Options */}
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground mb-2">Quick Select:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(getDateRangePresets()).map(([key, preset]) => (
                      <button
                        key={key}
                        onClick={() => handlePresetSelect(preset)}
                        className="px-3 py-2 text-sm border border-border rounded-md hover:bg-accent transition-colors text-left"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Date Range */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={exportDateRange.startDate}
                      onChange={(e) => setExportDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={exportDateRange.endDate}
                      onChange={(e) => setExportDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Export All Option */}
                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setIsExportModalOpen(false);
                      handleBulkExport();
                    }}
                    className="w-full px-4 py-2 text-sm font-medium text-foreground bg-muted border border-border rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Export All Submissions
                  </button>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-border flex justify-end space-x-3">
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-md hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExportWithDateRange}
                disabled={!exportDateRange.startDate || !exportDateRange.endDate}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Export Selected Range
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </div>
  );
}
