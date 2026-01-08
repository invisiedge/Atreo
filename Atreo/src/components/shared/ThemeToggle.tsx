import { FiSun, FiMoon } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { useTheme } from '../../context/ThemeContext';

export default function ThemeToggle() {
  const { effectiveTheme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="rounded-md transition-colors"
      title={`Switch to ${effectiveTheme === 'light' ? 'dark' : 'light'} mode`}
    >
      {effectiveTheme === 'light' ? (
        <FiMoon className="h-5 w-5" />
      ) : (
        <FiSun className="h-5 w-5" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
