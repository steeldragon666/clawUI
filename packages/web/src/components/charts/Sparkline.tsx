import ReactECharts from 'echarts-for-react';

interface SparklineProps {
  data: number[];
  color: string;
  height?: number;
  width?: string;
}

export function Sparkline({ data, color, height = 32, width = '100%' }: SparklineProps) {
  const option = {
    grid: { top: 0, right: 0, bottom: 0, left: 0 },
    xAxis: { show: false, type: 'category' as const, data: data.map((_, i) => i) },
    yAxis: { show: false, type: 'value' as const },
    series: [{
      type: 'line' as const,
      data,
      smooth: true,
      symbol: 'none',
      lineStyle: { color, width: 1.5 },
      areaStyle: { color: `${color}20` },
    }],
    animation: true,
    animationDuration: 500,
  };

  return (
    <ReactECharts
      option={option}
      style={{ height, width }}
      opts={{ renderer: 'svg' }}
    />
  );
}
