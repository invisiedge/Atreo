import React, { useState, useEffect } from 'react';
import { FiUpload, FiFile, FiCalendar, FiDollarSign, FiTag, FiEye, FiDownload, FiTrash2, FiPlus } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/useToast';
import { logger } from '../../lib/logger';

interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  provider: string;
  billingDate: string;
  uploadDate: string;
  fileName: string;
  fileUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  category?: string;
  notes?: string;
}

export default function UserInvoices() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState({
    invoiceNumber: '',
    amount: '',
    provider: '',
    billingDate: '',
    category: '',
    notes: ''
  });

  // Mock data for development - replace with actual API calls
  useEffect(() => {
    const mockInvoices: Invoice[] = [
      {
        id: '1',
        invoiceNumber: 'INV-2024-001',
        amount: 299.99,
        provider: 'AWS',
        billingDate: '2024-01-15',
        uploadDate: '2024-01-16',
        fileName: 'aws-invoice-jan-2024.pdf',
        fileUrl: '#',
        status: 'approved',
        category: 'Cloud Services',
        notes: 'Monthly AWS subscription'
      },
      {
        id: '2',
        invoiceNumber: 'INV-2024-002',
        amount: 49.99,
        provider: 'Adobe',
        billingDate: '2024-01-20',
        uploadDate: '2024-01-21',
        fileName: 'adobe-creative-cloud.pdf',
        fileUrl: '#',
        status: 'pending',
        category: 'Software',
        notes: 'Creative Cloud subscription'
      }
    ];
    setInvoices(mockInvoices);
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
        setSelectedFile(file);
      } else {
        showToast('Please select a PDF or image file', 'error');
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      showToast('Please select a file to upload', 'error');
      return;
    }

    setUploading(true);
    try {
      // Mock upload - replace with actual API call
      const newInvoice: Invoice = {
        id: Date.now().toString(),
        invoiceNumber: uploadForm.invoiceNumber,
        amount: parseFloat(uploadForm.amount),
        provider: uploadForm.provider,
        billingDate: uploadForm.billingDate,
        uploadDate: new Date().toISOString().split('T')[0],
        fileName: selectedFile.name,
        fileUrl: '#',
        status: 'pending',
        category: uploadForm.category,
        notes: uploadForm.notes
      };

      setInvoices(prev => [newInvoice, ...prev]);
      setShowUploadModal(false);
      setSelectedFile(null);
      setUploadForm({
        invoiceNumber: '',
        amount: '',
        provider: '',
        billingDate: '',
        category: '',
        notes: ''
      });
      showToast('Invoice uploaded successfully', 'success');
    } catch (error) {
      logger.error('Failed to upload invoice:', error);
      showToast('Failed to upload invoice', 'error');
    } finally {
      setUploading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const totalAmount = invoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  const approvedAmount = invoices
    .filter(inv => inv.status === 'approved')
    .reduce((sum, invoice) => sum + invoice.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Invoice Management</h1>
          <p className="mt-1 text-muted-foreground">
            Upload and manage your invoices for admin approval
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          <FiPlus className="h-4 w-4 mr-2" />
          Upload Invoice
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card rounded-lg border p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <FiFile className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Total Invoices</p>
              <p className="text-2xl font-bold text-foreground">{invoices.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg border p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <FiDollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Approved Amount</p>
              <p className="text-2xl font-bold text-foreground">${approvedAmount.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg border p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <FiDollarSign className="h-5 w-5 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
              <p className="text-2xl font-bold text-foreground">${totalAmount.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-card rounded-lg border">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">My Invoices</h2>
          {invoices.length === 0 ? (
            <div className="text-center py-8">
              <FiFile className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No invoices uploaded yet</p>
              <button
                onClick={() => setShowUploadModal(true)}
                className="mt-2 text-primary hover:underline"
              >
                Upload your first invoice
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {invoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <FiFile className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">{invoice.invoiceNumber}</h3>
                      <p className="text-sm text-muted-foreground">
                        {invoice.provider} • ${invoice.amount.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Uploaded: {new Date(invoice.uploadDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                      {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                    </span>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => {/* View invoice */}}
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                        title="View"
                      >
                        <FiEye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {/* Download invoice */}}
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Download"
                      >
                        <FiDownload className="h-4 w-4" />
                      </button>
                      {invoice.status === 'pending' && (
                        <button
                          onClick={() => {/* Delete invoice */}}
                          className="p-2 text-red-400 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Upload Invoice</h2>

              <form onSubmit={handleUpload} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Invoice Number</label>
                  <input
                    type="text"
                    value={uploadForm.invoiceNumber}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      value={uploadForm.amount}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, amount: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Billing Date</label>
                    <input
                      type="date"
                      value={uploadForm.billingDate}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, billingDate: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Provider</label>
                  <input
                    type="text"
                    value={uploadForm.provider}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, provider: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Category</label>
                  <select
                    value={uploadForm.category}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select Category</option>
                    <option value="Software">Software</option>
                    <option value="Cloud Services">Cloud Services</option>
                    <option value="Hardware">Hardware</option>
                    <option value="Services">Services</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Notes (Optional)</label>
                  <textarea
                    value={uploadForm.notes}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Invoice File</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      onChange={handleFileSelect}
                      accept=".pdf,.png,.jpg,.jpeg"
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <FiUpload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">
                        {selectedFile ? selectedFile.name : 'Click to upload or drag and drop'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">PDF, PNG, JPG up to 10MB</p>
                    </label>
                  </div>
                </div>

                <div className="flex space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading || !selectedFile}
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {uploading ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
