import React from 'react';
import { FiInfo } from 'react-icons/fi';
import { LineChart, Line, Area, ResponsiveContainer, Tooltip } from 'recharts';
import { Card } from '@/components/ui/card';
import { CHART_COLORS, CHART_STYLES, CHART_DIMENSIONS } from '@/config/chartTheme';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  showInfo?: boolean;
  showGraph?: boolean;
  graphData?: Array<{ value: number }>;
  trend?: 'up' | 'down' | 'neutral';
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  showInfo = false,
  showGraph = false,
  graphData = []
}) => {
  // Generate default graph data if not provided (wavy pattern)
  const defaultGraphData = Array.from({ length: 12 }, (_, i) => ({
    value: 50 + Math.sin(i * 0.5) * 20
  }));

  // Always use graphData if provided, otherwise use default
  const chartData = (graphData && graphData.length > 0) ? graphData : defaultGraphData;

  // Format value display
  const formatValue = () => {
    if (typeof value === 'number') {
      if (value >= 1000) {
        return value.toLocaleString('en-US');
      }
      return value.toString();
    }
    return value;
  };

  // Check if value contains "/" for split display (e.g., "27/80")
  const valueStr = formatValue();
  const hasSlash = typeof valueStr === 'string' && valueStr.includes('/');
  const [mainValue, secondaryValue] = hasSlash ? valueStr.split('/') : [valueStr, null];

  // Generate unique ID for gradient
  const gradientId = `gradient-${title.replace(/\s+/g, '-').toLowerCase()}`;
  

  return (
    <Card className="p-6 shadow-sm hover:shadow-md transition-shadow">
      {/* Title */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </span>
        {showInfo && (
          <div className="relative group">
            <FiInfo className="h-3 w-3 text-muted-foreground cursor-help" />
            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block bg-popover text-popover-foreground text-xs rounded px-2 py-1 whitespace-nowrap z-10 border border-border">
              {subtitle || 'Additional information'}
            </div>
          </div>
        )}
      </div>

      {/* Value */}
      <div className="mb-4">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-foreground">
            {mainValue}
          </span>
          {secondaryValue && (
            <span className="text-xl font-normal text-muted-foreground">
              /{secondaryValue}
            </span>
          )}
          {subtitle && !showInfo && !hasSlash && (
            <span className="text-lg font-normal text-muted-foreground">
              {subtitle}
            </span>
          )}
        </div>
      </div>

      {/* Small Graph */}
      {showGraph && (
        <div
          className="-mx-2 -mb-2"
          style={{
            width: 'calc(100% + 1rem)',
            height: `${CHART_DIMENSIONS.metric}px`,
            position: 'relative'
          }}
        >
          {chartData && chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={CHART_DIMENSIONS.metric}>
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
              >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.primary.light} stopOpacity={0.3} />
                  <stop offset="50%" stopColor={CHART_COLORS.primary.DEFAULT} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={CHART_COLORS.primary.dark} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip
                contentStyle={CHART_STYLES.tooltip.contentStyle}
                labelStyle={CHART_STYLES.tooltip.labelStyle}
                itemStyle={CHART_STYLES.tooltip.itemStyle}
                cursor={CHART_STYLES.tooltip.cursor}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="none"
                fill={`url(#${gradientId})`}
                fillOpacity={1}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={CHART_COLORS.primary.DEFAULT}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: CHART_COLORS.primary.DEFAULT }}
              />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
              {chartData.length === 0 ? 'No data' : 'Loading...'}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default MetricCard;

