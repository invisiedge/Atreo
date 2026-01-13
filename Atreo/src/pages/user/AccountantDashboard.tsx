import React, { useState, useEffect, useMemo } from 'react';
import {
  FiDollarSign,
  FiFileText,
  FiTrendingUp,
  FiTrendingDown,
  FiCalendar,
  FiPieChart,
  FiBarChart2,
  FiDownload,
  FiFilter,
  FiRefreshCw
} from 'react-icons/fi';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/useToast';
import { apiClient, type Invoice, type InvoiceSummary } from '../../services/api';
import { logger } from '../../lib/logger';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Chart container component
const ChartContainer = ({ children, title, icon: Icon = FiBarChart2 }: { children: React.ReactNode; title: string; icon?: any }) => (
  <div className="bg-card rounded-lg border p-6 shadow-sm">
    <h3 className="text-lg font-semibold mb-4 flex items-center text-foreground">
      <Icon className="h-5 w-5 mr-2 text-primary" />
      {title}
    </h3>
    <div className="h-80 w-full" style={{ minHeight: '320px' }}>
      {children}
    </div>
  </div>
);

// Color palette for charts
const CHART_COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  teal: '#14b8a6',
  pink: '#ec4899',
  indigo: '#6366f1'
};

const PIE_COLORS = [CHART_COLORS.success, CHART_COLORS.warning, CHART_COLORS.danger, CHART_COLORS.primary, CHART_COLORS.purple];

const StatCard = ({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  color = 'blue'
}: {
  title: string;
  value: string | number;
  icon: any;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: string;
}) => {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-600',
    green: 'bg-green-500/10 text-green-600',
    purple: 'bg-purple-500/10 text-purple-600',
    orange: 'bg-orange-500/10 text-orange-600',
    red: 'bg-red-500/10 text-red-600'
  };

  return (
    <div className="bg-card rounded-lg border p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className={`p-2 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
          </div>
        </div>
        {trend && trendValue && (
          <div className={`flex items-center text-sm ${
            trend === 'up' ? 'text-green-600' :
            trend === 'down' ? 'text-red-600' : 'text-muted-foreground'
          }`}>
            {trend === 'up' ? <FiTrendingUp className="h-4 w-4 mr-1" /> :
             trend === 'down' ? <FiTrendingDown className="h-4 w-4 mr-1" /> : null}
            {trendValue}
          </div>
        )}
      </div>
    </div>
  );
};

export default function AccountantDashboard() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30d');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [summary, setSummary] = useState<InvoiceSummary | null>(null);

  // Load real invoice data
  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        // Calculate date range
        const endDate = new Date();
        const startDate = new Date();
        
        switch (dateRange) {
          case '7d':
            startDate.setDate(endDate.getDate() - 7);
            break;
          case '30d':
            startDate.setDate(endDate.getDate() - 30);
            break;
          case '90d':
            startDate.setDate(endDate.getDate() - 90);
            break;
          case '1y':
            startDate.setFullYear(endDate.getFullYear() - 1);
            break;
        }

        // Fetch invoices and summary
        const [invoicesData, summaryData] = await Promise.all([
          apiClient.getInvoices({
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0]
          }),
          apiClient.getInvoicesSummary()
        ]);

        setInvoices(invoicesData || []);
        setSummary(summaryData);
      } catch (error: any) {
        logger.error('Failed to load dashboard data', error);
        showToast(error.message || 'Failed to load dashboard data', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [dateRange, showToast]);

  // Calculate dashboard metrics from real invoice data
  const dashboardData = useMemo(() => {
    if (!invoices.length) {
      return {
        totalInvoices: 0,
        totalAmount: 0,
        pendingInvoices: 0,
        approvedInvoices: 0,
        rejectedInvoices: 0,
        averageInvoiceAmount: 0,
        monthlyTrend: 0,
        topVendors: [],
        categoryBreakdown: [],
        monthlyData: [],
        statusDistribution: []
      };
    }

    const totalInvoices = invoices.length;
    const totalAmount = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const pendingInvoices = invoices.filter(inv => inv.status === 'pending').length;
    const approvedInvoices = invoices.filter(inv => inv.status === 'approved').length;
    const rejectedInvoices = invoices.filter(inv => inv.status === 'rejected').length;
    const averageInvoiceAmount = totalInvoices > 0 ? totalAmount / totalInvoices : 0;

    // Calculate monthly trend (compare current month with previous month)
    const now = new Date();
    const currentMonth = invoices.filter(inv => {
      const invDate = new Date(inv.billingDate);
      return invDate.getMonth() === now.getMonth() && invDate.getFullYear() === now.getFullYear();
    }).reduce((sum, inv) => sum + (inv.amount || 0), 0);

    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonth = invoices.filter(inv => {
      const invDate = new Date(inv.billingDate);
      return invDate.getMonth() === lastMonth.getMonth() && invDate.getFullYear() === lastMonth.getFullYear();
    }).reduce((sum, inv) => sum + (inv.amount || 0), 0);

    const monthlyTrend = previousMonth > 0 ? ((currentMonth - previousMonth) / previousMonth) * 100 : 0;

    // Top vendors by spending
    const vendorMap = new Map<string, { amount: number; count: number }>();
    invoices.forEach(inv => {
      if (inv.provider) {
        const existing = vendorMap.get(inv.provider) || { amount: 0, count: 0 };
        vendorMap.set(inv.provider, {
          amount: existing.amount + (inv.amount || 0),
          count: existing.count + 1
        });
      }
    });
    const topVendors = Array.from(vendorMap.entries())
      .map(([name, data]) => ({ name, amount: data.amount, count: data.count }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Category breakdown
    const categoryMap = new Map<string, number>();
    invoices.forEach(inv => {
      const category = inv.category || 'Uncategorized';
      categoryMap.set(category, (categoryMap.get(category) || 0) + (inv.amount || 0));
    });
    const totalByCategory = Array.from(categoryMap.values()).reduce((sum, val) => sum + val, 0);
    const categoryBreakdown = Array.from(categoryMap.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalByCategory > 0 ? Math.round((amount / totalByCategory) * 100) : 0
      }))
      .sort((a, b) => b.amount - a.amount);

    // Monthly data (last 6 months)
    const monthlyDataMap = new Map<string, number>();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = `${monthNames[date.getMonth()]}`;
      monthlyDataMap.set(monthKey, 0);
    }

    invoices.forEach(inv => {
      const invDate = new Date(inv.billingDate);
      const monthKey = monthNames[invDate.getMonth()];
      const existing = monthlyDataMap.get(monthKey) || 0;
      monthlyDataMap.set(monthKey, existing + (inv.amount || 0));
    });

    // Get last 6 months with data, ensuring we have entries even if empty
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = monthNames[date.getMonth()];
      monthlyData.push({
        month: monthKey,
        amount: monthlyDataMap.get(monthKey) || 0
      });
    }

    // Status distribution
    const statusDistribution = [
      {
        status: 'Approved',
        count: approvedInvoices,
        percentage: totalInvoices > 0 ? Math.round((approvedInvoices / totalInvoices) * 100 * 10) / 10 : 0
      },
      {
        status: 'Pending',
        count: pendingInvoices,
        percentage: totalInvoices > 0 ? Math.round((pendingInvoices / totalInvoices) * 100 * 10) / 10 : 0
      },
      {
        status: 'Rejected',
        count: rejectedInvoices,
        percentage: totalInvoices > 0 ? Math.round((rejectedInvoices / totalInvoices) * 100 * 10) / 10 : 0
      }
    ];
    
    console.log('Monthly data:', monthlyData);
    console.log('Total invoices:', invoices.length);
    console.log('Status distribution:', statusDistribution);
    console.log('Category breakdown:', categoryBreakdown);
    console.log('Top vendors:', topVendors);

    return {
      totalInvoices,
      totalAmount,
      pendingInvoices,
      approvedInvoices,
      rejectedInvoices,
      averageInvoiceAmount,
      monthlyTrend,
      topVendors,
      categoryBreakdown,
      monthlyData,
      statusDistribution
    };
  }, [invoices]);

  const handleExportReport = () => {
    showToast('Report export started', 'success');
    // Implement export functionality
  };

  const handleRefreshData = async () => {
    setLoading(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      switch (dateRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }

      const [invoicesData, summaryData] = await Promise.all([
        apiClient.getInvoices({
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        }),
        apiClient.getInvoicesSummary()
      ]);

      setInvoices(invoicesData || []);
      setSummary(summaryData);
      showToast('Data refreshed successfully', 'success');
    } catch (error: any) {
      logger.error('Failed to refresh dashboard data', error);
      showToast(error.message || 'Failed to refresh data', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Accountant Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Comprehensive invoice analytics and financial insights
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>

          <button
            onClick={handleRefreshData}
            disabled={loading}
            className="flex items-center px-3 py-2 border border-border rounded-md hover:bg-accent transition-colors"
          >
            <FiRefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={handleExportReport}
            className="flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            <FiDownload className="h-4 w-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Invoices"
          value={dashboardData.totalInvoices.toLocaleString()}
          icon={FiFileText}
          trend={dashboardData.totalInvoices > 0 ? "up" : "neutral"}
          trendValue={summary ? `${summary.totalInvoices}` : "0"}
          color="blue"
        />

        <StatCard
          title="Total Amount"
          value={`$${dashboardData.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={FiDollarSign}
          trend={dashboardData.monthlyTrend > 0 ? "up" : dashboardData.monthlyTrend < 0 ? "down" : "neutral"}
          trendValue={dashboardData.monthlyTrend !== 0 ? `${dashboardData.monthlyTrend > 0 ? '+' : ''}${dashboardData.monthlyTrend.toFixed(1)}%` : "0%"}
          color="green"
        />

        <StatCard
          title="Pending Approvals"
          value={dashboardData.pendingInvoices}
          icon={FiCalendar}
          trend={dashboardData.pendingInvoices > 0 ? "up" : "neutral"}
          trendValue={summary ? `${summary.pendingInvoices}` : "0"}
          color="orange"
        />

        <StatCard
          title="Average Invoice"
          value={`$${dashboardData.averageInvoiceAmount.toFixed(2)}`}
          icon={FiTrendingUp}
          trend="neutral"
          trendValue={summary ? `$${summary.averageInvoiceAmount.toFixed(2)}` : "$0.00"}
          color="purple"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend Chart - Area Chart */}
        <ChartContainer title="Monthly Invoice Trends" icon={FiTrendingUp}>
          {dashboardData.monthlyData && dashboardData.monthlyData.length > 0 ? (
            <Line
              data={{
                labels: dashboardData.monthlyData.map(d => d.month),
                datasets: [{
                  label: 'Amount',
                  data: dashboardData.monthlyData.map(d => d.amount),
                  borderColor: CHART_COLORS.primary,
                  backgroundColor: CHART_COLORS.primary + '20',
                  fill: true,
                  tension: 0.4,
                  borderWidth: 2,
                  pointRadius: 4,
                  pointHoverRadius: 6
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        return `$${context.parsed.y.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                      }
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: function(value) {
                        return '$' + (Number(value) / 1000).toFixed(0) + 'k';
                      }
                    },
                    grid: {
                      color: 'rgba(0, 0, 0, 0.05)'
                    }
                  },
                  x: {
                    grid: {
                      display: false
                    }
                  }
                }
              }}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              No data available for the selected period
            </div>
          )}
        </ChartContainer>

        {/* Status Distribution - Pie Chart */}
        <ChartContainer title="Invoice Status Distribution" icon={FiPieChart}>
          {dashboardData.statusDistribution && dashboardData.statusDistribution.length > 0 && dashboardData.statusDistribution.some(item => item.count > 0) ? (
            <Pie
              data={{
                labels: dashboardData.statusDistribution.map(d => d.status),
                datasets: [{
                  data: dashboardData.statusDistribution.map(d => d.count),
                  backgroundColor: dashboardData.statusDistribution.map(d => {
                    const colorMap: { [key: string]: string } = {
                      'Approved': CHART_COLORS.success,
                      'Pending': CHART_COLORS.warning,
                      'Rejected': CHART_COLORS.danger
                    };
                    return colorMap[d.status] || PIE_COLORS[0];
                  }),
                  borderWidth: 2,
                  borderColor: '#fff'
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: {
                      padding: 15,
                      usePointStyle: true
                    }
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        const label = context.label || '';
                        const value = context.parsed || 0;
                        const item = dashboardData.statusDistribution.find(d => d.status === label);
                        const percentage = item ? item.percentage : 0;
                        return `${label}: ${value} (${percentage}%)`;
                      }
                    }
                  }
                }
              }}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              No invoice data available
            </div>
          )}
        </ChartContainer>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown - Horizontal Bar Chart */}
        <ChartContainer title="Spending by Category" icon={FiBarChart2}>
          {dashboardData.categoryBreakdown && dashboardData.categoryBreakdown.length > 0 ? (
            <Bar
              data={{
                labels: dashboardData.categoryBreakdown.map(d => d.category),
                datasets: [{
                  label: 'Amount',
                  data: dashboardData.categoryBreakdown.map(d => d.amount),
                  backgroundColor: dashboardData.categoryBreakdown.map((_, index) => PIE_COLORS[index % PIE_COLORS.length]),
                  borderRadius: 8
                }]
              }}
              options={{
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        const item = dashboardData.categoryBreakdown[context.dataIndex];
                        return `$${context.parsed.x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${item.percentage}%)`;
                      }
                    }
                  }
                },
                scales: {
                  x: {
                    beginAtZero: true,
                    ticks: {
                      callback: function(value) {
                        return '$' + (Number(value) / 1000).toFixed(0) + 'k';
                      }
                    },
                    grid: {
                      color: 'rgba(0, 0, 0, 0.05)'
                    }
                  },
                  y: {
                    grid: {
                      display: false
                    }
                  }
                }
              }}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              No category data available
            </div>
          )}
        </ChartContainer>

        {/* Top Vendors - Bar Chart */}
        <ChartContainer title="Top Vendors by Spending" icon={FiDollarSign}>
          {dashboardData.topVendors && dashboardData.topVendors.length > 0 ? (
            <Bar
              data={{
                labels: dashboardData.topVendors.map(d => d.name),
                datasets: [{
                  label: 'Amount',
                  data: dashboardData.topVendors.map(d => d.amount),
                  backgroundColor: dashboardData.topVendors.map((_, index) => PIE_COLORS[index % PIE_COLORS.length]),
                  borderRadius: 8
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        const item = dashboardData.topVendors[context.dataIndex];
                        return `$${context.parsed.y.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${item.count} invoices)`;
                      }
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: function(value) {
                        return '$' + (Number(value) / 1000).toFixed(0) + 'k';
                      }
                    },
                    grid: {
                      color: 'rgba(0, 0, 0, 0.05)'
                    }
                  },
                  x: {
                    ticks: {
                      maxRotation: 45,
                      minRotation: 45
                    },
                    grid: {
                      display: false
                    }
                  }
                }
              }}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              No vendor data available
            </div>
          )}
        </ChartContainer>
                      </div>

      {/* Additional Chart Row - Invoice Trend Over Time */}
      <div className="grid grid-cols-1 gap-6">
        <ChartContainer title="Invoice Amount Trend Over Time" icon={FiTrendingUp}>
          {invoices && invoices.length > 0 ? (
            <Line
              data={{
                labels: invoices
                  .sort((a, b) => new Date(a.billingDate).getTime() - new Date(b.billingDate).getTime())
                  .slice(0, 50)
                  .map(inv => new Date(inv.billingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
                datasets: [{
                  label: 'Amount',
                  data: invoices
                    .sort((a, b) => new Date(a.billingDate).getTime() - new Date(b.billingDate).getTime())
                    .slice(0, 50)
                    .map(inv => inv.amount || 0),
                  borderColor: CHART_COLORS.primary,
                  backgroundColor: CHART_COLORS.primary + '20',
                  fill: true,
                  tension: 0.4,
                  borderWidth: 2,
                  pointRadius: 3,
                  pointHoverRadius: 5
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        return `$${context.parsed.y.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                      }
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: function(value) {
                        return '$' + (Number(value) / 1000).toFixed(0) + 'k';
                      }
                    },
                    grid: {
                      color: 'rgba(0, 0, 0, 0.05)'
                    }
                  },
                  x: {
                    ticks: {
                      maxRotation: 45,
                      minRotation: 45
                    },
                    grid: {
                      display: false
                    }
                  }
                }
              }}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              No invoice data available for trend analysis
            </div>
          )}
        </ChartContainer>
      </div>

      {/* Recent Activity */}
      <div className="bg-card rounded-lg border">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-semibold flex items-center">
            <FiFileText className="h-5 w-5 mr-2" />
            Recent Invoice Activity
          </h2>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="text-center text-muted-foreground py-8">Loading recent invoices...</div>
          ) : invoices.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">No invoices found</div>
          ) : (
          <div className="space-y-4">
              {invoices
                .sort((a, b) => new Date(b.createdAt || b.billingDate).getTime() - new Date(a.createdAt || a.billingDate).getTime())
                .slice(0, 10)
                .map((invoice) => {
                  const invoiceDate = new Date(invoice.createdAt || invoice.billingDate);
                  const now = new Date();
                  const diffMs = now.getTime() - invoiceDate.getTime();
                  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                  const diffDays = Math.floor(diffHours / 24);
                  
                  let timeAgo = '';
                  if (diffHours < 1) {
                    timeAgo = 'Just now';
                  } else if (diffHours < 24) {
                    timeAgo = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
                  } else {
                    timeAgo = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
                  }

                  const action = invoice.status === 'approved' 
                    ? 'Invoice approved' 
                    : invoice.status === 'rejected' 
                    ? 'Invoice rejected' 
                    : 'New invoice pending';

                  return (
                    <div key={invoice.id || invoice._id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                          invoice.status === 'approved' ? 'bg-green-500' :
                          invoice.status === 'rejected' ? 'bg-red-500' : 'bg-yellow-500'
                  }`}></div>
                  <div>
                          <div className="font-medium">{action}</div>
                    <div className="text-sm text-muted-foreground">
                            {invoice.invoiceNumber || 'N/A'} • {invoice.provider || 'Unknown'} • ${(invoice.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                        {timeAgo}
                </div>
              </div>
                  );
                })}
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
