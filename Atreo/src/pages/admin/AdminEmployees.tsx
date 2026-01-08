import React, { useState, useEffect } from 'react';
import { FiPlus, FiEye, FiEyeOff, FiEdit2, FiTrash2, FiInfo } from 'react-icons/fi';
import { EmployeeService } from '../../services/employeeService';
import { type Employee } from '../../services/api';
import AlertModal from '../../components/shared/AlertModal';
import { useAuth } from '../../context/AuthContext';
import { logger } from '../../lib/logger';

export default function AdminEmployees() {
  const { user } = useAuth();
  const isSuperAdmin = user?.adminRole === 'super-admin';
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetPassword, setResetPassword] = useState(false);
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
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    employee: Employee | null;
  }>({
    isOpen: false,
    employee: null,
  });
  const [viewEmployeeModal, setViewEmployeeModal] = useState<{
    isOpen: boolean;
    employee: Employee | null;
  }>({
    isOpen: false,
    employee: null,
  });
  const [formData, setFormData] = useState({
    // 1. EMPLOYEE DASHBOARD
    name: '',
    employeeId: '',
    profilePhoto: '',
    position: '',
    department: '',
    employmentType: 'Full-time' as 'Full-time' | 'Intern' | 'Freelancer' | 'Consultant',
    workLocation: 'Remote' as 'Remote' | 'Hybrid' | 'Office',
    // 2. CONTACT & COMMUNICATION
    email: '',
    personalEmail: '',
    workEmail: '',
    personalPhone: '',
    whatsappNumber: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    // 3. DOCUMENTATION (URLs)
    resume: '',
    offerLetter: '',
    employeeAgreement: '',
    nda: '',
    govtId: '',
    passport: '',
    addressProof: '',
    pan: '',
    taxId: '',
    // 4. EMPLOYMENT LIFECYCLE
    dateOfJoined: '',
    employmentStatus: 'Active' as 'Active' | 'On Notice' | 'Exited',
    confirmationDate: '',
    lastWorkingDate: '',
    // 5. PAYROLL & FINANCE
    salary: '',
    salaryType: 'Monthly' as 'Monthly' | 'Hourly' | 'Project-based',
    paymentCurrency: 'USD',
    payrollCycle: 'Monthly' as 'Weekly' | 'Monthly',
    bankName: '',
    accountNumber: '',
    swiftCode: '',
    routingNumber: '',
    accountHolderName: '',
    lastSalaryPaidDate: '',
    bonus: '',
    incentives: '',
    deductions: '',
    // 6. ROLE, RESPONSIBILITIES & KPIs
    roleDescription: '',
    coreResponsibilities: '',
    keyKPIs: '',
    weeklyDeliverables: '',
    monthlyGoals: '',
    clientAccountsAssigned: '',
    toolsUsed: '',
    aiToolsAuthorized: '',
    // Login credentials
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const employeeData = await EmployeeService.getEmployees();
      setEmployees(employeeData);
    } catch (error) {
      logger.error('Failed to fetch employees:', error);
      setError(error instanceof Error ? error.message : 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = () => {
    setFormData({
      name: '',
      employeeId: '',
      profilePhoto: '',
      position: '',
      department: '',
      employmentType: 'Full-time',
      workLocation: 'Remote',
      email: '',
      personalEmail: '',
      workEmail: '',
      personalPhone: '',
      whatsappNumber: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      emergencyContactRelationship: '',
      resume: '',
      offerLetter: '',
      employeeAgreement: '',
      nda: '',
      govtId: '',
      passport: '',
      addressProof: '',
      pan: '',
      taxId: '',
      dateOfJoined: '',
      employmentStatus: 'Active',
      confirmationDate: '',
      lastWorkingDate: '',
      salary: '',
      salaryType: 'Monthly',
      paymentCurrency: 'USD',
      payrollCycle: 'Monthly',
      bankName: '',
      accountNumber: '',
      swiftCode: '',
      routingNumber: '',
      accountHolderName: '',
      lastSalaryPaidDate: '',
      bonus: '',
      incentives: '',
      deductions: '',
      roleDescription: '',
      coreResponsibilities: '',
      keyKPIs: '',
      weeklyDeliverables: '',
      monthlyGoals: '',
      clientAccountsAssigned: '',
      toolsUsed: '',
      aiToolsAuthorized: '',
      password: '',
      confirmPassword: ''
    });
    setIsModalOpen(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    const joinDate = employee.dateOfJoined || (employee as any).hireDate || employee.createdAt;
    const confirmDate = employee.confirmationDate ? new Date(employee.confirmationDate).toISOString().split('T')[0] : '';
    const lastWorkDate = employee.lastWorkingDate ? new Date(employee.lastWorkingDate).toISOString().split('T')[0] : '';
    const lastSalaryDate = employee.lastSalaryPaidDate ? new Date(employee.lastSalaryPaidDate).toISOString().split('T')[0] : '';
    
    setFormData({
      name: employee.name,
      employeeId: employee.employeeId,
      profilePhoto: employee.profilePhoto || '',
      position: employee.position,
      department: employee.department,
      employmentType: employee.employmentType || 'Full-time',
      workLocation: employee.workLocation || 'Remote',
      email: employee.email,
      personalEmail: employee.personalEmail || '',
      workEmail: employee.workEmail || '',
      personalPhone: employee.personalPhone || '',
      whatsappNumber: employee.whatsappNumber || '',
      emergencyContactName: employee.emergencyContact?.name || '',
      emergencyContactPhone: employee.emergencyContact?.phone || '',
      emergencyContactRelationship: employee.emergencyContact?.relationship || '',
      resume: employee.documents?.resume || '',
      offerLetter: employee.documents?.offerLetter || '',
      employeeAgreement: employee.documents?.employeeAgreement || '',
      nda: employee.documents?.nda || '',
      govtId: employee.documents?.govtId || '',
      passport: employee.documents?.passport || '',
      addressProof: employee.documents?.addressProof || '',
      pan: employee.documents?.pan || '',
      taxId: employee.documents?.taxId || '',
      dateOfJoined: joinDate ? new Date(joinDate).toISOString().split('T')[0] : '',
      employmentStatus: employee.employmentStatus || 'Active',
      confirmationDate: confirmDate,
      lastWorkingDate: lastWorkDate,
      salary: employee.salary?.toString() || '',
      salaryType: employee.salaryType || 'Monthly',
      paymentCurrency: employee.paymentCurrency || 'USD',
      payrollCycle: employee.payrollCycle || 'Monthly',
      bankName: employee.bankDetails?.bankName || employee.bankName || '',
      accountNumber: employee.bankDetails?.accountNumber || employee.accountNumber || '',
      swiftCode: employee.bankDetails?.swiftCode || employee.swiftCode || '',
      routingNumber: employee.bankDetails?.routingNumber || '',
      accountHolderName: employee.bankDetails?.accountHolderName || '',
      lastSalaryPaidDate: lastSalaryDate,
      bonus: employee.bonus?.toString() || '',
      incentives: employee.incentives?.toString() || '',
      deductions: employee.deductions?.toString() || '',
      roleDescription: employee.roleDescription || '',
      coreResponsibilities: employee.coreResponsibilities?.join('\n') || '',
      keyKPIs: employee.keyKPIs?.join('\n') || '',
      weeklyDeliverables: employee.weeklyDeliverables?.join('\n') || '',
      monthlyGoals: employee.monthlyGoals?.join('\n') || '',
      clientAccountsAssigned: employee.clientAccountsAssigned?.join('\n') || '',
      toolsUsed: employee.toolsUsed?.join('\n') || '',
      aiToolsAuthorized: employee.aiToolsAuthorized?.join('\n') || '',
      password: '',
      confirmPassword: ''
    });
    setResetPassword(false);
    setIsEditModalOpen(true);
  };

  const handleViewEmployee = (employee: Employee) => {
    setViewEmployeeModal({ isOpen: true, employee });
  };

  const handleDeleteEmployee = (employee: Employee) => {
    setDeleteConfirmModal({ isOpen: true, employee });
  };

  const confirmDeleteEmployee = async () => {
    if (!deleteConfirmModal.employee) return;
    
    try {
      await EmployeeService.deleteEmployee(deleteConfirmModal.employee._id);
      await fetchEmployees(); // Refresh the list
      setDeleteConfirmModal({ isOpen: false, employee: null });
      setAlertModal({
        isOpen: true,
        type: 'success',
        title: 'Employee Deleted',
        message: `${deleteConfirmModal.employee.name} has been successfully deleted.`,
      });
    } catch (error) {
      logger.error('Failed to delete employee:', error);
      setDeleteConfirmModal({ isOpen: false, employee: null });
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'Delete Failed',
        message: 'Failed to delete employee. Please try again.',
      });
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsEditModalOpen(false);
    setEditingEmployee(null);
    setResetPassword(false);
    setViewEmployeeModal({ isOpen: false, employee: null });
    setFormData({
      name: '',
      employeeId: '',
      profilePhoto: '',
      position: '',
      department: '',
      employmentType: 'Full-time',
      workLocation: 'Remote',
      email: '',
      personalEmail: '',
      workEmail: '',
      personalPhone: '',
      whatsappNumber: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      emergencyContactRelationship: '',
      resume: '',
      offerLetter: '',
      employeeAgreement: '',
      nda: '',
      govtId: '',
      passport: '',
      addressProof: '',
      pan: '',
      taxId: '',
      dateOfJoined: '',
      employmentStatus: 'Active',
      confirmationDate: '',
      lastWorkingDate: '',
      salary: '',
      salaryType: 'Monthly',
      paymentCurrency: 'USD',
      payrollCycle: 'Monthly',
      bankName: '',
      accountNumber: '',
      swiftCode: '',
      routingNumber: '',
      accountHolderName: '',
      lastSalaryPaidDate: '',
      bonus: '',
      incentives: '',
      deductions: '',
      roleDescription: '',
      coreResponsibilities: '',
      keyKPIs: '',
      weeklyDeliverables: '',
      monthlyGoals: '',
      clientAccountsAssigned: '',
      toolsUsed: '',
      aiToolsAuthorized: '',
      password: '',
      confirmPassword: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields for new employees
    if (!editingEmployee) {
      if (!formData.password || formData.password.trim() === '') {
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'Password Required',
          message: 'Password is required for new employees.',
        });
        return;
      }
      
      if (formData.password !== formData.confirmPassword) {
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'Password Mismatch',
          message: 'Passwords do not match. Please try again.',
        });
        return;
      }
      
      if (formData.password.length < 6) {
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'Invalid Password',
          message: 'Password must be at least 6 characters long.',
        });
        return;
      }
    }
    
    // Validate password if resetting password for existing employee
    if (editingEmployee && resetPassword) {
      if (!formData.password || formData.password.trim() === '') {
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'Password Required',
          message: 'Please enter a new password.',
        });
        return;
      }
      
      if (formData.password !== formData.confirmPassword) {
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'Password Mismatch',
          message: 'Passwords do not match. Please try again.',
        });
        return;
      }
      
      if (formData.password.length < 6) {
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'Invalid Password',
          message: 'Password must be at least 6 characters long.',
        });
        return;
      }
    }

    try {
      // Helper function to split newline-separated strings into arrays
      const splitArray = (str: string) => str.trim() ? str.split('\n').filter(s => s.trim()) : [];
      
      const employeeData: any = {
        // 1. EMPLOYEE DASHBOARD
          name: formData.name,
        employeeId: formData.employeeId,
        profilePhoto: formData.profilePhoto,
          position: formData.position,
          department: formData.department,
        employmentType: formData.employmentType,
        workLocation: formData.workLocation,
        // 2. CONTACT & COMMUNICATION
        email: formData.email,
        personalEmail: formData.personalEmail,
        workEmail: formData.workEmail,
        personalPhone: formData.personalPhone,
        whatsappNumber: formData.whatsappNumber,
        emergencyContact: {
          name: formData.emergencyContactName,
          phone: formData.emergencyContactPhone,
          relationship: formData.emergencyContactRelationship
        },
        // 3. DOCUMENTATION
        documents: {
          resume: formData.resume,
          offerLetter: formData.offerLetter,
          employeeAgreement: formData.employeeAgreement,
          nda: formData.nda,
          govtId: formData.govtId,
          passport: formData.passport,
          addressProof: formData.addressProof,
          pan: formData.pan,
          taxId: formData.taxId
        },
        // 4. EMPLOYMENT LIFECYCLE
        dateOfJoined: formData.dateOfJoined,
        employmentStatus: formData.employmentStatus,
        confirmationDate: formData.confirmationDate,
        lastWorkingDate: formData.lastWorkingDate,
        // 5. PAYROLL & FINANCE
        salary: formData.salary ? parseFloat(formData.salary) : undefined,
        salaryType: formData.salaryType,
        paymentCurrency: formData.paymentCurrency,
        payrollCycle: formData.payrollCycle,
        bankDetails: {
          bankName: formData.bankName,
          accountNumber: formData.accountNumber,
          swiftCode: formData.swiftCode,
          routingNumber: formData.routingNumber,
          accountHolderName: formData.accountHolderName
        },
        lastSalaryPaidDate: formData.lastSalaryPaidDate,
        bonus: formData.bonus ? parseFloat(formData.bonus) : undefined,
        incentives: formData.incentives ? parseFloat(formData.incentives) : undefined,
        deductions: formData.deductions ? parseFloat(formData.deductions) : undefined,
        // 6. ROLE, RESPONSIBILITIES & KPIs
        roleDescription: formData.roleDescription,
        coreResponsibilities: splitArray(formData.coreResponsibilities),
        keyKPIs: splitArray(formData.keyKPIs),
        weeklyDeliverables: splitArray(formData.weeklyDeliverables),
        monthlyGoals: splitArray(formData.monthlyGoals),
        clientAccountsAssigned: splitArray(formData.clientAccountsAssigned),
        toolsUsed: splitArray(formData.toolsUsed),
        aiToolsAuthorized: splitArray(formData.aiToolsAuthorized)
      };
      
      if (editingEmployee) {
        // Include password only if resetPassword is enabled and password is provided
        if (resetPassword && formData.password) {
          employeeData.password = formData.password;
        }
        await EmployeeService.updateEmployee(editingEmployee._id, employeeData);
      } else {
        // Create new employee
        employeeData.password = formData.password;
        await EmployeeService.createEmployee(employeeData);
      }
      
      await fetchEmployees(); // Refresh the list
      handleCloseModal();
      setAlertModal({
        isOpen: true,
        type: 'success',
        title: 'Employee Saved',
        message: `Employee ${editingEmployee ? 'updated' : 'created'} successfully.${resetPassword ? ' Password has been reset.' : ''}`,
      });
    } catch (error: any) {
      logger.error('Failed to save employee:', error);
      const errorMessage = error?.message || error?.response?.data?.message || 'Failed to save employee. Please try again.';
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'Save Failed',
        message: errorMessage,
      });
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getJoinDate = (employee: Employee) => {
    if (employee.dateOfJoined) {
      return new Date(employee.dateOfJoined).toLocaleDateString();
    }
    if ((employee as any).hireDate) {
      return new Date((employee as any).hireDate).toLocaleDateString();
    }
    if (employee.createdAt) {
      return new Date(employee.createdAt).toLocaleDateString();
    }
    return 'N/A';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-foreground">Employees</h2>
        <div className="bg-card shadow rounded-lg overflow-hidden border border-border animate-pulse">
          <div className="px-6 py-4">
            <div className="h-6 bg-gray-200 rounded w-40"></div>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-foreground">Employees</h2>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">Error loading employees: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-foreground">Employees</h2>
      
      {/* Employee Table */}
      <div className="bg-card shadow rounded-lg overflow-hidden border border-border max-w-full">
        <div className="px-6 py-4 pb-2">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-semibold text-foreground">Employee Directory</h3>
              <p className="mt-1 text-sm text-gray-500">
                Manage team members, view details, and track activity.
              </p>
            </div>
            <button 
              onClick={handleAddEmployee}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <FiPlus className="h-4 w-4" />
              Add Employee
            </button>
          </div>
        </div>
        <div className="px-4 py-5 sm:p-6">
          {employees.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No employees found. Add your first employee!</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md max-w-full">
              <table className="w-full divide-y divide-gray-200 border border-border table-fixed">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="w-1/6 px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="w-1/5 px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Email
                    </th>
                    <th className="w-1/6 px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Position
                    </th>
                    <th className="w-1/6 px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Department
                    </th>
                    <th className="w-1/6 px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Date Joined
                    </th>
                    <th className="w-1/6 px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                  <tbody className="bg-card divide-y divide-gray-200">
                    {employees.map((employee, index) => (
                      <tr key={employee._id || index}>
                      <td className="px-4 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8">
                            <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-xs font-medium text-gray-700">
                                {getInitials(employee.name)}
                              </span>
                            </div>
                          </div>
                          <div className="ml-3 min-w-0 flex-1">
                            <div className="text-sm font-medium text-foreground truncate">{employee.name}</div>
                            <div className="text-xs text-muted-foreground truncate">ID: {employee.employeeId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-foreground truncate">
                        {employee.email}
                      </td>
                      <td className="px-4 py-4 text-sm text-foreground truncate">
                        {employee.position}
                      </td>
                      <td className="px-4 py-4 text-sm text-foreground truncate">
                        {employee.department}
                      </td>
                      <td className="px-4 py-4 text-sm text-foreground truncate">
                        {getJoinDate(employee)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center sm:justify-start">
                          <button 
                            onClick={() => handleViewEmployee(employee)}
                            className="text-green-600 hover:text-green-900 flex items-center justify-center gap-1 text-xs sm:text-sm px-2 py-1 rounded hover:bg-green-50 transition-colors"
                            title="View Details"
                          >
                            <FiInfo className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="hidden sm:inline">View More</span>
                          </button>
                          <button 
                            onClick={() => handleEditEmployee(employee)}
                            className="text-blue-600 hover:text-blue-900 flex items-center justify-center gap-1 text-xs sm:text-sm px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                            title="Edit Employee"
                          >
                            <FiEdit2 className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="hidden sm:inline">Edit</span>
                          </button>
                          <button 
                            onClick={() => handleDeleteEmployee(employee)}
                            className="text-red-600 hover:text-red-900 flex items-center justify-center gap-1 text-xs sm:text-sm px-2 py-1 rounded hover:bg-red-50 transition-colors"
                            title="Delete Employee"
                          >
                            <FiTrash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="hidden sm:inline">Delete</span>
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
      </div>

      {/* Add/Edit Employee Modal */}
      {(isModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 min-h-screen p-4">
          <div className="bg-card rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-border flex-shrink-0">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-foreground">
                  {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto px-6 py-4">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* 1. EMPLOYEE DASHBOARD */}
              <div className="space-y-4 border-b border-border pb-6">
                <h4 className="text-base font-semibold text-foreground">1. Employee Dashboard</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Full Name *</label>
                    <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter full name" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Employee ID (Internal) *</label>
                    <input type="text" required value={formData.employeeId} onChange={(e) => setFormData({...formData, employeeId: e.target.value})} className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g., EMP001" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Profile Photo URL</label>
                    <input type="url" value={formData.profilePhoto} onChange={(e) => setFormData({...formData, profilePhoto: e.target.value})} className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="https://..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Role / Designation *</label>
                    <input type="text" required value={formData.position} onChange={(e) => setFormData({...formData, position: e.target.value})} className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter role/designation" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Department *</label>
                    <input type="text" required value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter department" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Employment Type</label>
                    <select value={formData.employmentType} onChange={(e) => setFormData({...formData, employmentType: e.target.value as any})} className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="Full-time">Full-time</option>
                      <option value="Intern">Intern</option>
                      <option value="Freelancer">Freelancer</option>
                      <option value="Consultant">Consultant</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Work Location</label>
                    <select value={formData.workLocation} onChange={(e) => setFormData({...formData, workLocation: e.target.value as any})} className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="Remote">Remote</option>
                      <option value="Hybrid">Hybrid</option>
                      <option value="Office">Office</option>
                    </select>
                  </div>
                  </div>
                </div>
                
              {/* 2. CONTACT & COMMUNICATION DETAILS */}
              <div className="space-y-4 border-b border-border pb-6">
                <h4 className="text-base font-semibold text-foreground">2. Contact & Communication Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Work Email *</label>
                    <input type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="work@example.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Personal Email</label>
                    <input type="email" value={formData.personalEmail} onChange={(e) => setFormData({...formData, personalEmail: e.target.value})} className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="personal@example.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Personal Phone</label>
                    <input type="tel" value={formData.personalPhone} onChange={(e) => setFormData({...formData, personalPhone: e.target.value})} className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="+1234567890" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">WhatsApp Number</label>
                    <input type="tel" value={formData.whatsappNumber} onChange={(e) => setFormData({...formData, whatsappNumber: e.target.value})} className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="+1234567890" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Emergency Contact Name</label>
                    <input type="text" value={formData.emergencyContactName} onChange={(e) => setFormData({...formData, emergencyContactName: e.target.value})} className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Emergency contact name" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Emergency Contact Phone</label>
                    <input type="tel" value={formData.emergencyContactPhone} onChange={(e) => setFormData({...formData, emergencyContactPhone: e.target.value})} className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="+1234567890" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Relationship (Emergency Contact)</label>
                    <input type="text" value={formData.emergencyContactRelationship} onChange={(e) => setFormData({...formData, emergencyContactRelationship: e.target.value})} className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g., Spouse, Parent" />
                  </div>
                </div>
              </div>

              {/* 3. DOCUMENTATION & COMPLIANCE */}
              <div className="space-y-4 border-b border-border pb-6">
                <h4 className="text-base font-semibold text-foreground">3. Documentation & Compliance</h4>
                <p className="text-xs text-muted-foreground mb-4">Enter URLs or file paths for documents</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-foreground mb-1">Resume / CV URL</label><input type="url" value={formData.resume} onChange={(e) => setFormData({...formData, resume: e.target.value})} className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="https://..." /></div>
                  <div><label className="block text-sm font-medium text-foreground mb-1">Offer Letter (Signed) URL</label><input type="url" value={formData.offerLetter} onChange={(e) => setFormData({...formData, offerLetter: e.target.value})} className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="https://..." /></div>
                  <div><label className="block text-sm font-medium text-foreground mb-1">Employee Agreement / NDA URL</label><input type="url" value={formData.employeeAgreement} onChange={(e) => setFormData({...formData, employeeAgreement: e.target.value})} className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="https://..." /></div>
                  <div><label className="block text-sm font-medium text-foreground mb-1">NDA URL</label><input type="url" value={formData.nda} onChange={(e) => setFormData({...formData, nda: e.target.value})} className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="https://..." /></div>
                  <div><label className="block text-sm font-medium text-foreground mb-1">Govt ID / Passport URL</label><input type="url" value={formData.govtId} onChange={(e) => setFormData({...formData, govtId: e.target.value})} className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="https://..." /></div>
                  <div><label className="block text-sm font-medium text-foreground mb-1">Passport URL</label><input type="url" value={formData.passport} onChange={(e) => setFormData({...formData, passport: e.target.value})} className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="https://..." /></div>
                  <div><label className="block text-sm font-medium text-foreground mb-1">Address Proof URL</label><input type="url" value={formData.addressProof} onChange={(e) => setFormData({...formData, addressProof: e.target.value})} className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="https://..." /></div>
                  <div><label className="block text-sm font-medium text-foreground mb-1">PAN / Tax ID</label><input type="text" value={formData.pan} onChange={(e) => setFormData({...formData, pan: e.target.value})} className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="PAN number" /></div>
                  <div><label className="block text-sm font-medium text-foreground mb-1">Tax ID</label><input type="text" value={formData.taxId} onChange={(e) => setFormData({...formData, taxId: e.target.value})} className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Tax ID" /></div>
                </div>
              </div>

              {/* 4. EMPLOYMENT LIFECYCLE */}
              <div className="space-y-4 border-b border-border pb-6">
                <h4 className="text-base font-semibold text-foreground">4. Employment Lifecycle</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-foreground mb-1">Date of Joining</label><input type="date" value={formData.dateOfJoined} onChange={(e) => setFormData({...formData, dateOfJoined: e.target.value})} className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                  <div><label className="block text-sm font-medium text-foreground mb-1">Employment Status</label><select value={formData.employmentStatus} onChange={(e) => setFormData({...formData, employmentStatus: e.target.value as any})} className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="Active">Active</option><option value="On Notice">On Notice</option><option value="Exited">Exited</option></select></div>
                  <div><label className="block text-sm font-medium text-foreground mb-1">Confirmation Date</label><input type="date" value={formData.confirmationDate} onChange={(e) => setFormData({...formData, confirmationDate: e.target.value})} className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                  <div><label className="block text-sm font-medium text-foreground mb-1">Last Working Date</label><input type="date" value={formData.lastWorkingDate} onChange={(e) => setFormData({...formData, lastWorkingDate: e.target.value})} className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                  </div>
                </div>
                
              {/* 5. PAYROLL & FINANCE DETAILS */}
              <div className="space-y-4 border-b border-border pb-6">
                <h4 className="text-base font-semibold text-foreground">5. Payroll & Finance Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-foreground mb-1">Salary Type</label><select value={formData.salaryType} onChange={(e) => setFormData({...formData, salaryType: e.target.value as any})} className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="Monthly">Monthly</option><option value="Hourly">Hourly</option><option value="Project-based">Project-based</option></select></div>
                  <div><label className="block text-sm font-medium text-foreground mb-1">Salary Amount</label><input type="number" step="0.01" value={formData.salary} onChange={(e) => setFormData({...formData, salary: e.target.value})} className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0.00" /></div>
                  <div><label className="block text-sm font-medium text-foreground mb-1">Payment Currency</label><input type="text" value={formData.paymentCurrency} onChange={(e) => setFormData({...formData, paymentCurrency: e.target.value})} className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="USD" /></div>
                  <div><label className="block text-sm font-medium text-foreground mb-1">Payroll Cycle</label><select value={formData.payrollCycle} onChange={(e) => setFormData({...formData, payrollCycle: e.target.value as any})} className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="Weekly">Weekly</option><option value="Monthly">Monthly</option></select></div>
                  <div><label className="block text-sm font-medium text-foreground mb-1">Bank Name</label><input type="text" value={formData.bankName} onChange={(e) => setFormData({...formData, bankName: e.target.value})} className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Bank name" /></div>
                  <div><label className="block text-sm font-medium text-foreground mb-1">Account Number</label><input type="text" value={formData.accountNumber} onChange={(e) => setFormData({...formData, accountNumber: e.target.value})} className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Account number" /></div>
                  <div><label className="block text-sm font-medium text-foreground mb-1">SWIFT Code</label><input type="text" value={formData.swiftCode} onChange={(e) => setFormData({...formData, swiftCode: e.target.value})} className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="SWIFT code" /></div>
                  <div><label className="block text-sm font-medium text-foreground mb-1">Routing Number</label><input type="text" value={formData.routingNumber} onChange={(e) => setFormData({...formData, routingNumber: e.target.value})} className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Routing number" /></div>
                  <div><label className="block text-sm font-medium text-foreground mb-1">Account Holder Name</label><input type="text" value={formData.accountHolderName} onChange={(e) => setFormData({...formData, accountHolderName: e.target.value})} className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Account holder name" /></div>
                  <div><label className="block text-sm font-medium text-foreground mb-1">Last Salary Paid Date</label><input type="date" value={formData.lastSalaryPaidDate} onChange={(e) => setFormData({...formData, lastSalaryPaidDate: e.target.value})} className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                  <div><label className="block text-sm font-medium text-foreground mb-1">Bonus</label><input type="number" step="0.01" value={formData.bonus} onChange={(e) => setFormData({...formData, bonus: e.target.value})} className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0.00" /></div>
                  <div><label className="block text-sm font-medium text-foreground mb-1">Incentives</label><input type="number" step="0.01" value={formData.incentives} onChange={(e) => setFormData({...formData, incentives: e.target.value})} className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0.00" /></div>
                  <div><label className="block text-sm font-medium text-foreground mb-1">Deductions</label><input type="number" step="0.01" value={formData.deductions} onChange={(e) => setFormData({...formData, deductions: e.target.value})} className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0.00" /></div>
                </div>
                </div>
                
              {/* 6. ROLE, RESPONSIBILITIES & KPIs */}
              <div className="space-y-4 border-b border-border pb-6">
                <h4 className="text-base font-semibold text-foreground">6. Role, Responsibilities & KPIs</h4>
                <div className="space-y-4">
                  <div><label className="block text-sm font-medium text-foreground mb-1">Role Description</label><textarea rows={3} value={formData.roleDescription} onChange={(e) => setFormData({...formData, roleDescription: e.target.value})} className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Describe the role..." /></div>
                  <div><label className="block text-sm font-medium text-foreground mb-1">Core Responsibilities (one per line)</label><textarea rows={4} value={formData.coreResponsibilities} onChange={(e) => setFormData({...formData, coreResponsibilities: e.target.value})} className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Responsibility 1&#10;Responsibility 2" /></div>
                  <div><label className="block text-sm font-medium text-foreground mb-1">Key KPIs (one per line)</label><textarea rows={3} value={formData.keyKPIs} onChange={(e) => setFormData({...formData, keyKPIs: e.target.value})} className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="KPI 1&#10;KPI 2" /></div>
                  <div><label className="block text-sm font-medium text-foreground mb-1">Weekly Deliverables (one per line)</label><textarea rows={3} value={formData.weeklyDeliverables} onChange={(e) => setFormData({...formData, weeklyDeliverables: e.target.value})} className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Deliverable 1&#10;Deliverable 2" /></div>
                  <div><label className="block text-sm font-medium text-foreground mb-1">Monthly Goals (one per line)</label><textarea rows={3} value={formData.monthlyGoals} onChange={(e) => setFormData({...formData, monthlyGoals: e.target.value})} className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Goal 1&#10;Goal 2" /></div>
                  <div><label className="block text-sm font-medium text-foreground mb-1">Client Accounts Assigned (one per line)</label><textarea rows={3} value={formData.clientAccountsAssigned} onChange={(e) => setFormData({...formData, clientAccountsAssigned: e.target.value})} className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Client 1&#10;Client 2" /></div>
                  <div><label className="block text-sm font-medium text-foreground mb-1">Tools Used (one per line)</label><textarea rows={3} value={formData.toolsUsed} onChange={(e) => setFormData({...formData, toolsUsed: e.target.value})} className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Tool 1&#10;Tool 2" /></div>
                  <div><label className="block text-sm font-medium text-foreground mb-1">AI Tools Authorized (one per line)</label><textarea rows={3} value={formData.aiToolsAuthorized} onChange={(e) => setFormData({...formData, aiToolsAuthorized: e.target.value})} className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="AI Tool 1&#10;AI Tool 2" /></div>
                </div>
              </div>

              {/* Password Reset - Only show for super admin when editing */}
              {editingEmployee && isSuperAdmin && (
                <div className="border-t border-border pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-medium text-foreground">Reset Password</h4>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={resetPassword}
                        onChange={(e) => {
                          setResetPassword(e.target.checked);
                          if (!e.target.checked) {
                            setFormData({...formData, password: '', confirmPassword: ''});
                          }
                        }}
                        className="sr-only peer"
                      />
                      <div className="relative w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-gray-300 after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      <span className="ml-3 text-sm text-gray-700">Reset Password</span>
                    </label>
                  </div>
                  
                  {resetPassword && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          New Password *
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            required={resetPassword}
                            value={formData.password}
                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                            className="w-full px-3 py-2 pr-10 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter new password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-gray-600"
                          >
                            {showPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          Confirm New Password *
                        </label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            required={resetPassword}
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                            className="w-full px-3 py-2 pr-10 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Confirm new password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-gray-600"
                          >
                            {showConfirmPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Login Credentials - Only show for new employees */}
              {!editingEmployee && (
                <div className="border-t border-border pt-6">
                  <h4 className="text-sm font-medium text-foreground mb-4">Login Credentials</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Password *
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          required={!editingEmployee}
                          value={formData.password}
                          onChange={(e) => setFormData({...formData, password: e.target.value})}
                          className="w-full px-3 py-2 pr-10 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-gray-600"
                        >
                          {showPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Confirm Password *
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          required={!editingEmployee}
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                          className="w-full px-3 py-2 pr-10 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Confirm password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-gray-600"
                        >
                          {showConfirmPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </form>
            </div>
            
            <div className="px-6 py-4 bg-background rounded-b-lg flex justify-end space-x-3 flex-shrink-0 border-t border-gray-200">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-md hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-blue-700 transition-colors"
              >
                {editingEmployee ? 'Update Employee' : 'Add Employee'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Employee Details Modal */}
      {viewEmployeeModal.isOpen && viewEmployeeModal.employee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 min-h-screen p-4">
          <div className="bg-card rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-border flex-shrink-0">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-foreground">Employee Details - {viewEmployeeModal.employee.name}</h3>
                <button
                  onClick={() => setViewEmployeeModal({ isOpen: false, employee: null })}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
              {(() => {
                const emp = viewEmployeeModal.employee;
                const formatDate = (dateStr?: string) => dateStr ? new Date(dateStr).toLocaleDateString() : 'N/A';
                const formatArray = (arr?: string[]) => arr && arr.length > 0 ? arr.join(', ') : 'N/A';
                const formatCurrency = (amount?: number) => amount ? `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A';
                
                return (
                  <>
                    {/* 1. EMPLOYEE DASHBOARD */}
                    <div className="border-b border-border pb-4">
                      <h4 className="text-base font-semibold text-foreground mb-3">1. Employee Dashboard</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div><span className="font-medium text-gray-700">Full Name:</span> <span className="text-foreground">{emp.name}</span></div>
                        <div><span className="font-medium text-gray-700">Employee ID:</span> <span className="text-foreground">{emp.employeeId}</span></div>
                        <div><span className="font-medium text-gray-700">Role / Designation:</span> <span className="text-foreground">{emp.position}</span></div>
                        <div><span className="font-medium text-gray-700">Department:</span> <span className="text-foreground">{emp.department}</span></div>
                        <div><span className="font-medium text-gray-700">Employment Type:</span> <span className="text-foreground">{emp.employmentType || 'N/A'}</span></div>
                        <div><span className="font-medium text-gray-700">Work Location:</span> <span className="text-foreground">{emp.workLocation || 'N/A'}</span></div>
                        {emp.profilePhoto && <div className="md:col-span-2"><span className="font-medium text-gray-700">Profile Photo:</span> <a href={emp.profilePhoto} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{emp.profilePhoto}</a></div>}
                      </div>
                    </div>

                    {/* 2. CONTACT & COMMUNICATION */}
                    <div className="border-b border-border pb-4">
                      <h4 className="text-base font-semibold text-foreground mb-3">2. Contact & Communication Details</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div><span className="font-medium text-gray-700">Work Email:</span> <span className="text-foreground">{emp.email}</span></div>
                        <div><span className="font-medium text-gray-700">Personal Email:</span> <span className="text-foreground">{emp.personalEmail || 'N/A'}</span></div>
                        <div><span className="font-medium text-gray-700">Personal Phone:</span> <span className="text-foreground">{emp.personalPhone || 'N/A'}</span></div>
                        <div><span className="font-medium text-gray-700">WhatsApp Number:</span> <span className="text-foreground">{emp.whatsappNumber || 'N/A'}</span></div>
                        <div><span className="font-medium text-gray-700">Emergency Contact Name:</span> <span className="text-foreground">{emp.emergencyContact?.name || 'N/A'}</span></div>
                        <div><span className="font-medium text-gray-700">Emergency Contact Phone:</span> <span className="text-foreground">{emp.emergencyContact?.phone || 'N/A'}</span></div>
                        <div><span className="font-medium text-gray-700">Relationship:</span> <span className="text-foreground">{emp.emergencyContact?.relationship || 'N/A'}</span></div>
                      </div>
                    </div>

                    {/* 3. DOCUMENTATION */}
                    <div className="border-b border-border pb-4">
                      <h4 className="text-base font-semibold text-foreground mb-3">3. Documentation & Compliance</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        {emp.documents?.resume && <div><span className="font-medium text-gray-700">Resume:</span> <a href={emp.documents.resume} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View</a></div>}
                        {emp.documents?.offerLetter && <div><span className="font-medium text-gray-700">Offer Letter:</span> <a href={emp.documents.offerLetter} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View</a></div>}
                        {emp.documents?.employeeAgreement && <div><span className="font-medium text-gray-700">Employee Agreement:</span> <a href={emp.documents.employeeAgreement} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View</a></div>}
                        {emp.documents?.nda && <div><span className="font-medium text-gray-700">NDA:</span> <a href={emp.documents.nda} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View</a></div>}
                        {emp.documents?.govtId && <div><span className="font-medium text-gray-700">Govt ID:</span> <a href={emp.documents.govtId} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View</a></div>}
                        {emp.documents?.passport && <div><span className="font-medium text-gray-700">Passport:</span> <a href={emp.documents.passport} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View</a></div>}
                        {emp.documents?.addressProof && <div><span className="font-medium text-gray-700">Address Proof:</span> <a href={emp.documents.addressProof} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View</a></div>}
                        {emp.documents?.pan && <div><span className="font-medium text-gray-700">PAN:</span> <span className="text-foreground">{emp.documents.pan}</span></div>}
                        {emp.documents?.taxId && <div><span className="font-medium text-gray-700">Tax ID:</span> <span className="text-foreground">{emp.documents.taxId}</span></div>}
                      </div>
                    </div>

                    {/* 4. EMPLOYMENT LIFECYCLE */}
                    <div className="border-b border-border pb-4">
                      <h4 className="text-base font-semibold text-foreground mb-3">4. Employment Lifecycle</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div><span className="font-medium text-gray-700">Date of Joining:</span> <span className="text-foreground">{formatDate(emp.dateOfJoined)}</span></div>
                        <div><span className="font-medium text-gray-700">Employment Status:</span> <span className="text-foreground">{emp.employmentStatus || 'N/A'}</span></div>
                        <div><span className="font-medium text-gray-700">Confirmation Date:</span> <span className="text-foreground">{formatDate(emp.confirmationDate)}</span></div>
                        <div><span className="font-medium text-gray-700">Last Working Date:</span> <span className="text-foreground">{formatDate(emp.lastWorkingDate)}</span></div>
                      </div>
                    </div>

                    {/* 5. PAYROLL & FINANCE */}
                    <div className="border-b border-border pb-4">
                      <h4 className="text-base font-semibold text-foreground mb-3">5. Payroll & Finance Details</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div><span className="font-medium text-gray-700">Salary Type:</span> <span className="text-foreground">{emp.salaryType || 'N/A'}</span></div>
                        <div><span className="font-medium text-gray-700">Salary Amount:</span> <span className="text-foreground">{formatCurrency(emp.salary)}</span></div>
                        <div><span className="font-medium text-gray-700">Payment Currency:</span> <span className="text-foreground">{emp.paymentCurrency || 'N/A'}</span></div>
                        <div><span className="font-medium text-gray-700">Payroll Cycle:</span> <span className="text-foreground">{emp.payrollCycle || 'N/A'}</span></div>
                        <div><span className="font-medium text-gray-700">Bank Name:</span> <span className="text-foreground">{emp.bankDetails?.bankName || emp.bankName || 'N/A'}</span></div>
                        <div><span className="font-medium text-gray-700">Account Number:</span> <span className="text-foreground">{emp.bankDetails?.accountNumber || emp.accountNumber || 'N/A'}</span></div>
                        <div><span className="font-medium text-gray-700">SWIFT Code:</span> <span className="text-foreground">{emp.bankDetails?.swiftCode || emp.swiftCode || 'N/A'}</span></div>
                        <div><span className="font-medium text-gray-700">Last Salary Paid Date:</span> <span className="text-foreground">{formatDate(emp.lastSalaryPaidDate)}</span></div>
                        <div><span className="font-medium text-gray-700">Bonus:</span> <span className="text-foreground">{formatCurrency(emp.bonus)}</span></div>
                        <div><span className="font-medium text-gray-700">Incentives:</span> <span className="text-foreground">{formatCurrency(emp.incentives)}</span></div>
                        <div><span className="font-medium text-gray-700">Deductions:</span> <span className="text-foreground">{formatCurrency(emp.deductions)}</span></div>
                      </div>
                    </div>

                    {/* 6. ROLE, RESPONSIBILITIES & KPIs */}
                    <div className="pb-4">
                      <h4 className="text-base font-semibold text-foreground mb-3">6. Role, Responsibilities & KPIs</h4>
                      <div className="space-y-3 text-sm">
                        <div><span className="font-medium text-gray-700">Role Description:</span> <p className="text-foreground mt-1">{emp.roleDescription || 'N/A'}</p></div>
                        <div><span className="font-medium text-gray-700">Core Responsibilities:</span> <p className="text-foreground mt-1">{formatArray(emp.coreResponsibilities)}</p></div>
                        <div><span className="font-medium text-gray-700">Key KPIs:</span> <p className="text-foreground mt-1">{formatArray(emp.keyKPIs)}</p></div>
                        <div><span className="font-medium text-gray-700">Weekly Deliverables:</span> <p className="text-foreground mt-1">{formatArray(emp.weeklyDeliverables)}</p></div>
                        <div><span className="font-medium text-gray-700">Monthly Goals:</span> <p className="text-foreground mt-1">{formatArray(emp.monthlyGoals)}</p></div>
                        <div><span className="font-medium text-gray-700">Client Accounts Assigned:</span> <p className="text-foreground mt-1">{formatArray(emp.clientAccountsAssigned)}</p></div>
                        <div><span className="font-medium text-gray-700">Tools Used:</span> <p className="text-foreground mt-1">{formatArray(emp.toolsUsed)}</p></div>
                        <div><span className="font-medium text-gray-700">AI Tools Authorized:</span> <p className="text-foreground mt-1">{formatArray(emp.aiToolsAuthorized)}</p></div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
            
            <div className="px-6 py-4 bg-background rounded-b-lg flex justify-end space-x-3 flex-shrink-0 border-t border-gray-200">
              <button
                onClick={() => {
                  setViewEmployeeModal({ isOpen: false, employee: null });
                  if (viewEmployeeModal.employee) {
                    handleEditEmployee(viewEmployeeModal.employee);
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-blue-700 transition-colors"
              >
                Edit Employee
              </button>
              <button
                onClick={() => setViewEmployeeModal({ isOpen: false, employee: null })}
                className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-md hover:bg-accent transition-colors"
              >
                Close
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

      {/* Delete Confirmation Modal */}
      <AlertModal
        isOpen={deleteConfirmModal.isOpen}
        onClose={() => setDeleteConfirmModal({ isOpen: false, employee: null })}
        title="Delete Employee"
        message={`Are you sure you want to delete ${deleteConfirmModal.employee?.name}? This action cannot be undone.`}
        type="warning"
        showConfirmButton={true}
        confirmText="Delete"
        onConfirm={confirmDeleteEmployee}
      />
    </div>
  );
}
