import { useState, KeyboardEvent } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';

interface SubtypesInputProps {
  subtypes: string[];
  onChange: (subtypes: string[]) => void;
}

export function SubtypesInput({ subtypes, onChange }: SubtypesInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab' && inputValue.trim()) {
      e.preventDefault();
      const trimmedValue = inputValue.trim();
      if (!subtypes.includes(trimmedValue)) {
        onChange([...subtypes, trimmedValue]);
      }
      setInputValue('');
    } else if (e.key === 'Backspace' && !inputValue && subtypes.length > 0) {
      e.preventDefault();
      const newSubtypes = [...subtypes];
      newSubtypes.pop();
      onChange(newSubtypes);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValue.trim()) {
        const trimmedValue = inputValue.trim();
        if (!subtypes.includes(trimmedValue)) {
          onChange([...subtypes, trimmedValue]);
        }
        setInputValue('');
      }
    }
  };

  const removeSubtype = (index: number) => {
    const newSubtypes = subtypes.filter((_, i) => i !== index);
    onChange(newSubtypes);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 min-h-[40px] p-2 border rounded-md bg-background">
        {subtypes.map((subtype, index) => (
          <Badge
            key={index}
            variant="secondary"
            className="bg-green-100 text-green-800 hover:bg-green-200 gap-1 pl-2 pr-1"
          >
            {subtype}
            <button
              type="button"
              onClick={() => removeSubtype(index)}
              className="ml-1 hover:bg-green-300 rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={subtypes.length === 0 ? "Type and press Tab to add sub-types" : "Add more..."}
          className="flex-1 min-w-[120px] border-0 shadow-none focus-visible:ring-0 p-0 h-auto"
        />
      </div>
    </div>
  );
}
