/**
 * Employee Types
 * Contains employee-related type definitions
 */

export interface Employee {
  _id: string;
  id: string; // Alias for _id for compatibility

  // 1. EMPLOYEE DASHBOARD
  name: string;
  employeeId: string;
  profilePhoto?: string;
  position: string;
  department: string;
  employmentType?: 'Full-time' | 'Intern' | 'Freelancer' | 'Consultant';
  workLocation?: 'Remote' | 'Hybrid' | 'Office';

  // 2. CONTACT & COMMUNICATION DETAILS
  email: string;
  personalEmail?: string;
  workEmail?: string;
  personalPhone?: string;
  whatsappNumber?: string;
  emergencyContact?: {
    name?: string;
    phone?: string;
    relationship?: string;
  };

  // 3. DOCUMENTATION & COMPLIANCE
  documents?: {
    resume?: string;
    offerLetter?: string;
    employeeAgreement?: string;
    nda?: string;
    govtId?: string;
    passport?: string;
    addressProof?: string;
    pan?: string;
    taxId?: string;
  };

  // 4. EMPLOYMENT LIFECYCLE
  dateOfJoined?: string;
  hireDate?: string;
  employmentStatus?: 'Active' | 'On Notice' | 'Exited';
  confirmationDate?: string;
  lastWorkingDate?: string;
  status: 'active' | 'inactive' | 'terminated' | 'on-leave';

  // 5. PAYROLL & FINANCE DETAILS
  salary?: number;
  salaryType?: 'Monthly' | 'Hourly' | 'Project-based';
  paymentCurrency?: string;
  payrollCycle?: 'Weekly' | 'Monthly';
  bankDetails?: {
    bankName?: string;
    accountNumber?: string;
    swiftCode?: string;
    routingNumber?: string;
    accountHolderName?: string;
  };
  lastSalaryPaidDate?: string;
  salaryRevisionHistory?: Array<{
    date: string;
    previousAmount: number;
    newAmount: number;
    reason: string;
  }>;
  bonus?: number;
  incentives?: number;
  deductions?: number;

  // 6. ROLE, RESPONSIBILITIES & KPIs
  roleDescription?: string;
  coreResponsibilities?: string[];
  keyKPIs?: string[];
  weeklyDeliverables?: string[];
  monthlyGoals?: string[];
  clientAccountsAssigned?: string[];
  toolsUsed?: string[];
  aiToolsAuthorized?: string[];

  // Legacy fields
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  bankName?: string;
  accountNumber?: string;
  swiftCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeeRequest {
  name: string;
  email: string;
  password: string;
  position: string;
  department: string;
  employeeId: string;
  dateOfJoined: string;
}
