import { FiChevronDown } from 'react-icons/fi';

type TimeFrame = '1month' | '3months' | '6months' | '1year';

interface TimeFrameSelectorProps {
  timeFrame: TimeFrame;
  onTimeFrameChange: (timeFrame: TimeFrame) => void;
  showDropdown: boolean;
  onToggleDropdown: (show: boolean) => void;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
}

export default function TimeFrameSelector({
  timeFrame,
  onTimeFrameChange,
  showDropdown,
  onToggleDropdown,
  dropdownRef
}: TimeFrameSelectorProps) {
  const getTimeFrameLabel = (tf: TimeFrame) => {
    switch (tf) {
      case '1month':
        return '1 Month';
      case '3months':
        return '3 Months';
      case '6months':
        return '6 Months';
      case '1year':
        return '1 Year';
      default:
        return '6 Months';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => onToggleDropdown(!showDropdown)}
        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors"
      >
        <span>{getTimeFrameLabel(timeFrame)}</span>
        <FiChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
      </button>
      {showDropdown && (
        <div className="absolute right-0 mt-1 w-36 bg-card border border-border rounded-lg shadow-lg z-10">
          <button
            onClick={() => {
              onTimeFrameChange('1month');
              onToggleDropdown(false);
            }}
            className={`w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors ${
              timeFrame === '1month' ? 'bg-primary/10 dark:bg-primary/20 text-primary font-medium' : 'text-foreground'
            }`}
          >
            1 Month
          </button>
          <button
            onClick={() => {
              onTimeFrameChange('3months');
              onToggleDropdown(false);
            }}
            className={`w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors ${
              timeFrame === '3months' ? 'bg-primary/10 dark:bg-primary/20 text-primary font-medium' : 'text-foreground'
            }`}
          >
            3 Months
          </button>
          <button
            onClick={() => {
              onTimeFrameChange('6months');
              onToggleDropdown(false);
            }}
            className={`w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors ${
              timeFrame === '6months' ? 'bg-primary/10 dark:bg-primary/20 text-primary font-medium' : 'text-foreground'
            }`}
          >
            6 Months
          </button>
          <button
            onClick={() => {
              onTimeFrameChange('1year');
              onToggleDropdown(false);
            }}
            className={`w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors rounded-b-lg ${
              timeFrame === '1year' ? 'bg-primary/10 dark:bg-primary/20 text-primary font-medium' : 'text-foreground'
            }`}
          >
            1 Year
          </button>
        </div>
      )}
    </div>
  );
}


