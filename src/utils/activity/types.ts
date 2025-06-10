
export interface ActivityLogData {
  action_type: string;
  entity_type: string;
  entity_id?: string;
  entity_name: string;
  description: string;
  comment?: string;
}
