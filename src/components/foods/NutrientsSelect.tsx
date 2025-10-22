import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, Plus } from 'lucide-react';

interface Nutrient {
  category: string;
  subtype: string;
}

interface NutrientsSelectProps {
  nutrients: Nutrient[];
  onChange: (nutrients: Nutrient[]) => void;
}

interface NutrientCategory {
  id: string;
  category: string;
  subtypes: string[];
}

export function NutrientsSelect({ nutrients, onChange }: NutrientsSelectProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubtype, setSelectedSubtype] = useState<string>('');

  const { data: categories = [] } = useQuery({
    queryKey: ['nutrients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nutrients')
        .select('*')
        .order('category');
      
      if (error) throw error;
      return data as NutrientCategory[];
    },
  });

  const selectedCategoryData = categories.find(c => c.category === selectedCategory);

  const handleAdd = () => {
    if (!selectedCategory || !selectedSubtype) return;
    
    const exists = nutrients.some(
      n => n.category === selectedCategory && n.subtype === selectedSubtype
    );
    
    if (!exists) {
      onChange([...nutrients, { category: selectedCategory, subtype: selectedSubtype }]);
    }
    
    setSelectedCategory('');
    setSelectedSubtype('');
  };

  const handleRemove = (index: number) => {
    onChange(nutrients.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 min-h-[40px] p-2 border rounded-md bg-background">
        {nutrients.length === 0 ? (
          <p className="text-sm text-muted-foreground">No nutrients selected</p>
        ) : (
          nutrients.map((nutrient, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="bg-green-100 text-green-800 hover:bg-green-200 gap-1 pl-2 pr-1"
            >
              {nutrient.category} - {nutrient.subtype}
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="ml-1 hover:bg-green-300 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))
        )}
      </div>

      <div className="flex gap-2 items-end">
        <div className="flex-1 space-y-2">
          <label className="text-sm font-medium">Category</label>
          <Select value={selectedCategory} onValueChange={(value) => {
            setSelectedCategory(value);
            setSelectedSubtype('');
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.category}>
                  {cat.category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 space-y-2">
          <label className="text-sm font-medium">Subtype</label>
          <Select 
            value={selectedSubtype} 
            onValueChange={setSelectedSubtype}
            disabled={!selectedCategory}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select subtype" />
            </SelectTrigger>
            <SelectContent>
              {selectedCategoryData?.subtypes.map((subtype) => (
                <SelectItem key={subtype} value={subtype}>
                  {subtype}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button 
          type="button" 
          onClick={handleAdd}
          disabled={!selectedCategory || !selectedSubtype}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
