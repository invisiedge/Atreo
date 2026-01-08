/**
 * Dashboard Types
 */

export interface DashboardStats {
  totalUsers: number;
  totalEmployees: number;
  totalTools: number;
  paidTools: number;
  monthlyToolsSpend: number;
  yearlyExpenditure?: number;
  yearlyExpenditureMonthly?: number;
  pendingSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
    totalInvoices: number;
    totalPaid: number;
    totalPayments: number;
    activeTools: number;

  inactiveTools: number;
  toolsWith2FA: number;
  toolsWithAutopay: number;
  monthlyToolsData: Array<{ month: string; tools: number; expenditure?: number }>;
  monthlySpendData: Array<{ month: string; spend: number }>;
  monthlyInvoiceTrends: Array<{ month: string; invoices: number; amount: number }>;
  monthlyApprovedAmounts: Array<{ month: string; amount: number }>;
  monthlyUserData: Array<{ month: string; users: number }>;
  categoryData: Array<{ name: string; value: number }>;
  invoiceStatusData: Array<{ name: string; value: number }>;
  topToolsData: Array<{ name: string; monthlySpend: number }>;
  employeeSpendingByMonth: Array<{ month: string; amount: number }>;
  roleDistributionData: Array<{ name: string; value: number }>;
  hoursUtilizationData: Array<{ month: string; contractHours: number; fulfilledHours: number }>;
  toolStatusData: Array<{ name: string; value: number }>;
  billingPeriodData: Array<{ name: string; value: number }>;
  totalAssets: number;
  activeAssets: number;
  assetsByType: Array<{ name: string; value: number }>;
  totalDomains: number;
  activeDomains: number;
  domainsByStatus: Array<{ name: string; value: number }>;
  spendByOrganization: Array<{ name: string; value: number }>;
}

export interface UserDashboardStats {
  totalEarnings: number;
  pendingRequests: number;
  approvedRequests: number;
}


