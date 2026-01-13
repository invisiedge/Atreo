import React, { useState, useEffect } from 'react';
import { FiClock, FiCheckCircle, FiXCircle, FiDollarSign, FiFileText } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { DashboardService, type UserDashboardStats } from '../../services/dashboardService';
import { SubmissionService } from '../../services/submissionService';
import { apiClient, type Submission, type Invoice } from '../../services/api';
import { logger } from '../../lib/logger';

const EmployeeDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserDashboardStats | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [dashboardStats, userSubmissions, userInvoices] = await Promise.all([
          DashboardService.getUserStats(),
          SubmissionService.getSubmissions(),
          apiClient.getInvoices().catch(() => []) // Invoices are optional
        ]);
        setStats(dashboardStats);
        setSubmissions(userSubmissions);
        setInvoices(userInvoices);
      } catch (error) {
        logger.error('Failed to fetch employee dashboard data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <FiCheckCircle className="h-4 w-4" />;
      case 'rejected': return <FiXCircle className="h-4 w-4" />;
      case 'pending': return <FiClock className="h-4 w-4" />;
      default: return <FiClock className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Welcome back, {user?.name}!</h2>
          <p className="mt-2 text-gray-600">Here's an overview of your activity.</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">Error loading dashboard: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Welcome back, {user?.name}!</h2>
        <p className="mt-2 text-gray-600">Here's an overview of your activity and submissions.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="flex items-start space-x-3 bg-card p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center flex-shrink-0">
            <FiDollarSign className="h-4 w-4 text-green-600" />
          </div>
          <div className="flex-1">
            <div className="text-sm text-gray-500">Total Earnings</div>
            <div className="text-2xl font-semibold text-foreground mt-2">
              ${stats?.submissions?.totalEarnings?.toLocaleString() || '0'}
            </div>
          </div>
        </div>

        <div className="flex items-start space-x-3 bg-card p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="w-8 h-8 bg-yellow-100 rounded flex items-center justify-center flex-shrink-0">
            <FiClock className="h-4 w-4 text-yellow-600" />
          </div>
          <div className="flex-1">
            <div className="text-sm text-gray-500">Pending Requests</div>
            <div className="text-2xl font-semibold text-foreground mt-2">
              {stats?.submissions?.pendingRequests || 0}
            </div>
          </div>
        </div>

        <div className="flex items-start space-x-3 bg-card p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center flex-shrink-0">
            <FiCheckCircle className="h-4 w-4 text-green-600" />
          </div>
          <div className="flex-1">
            <div className="text-sm text-gray-500">Approved Requests</div>
            <div className="text-2xl font-semibold text-foreground mt-2">
              {stats?.submissions?.approvedRequests || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Submissions */}
      <div className="bg-card rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-foreground">Recent Submissions</h3>
        </div>
        <div className="p-6">
          {submissions.length === 0 ? (
            <div className="text-center py-8">
              <FiFileText className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">No submissions yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {submissions.slice(0, 5).map((submission) => (
                <div
                  key={submission.id}
                  className="flex items-center justify-between p-4 bg-background rounded-lg border border-gray-200"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getStatusColor(submission.status || 'pending')}`}>
                      {getStatusIcon(submission.status || 'pending')}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {submission.employeeName} - {submission.workPeriod}
                      </p>
                      <p className="text-xs text-gray-500">
                        Submitted: {formatDate(submission.submittedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-foreground">
                      {formatCurrency(submission.totalAmount)}
                    </p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(submission.status || 'pending')}`}>
                      {submission.status || 'pending'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Invoices */}
      {invoices.length > 0 && (
        <div className="bg-card rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-foreground">Recent Invoices</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {invoices.slice(0, 5).map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-4 bg-background rounded-lg border border-gray-200"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-100">
                      <FiFileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {invoice.invoiceNumber} - {invoice.provider}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(invoice.billingDate)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-foreground">
                      {formatCurrency(invoice.amount)}
                    </p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      invoice.status === 'approved' ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-400' :
                      invoice.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-400' :
                      'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}>
                      {invoice.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDashboard;

