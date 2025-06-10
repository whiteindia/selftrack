
export interface Service {
  id: string;
  name: string;
  description: string | null;
  hourly_rate: number;
  created_at: string;
}

export interface ServiceFormData {
  name: string;
  description: string;
  hourly_rate: string;
}
