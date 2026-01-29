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
    FiBarChart,
    FiDownload,
    FiMaximize2,
    FiMinimize2,
    FiFilter
  } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
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
import zoomPlugin from 'chartjs-plugin-zoom';
import annotationPlugin from 'chartjs-plugin-annotation';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';
import { CHART_COLORS as THEME_COLORS, CHART_ANIMATION, CHART_STYLES } from '@/config/chartTheme';

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
  ChartDataLabels,
  zoomPlugin,
  annotationPlugin
);

// Single palette from theme – all charts use same library (Chart.js) and same colors
const CHART_COLORS = THEME_COLORS.series;

const FONT_FAMILY = 'Inter, system-ui, -apple-system, sans-serif';

// Theme-aware grid (works in light/dark)
const getGridColor = () => {
  if (typeof document === 'undefined') return 'rgba(0, 0, 0, 0.08)';
  const isDark = document.documentElement.classList.contains('dark');
  return isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
};

/**
 * Single professional chart options – same library (Chart.js), consistent look.
 * Used by every chart on the dashboard.
 */
const getCleanChartOptions = (opts?: { indexAxis?: 'y'; dualAxis?: boolean }) => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: {
    duration: CHART_ANIMATION.duration,
    easing: CHART_ANIMATION.easing,
  },
  interaction: { intersect: false, mode: 'index' as const },
  plugins: {
    datalabels: { display: false },
    legend: {
      display: true,
      position: 'top' as const,
      labels: {
        usePointStyle: true,
        pointStyle: 'circle',
        padding: 16,
        font: { size: 13, weight: '600', family: FONT_FAMILY },
        color: 'hsl(var(--foreground))',
        boxWidth: 10,
        boxHeight: 10,
      },
    },
    tooltip: {
      enabled: true,
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      titleColor: '#1a1a1a',
      bodyColor: '#1a1a1a',
      borderColor: 'rgba(0, 0, 0, 0.12)',
      borderWidth: 1,
      padding: 16,
      cornerRadius: 12,
      displayColors: true,
      boxPadding: 8,
      titleFont: { size: 14, weight: '600', family: FONT_FAMILY },
      bodyFont: { size: 13, weight: '500', family: FONT_FAMILY },
      bodySpacing: 6,
      titleSpacing: 4,
      boxWidth: 12,
      boxHeight: 12,
      caretSize: 6,
      caretPadding: 10,
      callbacks: {
        label: (ctx: any) => {
          const v = ctx.parsed?.y ?? ctx.parsed?.x ?? ctx.parsed;
          const label = ctx.dataset.label ? `${ctx.dataset.label}: ` : '';
          if (typeof v === 'number' && v >= 1000) return `${label}$${v.toLocaleString()}`;
          return `${label}${v}`;
        },
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: {
        font: { size: 12, family: FONT_FAMILY },
        maxRotation: 45,
        color: 'hsl(var(--muted-foreground))',
        padding: 8,
      },
    },
    y: {
      grid: { color: getGridColor(), drawBorder: false },
      ticks: {
        font: { size: 12, family: FONT_FAMILY },
        color: 'hsl(var(--muted-foreground))',
        padding: 8,
        callback: (v: any) =>
          typeof v === 'number' && v >= 1000 ? '$' + (v / 1000).toFixed(v >= 10000 ? 0 : 1) + 'k' : v,
      },
    },
    ...(opts?.dualAxis
      ? {
          y1: {
            position: 'right' as const,
            grid: { drawOnChartArea: false },
            ticks: { font: { size: 12, family: FONT_FAMILY }, color: 'hsl(var(--muted-foreground))' },
          },
        }
      : {}),
  },
  ...(opts?.indexAxis === 'y' ? { indexAxis: 'y' as const } : {}),
});

type TimeFrame = '1month' | '3months' | '6months' | '1year';

function ChartEmpty({ message = 'No data for this period' }: { message?: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-muted/30 rounded-xl">
      <p className="text-sm text-muted-foreground font-medium">{message}</p>
    </div>
  );
}

  export default function AdminDashboard() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [timeFrame, setTimeFrame] = useState<TimeFrame>('6months');
    const [showTimeFrameDropdown, setShowTimeFrameDropdown] = useState(false);
    const timeFrameDropdownRef = useRef<HTMLDivElement>(null);
    
    // Advanced features
    const [enableZoom, setEnableZoom] = useState(true);
    const [showForecast, setShowForecast] = useState(false);
    const [comparisonMode, setComparisonMode] = useState(false);
    const [fullscreenChart, setFullscreenChart] = useState<string | null>(null);
    
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
          invoiceStatusByAmount: dashboardStats.invoiceStatusByAmount || [],
          overdueInvoicesAmount: dashboardStats.overdueInvoicesAmount ?? 0,
          topVendorsBySpend: dashboardStats.topVendorsBySpend || [],
          invoiceCategories: dashboardStats.invoiceCategories || [],
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

    // Calculate forecast data (simple linear projection)
    const calculateForecast = useCallback((data: any[], key: string, periods = 3) => {
      if (!data || data.length < 2) return [];
      const recent = data.slice(-3);
      const avgGrowth = recent.reduce((acc, curr, idx) => {
        if (idx === 0) return 0;
        const prev = recent[idx - 1][key] || 0;
        const currVal = curr[key] || 0;
        if (prev === 0) return acc;
        return acc + ((currVal - prev) / prev);
      }, 0) / (recent.length - 1);
      
      const lastValue = recent[recent.length - 1][key] || 0;
      const forecast = [];
      for (let i = 1; i <= periods; i++) {
        forecast.push(lastValue * (1 + avgGrowth * i));
      }
      return forecast;
    }, []);

    // Export chart as image
    const exportChart = useCallback((chartId: string, chartName: string) => {
      const canvas = document.getElementById(chartId) as HTMLCanvasElement;
      if (canvas) {
        const url = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `${chartName}-${new Date().toISOString().split('T')[0]}.png`;
        link.href = url;
        link.click();
      }
    }, []);

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
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
              {isAdmin ? 'Admin Dashboard' : 'Dashboard'}
            </h1>
            {isAdmin && (
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-primary/15 text-primary border border-primary/30">
                Admin
              </span>
            )}
          </div>
          <p className="mt-2 text-lg text-muted-foreground flex items-center gap-2">
            <FiActivity className="text-primary animate-pulse" />
            {isAdmin ? 'Full overview: finance, tools, people & resources' : 'Live overview of your digital infrastructure'}
            {lastUpdated && (
              <span className="text-xs font-medium px-2 py-1 bg-accent rounded-full ml-2">
                Last synced: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            onClick={() => fetchStats(false)}
            disabled={isRefreshing}
            variant="outline"
            className="rounded-xl px-6 hover:bg-accent/50 transition-all active:scale-95"
          >
            <FiRefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Sync Data
          </Button>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setEnableZoom(!enableZoom)}
              variant={enableZoom ? "default" : "outline"}
              size="sm"
              className="rounded-xl"
              title="Toggle zoom/pan (Hold Shift+Drag to pan, Ctrl+Scroll to zoom)"
            >
              <FiMaximize2 className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => setShowForecast(!showForecast)}
              variant={showForecast ? "default" : "outline"}
              size="sm"
              className="rounded-xl"
              title="Show forecast projections"
            >
              <FiTrendingUp className="h-4 w-4" />
            </Button>
          </div>
          
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

        <TabsContent value="overview" className="space-y-10 animate-in slide-in-from-bottom-4 duration-500">
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard 
              title="Monthly Burn (Tools)" 
              value={`$${(stats?.monthlyToolsSpend || 0).toLocaleString()}`} 
              subtitle="Recurring tools & subscriptions"
              icon={<FiDollarSign className="text-white" />}
              color="from-emerald-500 to-teal-600"
              growth={spendGrowth}
            />
            <SummaryCard 
              title="Approved to Date" 
              value={`$${(stats?.totalPaid || 0).toLocaleString()}`} 
              subtitle="Total approved invoice amount"
              icon={<FiFileText className="text-white" />}
              color="from-orange-500 to-rose-600"
              growth="—"
            />
            <SummaryCard 
              title="Overdue" 
              value={`$${(stats?.overdueInvoicesAmount ?? 0).toLocaleString()}`} 
              subtitle="Approved invoices past due date"
              icon={<FiClock className="text-white" />}
              color="from-red-500 to-rose-700"
              growth="—"
            />
            <SummaryCard 
              title="Invoices" 
              value={stats?.totalInvoices || 0} 
              subtitle={`Pending / approved / rejected`}
              icon={<FiActivity className="text-white" />}
              color="from-purple-500 to-pink-600"
              growth="—"
            />
          </div>

          {/* ——— Invoices & spend ——— */}
          <section className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 pb-2 border-b border-border">
                <FiFileText className="text-orange-500" />
                Invoices & spend
              </h2>
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium">
                  Approved: ${(stats?.totalPaid || 0).toLocaleString()}
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-700 dark:text-red-400 font-medium">
                  Overdue: ${(stats?.overdueInvoicesAmount ?? 0).toLocaleString()}
                </span>
              </div>
            </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Monthly invoice spend</CardTitle>
                <CardDescription>Approved invoice amount by month</CardDescription>
              </CardHeader>
              <CardContent className="h-[360px] relative">
                <Line
                  id="financial-trajectory-chart"
                  data={{
                    labels: filterDataByTimeFrame(stats?.monthlySpendData || [], timeFrame).map(d => d.month),
                    datasets: [{
                      label: 'Spend ($)',
                      data: filterDataByTimeFrame(stats?.monthlySpendData || [], timeFrame).map(d => d.spend),
                      borderColor: '#059669',
                      backgroundColor: (ctx: any) => {
                        const chart = ctx.chart;
                        const { ctx: context } = chart;
                        const gradient = context.createLinearGradient(0, 0, 0, 350);
                        gradient.addColorStop(0, 'rgba(5, 150, 105, 0.25)');
                        gradient.addColorStop(1, 'rgba(5, 150, 105, 0)');
                        return gradient;
                      },
                      fill: true,
                      tension: 0.35,
                      pointRadius: 0,
                      pointHoverRadius: 2,
                      borderWidth: 2.5
                    }]
                  }}
                  options={getCleanChartOptions()}
                />
              </CardContent>
            </Card>
            <Card className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Status by amount</CardTitle>
                <CardDescription>Total $ by status</CardDescription>
              </CardHeader>
              <CardContent className="h-[360px]">
                <Doughnut
                  data={{
                    labels: stats?.invoiceStatusByAmount?.map(d => d.name) || [],
                    datasets: [{
                      data: stats?.invoiceStatusByAmount?.map(d => d.value) || [],
                      backgroundColor: ['#F59E0B', '#10B981', '#EF4444', '#6B7280'],
                      borderWidth: 2,
                      borderColor: 'hsl(var(--card))',
                      hoverOffset: 12
                    }]
                  }}
                  options={{
                    ...getCleanChartOptions(),
                    plugins: {
                      ...getCleanChartOptions().plugins,
                      legend: { position: 'bottom' },
                      tooltip: {
                        ...getCleanChartOptions().plugins?.tooltip,
                        callbacks: {
                          label: (ctx: any) => {
                            const v = ctx.parsed;
                            const total = (ctx.dataset.data as number[]).reduce((a: number, b: number) => a + b, 0);
                            const pct = total ? ((v / total) * 100).toFixed(1) : '0';
                            return ` ${ctx.label}: $${Number(v).toLocaleString()} (${pct}%)`;
                          }
                        }
                      }
                    }
                  }}
                />
              </CardContent>
            </Card>
          </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Top vendors by spend</CardTitle>
                <CardDescription>By provider (approved invoices)</CardDescription>
              </CardHeader>
              <CardContent className="h-[340px]">
                <Bar
                  data={{
                    labels: stats?.topVendorsBySpend?.slice(0, 10).map(d => d.name) || [],
                    datasets: [{
                      label: 'Spend ($)',
                      data: stats?.topVendorsBySpend?.slice(0, 10).map(d => d.value) || [],
                      backgroundColor: 'rgba(99, 102, 241, 0.85)',
                      borderRadius: 8,
                      maxBarThickness: 36
                    }]
                  }}
                  options={getCleanChartOptions({ indexAxis: 'y' })}
                />
              </CardContent>
            </Card>
            <Card className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Invoice count vs amount by month</CardTitle>
                <CardDescription>Volume and total $</CardDescription>
              </CardHeader>
              <CardContent className="h-[340px]">
                <Bar
                  data={{
                    labels: filterDataByTimeFrame(stats?.monthlyInvoiceTrends || [], timeFrame).map(d => d.month),
                    datasets: [
                      {
                        label: 'Count',
                        data: filterDataByTimeFrame(stats?.monthlyInvoiceTrends || [], timeFrame).map(d => d.invoices),
                        backgroundColor: '#F59E0B',
                        borderRadius: 8,
                        yAxisID: 'y'
                      },
                      {
                        label: 'Amount ($)',
                        data: filterDataByTimeFrame(stats?.monthlyInvoiceTrends || [], timeFrame).map(d => d.amount),
                        backgroundColor: '#EA580C',
                        borderRadius: 8,
                        yAxisID: 'y1'
                      }
                    ]
                  }}
                  options={{
                    ...getCleanChartOptions({ dualAxis: true }),
                    scales: {
                      ...getCleanChartOptions().scales,
                      y: { position: 'left', title: { display: true, text: 'Count' } },
                      y1: { position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Amount ($)' } }
                    }
                  }}
                />
              </CardContent>
            </Card>
            <Card className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Invoice count by status</CardTitle>
                <CardDescription>Pending / approved / rejected (count)</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <Doughnut
                  data={{
                    labels: stats?.invoiceStatusData?.map(d => d.name) || [],
                    datasets: [{
                      data: stats?.invoiceStatusData?.map(d => d.value) || [],
                      backgroundColor: ['#F59E0B', '#10B981', '#EF4444', '#6B7280'],
                      borderWidth: 2,
                      borderColor: 'hsl(var(--card))',
                      hoverOffset: 10
                    }]
                  }}
                  options={{ ...getCleanChartOptions(), plugins: { ...getCleanChartOptions().plugins, legend: { position: 'bottom' } } }}
                />
              </CardContent>
            </Card>
            <Card className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Spend by invoice category</CardTitle>
                <CardDescription>Approved invoices by category</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <Bar
                  data={{
                    labels: stats?.invoiceCategories?.slice(0, 8).map(d => d.name) || [],
                    datasets: [{
                      label: 'Spend ($)',
                      data: stats?.invoiceCategories?.slice(0, 8).map(d => d.value) || [],
                      backgroundColor: 'rgba(234, 88, 12, 0.9)',
                      borderRadius: 8,
                      maxBarThickness: 36
                    }]
                  }}
                  options={getCleanChartOptions()}
                />
              </CardContent>
            </Card>
          </div>
          </section>

          {/* ——— Submissions & users ——— */}
          <section className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 pb-2 border-b border-border">
                <FiActivity className="text-amber-500" />
                Submissions & users
              </h2>
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium">
                  Pending: {stats?.pendingSubmissions ?? 0}
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium">
                  Approved: {stats?.approvedSubmissions ?? 0}
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-slate-500/10 text-slate-700 dark:text-slate-400 font-medium">
                  Users: {stats?.totalUsers ?? 0}
                </span>
              </div>
            </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Submissions pipeline</CardTitle>
                <CardDescription>Pending vs approved</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <Doughnut
                  data={{
                    labels: ['Pending', 'Approved'],
                    datasets: [{
                      data: [stats?.pendingSubmissions ?? 0, stats?.approvedSubmissions ?? 0],
                      backgroundColor: ['#F59E0B', '#10B981'],
                      borderWidth: 2,
                      borderColor: 'hsl(var(--card))',
                      hoverOffset: 10
                    }]
                  }}
                  options={{ ...getCleanChartOptions(), plugins: { ...getCleanChartOptions().plugins, legend: { position: 'bottom' } } }}
                />
              </CardContent>
            </Card>
            <SummaryCard 
              title="Total users" 
              value={stats?.totalUsers ?? 0} 
              subtitle="Registered users"
              icon={<FiUsers className="text-white" />}
              color="from-slate-600 to-slate-700"
              growth="—"
            />
          </div>
          </section>

          {/* ——— Credentials (Tools) ——— */}
          <section className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 pb-2 border-b border-border">
                <FiTool className="text-blue-500" />
                Credentials (Tools)
              </h2>
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-400 font-medium">
                  Total: {stats?.totalTools ?? 0} ({stats?.activeTools ?? 0} active)
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium">
                  Monthly burn: ${(stats?.monthlyToolsSpend || 0).toLocaleString()}
                </span>
              </div>
            </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Tools added over time</CardTitle>
                <CardDescription>New credentials per month</CardDescription>
              </CardHeader>
              <CardContent className="h-[320px]">
                <Line
                  data={{
                    labels: filterDataByTimeFrame(stats?.monthlyToolsData || [], timeFrame).map(d => d.month),
                    datasets: [{
                      label: 'Tools added',
                      data: filterDataByTimeFrame(stats?.monthlyToolsData || [], timeFrame).map(d => d.tools),
                      borderColor: '#2563EB',
                      backgroundColor: (ctx: any) => {
                        const chart = ctx.chart;
                        const { ctx: context } = chart;
                        const gradient = context.createLinearGradient(0, 0, 0, 300);
                        gradient.addColorStop(0, 'rgba(37, 99, 235, 0.2)');
                        gradient.addColorStop(1, 'rgba(37, 99, 235, 0)');
                        return gradient;
                      },
                      fill: true,
                      tension: 0.35,
                      pointRadius: 0,
                      pointHoverRadius: 2,
                      borderWidth: 2.5
                    }]
                  }}
                  options={getCleanChartOptions()}
                />
              </CardContent>
            </Card>
            <Card className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Tools by category</CardTitle>
                <CardDescription>Distribution by category</CardDescription>
              </CardHeader>
              <CardContent className="h-[320px]">
                <Bar
                  data={{
                    labels: stats?.categoryData?.slice(0, 10).map(d => d.name) || [],
                    datasets: [{
                      label: 'Tools',
                      data: stats?.categoryData?.slice(0, 10).map(d => d.value) || [],
                      backgroundColor: 'rgba(59, 130, 246, 0.9)',
                      borderRadius: 8,
                      maxBarThickness: 40
                    }]
                  }}
                  options={getCleanChartOptions()}
                />
              </CardContent>
            </Card>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Top tools by monthly spend</CardTitle>
                <CardDescription>Paid tools</CardDescription>
              </CardHeader>
              <CardContent className="h-[320px]">
                <Bar
                  data={{
                    labels: stats?.topToolsData?.slice(0, 8).map(d => d.name) || [],
                    datasets: [{
                      label: 'Spend ($)',
                      data: stats?.topToolsData?.slice(0, 8).map(d => d.monthlySpend) || [],
                      backgroundColor: 'rgba(16, 185, 129, 0.9)',
                      borderRadius: 8,
                      maxBarThickness: 40
                    }]
                  }}
                  options={getCleanChartOptions({ indexAxis: 'y' })}
                />
              </CardContent>
            </Card>
          </div>
          </section>

          {/* ——— People & payroll ——— */}
          <section className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 pb-2 border-b border-border">
                <FiUsers className="text-violet-500" />
                People & payroll
              </h2>
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="px-3 py-1.5 rounded-lg bg-violet-500/10 text-violet-700 dark:text-violet-400 font-medium">
                  Headcount: {stats?.totalEmployees ?? 0}
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-700 dark:text-purple-400 font-medium">
                  Total payroll (period): ${(stats?.totalPayments || 0).toLocaleString()}
                </span>
              </div>
            </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Payroll over time</CardTitle>
                <CardDescription>Monthly payroll (contractor invoices)</CardDescription>
              </CardHeader>
              <CardContent className="h-[340px]">
                <Line
                  data={{
                    labels: filterDataByTimeFrame(stats?.employeeSpendingByMonth || [], timeFrame).map(d => d.month),
                    datasets: [{
                      label: 'Payroll ($)',
                      data: filterDataByTimeFrame(stats?.employeeSpendingByMonth || [], timeFrame).map(d => d.amount),
                      borderColor: '#7C3AED',
                      backgroundColor: (ctx: any) => {
                        const chart = ctx.chart;
                        const { ctx: context } = chart;
                        const gradient = context.createLinearGradient(0, 0, 0, 320);
                        gradient.addColorStop(0, 'rgba(124, 58, 237, 0.22)');
                        gradient.addColorStop(1, 'rgba(124, 58, 237, 0)');
                        return gradient;
                      },
                      fill: true,
                      tension: 0.35,
                      pointRadius: 0,
                      pointHoverRadius: 2,
                      borderWidth: 2.5
                    }]
                  }}
                  options={getCleanChartOptions()}
                />
              </CardContent>
            </Card>
            <Card className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Spend by role</CardTitle>
                <CardDescription>Payroll by role (contractor invoices)</CardDescription>
              </CardHeader>
              <CardContent className="h-[340px]">
                <Doughnut
                  data={{
                    labels: stats?.roleDistributionData?.map(d => d.name) || [],
                    datasets: [{
                      data: stats?.roleDistributionData?.map(d => d.value) || [],
                      backgroundColor: CHART_COLORS,
                      borderWidth: 2,
                      borderColor: 'hsl(var(--card))',
                      hoverOffset: 12
                    }]
                  }}
                  options={{
                    ...getCleanChartOptions(),
                    plugins: {
                      ...getCleanChartOptions().plugins,
                      legend: { position: 'bottom' },
                      tooltip: {
                        ...getCleanChartOptions().plugins?.tooltip,
                        callbacks: {
                          label: (ctx: any) => {
                            const v = ctx.parsed;
                            const total = (ctx.dataset.data as number[]).reduce((a: number, b: number) => a + b, 0);
                            const pct = total ? ((v / total) * 100).toFixed(1) : '0';
                            return ` ${ctx.label}: $${Number(v).toLocaleString()} (${pct}%)`;
                          }
                        }
                      }
                    }
                  }}
                />
              </CardContent>
            </Card>
          </div>
          </section>

          {/* ——— Combined & by organization ——— */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 pb-2 border-b border-border">
              <FiTrendingUp className="text-emerald-500" />
              Combined spend & by organization
            </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="rounded-2xl border border-border bg-card overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Tools + payroll over time</CardTitle>
                <CardDescription>Combined invoice spend and payroll</CardDescription>
              </CardHeader>
              <CardContent className="h-[320px]">
                <Line
                  data={{
                    labels: filterDataByTimeFrame(stats?.monthlySpendData || [], timeFrame).map(d => d.month),
                    datasets: [
                      {
                        label: 'Tools (invoices)',
                        data: filterDataByTimeFrame(stats?.monthlySpendData || [], timeFrame).map(d => d.spend),
                        borderColor: '#10B981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        borderWidth: 2,
                        pointRadius: 0,
                        pointHoverRadius: 2,
                        fill: true,
                        tension: 0.3
                      },
                      {
                        label: 'Payroll',
                        data: filterDataByTimeFrame(stats?.employeeSpendingByMonth || [], timeFrame).map(d => d.amount),
                        borderColor: '#8B5CF6',
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        borderWidth: 2,
                        pointRadius: 0,
                        pointHoverRadius: 2,
                        fill: true,
                        tension: 0.3
                      }
                    ]
                  }}
                  options={getCleanChartOptions()}
                />
              </CardContent>
            </Card>
            <Card className="rounded-2xl border border-border bg-card overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Spend by organization</CardTitle>
                <CardDescription>Top orgs by approved invoice spend</CardDescription>
              </CardHeader>
              <CardContent className="h-[320px]">
                <Bar
                  data={{
                    labels: stats?.spendByOrganization?.slice(0, 8).map(d => d.name) || [],
                    datasets: [{
                      label: 'Spend ($)',
                      data: stats?.spendByOrganization?.slice(0, 8).map(d => d.value) || [],
                      backgroundColor: '#6366F1',
                      borderRadius: 6,
                      maxBarThickness: 40
                    }]
                  }}
                  options={getCleanChartOptions({ indexAxis: 'y' })}
                />
              </CardContent>
            </Card>
          </div>
          </section>

        </TabsContent>

        <TabsContent value="tools" className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <section className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 pb-2 border-b border-border">
                <FiTool className="text-blue-500" />
                Credentials (Tools)
              </h2>
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-400 font-medium">
                  Total: {stats?.totalTools ?? 0} ({stats?.activeTools ?? 0} active)
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium">
                  Monthly burn: ${(stats?.monthlyToolsSpend || 0).toLocaleString()}
                </span>
              </div>
            </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Tools added over time</CardTitle>
                <CardDescription>New credentials per month</CardDescription>
              </CardHeader>
              <CardContent className="h-[340px]">
                <Line
                  data={{
                    labels: filterDataByTimeFrame(stats?.monthlyToolsData || [], timeFrame).map(d => d.month),
                    datasets: [{
                      label: 'Tools added',
                      data: filterDataByTimeFrame(stats?.monthlyToolsData || [], timeFrame).map(d => d.tools),
                      borderColor: '#2563EB',
                      backgroundColor: 'rgba(37, 99, 235, 0.12)',
                      fill: true,
                      tension: 0.35,
                      pointRadius: 0,
                      pointHoverRadius: 2,
                      borderWidth: 2.5
                    }]
                  }}
                  options={getCleanChartOptions()}
                />
              </CardContent>
            </Card>
            <Card className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Top tools by monthly spend</CardTitle>
                <CardDescription>Paid tools</CardDescription>
              </CardHeader>
              <CardContent className="h-[340px]">
                <Bar
                  data={{
                    labels: stats?.topToolsData?.slice(0, 8).map(d => d.name) || [],
                    datasets: [{
                      label: 'Spend ($)',
                      data: stats?.topToolsData?.slice(0, 8).map(d => d.monthlySpend) || [],
                      backgroundColor: 'rgba(16, 185, 129, 0.9)',
                      borderRadius: 8,
                      maxBarThickness: 40
                    }]
                  }}
                  options={getCleanChartOptions({ indexAxis: 'y' })}
                />
              </CardContent>
            </Card>
            <Card className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <FiHeart className="text-rose-500" /> Tool status
                </CardTitle>
                <CardDescription>Active vs inactive</CardDescription>
              </CardHeader>
              <CardContent className="h-[320px]">
                <Doughnut
                  data={{
                    labels: stats?.toolStatusData?.map(d => d.name) || [],
                    datasets: [{
                      data: stats?.toolStatusData?.map(d => d.value) || [],
                      backgroundColor: ['#10B981', '#6B7280', '#F59E0B'],
                      borderWidth: 2,
                      borderColor: 'hsl(var(--card))',
                      hoverOffset: 10
                    }]
                  }}
                  options={{ ...getCleanChartOptions(), plugins: { ...getCleanChartOptions().plugins, legend: { position: 'bottom' } } }}
                />
              </CardContent>
            </Card>
            <Card className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <FiRefreshCw className="text-blue-500" /> Billing cycle
                </CardTitle>
                <CardDescription>Monthly vs yearly (paid tools)</CardDescription>
              </CardHeader>
              <CardContent className="h-[320px]">
                <Pie
                  data={{
                    labels: stats?.billingPeriodData?.map(d => d.name) || [],
                    datasets: [{
                      data: stats?.billingPeriodData?.map(d => d.value) || [],
                      backgroundColor: ['#3B82F6', '#8B5CF6'],
                      borderWidth: 2,
                      borderColor: 'hsl(var(--card))',
                      hoverOffset: 10
                    }]
                  }}
                  options={{ ...getCleanChartOptions(), plugins: { ...getCleanChartOptions().plugins, legend: { position: 'bottom' } } }}
                />
              </CardContent>
            </Card>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Tools by category</CardTitle>
                <CardDescription>Distribution by category</CardDescription>
              </CardHeader>
              <CardContent className="h-[320px]">
                <Bar
                  data={{
                    labels: stats?.categoryData?.slice(0, 10).map(d => d.name) || [],
                    datasets: [{
                      label: 'Tools',
                      data: stats?.categoryData?.slice(0, 10).map(d => d.value) || [],
                      backgroundColor: 'rgba(59, 130, 246, 0.9)',
                      borderRadius: 8,
                      maxBarThickness: 40
                    }]
                  }}
                  options={getCleanChartOptions()}
                />
              </CardContent>
            </Card>
            <Card className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Paid tools by monthly spend</CardTitle>
                <CardDescription>Top 10 paid tools (horizontal)</CardDescription>
              </CardHeader>
              <CardContent className="h-[320px]">
                <Bar
                  data={{
                    labels: stats?.topToolsData?.slice(0, 10).map(d => d.name) || [],
                    datasets: [{
                      label: 'Monthly spend ($)',
                      data: stats?.topToolsData?.slice(0, 10).map(d => d.monthlySpend) || [],
                      backgroundColor: 'rgba(16, 185, 129, 0.9)',
                      borderRadius: 8,
                      maxBarThickness: 36
                    }]
                  }}
                  options={getCleanChartOptions({ indexAxis: 'y' })}
                />
              </CardContent>
            </Card>
          </div>
          </section>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <section className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 pb-2 border-b border-border">
                <FiFileText className="text-orange-500" />
                Invoices & spend
              </h2>
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium">
                  Approved: ${(stats?.totalPaid || 0).toLocaleString()}
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-700 dark:text-red-400 font-medium">
                  Overdue: ${(stats?.overdueInvoicesAmount ?? 0).toLocaleString()}
                </span>
              </div>
            </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Status by amount</CardTitle>
                <CardDescription>Total $ by status</CardDescription>
              </CardHeader>
              <CardContent className="h-[340px]">
                <Doughnut
                  data={{
                    labels: stats?.invoiceStatusByAmount?.map(d => d.name) || [],
                    datasets: [{
                      data: stats?.invoiceStatusByAmount?.map(d => d.value) || [],
                      backgroundColor: ['#F59E0B', '#10B981', '#EF4444', '#6B7280'],
                      borderWidth: 2,
                      borderColor: 'hsl(var(--card))',
                      hoverOffset: 10
                    }]
                  }}
                  options={{
                    ...getCleanChartOptions(),
                    plugins: {
                      ...getCleanChartOptions().plugins,
                      legend: { position: 'bottom' },
                      tooltip: {
                        ...getCleanChartOptions().plugins?.tooltip,
                        callbacks: {
                          label: (ctx: any) => {
                            const v = ctx.parsed;
                            const total = (ctx.dataset.data as number[]).reduce((a: number, b: number) => a + b, 0);
                            const pct = total ? ((v / total) * 100).toFixed(1) : '0';
                            return ` ${ctx.label}: $${Number(v).toLocaleString()} (${pct}%)`;
                          }
                        }
                      }
                    }
                  }}
                />
              </CardContent>
            </Card>
            <Card className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Top vendors by spend</CardTitle>
                <CardDescription>By provider (approved invoices)</CardDescription>
              </CardHeader>
              <CardContent className="h-[340px]">
                <Bar
                  data={{
                    labels: stats?.topVendorsBySpend?.slice(0, 10).map(d => d.name) || [],
                    datasets: [{
                      label: 'Spend ($)',
                      data: stats?.topVendorsBySpend?.slice(0, 10).map(d => d.value) || [],
                      backgroundColor: 'rgba(99, 102, 241, 0.85)',
                      borderRadius: 8,
                      maxBarThickness: 36
                    }]
                  }}
                  options={getCleanChartOptions({ indexAxis: 'y' })}
                />
              </CardContent>
            </Card>
            <Card className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Spend by organization</CardTitle>
                <CardDescription>Expenditure by entity</CardDescription>
              </CardHeader>
              <CardContent className="h-[340px]">
                <Doughnut
                  data={{
                    labels: stats?.spendByOrganization?.slice(0, 10).map(d => d.name) || [],
                    datasets: [{
                      data: stats?.spendByOrganization?.slice(0, 10).map(d => d.value) || [],
                      backgroundColor: CHART_COLORS,
                      borderWidth: 2,
                      borderColor: 'hsl(var(--card))',
                      hoverOffset: 10
                    }]
                  }}
                  options={{ ...getCleanChartOptions(), plugins: { ...getCleanChartOptions().plugins, legend: { position: 'bottom' } } }}
                />
              </CardContent>
            </Card>
            <Card className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Volume & amount by month</CardTitle>
                <CardDescription>Invoice count and total $ over time</CardDescription>
              </CardHeader>
              <CardContent className="h-[340px]">
                <Bar
                  data={{
                    labels: filterDataByTimeFrame(stats?.monthlyInvoiceTrends || [], timeFrame).map(d => d.month),
                    datasets: [
                      {
                        label: 'Count',
                        data: filterDataByTimeFrame(stats?.monthlyInvoiceTrends || [], timeFrame).map(d => d.invoices),
                        backgroundColor: '#F59E0B',
                        borderRadius: 8,
                        yAxisID: 'y'
                      },
                      {
                        label: 'Amount ($)',
                        data: filterDataByTimeFrame(stats?.monthlyInvoiceTrends || [], timeFrame).map(d => d.amount),
                        backgroundColor: '#EA580C',
                        borderRadius: 8,
                        yAxisID: 'y1'
                      }
                    ]
                  }}
                  options={{
                    ...getCleanChartOptions({ dualAxis: true }),
                    scales: {
                      ...getCleanChartOptions().scales,
                      y: { position: 'left', title: { display: true, text: 'Count' } },
                      y1: { position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Amount ($)' } }
                    }
                  }}
                />
              </CardContent>
            </Card>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Monthly invoice spend</CardTitle>
                <CardDescription>Approved invoice amount by month</CardDescription>
              </CardHeader>
              <CardContent className="h-[320px]">
                <Line
                  data={{
                    labels: filterDataByTimeFrame(stats?.monthlySpendData || [], timeFrame).map(d => d.month),
                    datasets: [{
                      label: 'Spend ($)',
                      data: filterDataByTimeFrame(stats?.monthlySpendData || [], timeFrame).map(d => d.spend),
                      borderColor: '#059669',
                      backgroundColor: (ctx: any) => {
                        const chart = ctx.chart;
                        const { ctx: context } = chart;
                        const gradient = context.createLinearGradient(0, 0, 0, 300);
                        gradient.addColorStop(0, 'rgba(5, 150, 105, 0.25)');
                        gradient.addColorStop(1, 'rgba(5, 150, 105, 0)');
                        return gradient;
                      },
                      fill: true,
                      tension: 0.35,
                      pointRadius: 0,
                      pointHoverRadius: 2,
                      borderWidth: 2.5
                    }]
                  }}
                  options={getCleanChartOptions()}
                />
              </CardContent>
            </Card>
            <Card className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Invoice count by status</CardTitle>
                <CardDescription>Pending / approved / rejected (count)</CardDescription>
              </CardHeader>
              <CardContent className="h-[320px]">
                <Doughnut
                  data={{
                    labels: stats?.invoiceStatusData?.map(d => d.name) || [],
                    datasets: [{
                      data: stats?.invoiceStatusData?.map(d => d.value) || [],
                      backgroundColor: ['#F59E0B', '#10B981', '#EF4444', '#6B7280'],
                      borderWidth: 2,
                      borderColor: 'hsl(var(--card))',
                      hoverOffset: 10
                    }]
                  }}
                  options={{ ...getCleanChartOptions(), plugins: { ...getCleanChartOptions().plugins, legend: { position: 'bottom' } } }}
                />
              </CardContent>
            </Card>
            <Card className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Spend by invoice category</CardTitle>
                <CardDescription>Approved invoices by category</CardDescription>
              </CardHeader>
              <CardContent className="h-[320px]">
                <Bar
                  data={{
                    labels: stats?.invoiceCategories?.slice(0, 8).map(d => d.name) || [],
                    datasets: [{
                      label: 'Spend ($)',
                      data: stats?.invoiceCategories?.slice(0, 8).map(d => d.value) || [],
                      backgroundColor: 'rgba(234, 88, 12, 0.9)',
                      borderRadius: 8,
                      maxBarThickness: 36
                    }]
                  }}
                  options={getCleanChartOptions()}
                />
              </CardContent>
            </Card>
          </div>
          </section>
        </TabsContent>

        <TabsContent value="assets" className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <section className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 pb-2 border-b border-border">
                <FiFolder className="text-blue-500" />
                Assets
              </h2>
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-medium">
                  Total: {stats?.totalAssets ?? 0}
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium">
                  Active: {stats?.activeAssets ?? 0}
                </span>
              </div>
            </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <FiFolder className="text-blue-500" /> Asset distribution
                </CardTitle>
                <CardDescription>By type</CardDescription>
              </CardHeader>
              <CardContent className="h-[360px]">
                <Pie
                  data={{
                    labels: stats?.assetsByType?.map(d => d.name) || [],
                    datasets: [{
                      data: stats?.assetsByType?.map(d => d.value) || [],
                      backgroundColor: CHART_COLORS,
                      borderWidth: 2,
                      borderColor: 'hsl(var(--card))',
                      hoverOffset: 10
                    }]
                  }}
                  options={{ ...getCleanChartOptions(), plugins: { ...getCleanChartOptions().plugins, legend: { position: 'bottom' } } }}
                />
              </CardContent>
            </Card>
            <SummaryCard 
              title="Digital Assets" 
              value={stats?.totalAssets || 0} 
              subtitle={`${stats?.activeAssets || 0} active files & folders`}
              icon={<FiFolder className="text-white" />}
              color="from-indigo-500 to-blue-600"
              growth="—"
            />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Active vs inactive assets</CardTitle>
                <CardDescription>Asset status overview</CardDescription>
              </CardHeader>
              <CardContent className="h-[320px]">
                <Doughnut
                  data={{
                    labels: ['Active', 'Inactive'],
                    datasets: [{
                      data: [stats?.activeAssets ?? 0, Math.max(0, (stats?.totalAssets ?? 0) - (stats?.activeAssets ?? 0))],
                      backgroundColor: ['#10B981', '#6B7280'],
                      borderWidth: 2,
                      borderColor: 'hsl(var(--card))',
                      hoverOffset: 10
                    }]
                  }}
                  options={{ ...getCleanChartOptions(), plugins: { ...getCleanChartOptions().plugins, legend: { position: 'bottom' } } }}
                />
              </CardContent>
            </Card>
            <Card className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Assets by type</CardTitle>
                <CardDescription>Count by asset type (bar)</CardDescription>
              </CardHeader>
              <CardContent className="h-[320px]">
                <Bar
                  data={{
                    labels: stats?.assetsByType?.map(d => d.name) || [],
                    datasets: [{
                      label: 'Count',
                      data: stats?.assetsByType?.map(d => d.value) || [],
                      backgroundColor: 'rgba(99, 102, 241, 0.9)',
                      borderRadius: 8,
                      maxBarThickness: 40
                    }]
                  }}
                  options={getCleanChartOptions()}
                />
              </CardContent>
            </Card>
          </div>
          </section>
        </TabsContent>

        <TabsContent value="domains" className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <section className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 pb-2 border-b border-border">
                <FiGlobe className="text-emerald-500" />
                Domains
              </h2>
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium">
                  Total: {stats?.totalDomains ?? 0}
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-400 font-medium">
                  Active: {stats?.activeDomains ?? 0}
                </span>
              </div>
            </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <FiGlobe className="text-emerald-500" /> Domain status
                </CardTitle>
                <CardDescription>Status distribution</CardDescription>
              </CardHeader>
              <CardContent className="h-[360px]">
                <Doughnut
                  data={{
                    labels: stats?.domainsByStatus?.map(d => d.name) || [],
                    datasets: [{
                      data: stats?.domainsByStatus?.map(d => d.value) || [],
                      backgroundColor: [CHART_COLORS[1], CHART_COLORS[4], CHART_COLORS[3]],
                      borderWidth: 2,
                      borderColor: 'hsl(var(--card))',
                      hoverOffset: 10
                    }]
                  }}
                  options={{ ...getCleanChartOptions(), plugins: { ...getCleanChartOptions().plugins, legend: { position: 'bottom' } } }}
                />
              </CardContent>
            </Card>
            <SummaryCard 
              title="Registered Domains" 
              value={stats?.totalDomains || 0} 
              subtitle={`${stats?.activeDomains || 0} domains resolving`}
              icon={<FiGlobe className="text-white" />}
              color="from-emerald-600 to-green-700"
              growth="—"
            />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Active vs inactive domains</CardTitle>
                <CardDescription>Domain status overview</CardDescription>
              </CardHeader>
              <CardContent className="h-[320px]">
                <Doughnut
                  data={{
                    labels: ['Active', 'Inactive'],
                    datasets: [{
                      data: [stats?.activeDomains ?? 0, Math.max(0, (stats?.totalDomains ?? 0) - (stats?.activeDomains ?? 0))],
                      backgroundColor: ['#10B981', '#6B7280'],
                      borderWidth: 2,
                      borderColor: 'hsl(var(--card))',
                      hoverOffset: 10
                    }]
                  }}
                  options={{ ...getCleanChartOptions(), plugins: { ...getCleanChartOptions().plugins, legend: { position: 'bottom' } } }}
                />
              </CardContent>
            </Card>
            <Card className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Domains by status</CardTitle>
                <CardDescription>Count by status (bar)</CardDescription>
              </CardHeader>
              <CardContent className="h-[320px]">
                <Bar
                  data={{
                    labels: stats?.domainsByStatus?.map(d => d.name) || [],
                    datasets: [{
                      label: 'Count',
                      data: stats?.domainsByStatus?.map(d => d.value) || [],
                      backgroundColor: 'rgba(16, 185, 129, 0.9)',
                      borderRadius: 8,
                      maxBarThickness: 40
                    }]
                  }}
                  options={getCleanChartOptions({ indexAxis: 'y' })}
                />
              </CardContent>
            </Card>
          </div>
          </section>
        </TabsContent>

          <TabsContent value="resources" className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <section className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 pb-2 border-b border-border">
                  <FiUsers className="text-violet-500" />
                  People & payroll
                </h2>
                <div className="flex flex-wrap gap-4 text-sm">
                  <span className="px-3 py-1.5 rounded-lg bg-violet-500/10 text-violet-700 dark:text-violet-400 font-medium">
                    Headcount: {stats?.totalEmployees ?? 0}
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-700 dark:text-purple-400 font-medium">
                    Total payroll (period): ${(stats?.totalPayments || 0).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard 
                  title="Total Payroll" 
                  value={`$${(stats?.totalPayments || 0).toLocaleString()}`} 
                  subtitle={`For selected ${timeFrame.replace(/(\d+)/, '$1 ')}`}
                  icon={<FiDollarSign className="text-white" />}
                  color="from-purple-600 to-indigo-700"
                  growth="—"
                />
                <SummaryCard 
                  title="Staff Count" 
                  value={stats?.totalEmployees || 0} 
                  subtitle="Active personnel"
                  icon={<FiUsers className="text-white" />}
                  color="from-blue-500 to-cyan-600"
                  growth="—"
                />
                <SummaryCard 
                  title="Avg. Fulfillment" 
                  value={`${stats?.hoursUtilizationData?.length ? Math.round(stats.hoursUtilizationData.reduce((acc, d) => acc + (d.contractHours > 0 ? (d.fulfilledHours / d.contractHours) * 100 : 0), 0) / stats.hoursUtilizationData.length) : 0}%`}
                  subtitle="Hours target achievement"
                  icon={<FiClock className="text-white" />}
                  color="from-emerald-500 to-green-600"
                  growth="—"
                />
                <SummaryCard 
                  title="Contract Capacity" 
                  value={Math.round(stats?.hoursUtilizationData?.reduce((acc, d) => acc + d.contractHours, 0) || 0).toLocaleString()}
                  subtitle="Total monthly hours"
                  icon={<FiActivity className="text-white" />}
                  color="from-orange-500 to-rose-600"
                  growth="—"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">Payroll over time</CardTitle>
                    <CardDescription>Monthly payroll (contractor disbursements)</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[360px]">
                    <Line
                      data={{
                        labels: filterDataByTimeFrame(stats?.employeeSpendingByMonth || [], timeFrame).map(d => d.month),
                        datasets: [{
                          label: 'Payroll ($)',
                          data: filterDataByTimeFrame(stats?.employeeSpendingByMonth || [], timeFrame).map(d => d.amount),
                          borderColor: '#7C3AED',
                          backgroundColor: 'rgba(124, 58, 237, 0.12)',
                          fill: true,
                          tension: 0.35,
                          pointRadius: 0,
                          pointHoverRadius: 2,
                          borderWidth: 2.5
                        }]
                      }}
                      options={getCleanChartOptions()}
                    />
                  </CardContent>
                </Card>
                <Card className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <FiPieChart className="text-primary" /> Spend by role
                    </CardTitle>
                    <CardDescription>Payroll by role (contractor invoices)</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[360px]">
                    <Doughnut
                      data={{
                        labels: stats?.roleDistributionData?.map(d => d.name) || [],
                        datasets: [{
                          data: stats?.roleDistributionData?.map(d => d.value) || [],
                          backgroundColor: CHART_COLORS,
                          borderWidth: 2,
                          borderColor: 'hsl(var(--card))',
                          hoverOffset: 10
                        }]
                      }}
                      options={{
                        ...getCleanChartOptions(),
                        plugins: {
                          ...getCleanChartOptions().plugins,
                          legend: { position: 'bottom' },
                          tooltip: {
                            ...getCleanChartOptions().plugins?.tooltip,
                            callbacks: {
                              label: (ctx: any) => {
                                const v = ctx.parsed;
                                const total = (ctx.dataset.data as number[]).reduce((a: number, b: number) => a + b, 0);
                                const pct = total ? ((v / total) * 100).toFixed(1) : '0';
                                return ` ${ctx.label}: $${Number(v).toLocaleString()} (${pct}%)`;
                              }
                            }
                          }
                        }
                      }}
                    />
                  </CardContent>
                </Card>
              </div>
            </section>
          </TabsContent>

      </Tabs>
    </div>
  );
}

function SummaryCard({ title, value, subtitle, icon, color, growth }) {
  const isPositive = growth?.startsWith('+');
  const showGrowth = growth != null && growth !== '—' && String(growth).trim() !== '';
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
              {showGrowth && (
                <div className="flex items-center gap-1.5">
                  <div className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter bg-white/20 backdrop-blur-md`}>
                    {isPositive ? <FiTrendingUp className="w-2.5 h-2.5" /> : <FiTrendingDown className="w-2.5 h-2.5" />}
                    {growth}
                  </div>
                  <span className="text-[10px] font-bold opacity-50 uppercase tracking-widest">Growth</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
