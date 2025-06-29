
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';

interface Service {
  id: string;
  name: string;
}

interface ProjectFiltersProps {
  selectedStatus: string[];
  setSelectedStatus: (value: string[]) => void;
  selectedYear: string;
  setSelectedYear: (value: string) => void;
  selectedMonth: string;
  setSelectedMonth: (value: string) => void;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  services: Service[];
  availableYears: number[];
  onClearFilters: () => void;
}

const ProjectFilters: React.FC<ProjectFiltersProps> = ({
  selectedStatus,
  setSelectedStatus,
  selectedYear,
  setSelectedYear,
  selectedMonth,
  setSelectedMonth,
  searchTerm,
  setSearchTerm,
  services,
  availableYears,
  onClearFilters
}) => {
  // Available status options including all the ones from the database
  const statusOptions = [
    'Planning',
    'Active',
    'On Hold', 
    'Completed',
    'Cancelled',
    'Imp',
    'On-Head',
    'Targeted',
    'OverDue'
  ];

  const handleStatusToggle = (status: string) => {
    if (selectedStatus.includes(status)) {
      setSelectedStatus(selectedStatus.filter(s => s !== status));
    } else {
      setSelectedStatus([...selectedStatus, status]);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filters
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="space-y-2">
            <Label>Search</Label>
            <Input
              placeholder="Search projects or clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Year</Label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger>
                <SelectValue placeholder="All years" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Month</Label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger>
                <SelectValue placeholder="All months" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                <SelectItem value="1">January</SelectItem>
                <SelectItem value="2">February</SelectItem>
                <SelectItem value="3">March</SelectItem>
                <SelectItem value="4">April</SelectItem>
                <SelectItem value="5">May</SelectItem>
                <SelectItem value="6">June</SelectItem>
                <SelectItem value="7">July</SelectItem>
                <SelectItem value="8">August</SelectItem>
                <SelectItem value="9">September</SelectItem>
                <SelectItem value="10">October</SelectItem>
                <SelectItem value="11">November</SelectItem>
                <SelectItem value="12">December</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Status Filter Buttons */}
        <div className="space-y-2 mb-4">
          <Label>Status</Label>
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((status) => (
              <Toggle
                key={status}
                pressed={selectedStatus.includes(status)}
                onPressedChange={() => handleStatusToggle(status)}
                variant="outline"
                size="sm"
                className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                {status}
              </Toggle>
            ))}
          </div>
        </div>

        <Button variant="outline" onClick={onClearFilters} className="w-full md:w-auto">
          Clear All Filters
        </Button>
      </CardContent>
    </Card>
  );
};

export default ProjectFilters;
