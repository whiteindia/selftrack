import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, Plus } from 'lucide-react';

interface FoodItem {
  food_id: string;
  food_name: string;
  quantity: number;
  unit: string;
  calories: number;
}

interface FoodItemsSelectProps {
  foodItems: FoodItem[];
  onChange: (items: FoodItem[]) => void;
}

export function FoodItemsSelect({ foodItems, onChange }: FoodItemsSelectProps) {
  const [selectedFoodId, setSelectedFoodId] = useState('');
  const [quantity, setQuantity] = useState('100');
  const [unit, setUnit] = useState('grams');

  const { data: foods = [] } = useQuery({
    queryKey: ['foods'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('foods')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  const handleAddFood = () => {
    if (!selectedFoodId || !quantity) return;

    const selectedFood = foods.find(f => f.id === selectedFoodId);
    if (!selectedFood) return;

    const quantityNum = parseFloat(quantity);
    let calculatedCalories = 0;

    // Calculate calories based on unit
    if (selectedFood.calories_unit === 'Per 100G') {
      if (unit === 'grams') {
        calculatedCalories = (selectedFood.calories_value * quantityNum) / 100;
      } else if (unit === 'kg') {
        calculatedCalories = selectedFood.calories_value * quantityNum * 10;
      }
    } else if (selectedFood.calories_unit === 'Per Piece') {
      calculatedCalories = selectedFood.calories_value * quantityNum;
    }

    const newItem: FoodItem = {
      food_id: selectedFood.id,
      food_name: selectedFood.name,
      quantity: quantityNum,
      unit,
      calories: Math.round(calculatedCalories * 10) / 10,
    };

    onChange([...foodItems, newItem]);
    setSelectedFoodId('');
    setQuantity('100');
    setUnit('grams');
  };

  const handleRemoveFood = (index: number) => {
    onChange(foodItems.filter((_, i) => i !== index));
  };

  const totalCalories = foodItems.reduce((sum, item) => sum + item.calories, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-12 gap-2">
        <div className="col-span-5">
          <Label>Select Food</Label>
          <Select value={selectedFoodId} onValueChange={setSelectedFoodId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose food..." />
            </SelectTrigger>
            <SelectContent>
              {foods.map(food => (
                <SelectItem key={food.id} value={food.id}>
                  {food.name} ({food.calories_value} kcal {food.calories_unit})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-3">
          <Label>Quantity</Label>
          <Input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="100"
            min="0"
            step="0.1"
          />
        </div>
        <div className="col-span-3">
          <Label>Unit</Label>
          <Select value={unit} onValueChange={setUnit}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="grams">Grams</SelectItem>
              <SelectItem value="kg">Kg</SelectItem>
              <SelectItem value="pieces">Pieces</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-1 flex items-end">
          <Button
            type="button"
            size="icon"
            onClick={handleAddFood}
            disabled={!selectedFoodId || !quantity}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {foodItems.length > 0 && (
        <div className="space-y-2">
          <Label>Added Foods</Label>
          <div className="border rounded-md p-3 space-y-2">
            {foodItems.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-secondary/50 p-2 rounded"
              >
                <span className="text-sm">
                  {item.food_name} - {item.quantity} {item.unit} ({item.calories} kcal)
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveFood(index)}
                  className="h-6 w-6"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <div className="pt-2 border-t">
              <span className="font-semibold text-sm">
                Total Calories: {Math.round(totalCalories * 10) / 10} kcal
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
