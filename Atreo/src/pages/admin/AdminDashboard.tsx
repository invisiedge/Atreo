// @ts-nocheck
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
    FiDollarSign, 
    FiChevronDown, 
    FiRefreshCw,
    FiTool,
    FiTrendingUp,
    FiTrendingDown,
    FiGrid,
    FiFileText,
    FiUsers,
    FiActivity,
    FiClock, 
    FiHeart,
    FiFolder,
    FiGlobe,
    FiPieChart,
    FiBarChart
  } from 'react-icons/fi';
import { DashboardService, type DashboardStats } from '../../services/dashboardService';
import { logger } from '../../lib/logger';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';

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
  Filler,
  ChartDataLabels
);

// Chart colors using CSS variables for dark mode support
const getChartColors = () => {
  return [
    'hsl(221.2 83.2% 53.3%)',
    'hsl(142.1 76.2% 36.3%)',
    'hsl(262.1 83.3% 57.8%)',
    'hsl(346.8 77.2% 49.8%)',
    'hsl(45.4 93.4% 47.5%)',
    'hsl(189 85% 52%)',
    'hsl(324 86% 60%)',
    'hsl(168 76% 42%)'
  ];
};

// Get theme-aware grid and border colors
const getGridColor = () => {
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  return isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
};

const CHART_COLORS = getChartColors();

// Enhanced Chart.js default options with animations and better styling
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: {
    duration: 1500,
    easing: 'easeInOutQuart' as const,
    delay: (context: { type: string; mode: string; dataIndex: number }) => {
      let delay = 0;
      if (context.type === 'data' && context.mode === 'default') {
        delay = context.dataIndex * 50;
      }
      return delay;
    }
  },
  interaction: {
    intersect: false,
    mode: 'index' as const,
  },
  plugins: {
    datalabels: {
      display: false
    },
    legend: {
      display: true,
      position: 'top' as const,
      labels: {
        usePointStyle: true,
        padding: 20,
        font: {
          size: 13,
          weight: 'bold' as const,
          family: 'Inter, sans-serif'
        },
        color: 'currentColor',
        boxWidth: 12,
        boxHeight: 12
      }
    },
    tooltip: {
      enabled: true,
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      titleColor: '#111827',
      bodyColor: '#374151',
      borderColor: '#e5e7eb',
      borderWidth: 1,
      padding: 16,
      cornerRadius: 12,
      displayColors: true,
      boxPadding: 8,
      titleFont: {
        size: 14,
        weight: 'bold' as const,
        family: 'Inter, sans-serif'
      },
      bodyFont: {
        size: 13,
        weight: 500,
        family: 'Inter, sans-serif'
      }
    }
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
      ticks: {
        font: {
          size: 12,
          family: 'Inter, sans-serif'
        },
        padding: 10
      }
    },
    y: {
      grid: {
        color: getGridColor(),
        drawBorder: false,
      },
      ticks: {
        font: {
          size: 12,
          family: 'Inter, sans-serif'
        },
        padding: 10
      }
    }
  }
};

type TimeFrame = '1month' | '3months' | '6months' | '1year';

  export default function AdminDashboard() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [timeFrame, setTimeFrame] = useState<TimeFrame>('6months');
    const [showTimeFrameDropdown, setShowTimeFrameDropdown] = useState(false);
    const timeFrameDropdownRef = useRef<HTMLDivElement>(null);
    
    // Individual graph timeframes
    const [toolsAnalysisTimeFrame] = useState<TimeFrame>('6months');
    const toolsAnalysisDropdownRef = useRef<HTMLDivElement>(null);
  
    // Close dropdowns when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (timeFrameDropdownRef.current && !timeFrameDropdownRef.current.contains(event.target as Node)) {
          setShowTimeFrameDropdown(false);
        }
      };
  
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
  
    const fetchStats = useCallback(async (showLoading = true) => {
      try {
        if (showLoading) setLoading(true);
        setIsRefreshing(true);
  
        const dashboardStats = await DashboardService.getAdminStats(timeFrame);
        
        const safeStats: DashboardStats = {
          ...dashboardStats,
          monthlyToolsData: dashboardStats.monthlyToolsData || [],
          monthlySpendData: dashboardStats.monthlySpendData || [],
          categoryData: dashboardStats.categoryData || [],
          invoiceStatusData: dashboardStats.invoiceStatusData || [],
          roleDistributionData: dashboardStats.roleDistributionData || [],
          hoursUtilizationData: dashboardStats.hoursUtilizationData || [],
          toolStatusData: dashboardStats.toolStatusData || [],
          billingPeriodData: dashboardStats.billingPeriodData || [],
          assetsByType: dashboardStats.assetsByType || [],
          domainsByStatus: dashboardStats.domainsByStatus || [],
          spendByOrganization: dashboardStats.spendByOrganization || []
        };
  
        setStats(safeStats);
        setLastUpdated(new Date());
      } catch (error) {
        logger.error('Failed to fetch dashboard stats:', error);
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    }, [timeFrame]);
  
    useEffect(() => {
      fetchStats();
    }, [fetchStats, timeFrame]);
  
    // Helper functions
    const calculateGrowth = (data: { month: string; [key: string]: any }[], valueKey: string) => {
      if (!data || data.length < 2) return '0%';
      const recent = data.slice(-2);
      const current = (recent[1][valueKey] as number) || 0;
      const previous = (recent[0][valueKey] as number) || 0;
      if (previous === 0) return current > 0 ? '+100%' : '0%';
      const growth = ((current - previous) / previous) * 100;
      return `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`;
    };
  
    const toolsGrowth = useMemo(() => calculateGrowth(stats?.monthlyToolsData || [], 'tools'), [stats?.monthlyToolsData]);
    const spendGrowth = useMemo(() => calculateGrowth(stats?.monthlySpendData || [], 'spend'), [stats?.monthlySpendData]);
  
    const filterDataByTimeFrame = (data: any[], tf: TimeFrame) => {
      const monthsMap = { '1month': 1, '3months': 3, '6months': 6, '1year': 12 };
      return data.slice(-monthsMap[tf]);
    };

  const createGradient = (ctx: CanvasRenderingContext2D, color1: string, color2: string) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, color1);
    gradient.addColorStop(1, color2);
    return gradient;
  };

  if (loading) {
    return (
      <div className="p-8 space-y-8 animate-in fade-in duration-500">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-[500px] w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700">
      {/* Hero Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Dashboard
          </h1>
          <p className="mt-2 text-lg text-muted-foreground flex items-center gap-2">
            <FiActivity className="text-primary animate-pulse" />
            Live overview of your digital infrastructure
            {lastUpdated && (
              <span className="text-xs font-medium px-2 py-1 bg-accent rounded-full ml-2">
                Last synced: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            onClick={() => fetchStats(false)}
            disabled={isRefreshing}
            variant="outline"
            className="rounded-xl px-6 hover:bg-accent/50 transition-all active:scale-95"
          >
            <FiRefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Sync Data
          </Button>
          
          <div className="relative" ref={timeFrameDropdownRef}>
            <Button
              onClick={() => setShowTimeFrameDropdown(!showTimeFrameDropdown)}
              variant="secondary"
              className="rounded-xl border border-border px-6 hover:shadow-md transition-all active:scale-95"
            >
              Timeframe: {timeFrame.replace(/(\d+)/, '$1 ')}
              <FiChevronDown className={`ml-2 h-4 w-4 transition-transform ${showTimeFrameDropdown ? 'rotate-180' : ''}`} />
            </Button>
            {showTimeFrameDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden animate-in zoom-in-95 duration-200">
                {['1month', '3months', '6months', '1year'].map((tf) => (
                  <button
                    key={tf}
                    onClick={() => { setTimeFrame(tf as TimeFrame); setShowTimeFrameDropdown(false); }}
                    className={`w-full text-left px-5 py-3 text-sm hover:bg-accent transition-colors ${timeFrame === tf ? 'bg-primary/10 text-primary font-bold' : 'text-foreground'}`}
                  >
                    {tf.replace(/(\d+)/, '$1 ')}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-6 max-w-4xl bg-muted/50 p-1.5 rounded-2xl mb-8">
          <TabsTrigger value="overview" className="rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-lg py-2.5">
            <FiGrid className="mr-2" /> Overview
          </TabsTrigger>
          <TabsTrigger value="tools" className="rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-lg py-2.5">
            <FiTool className="mr-2" /> Tools
          </TabsTrigger>
          <TabsTrigger value="invoices" className="rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-lg py-2.5">
            <FiFileText className="mr-2" /> Invoices
          </TabsTrigger>
          <TabsTrigger value="resources" className="rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-lg py-2.5">
            <FiUsers className="mr-2" /> People
          </TabsTrigger>
          <TabsTrigger value="assets" className="rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-lg py-2.5">
            <FiFolder className="mr-2" /> Assets
          </TabsTrigger>
          <TabsTrigger value="domains" className="rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-lg py-2.5">
            <FiGlobe className="mr-2" /> Domains
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          {/* Executive Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <SummaryCard 
              title="Global Tools" 
              value={stats?.totalTools || 0} 
              subtitle={`${stats?.activeTools || 0} actively deployed`}
              icon={<FiTool className="text-white" />}
              color="from-blue-600 to-indigo-600"
              growth={toolsGrowth}
            />
            <SummaryCard 
              title="Monthly Burn" 
              value={`$${(stats?.monthlyToolsSpend || 0).toLocaleString()}`} 
              subtitle="Current operational spend"
              icon={<FiDollarSign className="text-white" />}
              color="from-emerald-500 to-teal-600"
              growth={spendGrowth}
            />
            <SummaryCard 
              title="Total Invoices" 
              value={stats?.totalInvoices || 0} 
              subtitle="Across all providers"
              icon={<FiFileText className="text-white" />}
              color="from-orange-500 to-rose-600"
              growth="+5.2%"
            />
            <SummaryCard 
              title="Headcount" 
              value={stats?.totalEmployees || 0} 
              subtitle="Active staff & contractors"
              icon={<FiUsers className="text-white" />}
              color="from-purple-500 to-pink-600"
              growth="+2.1%"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Expenditure Trend */}
            <Card className="lg:col-span-2 rounded-3xl border-border shadow-xl overflow-hidden hover:shadow-2xl transition-shadow duration-300">
              <CardHeader className="flex flex-row items-center justify-between pb-8">
                <div>
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <FiTrendingUp className="text-emerald-500" /> Financial Trajectory
                  </CardTitle>
                  <CardDescription>Monthly spend analysis across the organization</CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 rounded-full">
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                    <span className="text-xs font-bold text-emerald-600 uppercase tracking-tighter">Expenditure</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="h-[400px]">
                <Line
                  data={{
                    labels: filterDataByTimeFrame(stats?.monthlySpendData || [], timeFrame).map(d => d.month),
                    datasets: [{
                      label: 'Spend',
                      data: filterDataByTimeFrame(stats?.monthlySpendData || [], timeFrame).map(d => d.spend),
                      borderColor: '#10B981',
                      borderWidth: 4,
                      pointBackgroundColor: '#10B981',
                      pointBorderWidth: 2,
                      pointBorderColor: '#fff',
                      pointRadius: 6,
                      pointHoverRadius: 8,
                      fill: true,
                      backgroundColor: (context) => {
                        const ctx = context.chart.ctx;
                        const gradient = ctx.createLinearGradient(0, 0, 0, 350);
                        gradient.addColorStop(0, 'rgba(16, 185, 129, 0.2)');
                        gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');
                        return gradient;
                      },
                      tension: 0.4
                    }]
                  }}
                  options={{
                    ...chartOptions,
                    plugins: {
                      ...chartOptions.plugins,
                      legend: { display: false }
                    }
                  }}
                />
              </CardContent>
            </Card>

              {/* Stack Composition */}
              <Card className="rounded-3xl border-border shadow-xl hover:shadow-2xl transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <FiPieChart className="text-primary" /> Stack Composition
                  </CardTitle>
                  <CardDescription>Tool distribution by category</CardDescription>
                </CardHeader>
                <CardContent className="h-[400px]">
                  <Pie
                    data={{
                      labels: stats?.categoryData.map(d => d.name),
                      datasets: [{
                        data: stats?.categoryData.map(d => d.value),
                        backgroundColor: CHART_COLORS,
                        borderWidth: 0,
                        hoverOffset: 15
                      }]
                    }}
                    options={{
                      ...chartOptions,
                      plugins: {
                        ...chartOptions.plugins,
                        legend: { position: 'bottom', labels: { padding: 25, usePointStyle: true } }
                      }
                    }}
                  />
                </CardContent>
              </Card>
          </div>

          {/* Additional Graphs Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Invoice Status Distribution */}
            <Card className="rounded-3xl border-border shadow-xl hover:shadow-2xl transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <FiFileText className="text-orange-500" /> Invoice Status
                </CardTitle>
                <CardDescription>Distribution of invoice statuses</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                <Doughnut
                  data={{
                    labels: stats?.invoiceStatusData?.map(d => d.name) || [],
                    datasets: [{
                      data: stats?.invoiceStatusData?.map(d => d.value) || [],
                      backgroundColor: ['#10B981', '#F59E0B', '#EF4444', '#6B7280'],
                      borderWidth: 0,
                      cutout: '60%'
                    }]
                  }}
                  options={{
                    ...chartOptions,
                    plugins: {
                      ...chartOptions.plugins,
                      legend: { position: 'bottom', labels: { padding: 20, usePointStyle: true } }
                    }
                  }}
                />
              </CardContent>
            </Card>

            {/* Billing Period Distribution */}
            <Card className="rounded-3xl border-border shadow-xl hover:shadow-2xl transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <FiClock className="text-purple-500" /> Billing Cycles
                </CardTitle>
                <CardDescription>Monthly vs Yearly billing distribution</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                <Pie
                  data={{
                    labels: stats?.billingPeriodData?.map(d => d.name) || [],
                    datasets: [{
                      data: stats?.billingPeriodData?.map(d => d.value) || [],
                      backgroundColor: ['#3B82F6', '#8B5CF6'],
                      borderWidth: 0,
                      hoverOffset: 15
                    }]
                  }}
                  options={{
                    ...chartOptions,
                    plugins: {
                      ...chartOptions.plugins,
                      legend: { position: 'bottom', labels: { padding: 20, usePointStyle: true } }
                    }
                  }}
                />
              </CardContent>
            </Card>
          </div>

          {/* Combined Spend Analysis */}
          <Card className="rounded-3xl border-border shadow-xl overflow-hidden hover:shadow-2xl transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-8">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <FiTrendingUp className="text-blue-500" /> Total Spend Analysis
                </CardTitle>
                <CardDescription>Combined tools and payroll expenditure over time</CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 rounded-full">
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                  <span className="text-xs font-bold text-emerald-600 uppercase tracking-tighter">Tools</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-purple-500/10 rounded-full">
                  <div className="w-2.5 h-2.5 bg-purple-500 rounded-full" />
                  <span className="text-xs font-bold text-purple-600 uppercase tracking-tighter">Payroll</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="h-[400px]">
              <Line
                data={{
                  labels: filterDataByTimeFrame(stats?.monthlySpendData || [], timeFrame).map(d => d.month),
                  datasets: [
                    {
                      label: 'Tools Spend',
                      data: filterDataByTimeFrame(stats?.monthlySpendData || [], timeFrame).map(d => d.spend),
                      borderColor: '#10B981',
                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                      borderWidth: 3,
                      pointRadius: 5,
                      pointHoverRadius: 7,
                      fill: true,
                      tension: 0.4
                    },
                    {
                      label: 'Payroll',
                      data: filterDataByTimeFrame(stats?.employeeSpendingByMonth || [], timeFrame).map(d => d.amount),
                      borderColor: '#8B5CF6',
                      backgroundColor: 'rgba(139, 92, 246, 0.1)',
                      borderWidth: 3,
                      pointRadius: 5,
                      pointHoverRadius: 7,
                      fill: true,
                      tension: 0.4
                    }
                  ]
                }}
                options={chartOptions}
              />
            </CardContent>
          </Card>

          {/* Additional Graphs Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Spend by Organization */}
            <Card className="rounded-3xl border-border shadow-xl overflow-hidden hover:shadow-2xl transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <FiUsers className="text-indigo-500" /> Spend by Organization
                </CardTitle>
                <CardDescription>Top organizations by expenditure</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <Bar
                  data={{
                    labels: stats?.spendByOrganization?.slice(0, 8).map(d => d.name) || [],
                    datasets: [{
                      label: 'Spend ($)',
                      data: stats?.spendByOrganization?.slice(0, 8).map(d => d.value) || [],
                      backgroundColor: '#6366F1',
                      borderRadius: 8,
                      maxBarThickness: 50
                    }]
                  }}
                  options={{
                    ...chartOptions,
                    indexAxis: 'y',
                    plugins: {
                      ...chartOptions.plugins,
                      legend: { display: false }
                    }
                  }}
                />
              </CardContent>
            </Card>

            {/* Hours Utilization */}
            <Card className="rounded-3xl border-border shadow-xl overflow-hidden hover:shadow-2xl transition-shadow duration-300">
              <CardHeader className="flex flex-row items-center justify-between pb-8">
                <div>
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <FiActivity className="text-teal-500" /> Hours Utilization
                  </CardTitle>
                  <CardDescription>Contract vs Fulfilled hours</CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 rounded-full">
                    <div className="w-2.5 h-2.5 bg-blue-500 rounded-full" />
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-tighter">Contract</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-teal-500/10 rounded-full">
                    <div className="w-2.5 h-2.5 bg-teal-500 rounded-full" />
                    <span className="text-xs font-bold text-teal-600 uppercase tracking-tighter">Fulfilled</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="h-[400px]">
                <Bar
                  data={{
                    labels: filterDataByTimeFrame(stats?.hoursUtilizationData || [], timeFrame).map(d => d.month),
                    datasets: [
                      {
                        label: 'Contract Hours',
                        data: filterDataByTimeFrame(stats?.hoursUtilizationData || [], timeFrame).map(d => d.contractHours),
                        backgroundColor: '#3B82F6',
                        borderRadius: 8
                      },
                      {
                        label: 'Fulfilled Hours',
                        data: filterDataByTimeFrame(stats?.hoursUtilizationData || [], timeFrame).map(d => d.fulfilledHours),
                        backgroundColor: '#14B8A6',
                        borderRadius: 8
                      }
                    ]
                  }}
                  options={chartOptions}
                />
              </CardContent>
            </Card>
          </div>

          {/* Role Distribution & Invoice Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Role Distribution */}
            <Card className="rounded-3xl border-border shadow-xl hover:shadow-2xl transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <FiUsers className="text-pink-500" /> Spend by Role
                </CardTitle>
                <CardDescription>Payroll distribution across roles</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                <Doughnut
                  data={{
                    labels: stats?.roleDistributionData?.map(d => d.name) || [],
                    datasets: [{
                      data: stats?.roleDistributionData?.map(d => d.value) || [],
                      backgroundColor: CHART_COLORS,
                      borderWidth: 0,
                      cutout: '60%'
                    }]
                  }}
                  options={{
                    ...chartOptions,
                    plugins: {
                      ...chartOptions.plugins,
                      legend: { position: 'bottom', labels: { padding: 20, usePointStyle: true } }
                    }
                  }}
                />
              </CardContent>
            </Card>

            {/* Invoice Volume vs Amount */}
            <Card className="rounded-3xl border-border shadow-xl overflow-hidden hover:shadow-2xl transition-shadow duration-300">
              <CardHeader className="flex flex-row items-center justify-between pb-8">
                <div>
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <FiBarChart className="text-amber-500" /> Invoice Trends
                  </CardTitle>
                  <CardDescription>Invoice count vs total amount</CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 rounded-full">
                    <div className="w-2.5 h-2.5 bg-amber-500 rounded-full" />
                    <span className="text-xs font-bold text-amber-600 uppercase tracking-tighter">Count</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-orange-500/10 rounded-full">
                    <div className="w-2.5 h-2.5 bg-orange-500 rounded-full" />
                    <span className="text-xs font-bold text-orange-600 uppercase tracking-tighter">Amount</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="h-[350px]">
                <Bar
                  data={{
                    labels: filterDataByTimeFrame(stats?.monthlyInvoiceTrends || [], timeFrame).map(d => d.month),
                    datasets: [
                      {
                        label: 'Invoices',
                        data: filterDataByTimeFrame(stats?.monthlyInvoiceTrends || [], timeFrame).map(d => d.invoices),
                        backgroundColor: '#F59E0B',
                        borderRadius: 8,
                        yAxisID: 'y'
                      },
                      {
                        label: 'Amount ($)',
                        data: filterDataByTimeFrame(stats?.monthlyInvoiceTrends || [], timeFrame).map(d => d.amount),
                        backgroundColor: '#F97316',
                        borderRadius: 8,
                        yAxisID: 'y1'
                      }
                    ]
                  }}
                  options={{
                    ...chartOptions,
                    scales: {
                      ...chartOptions.scales,
                      y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: { display: true, text: 'Invoice Count' }
                      },
                      y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: { display: true, text: 'Amount ($)' },
                        grid: { drawOnChartArea: false }
                      }
                    }
                  }}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tools" className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             <Card className="rounded-3xl border-border shadow-xl overflow-hidden hover:shadow-2xl transition-shadow duration-300">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-bold">Growth Intelligence</CardTitle>
                  <CardDescription>Velocity of new tool adoption</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="h-[400px]">
                <Bar
                  data={{
                    labels: filterDataByTimeFrame(stats?.monthlyToolsData || [], toolsAnalysisTimeFrame).map(d => d.month),
                    datasets: [{
                      label: 'Tools Added',
                      data: filterDataByTimeFrame(stats?.monthlyToolsData || [], toolsAnalysisTimeFrame).map(d => d.tools),
                      backgroundColor: '#3B82F6',
                      borderRadius: 12,
                      maxBarThickness: 45
                    }]
                  }}
                  options={chartOptions}
                />
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-border shadow-xl overflow-hidden hover:shadow-2xl transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="text-xl font-bold">Top Investments</CardTitle>
                <CardDescription>Tools by monthly resource allocation</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <Bar
                  data={{
                    labels: stats?.topToolsData?.slice(0, 6).map(d => d.name),
                    datasets: [{
                      label: 'Spend ($)',
                      data: stats?.topToolsData?.slice(0, 6).map(d => d.monthlySpend),
                      backgroundColor: CHART_COLORS[1],
                      borderRadius: 12,
                    }]
                  }}
                  options={{
                    ...chartOptions,
                    indexAxis: 'y'
                  }}
                />
              </CardContent>
            </Card>

            {/* Tool Health Distribution */}
            <Card className="rounded-3xl border-border shadow-xl hover:shadow-2xl transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <FiHeart className="text-rose-500" /> Tool Health
                </CardTitle>
                <CardDescription>Active vs Inactive tool deployment</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <Doughnut
                  data={{
                    labels: stats?.toolStatusData.map(d => d.name),
                    datasets: [{
                      data: stats?.toolStatusData.map(d => d.value),
                      backgroundColor: [CHART_COLORS[1], CHART_COLORS[3], CHART_COLORS[4]],
                      borderWidth: 0,
                      cutout: '70%'
                    }]
                  }}
                  options={{
                    ...chartOptions,
                    plugins: {
                      ...chartOptions.plugins,
                      legend: { position: 'bottom', labels: { padding: 25, usePointStyle: true } }
                    }
                  }}
                />
              </CardContent>
            </Card>

            {/* Billing Period Distribution */}
            <Card className="rounded-3xl border-border shadow-xl hover:shadow-2xl transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <FiRefreshCw className="text-blue-500" /> Billing Cycles
                </CardTitle>
                <CardDescription>Tool distribution by payment frequency</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <Pie
                  data={{
                    labels: stats?.billingPeriodData.map(d => d.name),
                    datasets: [{
                      data: stats?.billingPeriodData.map(d => d.value),
                      backgroundColor: [CHART_COLORS[0], CHART_COLORS[2], CHART_COLORS[5]],
                      borderWidth: 0,
                      hoverOffset: 15
                    }]
                  }}
                  options={{
                    ...chartOptions,
                    plugins: {
                      ...chartOptions.plugins,
                      legend: { position: 'bottom', labels: { padding: 25, usePointStyle: true } }
                    }
                  }}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="rounded-3xl border-border shadow-xl hover:shadow-2xl transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="text-xl font-bold">Approval Flow</CardTitle>
                <CardDescription>Current state of invoice pipeline</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <Pie
                  data={{
                    labels: stats?.invoiceStatusData?.map(d => d.name),
                    datasets: [{
                      data: stats?.invoiceStatusData?.map(d => d.value),
                      backgroundColor: [CHART_COLORS[1], CHART_COLORS[4], CHART_COLORS[3]],
                      borderWidth: 0,
                    }]
                  }}
                  options={{
                    ...chartOptions,
                    plugins: {
                      ...chartOptions.plugins,
                      legend: { position: 'bottom', labels: { padding: 25, usePointStyle: true } }
                    }
                  }}
                />
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-border shadow-xl hover:shadow-2xl transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="text-xl font-bold">Organization Spend</CardTitle>
                <CardDescription>Expenditure distribution across entities</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <Doughnut
                  data={{
                    labels: stats?.spendByOrganization?.map(d => d.name),
                    datasets: [{
                      data: stats?.spendByOrganization?.map(d => d.value),
                      backgroundColor: CHART_COLORS,
                      borderWidth: 0,
                      cutout: '70%'
                    }]
                  }}
                  options={{
                    ...chartOptions,
                    plugins: {
                      ...chartOptions.plugins,
                      legend: { position: 'bottom', labels: { padding: 25, usePointStyle: true } }
                    }
                  }}
                />
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 rounded-3xl border-border shadow-xl overflow-hidden hover:shadow-2xl transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="text-xl font-bold">Volume Analysis</CardTitle>
                <CardDescription>Invoices processed vs total amount</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <Bar
                  data={{
                    labels: stats?.monthlyInvoiceTrends?.slice(-6).map(d => d.month),
                    datasets: [{
                      label: 'Invoices',
                      data: stats?.monthlyInvoiceTrends?.slice(-6).map(d => d.invoices),
                      backgroundColor: '#F59E0B',
                      borderRadius: 8
                    }]
                  }}
                  options={chartOptions}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="assets" className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="rounded-3xl border-border shadow-xl hover:shadow-2xl transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <FiFolder className="text-blue-500" /> Asset Distribution
                </CardTitle>
                <CardDescription>Company assets categorized by type</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <Pie
                  data={{
                    labels: stats?.assetsByType?.map(d => d.name),
                    datasets: [{
                      data: stats?.assetsByType?.map(d => d.value),
                      backgroundColor: [CHART_COLORS[0], CHART_COLORS[1], CHART_COLORS[2]],
                      borderWidth: 0,
                    }]
                  }}
                  options={{
                    ...chartOptions,
                    plugins: {
                      ...chartOptions.plugins,
                      legend: { position: 'bottom', labels: { padding: 25, usePointStyle: true } }
                    }
                  }}
                />
              </CardContent>
            </Card>

            <SummaryCard 
              title="Digital Assets" 
              value={stats?.totalAssets || 0} 
              subtitle={`${stats?.activeAssets || 0} active files & folders`}
              icon={<FiFolder className="text-white" />}
              color="from-indigo-500 to-blue-600"
              growth="+12.5%"
            />
          </div>
        </TabsContent>

        <TabsContent value="domains" className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="rounded-3xl border-border shadow-xl hover:shadow-2xl transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <FiGlobe className="text-emerald-500" /> Domain Registry
                </CardTitle>
                <CardDescription>Status distribution of corporate domains</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <Doughnut
                  data={{
                    labels: stats?.domainsByStatus?.map(d => d.name),
                    datasets: [{
                      data: stats?.domainsByStatus?.map(d => d.value),
                      backgroundColor: [CHART_COLORS[1], CHART_COLORS[4], CHART_COLORS[3]],
                      borderWidth: 0,
                      cutout: '70%'
                    }]
                  }}
                  options={{
                    ...chartOptions,
                    plugins: {
                      ...chartOptions.plugins,
                      legend: { position: 'bottom', labels: { padding: 25, usePointStyle: true } }
                    }
                  }}
                />
              </CardContent>
            </Card>

            <SummaryCard 
              title="Registered Domains" 
              value={stats?.totalDomains || 0} 
              subtitle={`${stats?.activeDomains || 0} domains resolving`}
              icon={<FiGlobe className="text-white" />}
              color="from-emerald-600 to-green-700"
              growth="+3.4%"
            />
          </div>
        </TabsContent>

          <TabsContent value="resources" className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            {/* Resources Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <SummaryCard 
                title="Total Payroll" 
                value={`$${(stats?.totalPayments || 0).toLocaleString()}`} 
                subtitle={`For selected ${timeFrame.replace(/(\d+)/, '$1 ')}`}
                icon={<FiDollarSign className="text-white" />}
                color="from-purple-600 to-indigo-700"
                growth="+4.2%"
              />
              <SummaryCard 
                title="Staff Count" 
                value={stats?.totalEmployees || 0} 
                subtitle="Active personnel"
                icon={<FiUsers className="text-white" />}
                color="from-blue-500 to-cyan-600"
                growth="+1.5%"
              />
              <SummaryCard 
                title="Avg. Fulfillment" 
                value={`${stats?.hoursUtilizationData?.length ? Math.round(stats.hoursUtilizationData.reduce((acc, d) => acc + (d.contractHours > 0 ? (d.fulfilledHours / d.contractHours) * 100 : 0), 0) / stats.hoursUtilizationData.length) : 0}%`}
                subtitle="Hours target achievement"
                icon={<FiClock className="text-white" />}
                color="from-emerald-500 to-green-600"
                growth="+0.8%"
              />
              <SummaryCard 
                title="Contract Capacity" 
                value={Math.round(stats?.hoursUtilizationData?.reduce((acc, d) => acc + d.contractHours, 0) || 0).toLocaleString()}
                subtitle="Total monthly hours"
                icon={<FiActivity className="text-white" />}
                color="from-orange-500 to-rose-600"
                growth="-2.1%"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="lg:col-span-2 rounded-3xl border-border shadow-xl overflow-hidden hover:shadow-2xl transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="text-xl font-bold">Human Capital Investment</CardTitle>
                  <CardDescription>Monthly payroll and contractor disbursements</CardDescription>
                </CardHeader>
                <CardContent className="h-[450px]">
                  <Bar
                    data={{
                      labels: stats?.employeeSpendingByMonth?.map(d => d.month),
                      datasets: [{
                        label: 'Disbursement Amount',
                        data: stats?.employeeSpendingByMonth?.map(d => d.amount),
                        backgroundColor: (context) => {
                          const ctx = context.chart.ctx;
                          const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                          gradient.addColorStop(0, '#8B5CF6');
                          gradient.addColorStop(1, '#6366F1');
                          return gradient;
                        },
                        borderRadius: 15,
                        maxBarThickness: 60
                      }]
                    }}
                    options={chartOptions}
                  />
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-border shadow-xl overflow-hidden hover:shadow-2xl transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <FiClock className="text-orange-500" /> Hours Utilization
                  </CardTitle>
                  <CardDescription>Average Contract vs Fulfilled hours</CardDescription>
                </CardHeader>
                <CardContent className="h-[400px]">
                  <Bar
                    data={{
                      labels: stats?.hoursUtilizationData?.map(d => d.month),
                      datasets: [
                        {
                          label: 'Contract',
                          data: stats?.hoursUtilizationData?.map(d => d.contractHours),
                          backgroundColor: '#3B82F6',
                          borderRadius: 8
                        },
                        {
                          label: 'Fulfilled',
                          data: stats?.hoursUtilizationData?.map(d => d.fulfilledHours),
                          backgroundColor: '#10B981',
                          borderRadius: 8
                        }
                      ]
                    }}
                    options={chartOptions}
                  />
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-border shadow-xl hover:shadow-2xl transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <FiTrendingUp className="text-emerald-500" /> Fulfillment Trend
                  </CardTitle>
                  <CardDescription>Target achievement rate percentage</CardDescription>
                </CardHeader>
                <CardContent className="h-[400px]">
                  <Line
                    data={{
                      labels: stats?.hoursUtilizationData?.map(d => d.month),
                      datasets: [{
                        label: 'Fulfillment Rate (%)',
                        data: stats?.hoursUtilizationData?.map(d => d.contractHours > 0 ? (d.fulfilledHours / d.contractHours) * 100 : 0),
                        borderColor: '#10B981',
                        borderWidth: 4,
                        pointBackgroundColor: '#10B981',
                        pointBorderColor: '#fff',
                        pointRadius: 6,
                        fill: true,
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4
                      }]
                    }}
                    options={{
                      ...chartOptions,
                      scales: {
                        ...chartOptions.scales,
                        y: {
                          ...chartOptions.scales.y,
                          max: 120,
                          min: 0,
                          ticks: {
                            callback: (val) => `${val}%`
                          }
                        }
                      }
                    }}
                  />
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-border shadow-xl hover:shadow-2xl transition-shadow duration-300 lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <FiPieChart className="text-primary" /> Spend by Role
                  </CardTitle>
                  <CardDescription>Allocation across different job functions</CardDescription>
                </CardHeader>
                <CardContent className="h-[400px]">
                  <Pie
                    data={{
                      labels: stats?.roleDistributionData?.map(d => d.name),
                      datasets: [{
                        data: stats?.roleDistributionData?.map(d => d.value),
                        backgroundColor: CHART_COLORS,
                        borderWidth: 0,
                        hoverOffset: 15
                      }]
                    }}
                    options={{
                      ...chartOptions,
                      plugins: {
                        ...chartOptions.plugins,
                        legend: { position: 'right', labels: { padding: 25, usePointStyle: true } }
                      }
                    }}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

      </Tabs>
    </div>
  );
}

function SummaryCard({ title, value, subtitle, icon, color, growth }) {
  const isPositive = growth?.startsWith('+');
  return (
    <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden group hover:-translate-y-2 transition-all duration-500">
      <CardContent className="p-0">
        <div className={`p-8 bg-gradient-to-br ${color} h-full text-white relative`}>
          <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:scale-125 transition-transform duration-700">
             <div className="p-4 bg-white/20 rounded-3xl backdrop-blur-xl">
               {icon}
             </div>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm font-bold tracking-widest uppercase opacity-80">{title}</p>
            <h3 className="text-4xl font-extrabold tracking-tight">{value}</h3>
          </div>
          
          <div className="mt-8 flex items-end justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold opacity-70">{subtitle}</p>
              <div className="flex items-center gap-1.5">
                 <div className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter bg-white/20 backdrop-blur-md`}>
                   {isPositive ? <FiTrendingUp className="w-2.5 h-2.5" /> : <FiTrendingDown className="w-2.5 h-2.5" />}
                   {growth}
                 </div>
                 <span className="text-[10px] font-bold opacity-50 uppercase tracking-widest">Growth</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
