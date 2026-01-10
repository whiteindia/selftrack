import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, Filter } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Service {
  id: string;
  name: string;
}

interface ClientOption {
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
  selectedServices: string[];
  setSelectedServices: (value: string[]) => void;
  availableClients: ClientOption[];
  selectedClients: string[];
  setSelectedClients: (value: string[]) => void;
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
  selectedServices,
  setSelectedServices,
  availableClients,
  selectedClients,
  setSelectedClients,
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

  const isAllSelected = statusOptions.every((s) => selectedStatus.includes(s));
  const selectAllStatuses = () => setSelectedStatus(statusOptions);

  const [activeCascadeTab, setActiveCascadeTab] = React.useState<"services" | "clients">("services");

  const toggleService = (serviceName: string) => {
    const nextServices = selectedServices.includes(serviceName)
      ? selectedServices.filter((s) => s !== serviceName)
      : [...selectedServices, serviceName];

    setSelectedServices(nextServices);
    // Cascade reset
    setSelectedClients([]);
    setActiveCascadeTab(nextServices.length > 0 ? "clients" : "services");
  };

  const toggleClient = (clientId: string) => {
    const nextClients = selectedClients.includes(clientId)
      ? selectedClients.filter((c) => c !== clientId)
      : [...selectedClients, clientId];
    setSelectedClients(nextClients);
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

        {/* Cascade Filter (same style as Active Time Tracking): Services → Clients */}
        <div className="space-y-2 mb-4">
          <Label>Global Filters</Label>
          <Tabs value={activeCascadeTab} onValueChange={(v) => setActiveCascadeTab(v as any)}>
            <TabsList className="w-full justify-start">
              <TabsTrigger value="services">Services</TabsTrigger>
              {selectedServices.length > 0 && <TabsTrigger value="clients">Clients</TabsTrigger>}
            </TabsList>

            <TabsContent value="services" className="mt-3">
              {services.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {services.map((service) => (
                    <Button
                      key={service.id}
                      variant={selectedServices.includes(service.name) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleService(service.name)}
                      className="flex items-center gap-2 text-xs"
                      type="button"
                    >
                      {selectedServices.includes(service.name) && <Check className="h-3 w-3" />}
                      {service.name}
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">No services found.</div>
              )}
            </TabsContent>

            <TabsContent value="clients" className="mt-3">
              {selectedServices.length === 0 ? (
                <div className="text-xs text-muted-foreground">Select a service to see clients.</div>
              ) : availableClients.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {availableClients.map((client) => (
                    <Button
                      key={client.id}
                      variant={selectedClients.includes(client.id) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleClient(client.id)}
                      className="flex items-center gap-2 text-xs"
                      type="button"
                    >
                      {selectedClients.includes(client.id) && <Check className="h-3 w-3" />}
                      {client.name}
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">No clients found for the selected services.</div>
              )}
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Status Filter Buttons */}
        <div className="space-y-2 mb-4">
          <Label>Status</Label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={isAllSelected ? "default" : "outline"}
              onClick={selectAllStatuses}
            >
              All Status
            </Button>
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
