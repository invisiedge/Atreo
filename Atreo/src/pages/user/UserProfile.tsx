import React, { useState, useEffect } from 'react';
import { FiUser, FiCreditCard, FiSave, FiEdit3, FiPhone, FiDollarSign, FiFileText, FiTarget, FiShield, FiDownload, FiTrash2, FiCheck } from 'react-icons/fi';
import { apiClient } from '../../services/api';
import type { UserProfile as UserProfileType } from '../../services/api';
import { logger } from '../../lib/logger';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const UserProfile: React.FC = () => {
  const { setUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Record<string, string>>({});
  const [uploadingDocs, setUploadingDocs] = useState<Record<string, boolean>>({});
  const [deletingDocs, setDeletingDocs] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState({
    // Basic Info
    name: '',
    email: '',
    employeeId: '',
    position: '',
    department: '',
    employmentType: 'Full-time' as 'Full-time' | 'Intern' | 'Freelancer' | 'Consultant',
    workLocation: 'Remote' as 'Remote' | 'Hybrid' | 'Office',
    // Contact
    phone: '',
    personalEmail: '',
    workEmail: '',
    personalPhone: '',
    whatsappNumber: '',
    address: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    // Banking
    bankName: '',
    accountNumber: '',
    swiftCode: '',
    routingNumber: '',
    accountHolderName: '',
    // Payroll
    salary: '',
    salaryType: 'Monthly' as 'Monthly' | 'Hourly' | 'Project-based',
    paymentCurrency: 'USD',
    payrollCycle: 'Monthly' as 'Weekly' | 'Monthly',
    bonus: '',
    incentives: '',
    deductions: '',
    // Role & Responsibilities
    roleDescription: '',
    coreResponsibilities: '',
    keyKPIs: '',
    weeklyDeliverables: '',
    monthlyGoals: '',
    clientAccountsAssigned: '',
    toolsUsed: '',
    aiToolsAuthorized: '',
  });
  const [originalData, setOriginalData] = useState(formData);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const profile: UserProfileType = await apiClient.getUserProfile();
      // Handle both direct profile and wrapped response
      const profileData = (profile as any).user || profile;
      
      const profileFormData = {
        name: profileData.name || '',
        email: profileData.email || '',
        employeeId: profileData.employeeId || '',
        position: profileData.position || '',
        department: profileData.department || '',
        employmentType: (profileData.employmentType as any) || 'Full-time',
        workLocation: (profileData.workLocation as any) || 'Remote',
        phone: profileData.phone || '',
        personalEmail: profileData.personalEmail || '',
        workEmail: profileData.workEmail || '',
        personalPhone: profileData.personalPhone || '',
        whatsappNumber: profileData.whatsappNumber || '',
        address: profileData.address || '',
        emergencyContactName: profileData.emergencyContact?.name || '',
        emergencyContactPhone: profileData.emergencyContact?.phone || '',
        emergencyContactRelationship: profileData.emergencyContact?.relationship || '',
        bankName: profileData.bankName || profileData.bankDetails?.bankName || '',
        accountNumber: profileData.accountNumber || profileData.bankDetails?.accountNumber || '',
        swiftCode: profileData.swiftCode || profileData.bankDetails?.swiftCode || '',
        routingNumber: profileData.routingNumber || profileData.bankDetails?.routingNumber || '',
        accountHolderName: profileData.accountHolderName || profileData.bankDetails?.accountHolderName || '',
        salary: profileData.salary?.toString() || '',
        salaryType: (profileData.salaryType as any) || 'Monthly',
        paymentCurrency: profileData.paymentCurrency || 'USD',
        payrollCycle: (profileData.payrollCycle as any) || 'Monthly',
        bonus: profileData.bonus?.toString() || '',
        incentives: profileData.incentives?.toString() || '',
        deductions: profileData.deductions?.toString() || '',
        roleDescription: profileData.roleDescription || '',
        coreResponsibilities: Array.isArray(profileData.coreResponsibilities) 
          ? profileData.coreResponsibilities.join('\n') 
          : profileData.coreResponsibilities || '',
        keyKPIs: Array.isArray(profileData.keyKPIs) 
          ? profileData.keyKPIs.join('\n') 
          : profileData.keyKPIs || '',
        weeklyDeliverables: Array.isArray(profileData.weeklyDeliverables) 
          ? profileData.weeklyDeliverables.join('\n') 
          : profileData.weeklyDeliverables || '',
        monthlyGoals: Array.isArray(profileData.monthlyGoals) 
          ? profileData.monthlyGoals.join('\n') 
          : profileData.monthlyGoals || '',
        clientAccountsAssigned: Array.isArray(profileData.clientAccountsAssigned) 
          ? profileData.clientAccountsAssigned.join('\n') 
          : profileData.clientAccountsAssigned || '',
        toolsUsed: Array.isArray(profileData.toolsUsed) 
          ? profileData.toolsUsed.join('\n') 
          : profileData.toolsUsed || '',
        aiToolsAuthorized: Array.isArray(profileData.aiToolsAuthorized) 
          ? profileData.aiToolsAuthorized.join('\n') 
          : profileData.aiToolsAuthorized || '',
      };
      
      setFormData(profileFormData);
      setOriginalData(profileFormData);
      
      // Load documents if available
      if (profileData.documents) {
        setDocuments(profileData.documents);
      }
    } catch (error) {
      logger.error('Failed to fetch profile:', error);
      setError('Failed to load profile data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDocumentUpload = async (documentType: string, file: File) => {
    try {
      setUploadingDocs(prev => ({ ...prev, [documentType]: true }));
      setError(null);
      
      const response = await apiClient.uploadDocument(documentType, file);
      
      setDocuments(prev => ({
        ...prev,
        [documentType]: response.fileUrl
      }));
      
      setSuccessMessage(`${documentType} uploaded successfully!`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      logger.error('Failed to upload document:', error);
      setError(error.message || `Failed to upload ${documentType}. Please try again.`);
    } finally {
      setUploadingDocs(prev => ({ ...prev, [documentType]: false }));
    }
  };

  const handleDocumentDelete = async (documentType: string) => {
    if (!confirm(`Are you sure you want to delete your ${documentType}?`)) {
      return;
    }

    try {
      setDeletingDocs(prev => ({ ...prev, [documentType]: true }));
      setError(null);
      
      await apiClient.deleteDocument(documentType);
      
      setDocuments(prev => {
        const newDocs = { ...prev };
        delete newDocs[documentType];
        return newDocs;
      });
      
      setSuccessMessage(`${documentType} deleted successfully!`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      logger.error('Failed to delete document:', error);
      setError(error.message || `Failed to delete ${documentType}. Please try again.`);
    } finally {
      setDeletingDocs(prev => ({ ...prev, [documentType]: false }));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccessMessage(null);

      const updateData: any = {
        phone: formData.phone,
        address: formData.address,
        bankName: formData.bankName,
        accountNumber: formData.accountNumber,
        swiftCode: formData.swiftCode,
        position: formData.position,
        // Employee fields
        department: formData.department,
        employmentType: formData.employmentType,
        workLocation: formData.workLocation,
        personalEmail: formData.personalEmail,
        workEmail: formData.workEmail,
        personalPhone: formData.personalPhone,
        whatsappNumber: formData.whatsappNumber,
        emergencyContactName: formData.emergencyContactName,
        emergencyContactPhone: formData.emergencyContactPhone,
        emergencyContactRelationship: formData.emergencyContactRelationship,
        routingNumber: formData.routingNumber,
        accountHolderName: formData.accountHolderName,
        salary: formData.salary ? parseFloat(formData.salary) : undefined,
        salaryType: formData.salaryType,
        paymentCurrency: formData.paymentCurrency,
        payrollCycle: formData.payrollCycle,
        bonus: formData.bonus ? parseFloat(formData.bonus) : undefined,
        incentives: formData.incentives ? parseFloat(formData.incentives) : undefined,
        deductions: formData.deductions ? parseFloat(formData.deductions) : undefined,
        roleDescription: formData.roleDescription,
        coreResponsibilities: formData.coreResponsibilities,
        keyKPIs: formData.keyKPIs,
        weeklyDeliverables: formData.weeklyDeliverables,
        monthlyGoals: formData.monthlyGoals,
        clientAccountsAssigned: formData.clientAccountsAssigned,
        toolsUsed: formData.toolsUsed,
        aiToolsAuthorized: formData.aiToolsAuthorized,
      };

      const response = await apiClient.updateUserProfile(updateData);
      
      // Update global user context
      if (response) {
        const updatedUser = {
          id: response.id,
          name: response.name,
          email: response.email,
          role: response.role,
          phone: response.phone,
          address: response.address,
          position: response.position,
          bankName: response.bankName,
          accountNumber: response.accountNumber,
          swiftCode: response.swiftCode
        };
        setUser(updatedUser as any);
      } else {
        const freshProfile = await apiClient.getUserProfile();
        const updatedUser = {
          id: freshProfile.id,
          name: freshProfile.name,
          email: freshProfile.email,
          role: freshProfile.role,
          phone: freshProfile.phone,
          address: freshProfile.address,
          position: freshProfile.position,
          bankName: freshProfile.bankName,
          accountNumber: freshProfile.accountNumber,
          swiftCode: freshProfile.swiftCode
        };
        setUser(updatedUser as any);
      }
      
      setOriginalData(formData);
      setIsEditing(false);
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      logger.error('Failed to save profile:', error);
      setError('Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(originalData);
    setIsEditing(false);
    setError(null);
    setSuccessMessage(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Profile Settings</h2>
          <p className="mt-2 text-gray-600">Manage your personal, contact, and employment information.</p>
        </div>
        <Button
          onClick={() => setIsEditing(!isEditing)}
          variant={isEditing ? "outline" : "default"}
        >
          <FiEdit3 className="h-4 w-4 mr-2" />
          {isEditing ? 'Cancel' : 'Edit Profile'}
        </Button>
      </div>

      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800">{successMessage}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* 1. Employee Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiUser className="h-5 w-5" />
            Employee Information
          </CardTitle>
          <CardDescription>Basic employee details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Full Name</Label>
              <Input value={formData.name} disabled={true} />
              <p className="text-xs text-muted-foreground mt-1">Cannot be edited</p>
            </div>
            <div>
              <Label>Email Address</Label>
              <Input value={formData.email} disabled={true} />
              <p className="text-xs text-muted-foreground mt-1">Contact administrator to change</p>
            </div>
            {formData.employeeId && (
              <div>
                <Label>Employee ID</Label>
                <Input value={formData.employeeId} disabled={true} />
                <p className="text-xs text-muted-foreground mt-1">Managed by HR</p>
              </div>
            )}
            <div>
              <Label>Position / Role</Label>
              <Input
                value={formData.position}
                onChange={handleInputChange}
                name="position"
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label>Department</Label>
              <Input
                value={formData.department}
                onChange={handleInputChange}
                name="department"
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label>Employment Type</Label>
              <Select
                value={formData.employmentType}
                onValueChange={(value) => handleSelectChange('employmentType', value)}
                disabled={!isEditing}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Full-time">Full-time</SelectItem>
                  <SelectItem value="Intern">Intern</SelectItem>
                  <SelectItem value="Freelancer">Freelancer</SelectItem>
                  <SelectItem value="Consultant">Consultant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Work Location</Label>
              <Select
                value={formData.workLocation}
                onValueChange={(value) => handleSelectChange('workLocation', value)}
                disabled={!isEditing}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Remote">Remote</SelectItem>
                  <SelectItem value="Hybrid">Hybrid</SelectItem>
                  <SelectItem value="Office">Office</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiPhone className="h-5 w-5" />
            Contact Information
          </CardTitle>
          <CardDescription>Personal and emergency contact details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Phone Number</Label>
              <Input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div>
              <Label>Personal Email</Label>
              <Input
                type="email"
                name="personalEmail"
                value={formData.personalEmail}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder="personal@example.com"
              />
            </div>
            <div>
              <Label>Work Email</Label>
              <Input
                type="email"
                name="workEmail"
                value={formData.workEmail}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder="work@example.com"
              />
            </div>
            <div>
              <Label>Personal Phone</Label>
              <Input
                type="tel"
                name="personalPhone"
                value={formData.personalPhone}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div>
              <Label>WhatsApp Number</Label>
              <Input
                type="tel"
                name="whatsappNumber"
                value={formData.whatsappNumber}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div>
              <Label>Home Address</Label>
              <Input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder="123 Main Street, City, State 12345"
              />
            </div>
            <div>
              <Label>Emergency Contact Name</Label>
              <Input
                type="text"
                name="emergencyContactName"
                value={formData.emergencyContactName}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder="Emergency contact name"
              />
          </div>
            <div>
              <Label>Emergency Contact Phone</Label>
              <Input
                type="tel"
                name="emergencyContactPhone"
                value={formData.emergencyContactPhone}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder="+1 (555) 123-4567"
              />
        </div>
            <div>
              <Label>Emergency Contact Relationship</Label>
              <Input
                type="text"
                name="emergencyContactRelationship"
                value={formData.emergencyContactRelationship}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder="e.g., Spouse, Parent"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Banking Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiCreditCard className="h-5 w-5" />
            Banking Information
          </CardTitle>
          <CardDescription>Payment and banking details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
              <Label>Bank Name</Label>
              <Input
                  type="text"
                  name="bankName"
                  value={formData.bankName}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </div>
              <div>
              <Label>Account Number</Label>
              <Input
                  type="text"
                  name="accountNumber"
                  value={formData.accountNumber}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                className="font-mono"
                />
              </div>
              <div>
              <Label>SWIFT Code</Label>
              <Input
                  type="text"
                  name="swiftCode"
                  value={formData.swiftCode}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                className="font-mono"
              />
            </div>
            <div>
              <Label>Routing Number</Label>
              <Input
                type="text"
                name="routingNumber"
                value={formData.routingNumber}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="font-mono"
              />
            </div>
            <div>
              <Label>Account Holder Name</Label>
              <Input
                type="text"
                name="accountHolderName"
                value={formData.accountHolderName}
                onChange={handleInputChange}
                disabled={!isEditing}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Payroll & Finance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiDollarSign className="h-5 w-5" />
            Payroll & Finance
          </CardTitle>
          <CardDescription>Salary and compensation details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Salary Type</Label>
              <Select
                value={formData.salaryType}
                onValueChange={(value) => handleSelectChange('salaryType', value)}
                disabled={!isEditing}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="Hourly">Hourly</SelectItem>
                  <SelectItem value="Project-based">Project-based</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Salary Amount</Label>
              <Input
                type="number"
                step="0.01"
                name="salary"
                value={formData.salary}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Payment Currency</Label>
              <Input
                type="text"
                name="paymentCurrency"
                value={formData.paymentCurrency}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder="USD"
              />
            </div>
            <div>
              <Label>Payroll Cycle</Label>
              <Select
                value={formData.payrollCycle}
                onValueChange={(value) => handleSelectChange('payrollCycle', value)}
                disabled={!isEditing}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Weekly">Weekly</SelectItem>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Bonus</Label>
              <Input
                type="number"
                step="0.01"
                name="bonus"
                value={formData.bonus}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Incentives</Label>
              <Input
                type="number"
                step="0.01"
                name="incentives"
                value={formData.incentives}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder="0.00"
                />
              </div>
            <div>
              <Label>Deductions</Label>
              <Input
                type="number"
                step="0.01"
                name="deductions"
                value={formData.deductions}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder="0.00"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5. Role & Responsibilities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiTarget className="h-5 w-5" />
            Role & Responsibilities
          </CardTitle>
          <CardDescription>Job description, KPIs, and deliverables</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Role Description</Label>
            <textarea
              rows={3}
              name="roleDescription"
              value={formData.roleDescription}
              onChange={handleInputChange}
              disabled={!isEditing}
              placeholder="Describe your role..."
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:cursor-not-allowed"
            />
          </div>
          <div>
            <Label>Core Responsibilities (one per line)</Label>
            <textarea
              rows={4}
              name="coreResponsibilities"
              value={formData.coreResponsibilities}
              onChange={handleInputChange}
              disabled={!isEditing}
              placeholder="Responsibility 1&#10;Responsibility 2"
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:cursor-not-allowed"
            />
          </div>
          <div>
            <Label>Key KPIs (one per line)</Label>
            <textarea
              rows={3}
              name="keyKPIs"
              value={formData.keyKPIs}
              onChange={handleInputChange}
              disabled={!isEditing}
              placeholder="KPI 1&#10;KPI 2"
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:cursor-not-allowed"
            />
          </div>
          <div>
            <Label>Weekly Deliverables (one per line)</Label>
            <textarea
              rows={3}
              name="weeklyDeliverables"
              value={formData.weeklyDeliverables}
              onChange={handleInputChange}
              disabled={!isEditing}
              placeholder="Deliverable 1&#10;Deliverable 2"
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:cursor-not-allowed"
            />
          </div>
          <div>
            <Label>Monthly Goals (one per line)</Label>
            <textarea
              rows={3}
              name="monthlyGoals"
              value={formData.monthlyGoals}
              onChange={handleInputChange}
              disabled={!isEditing}
              placeholder="Goal 1&#10;Goal 2"
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:cursor-not-allowed"
            />
          </div>
          <div>
            <Label>Client Accounts Assigned (one per line)</Label>
            <textarea
              rows={3}
              name="clientAccountsAssigned"
              value={formData.clientAccountsAssigned}
              onChange={handleInputChange}
              disabled={!isEditing}
              placeholder="Client 1&#10;Client 2"
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:cursor-not-allowed"
            />
          </div>
          <div>
            <Label>Tools Used (one per line)</Label>
            <textarea
              rows={3}
              name="toolsUsed"
              value={formData.toolsUsed}
              onChange={handleInputChange}
              disabled={!isEditing}
              placeholder="Tool 1&#10;Tool 2"
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:cursor-not-allowed"
            />
          </div>
          <div>
            <Label>AI Tools Authorized (one per line)</Label>
            <textarea
              rows={3}
              name="aiToolsAuthorized"
              value={formData.aiToolsAuthorized}
              onChange={handleInputChange}
              disabled={!isEditing}
              placeholder="AI Tool 1&#10;AI Tool 2"
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:cursor-not-allowed"
            />
          </div>
        </CardContent>
      </Card>

      {/* 6. Documentation & Compliance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiFileText className="h-5 w-5" />
            Documentation & Compliance
          </CardTitle>
          <CardDescription>
            Upload required documents for HR and compliance. All documents are stored securely in the cloud.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: 'resume', label: 'Resume / CV', required: true },
            { key: 'offerLetter', label: 'Offer Letter (Signed)', required: true },
            { key: 'employeeAgreement', label: 'Employee Agreement / NDA', required: true },
            { key: 'govtId', label: 'Govt ID / Passport', required: true },
            { key: 'addressProof', label: 'Address Proof', required: false },
            { key: 'pan', label: 'PAN / Tax ID', required: false },
            { key: 'taxId', label: 'Tax ID (if applicable)', required: false },
          ].map(({ key, label, required }) => (
            <div key={key} className="border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">
                  {label}
                  {required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                {documents[key] && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                      <FiCheck className="h-3 w-3" />
                      Uploaded
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(documents[key], '_blank')}
                      className="h-7 px-2"
                    >
                      <FiDownload className="h-3 w-3 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDocumentDelete(key)}
                      disabled={deletingDocs[key]}
                      className="h-7 px-2 text-red-600 hover:text-red-700"
                    >
                      {deletingDocs[key] ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
                      ) : (
                        <FiTrash2 className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                )}
              </div>
              {!documents[key] && (
                <div className="text-xs text-muted-foreground mb-2">
                  {required ? 'Required document' : 'Optional document'}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      // Check file size (10MB limit)
                      if (file.size > 10 * 1024 * 1024) {
                        setError('File size must be less than 10MB');
                        return;
                      }
                      handleDocumentUpload(key, file);
                      // Reset input
                      e.target.value = '';
                    }
                  }}
                  disabled={uploadingDocs[key]}
                  className="flex-1"
                />
                {uploadingDocs[key] && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    Uploading...
                  </div>
                )}
        </div>
      </div>
          ))}
        </CardContent>
      </Card>

      {/* Save Button */}
      {isEditing && (
        <div className="flex justify-end space-x-3">
          <Button
            onClick={handleCancel}
            disabled={isSaving}
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <FiSave className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      )}

      {/* Security Notice */}
      <Card className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-2">
            <FiShield className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-2">Security Notice</h4>
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Your information is encrypted and stored securely. When you update your profile, admins can see these changes in the Employees page. Only you and authorized administrators can view this information.
        </p>
      </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserProfile;
