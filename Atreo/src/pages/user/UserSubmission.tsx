import React, { useState, useRef, useEffect } from 'react';
import { FiPlus, FiDownload } from 'react-icons/fi';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { SubmissionService } from '../../services/submissionService';
import { apiClient, config } from '../../services/api';
import type { UserProfile } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import AlertModal from '../../components/shared/AlertModal';
import { logger } from '../../lib/logger';

const UserSubmission: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
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
  
  const [formData, setFormData] = useState({
    bankName: '',
    accountNumber: '',
    swiftCode: '',
    description: '',
    workPeriod: '',
    totalAmount: ''
  });

  // Fetch user profile data on component mount
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setIsLoadingProfile(true);
        const profile = await apiClient.getUserProfile();
        setProfileData(profile);
        
        // Pre-fill form with profile bank details
        setFormData(prev => ({
          ...prev,
          bankName: profile.bankName || '',
          accountNumber: profile.accountNumber || '',
          swiftCode: profile.swiftCode || ''
        }));
      } catch (error) {
        logger.error('Failed to fetch profile data:', error);
        // Continue with empty form if profile fetch fails
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchProfileData();
  }, []);

  const handleAddSubmission = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    // Reset form data but preserve bank details from profile
    setFormData({
      bankName: profileData?.bankName || '',
      accountNumber: profileData?.accountNumber || '',
      swiftCode: profileData?.swiftCode || '',
      description: '',
      workPeriod: '',
      totalAmount: ''
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getTotalAmount = () => {
    return parseFloat(formData.totalAmount) || 0;
  };

  const getNextInvoiceNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    // Get current counter from localStorage or start at 0
    const counterKey = `invoiceCounter_${year}${month}${day}`;
    const currentCounter = parseInt(localStorage.getItem(counterKey) || '0');
    
    return `ATR-${year}${month}${day}-${String(currentCounter + 1).padStart(4, '0')}`;
  };

  const incrementInvoiceCounter = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    const counterKey = `invoiceCounter_${year}${month}${day}`;
    const currentCounter = parseInt(localStorage.getItem(counterKey) || '0');
    localStorage.setItem(counterKey, String(currentCounter + 1));
  };

  const getCurrentDate = () => {
    return new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const handleSubmitRequest = async () => {
    if (!user) {
      setSubmitError('User not authenticated');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Validate form data
      if (!formData.bankName || !formData.accountNumber || !formData.swiftCode || 
          !formData.description || !formData.workPeriod || !formData.totalAmount) {
        throw new Error('Please fill in all required fields');
      }

      const submissionData = {
        bankName: formData.bankName,
        accountNumber: formData.accountNumber,
        swiftCode: formData.swiftCode,
        workPeriod: formData.workPeriod,
        description: formData.description,
        totalAmount: parseFloat(formData.totalAmount),
      };

      // Submit to backend
      await SubmissionService.createSubmission(submissionData);
      
      // Increment the invoice counter only when actually submitting
      incrementInvoiceCounter();
      
      // Close the modal after successful submission
      handleCloseModal();
      
      // Show success message
      setAlertModal({
        isOpen: true,
        type: 'success',
        title: 'Submission Successful',
        message: 'Payment request submitted successfully!',
      });
    } catch (error) {
      logger.error('Submission failed:', error);
      let errorMessage = 'Failed to submit request';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        // If it's a network error, provide more helpful message
        if (error.message.includes('Unable to connect') || error.message.includes('Failed to fetch')) {
          errorMessage = config.isDevelopment
            ? 'Unable to connect to the server. Please ensure the backend is running on port 3001.'
            : 'Unable to connect to the server. Please check your internet connection and try again.';
        }
      }
      
      setSubmitError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!invoiceRef.current) return;

    try {
      // Capture the invoice element as canvas
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2, // Higher quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      // Create PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // Calculate dimensions to fit the page
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      // Add image to PDF
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add new pages if content is longer than one page
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Generate filename with invoice number
      const invoiceNumber = getNextInvoiceNumber();
      const filename = `Invoice_${invoiceNumber}.pdf`;

      // Download the PDF
      pdf.save(filename);
    } catch (error) {
      logger.error('Error generating PDF:', error);
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'PDF Generation Failed',
        message: 'Error generating PDF. Please try again.',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Submit Payment Request</h2>
          <p className="mt-2 text-gray-600">Submit your payment request with bank details and invoice.</p>
        </div>
        <button 
          onClick={handleAddSubmission}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <FiPlus className="h-4 w-4" />
          New Request
        </button>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">Instructions</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Fill in your bank details accurately</li>
          <li>• Upload a clear invoice or receipt</li>
          <li>• Double-check all information before submitting</li>
          <li>• You can track your submission status in the Dashboard</li>
        </ul>
      </div>

      {/* Submit Payment Request Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 min-h-screen">
          <div className="bg-card rounded-lg shadow-xl max-w-7xl w-full mx-4 max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-border flex-shrink-0">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-foreground">Submit Payment Request</h3>
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
            
            <div className="px-6 py-4 space-y-6 overflow-y-auto flex-1">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Form Section */}
                    <div className="space-y-6 lg:col-span-1">
                      {/* Bank Details */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-foreground">Bank Details</h4>
                          {isLoadingProfile && (
                            <div className="flex items-center text-xs text-gray-500">
                              <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-400 mr-1"></div>
                              Loading from profile...
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-1">
                              Bank Name
                            </label>
                            <input
                              type="text"
                              name="bankName"
                              value={formData.bankName}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Enter bank name"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-1">
                              Account Number
                            </label>
                            <input
                              type="text"
                              name="accountNumber"
                              value={formData.accountNumber}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                              placeholder="Enter account number"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-1">
                              Swift Code
                            </label>
                            <input
                              type="text"
                              name="swiftCode"
                              value={formData.swiftCode}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                              placeholder="Enter swift code"
                            />
                          </div>
                        </div>
                        
                        {/* Profile Info Note */}
                        {profileData && (profileData.bankName || profileData.accountNumber || profileData.swiftCode) && (
                          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                            <p className="text-xs text-blue-800">
                              💡 Bank details are pre-filled from your profile. You can edit them if needed for this specific submission.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Payment Details */}
                      <div className="border-t border-border pt-6">
                        <h4 className="text-sm font-medium text-foreground mb-4">Payment Details</h4>
                        
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-1">
                              Work Period (e.g., July 1-31, 2025)
                            </label>
                            <input
                              type="text"
                              name="workPeriod"
                              value={formData.workPeriod}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Enter work period"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-1">
                              Total Amount (USD)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              name="totalAmount"
                              value={formData.totalAmount}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="0.00"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-1">
                              Description
                            </label>
                            <input
                              type="text"
                              name="description"
                              value={formData.description}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Work description"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                {/* Live Invoice Preview */}
                <div className="bg-background rounded-lg p-4 lg:col-span-2">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium text-foreground">Invoice Preview</h4>
                      {isLoadingProfile && (
                        <div className="flex items-center text-xs text-gray-500">
                          <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-400 mr-1"></div>
                          Loading profile...
                        </div>
                      )}
                    </div>
                        <button 
                          onClick={handleDownloadPDF}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary bg-primary/10 border border-blue-200 rounded-md hover:bg-blue-100 hover:text-blue-700 transition-colors"
                        >
                          <FiDownload className="h-4 w-4" />
                          Download Invoice
                        </button>
                  </div>
                  <div ref={invoiceRef} className="bg-card rounded-lg shadow-sm border border-border p-6">
                    {/* Invoice Header */}
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h2 className="text-2xl font-bold text-foreground">INVOICE</h2>
                      </div>
                      <div className="text-sm text-muted-foreground text-right">
                        <div>Date: {getCurrentDate()}</div>
                        <div>Invoice No: {getNextInvoiceNumber()}</div>
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
                        <div><strong>Name:</strong> {profileData?.name || 'Loading...'}</div>
                        <div><strong>Email:</strong> {profileData?.email || 'Loading...'}</div>
                        <div><strong>Position:</strong> {profileData?.position || 'Loading...'}</div>
                        {profileData?.employeeId && (
                          <div><strong>Employee ID:</strong> {profileData.employeeId}</div>
                        )}
                      </div>
                    </div>

                    {/* Bank Details */}
                    <div className="mb-6">
                      <h3 className="text-sm font-medium text-foreground mb-2">Bank Details:</h3>
                      <div className="text-sm text-foreground space-y-1">
                        <div><strong>Bank:</strong> {formData.bankName || (isLoadingProfile ? 'Loading...' : 'Bank Name')}</div>
                        <div><strong>Account:</strong> {formData.accountNumber || (isLoadingProfile ? 'Loading...' : 'Account Number')}</div>
                        <div><strong>Swift Code:</strong> {formData.swiftCode || (isLoadingProfile ? 'Loading...' : 'SWIFT CODE')}</div>
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
                              {formData.workPeriod || 'Work Period'}
                            </td>
                            <td className="border border-border px-4 py-3 text-sm text-foreground whitespace-normal break-words align-top">
                              <div className="max-w-full">
                                {formData.description || 'Work description'}
                              </div>
                            </td>
                            <td className="border border-border px-4 py-3 text-sm text-foreground align-top">
                              {getTotalAmount() > 0 ? `${getTotalAmount()} USD` : 'Total USD'}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Total */}
                    <div className="text-right">
                      <div className="text-lg font-semibold text-foreground">
                        TOTAL = {getTotalAmount() > 0 ? `${getTotalAmount()} USD` : '0 USD'}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-8 text-left">
                      <div className="text-lg font-bold text-foreground mb-4">THANK YOU!</div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>Phone No.: {profileData?.phone || (isLoadingProfile ? 'Loading...' : 'Phone Number')}</div>
                        <div>Home Address: {profileData?.address || (isLoadingProfile ? 'Loading...' : 'Home Address')}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-background rounded-b-lg flex flex-col space-y-3 flex-shrink-0">
              {submitError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-800 whitespace-pre-line">{submitError}</p>
                </div>
              )}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-md hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitRequest}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting && (
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
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
};

export default UserSubmission;
