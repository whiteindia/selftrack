
export interface ProjectData {
  id: string;
  name: string;
  client_id: string;
  type: any;
  hourly_rate: number;
  project_amount: number | null;
  total_hours: number;
  status: any;
  start_date: string | null;
  deadline: string | null;
  brd_file_url: string | null;
  created_at: string;
  clients: {
    name: string;
  };
}

export interface DeleteProjectResult {
  deletedProjectId: string;
  projectName: string;
  clientName: string;
}

export interface CreateProjectParams {
  projectData: any;
  brdFile: File | null;
}

export interface UpdateProjectParams {
  id: string;
  updates: any;
  brdFile: File | null;
}
