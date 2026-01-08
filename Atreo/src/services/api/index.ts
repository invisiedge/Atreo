/**
 * Unified API client that wraps all domain-specific API classes
 */

import { API_BASE_URL } from '@/constants';
import { AdminApi } from './admin.api';
import { AiApi } from './ai.api';
import { AssetApi } from './asset.api';
import { AuthApi } from './auth.api';
import { CredentialsApi } from './credentials.api';
import { CustomersApi } from './customers.api';
import { DashboardApi } from './dashboard.api';
import { DomainApi } from './domain.api';
import { EmailApi } from './email.api';
import { EmployeeApi } from './employee.api';
import { InvoiceApi } from './invoice.api';
import { LogsApi } from './logs.api';
import { MessagesApi } from './messages.api';
import { OrganizationApi } from './organization.api';
import { PaymentApi } from './payment.api';
import { SubmissionApi } from './submission.api';
import { ToolApi } from './tool.api';
import { UserApi } from './user.api';

class ApiClient {
  private authApi: AuthApi;
  private userApi: UserApi;
  private employeeApi: EmployeeApi;
  private adminApi: AdminApi;
  private submissionApi: SubmissionApi;
  private toolApi: ToolApi;
  private organizationApi: OrganizationApi;
  private invoiceApi: InvoiceApi;
  private dashboardApi: DashboardApi;
  private assetApi: AssetApi;
  private credentialsApi: CredentialsApi;
  private logsApi: LogsApi;
  private messagesApi: MessagesApi;
  private customersApi: CustomersApi;
  private domainApi: DomainApi;
  private emailApi: EmailApi;
  private aiApi: AiApi;
  private paymentApi: PaymentApi;

  constructor(baseURL: string = API_BASE_URL) {
    this.authApi = new AuthApi(baseURL);
    this.userApi = new UserApi(baseURL);
    this.employeeApi = new EmployeeApi(baseURL);
    this.adminApi = new AdminApi(baseURL);
    this.submissionApi = new SubmissionApi(baseURL);
    this.toolApi = new ToolApi(baseURL);
    this.organizationApi = new OrganizationApi(baseURL);
    this.invoiceApi = new InvoiceApi(baseURL);
    this.dashboardApi = new DashboardApi(baseURL);
    this.assetApi = new AssetApi(baseURL);
    this.credentialsApi = new CredentialsApi(baseURL);
    this.logsApi = new LogsApi(baseURL);
    this.messagesApi = new MessagesApi(baseURL);
    this.customersApi = new CustomersApi(baseURL);
    this.domainApi = new DomainApi(baseURL);
    this.emailApi = new EmailApi(baseURL);
    this.aiApi = new AiApi(baseURL);
    this.paymentApi = new PaymentApi(baseURL);
  }

  // Auth
  login = (...args: Parameters<AuthApi['login']>) => this.authApi.login(...args);
  signup = (...args: Parameters<AuthApi['signup']>) => this.authApi.signup(...args);
  logout = () => this.authApi.logout();
  resetPassword = (...args: Parameters<AuthApi['resetPassword']>) => this.authApi.resetPassword(...args);
  getCurrentUser = () => this.authApi.getCurrentUser();

  // User
  getUserProfile = () => this.userApi.getUserProfile();
  updateUserProfile = (...args: Parameters<UserApi['updateUserProfile']>) => this.userApi.updateUserProfile(...args);
  getUsers = (...args: Parameters<UserApi['getUsers']>) => this.userApi.getUsers(...args);
  clearAllUsers = () => this.userApi.clearAllUsers();
  createUser = (...args: Parameters<UserApi['createUser']>) => this.userApi.createUser(...args);
  updateUserRole = (...args: Parameters<UserApi['updateUserRole']>) => this.userApi.updateUserRole(...args);
  updateUserAdminRole = (...args: Parameters<UserApi['updateUserAdminRole']>) => this.userApi.updateUserAdminRole(...args);
  updateUserStatus = (...args: Parameters<UserApi['updateUserStatus']>) => this.userApi.updateUserStatus(...args);
  updateUserPermissions = (...args: Parameters<UserApi['updateUserPermissions']>) => this.userApi.updateUserPermissions(...args);
  deleteUser = (...args: Parameters<UserApi['deleteUser']>) => this.userApi.deleteUser(...args);

  // Employees
  getEmployees = () => this.employeeApi.getEmployees();
  createEmployee = (...args: Parameters<EmployeeApi['createEmployee']>) => this.employeeApi.createEmployee(...args);
  updateEmployee = (...args: Parameters<EmployeeApi['updateEmployee']>) => this.employeeApi.updateEmployee(...args);
  deleteEmployee = (...args: Parameters<EmployeeApi['deleteEmployee']>) => this.employeeApi.deleteEmployee(...args);
  getEmployeeByEmployeeId = (...args: Parameters<EmployeeApi['getEmployeeByEmployeeId']>) =>
    this.employeeApi.getEmployeeByEmployeeId(...args);

  // Admins
  getAdmins = () => this.adminApi.getAdmins();
  createAdmin = (...args: Parameters<AdminApi['createAdmin']>) => this.adminApi.createAdmin(...args);
  updateAdmin = (...args: Parameters<AdminApi['updateAdmin']>) => this.adminApi.updateAdmin(...args);
  deleteAdmin = (...args: Parameters<AdminApi['deleteAdmin']>) => this.adminApi.deleteAdmin(...args);
  updateAdminStatus = (...args: Parameters<AdminApi['updateAdminStatus']>) => this.adminApi.updateAdminStatus(...args);

  // Dashboard
  getDashboardStats = (...args: Parameters<DashboardApi['getDashboardStats']>) =>
    this.dashboardApi.getDashboardStats(...args);
  getUserDashboardStats = () => this.dashboardApi.getUserDashboardStats();

  // Submissions
  getSubmissions = () => this.submissionApi.getSubmissions();
  createSubmission = (...args: Parameters<SubmissionApi['createSubmission']>) => this.submissionApi.createSubmission(...args);
  updateSubmissionStatus = (...args: Parameters<SubmissionApi['updateSubmissionStatus']>) =>
    this.submissionApi.updateSubmissionStatus(...args);
  getMySubmissions = () => this.submissionApi.getMySubmissions();

  // Tools
  getTools = () => this.toolApi.getTools();
  getToolById = (...args: Parameters<ToolApi['getToolById']>) => this.toolApi.getToolById(...args);
  createTool = (...args: Parameters<ToolApi['createTool']>) => this.toolApi.createTool(...args);
  updateTool = (...args: Parameters<ToolApi['updateTool']>) => this.toolApi.updateTool(...args);
  deleteTool = (...args: Parameters<ToolApi['deleteTool']>) => this.toolApi.deleteTool(...args);
  importToolsExcel = (...args: Parameters<ToolApi['importExcel']>) => this.toolApi.importExcel(...args);
  getUsersForSharing = (...args: Parameters<ToolApi['getUsersForSharing']>) => this.toolApi.getUsersForSharing(...args);
  shareTool = (...args: Parameters<ToolApi['shareTool']>) => this.toolApi.shareTool(...args);
  deleteAllTools = () => this.toolApi.deleteAllTools();

  // Organizations
  getOrganizations = () => this.organizationApi.getOrganizations();
  getOrganizationDetails = (...args: Parameters<OrganizationApi['getOrganizationDetails']>) =>
    this.organizationApi.getOrganizationDetails(...args);
  getOrganizationById = (...args: Parameters<OrganizationApi['getOrganizationById']>) =>
    this.organizationApi.getOrganizationById(...args);
  createOrganization = (...args: Parameters<OrganizationApi['createOrganization']>) =>
    this.organizationApi.createOrganization(...args);
  updateOrganization = (...args: Parameters<OrganizationApi['updateOrganization']>) =>
    this.organizationApi.updateOrganization(...args);
  deleteOrganization = (...args: Parameters<OrganizationApi['deleteOrganization']>) =>
    this.organizationApi.deleteOrganization(...args);
  addUserToOrganization = (...args: Parameters<OrganizationApi['addUserToOrganization']>) =>
    this.organizationApi.addUserToOrganization(...args);
  removeUserFromOrganization = (...args: Parameters<OrganizationApi['removeUserFromOrganization']>) =>
    this.organizationApi.removeUserFromOrganization(...args);
  addToolToOrganization = (...args: Parameters<OrganizationApi['addToolToOrganization']>) =>
    this.organizationApi.addToolToOrganization(...args);
  removeToolFromOrganization = (...args: Parameters<OrganizationApi['removeToolFromOrganization']>) =>
    this.organizationApi.removeToolFromOrganization(...args);

  // Invoices
  getInvoices = (...args: Parameters<InvoiceApi['getInvoices']>) => this.invoiceApi.getInvoices(...args);
  parseInvoice = (...args: Parameters<InvoiceApi['parseInvoice']>) => this.invoiceApi.parseInvoice(...args);
  createInvoice = (...args: Parameters<InvoiceApi['createInvoice']>) => this.invoiceApi.createInvoice(...args);
  updateInvoice = (...args: Parameters<InvoiceApi['updateInvoice']>) => this.invoiceApi.updateInvoice(...args);
  deleteInvoice = (...args: Parameters<InvoiceApi['deleteInvoice']>) => this.invoiceApi.deleteInvoice(...args);
  approveInvoice = (...args: Parameters<InvoiceApi['approveInvoice']>) => this.invoiceApi.approveInvoice(...args);
  rejectInvoice = (...args: Parameters<InvoiceApi['rejectInvoice']>) => this.invoiceApi.rejectInvoice(...args);
  getInvoiceDownloadUrl = (...args: Parameters<InvoiceApi['getInvoiceDownloadUrl']>) =>
    this.invoiceApi.getInvoiceDownloadUrl(...args);
  getInvoicesSummary = () => this.invoiceApi.getInvoicesSummary();
    importExcel = (...args: Parameters<InvoiceApi['importExcel']>) => this.invoiceApi.importExcel(...args);
    clearAllInvoices = () => this.invoiceApi.clearAllInvoices();
  
    // Assets
  getAssets = (...args: Parameters<AssetApi['getAssets']>) => this.assetApi.getAssets(...args);
  getAsset = (...args: Parameters<AssetApi['getAsset']>) => this.assetApi.getAsset(...args);
  createFolder = (...args: Parameters<AssetApi['createFolder']>) => this.assetApi.createFolder(...args);
  uploadFile = (...args: Parameters<AssetApi['uploadFile']>) => this.assetApi.uploadFile(...args);
  updateAsset = (...args: Parameters<AssetApi['updateAsset']>) => this.assetApi.updateAsset(...args);
  deleteAsset = (...args: Parameters<AssetApi['deleteAsset']>) => this.assetApi.deleteAsset(...args);
  getFolderPath = (...args: Parameters<AssetApi['getFolderPath']>) => this.assetApi.getFolderPath(...args);

  // Credentials
  getCredentials = (...args: Parameters<CredentialsApi['getCredentials']>) => this.credentialsApi.getCredentials(...args);
  getCredential = (...args: Parameters<CredentialsApi['getCredential']>) => this.credentialsApi.getCredential(...args);
  createCredential = (...args: Parameters<CredentialsApi['createCredential']>) => this.credentialsApi.createCredential(...args);
  updateCredential = (...args: Parameters<CredentialsApi['updateCredential']>) => this.credentialsApi.updateCredential(...args);
  deleteCredential = (...args: Parameters<CredentialsApi['deleteCredential']>) => this.credentialsApi.deleteCredential(...args);

  // Logs
  getLogs = (...args: Parameters<LogsApi['getLogs']>) => this.logsApi.getLogs(...args);
  getLog = (...args: Parameters<LogsApi['getLog']>) => this.logsApi.getLog(...args);
  getLogStats = (...args: Parameters<LogsApi['getLogStats']>) => this.logsApi.getLogStats(...args);
  cleanupLogs = (...args: Parameters<LogsApi['cleanupLogs']>) => this.logsApi.cleanupLogs(...args);

  // Messages
  getMessages = (...args: Parameters<MessagesApi['getMessages']>) => this.messagesApi.getMessages(...args);
  getSentMessages = (...args: Parameters<MessagesApi['getSentMessages']>) => this.messagesApi.getSentMessages(...args);
  getMessage = (...args: Parameters<MessagesApi['getMessage']>) => this.messagesApi.getMessage(...args);
  sendMessage = (...args: Parameters<MessagesApi['sendMessage']>) => this.messagesApi.sendMessage(...args);
  markMessageAsRead = (...args: Parameters<MessagesApi['markAsRead']>) => this.messagesApi.markAsRead(...args);
  deleteMessage = (...args: Parameters<MessagesApi['deleteMessage']>) => this.messagesApi.deleteMessage(...args);
  getMessageStats = (...args: Parameters<MessagesApi['getMessageStats']>) => this.messagesApi.getMessageStats(...args);

  // Customers
  getCustomers = (...args: Parameters<CustomersApi['getCustomers']>) => this.customersApi.getCustomers(...args);
  getCustomer = (...args: Parameters<CustomersApi['getCustomer']>) => this.customersApi.getCustomer(...args);
  createCustomer = (...args: Parameters<CustomersApi['createCustomer']>) => this.customersApi.createCustomer(...args);
  updateCustomer = (...args: Parameters<CustomersApi['updateCustomer']>) => this.customersApi.updateCustomer(...args);
  deleteCustomer = (...args: Parameters<CustomersApi['deleteCustomer']>) => this.customersApi.deleteCustomer(...args);
  getCustomerStats = (...args: Parameters<CustomersApi['getCustomerStats']>) => this.customersApi.getCustomerStats(...args);

  // Domains
  getDomains = (...args: Parameters<DomainApi['getDomains']>) => this.domainApi.getDomains(...args);
  createDomain = (...args: Parameters<DomainApi['createDomain']>) => this.domainApi.createDomain(...args);
  updateDomain = (...args: Parameters<DomainApi['updateDomain']>) => this.domainApi.updateDomain(...args);
  deleteDomain = (...args: Parameters<DomainApi['deleteDomain']>) => this.domainApi.deleteDomain(...args);

  // Emails
  getEmails = (...args: Parameters<EmailApi['getEmails']>) => this.emailApi.getEmails(...args);
  createEmail = (...args: Parameters<EmailApi['createEmail']>) => this.emailApi.createEmail(...args);
  updateEmail = (...args: Parameters<EmailApi['updateEmail']>) => this.emailApi.updateEmail(...args);
  deleteEmail = (...args: Parameters<EmailApi['deleteEmail']>) => this.emailApi.deleteEmail(...args);

  // AI
  askAI = async (question: string): Promise<string> => {
    const result = await this.aiApi.ask(question);
    // BaseApi.post returns { data: { answer: string } }
    return result.answer;
  };

    // Payments
    getPayments = () => this.paymentApi.getPayments();
    createPayment = (...args: Parameters<PaymentApi['createPayment']>) => this.paymentApi.createPayment(...args);
    importPaymentsExcel = (...args: Parameters<PaymentApi['importExcel']>) => this.paymentApi.importExcel(...args);
    clearAllPayments = () => this.paymentApi.clearAllPayments();
  }

export const apiClient = new ApiClient(API_BASE_URL);

export { API_BASE_URL } from '@/constants';
export const config = {
  apiBaseUrl: API_BASE_URL,
  isDevelopment:
    API_BASE_URL.includes('localhost') ||
    API_BASE_URL.includes('127.0.0.1') ||
    API_BASE_URL.startsWith('http://localhost') ||
    import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
};

// Re-export common types for convenience
export type {
  Admin,
  CreateAdminRequest,
  UpdateAdminRequest,
  Asset,
  CreateFolderRequest,
  UpdateAssetRequest,
  FolderPathItem,
  CreateEmployeeRequest,
  Employee,
  DashboardStats,
  UserDashboardStats,
  Invoice,
  CreateInvoiceRequest,
  UpdateInvoiceRequest,
  InvoiceSummary,
  Organization,
  OrganizationDetails,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  Submission,
  CreateSubmissionRequest,
  Tool,
  UserProfile,
  UpdateUserProfileRequest,
  User,
  LoginRequest,
  LoginResponse,
  SignupRequest,
  SignupResponse,
} from '@/types';
