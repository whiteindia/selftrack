import { useState, KeyboardEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface ArrayInputProps {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}

export function ArrayInput({ label, items, onChange, placeholder }: ArrayInputProps) {
  const [currentValue, setCurrentValue] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === 'Tab') && currentValue.trim()) {
      e.preventDefault();
      if (!items.includes(currentValue.trim())) {
        onChange([...items, currentValue.trim()]);
      }
      setCurrentValue('');
    } else if (e.key === 'Backspace' && !currentValue && items.length > 0) {
      onChange(items.slice(0, -1));
    }
  };

  const handleBlur = () => {
    if (currentValue.trim() && !items.includes(currentValue.trim())) {
      onChange([...items, currentValue.trim()]);
      setCurrentValue('');
    }
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {items.map((item, index) => (
          <Badge
            key={index}
            variant="secondary"
            className="px-2 py-1 flex items-center gap-1"
          >
            {item}
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="ml-1 hover:bg-destructive/20 rounded-full"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <Input
        value={currentValue}
        onChange={(e) => setCurrentValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={placeholder || `Add ${label.toLowerCase()} and press Enter or Tab`}
      />
    </div>
  );
}
