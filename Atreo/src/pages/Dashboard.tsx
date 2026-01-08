import { FiUsers, FiDollarSign, FiClock, FiBarChart } from 'react-icons/fi';

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-foreground">Dashboard</h2>
      
      {/* Stats Cards - Horizontal Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="flex items-start space-x-3 bg-card p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="w-8 h-8 bg-primary/20 rounded flex items-center justify-center flex-shrink-0">
            <FiUsers className="h-4 w-4 text-blue-600" />
          </div>
          <div className="flex-1">
            <div className="text-sm text-gray-500">Total Employees</div>
            <div className="text-2xl font-semibold text-foreground mt-2">156</div>
          </div>
        </div>

        <div className="flex items-start space-x-3 bg-card p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="w-8 h-8 bg-primary/20 rounded flex items-center justify-center flex-shrink-0">
            <FiDollarSign className="h-4 w-4 text-blue-600" />
          </div>
          <div className="flex-1">
            <div className="text-sm text-gray-500">Monthly Payroll</div>
            <div className="text-2xl font-semibold text-foreground mt-2">$125,430</div>
          </div>
        </div>

        <div className="flex items-start space-x-3 bg-card p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="w-8 h-8 bg-primary/20 rounded flex items-center justify-center flex-shrink-0">
            <FiClock className="h-4 w-4 text-blue-600" />
          </div>
          <div className="flex-1">
            <div className="text-sm text-gray-500">Pending Approvals</div>
            <div className="text-2xl font-semibold text-foreground mt-2">12</div>
          </div>
        </div>

        <div className="flex items-start space-x-3 bg-card p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="w-8 h-8 bg-primary/20 rounded flex items-center justify-center flex-shrink-0">
            <FiBarChart className="h-4 w-4 text-blue-600" />
          </div>
          <div className="flex-1">
            <div className="text-sm text-gray-500">Reports Generated</div>
            <div className="text-2xl font-semibold text-foreground mt-2">8</div>
          </div>
        </div>
      </div>
    </div>
  );
}
