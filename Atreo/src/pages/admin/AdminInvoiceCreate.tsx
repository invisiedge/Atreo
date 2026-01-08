import { useState, useEffect } from 'react';
import { FiArrowLeft, FiUpload, FiFileText } from 'react-icons/fi';
import { apiClient, type Organization } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../context/AuthContext';
import { logger } from '../../lib/logger';

export default function AdminInvoiceCreate() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [loading, setLoading] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [formData, setFormData] = useState({
    invoiceNumber: '',
    amount: '',
    provider: '',
    billingDate: '',
    dueDate: '',
    category: '',
    organizationId: ''
  });
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (isAdmin) {
      loadOrganizations();
    }
  }, [isAdmin]);

  const loadOrganizations = async () => {
    try {
      const data = await apiClient.getOrganizations();
      setOrganizations(data);
    } catch (error: any) {
      logger.error('Error loading organizations:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    if (selectedFile) {
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!validTypes.includes(selectedFile.type) && !selectedFile.name.toLowerCase().endsWith('.pdf')) {
        showToast('Please upload a PDF or image file', 'error');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.invoiceNumber || !formData.amount || !formData.provider || !formData.billingDate) {
        showToast('Please fill all required fields', 'error');
        setLoading(false);
        return;
      }

      const amountValue = parseFloat(formData.amount);
      if (isNaN(amountValue) || amountValue <= 0) {
        showToast('Please enter a valid amount', 'error');
        setLoading(false);
        return;
      }

      await apiClient.createInvoice({
        invoiceNumber: formData.invoiceNumber.trim(),
        amount: amountValue,
        provider: formData.provider.trim(),
        billingDate: formData.billingDate,
        dueDate: formData.dueDate || undefined,
        category: formData.category || undefined,
        organizationId: formData.organizationId || undefined,
        file: file || undefined
      });

      showToast('Invoice uploaded successfully!', 'success');
      setTimeout(() => {
        window.location.href = '#/invoices';
      }, 500);
    } catch (error: any) {
      logger.error('Error uploading invoice:', error);
      showToast(error.message || 'Failed to upload invoice', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 bg-background min-h-screen p-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => window.location.href = '#/invoices'}
          className="text-gray-600 hover:text-foreground transition-colors"
        >
          <FiArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold text-foreground">Upload New Invoice</h1>
      </div>

      <div className="bg-card shadow-sm border border-border rounded-lg p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {isAdmin && organizations.length > 0 && (
            <div>
              <label htmlFor="organizationId" className="block text-sm font-medium text-foreground mb-2">
                Organization
              </label>
              <select
                id="organizationId"
                value={formData.organizationId}
                onChange={(e) => setFormData({ ...formData, organizationId: e.target.value })}
                className="block w-full rounded-md border-border shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
              >
                <option value="">Select Organization (optional)</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} ({org.domain})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="invoiceNumber" className="block text-sm font-medium text-foreground mb-2">
              Invoice Number <span className="text-red-500">*</span>
            </label>
            <input
              id="invoiceNumber"
              type="text"
              required
              value={formData.invoiceNumber}
              onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
              className="block w-full rounded-md border-border shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
              placeholder="e.g., INV-2024-001"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-foreground mb-2">
                Amount <span className="text-red-500">*</span>
              </label>
              <input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="block w-full rounded-md border-border shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                placeholder="0.00"
              />
            </div>
            <div>
              <label htmlFor="currency" className="block text-sm font-medium text-foreground mb-2">
                Currency
              </label>
              <input
                id="currency"
                type="text"
                value="USD ($) - US Dollar"
                disabled
                className="block w-full rounded-md border-border shadow-sm bg-background text-muted-foreground cursor-not-allowed sm:text-sm px-3 py-2 border"
              />
            </div>
          </div>

          <div>
            <label htmlFor="provider" className="block text-sm font-medium text-foreground mb-2">
              Provider/Vendor <span className="text-red-500">*</span>
            </label>
            <input
              id="provider"
              type="text"
              required
              value={formData.provider}
              onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
              className="block w-full rounded-md border-border shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
              placeholder="e.g., AWS, GitHub, Stripe"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="billingDate" className="block text-sm font-medium text-foreground mb-2">
                Billing Date <span className="text-red-500">*</span>
              </label>
              <input
                id="billingDate"
                type="date"
                required
                value={formData.billingDate}
                onChange={(e) => setFormData({ ...formData, billingDate: e.target.value })}
                className="block w-full rounded-md border-border shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
              />
            </div>
            <div>
              <label htmlFor="dueDate" className="block text-sm font-medium text-foreground mb-2">
                Due Date (Optional)
              </label>
              <input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="block w-full rounded-md border-border shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
              />
            </div>
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-foreground mb-2">
              Category (Optional)
            </label>
            <input
              id="category"
              type="text"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="block w-full rounded-md border-border shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
              placeholder="e.g., Cloud Services, Software Licenses"
            />
          </div>

          <div>
            <label htmlFor="file" className="block text-sm font-medium text-foreground mb-2">
              Invoice File (Optional)
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-border border-dashed rounded-md hover:border-blue-400 transition-colors">
              <div className="space-y-1 text-center">
                {file ? (
                  <>
                    <FiFileText className="mx-auto h-12 w-12 text-blue-600" />
                    <p className="text-sm text-foreground mt-2">{file.name}</p>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="text-sm text-destructive hover:text-red-700"
                    >
                      Remove file
                    </button>
                  </>
                ) : (
                  <>
                    <FiUpload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label
                        htmlFor="file"
                        className="relative cursor-pointer bg-card rounded-md font-medium text-primary hover:text-blue-500"
                      >
                        <span>Upload a file</span>
                        <input
                          id="file"
                          name="file"
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg"
                          className="sr-only"
                          onChange={handleFileChange}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">PDF, PNG, JPG up to 10MB</p>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={() => window.location.href = '#/invoices'}
              className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-md hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Uploading...' : 'Upload Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

