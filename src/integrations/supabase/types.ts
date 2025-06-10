export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      activity_feed: {
        Row: {
          action_type: string
          comment: string | null
          created_at: string
          description: string
          entity_id: string | null
          entity_name: string
          entity_type: string
          id: string
          user_id: string
        }
        Insert: {
          action_type: string
          comment?: string | null
          created_at?: string
          description: string
          entity_id?: string | null
          entity_name: string
          entity_type: string
          id?: string
          user_id: string
        }
        Update: {
          action_type?: string
          comment?: string | null
          created_at?: string
          description?: string
          entity_id?: string | null
          entity_name?: string
          entity_type?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          company: string | null
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      employee_services: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          service_id: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          service_id: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_services_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          contact_number: string | null
          created_at: string
          email: string
          hourly_rate: number
          id: string
          name: string
          role: string
          updated_at: string
        }
        Insert: {
          contact_number?: string | null
          created_at?: string
          email: string
          hourly_rate?: number
          id?: string
          name: string
          role?: string
          updated_at?: string
        }
        Update: {
          contact_number?: string | null
          created_at?: string
          email?: string
          hourly_rate?: number
          id?: string
          name?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          client_id: string | null
          created_at: string | null
          email: string
          employee_data: Json | null
          expires_at: string | null
          id: string
          invited_by: string | null
          role: string
          status: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          email: string
          employee_data?: Json | null
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          role: string
          status?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          email?: string
          employee_data?: Json | null
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          role?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_tasks: {
        Row: {
          id: string
          invoice_id: string
          task_id: string
        }
        Insert: {
          id?: string
          invoice_id: string
          task_id: string
        }
        Update: {
          id?: string
          invoice_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_tasks_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_tasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          date: string
          due_date: string
          hours: number
          id: string
          project_id: string
          rate: number
          status: Database["public"]["Enums"]["invoice_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          client_id: string
          created_at?: string
          date?: string
          due_date: string
          hours: number
          id: string
          project_id: string
          rate: number
          status?: Database["public"]["Enums"]["invoice_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          date?: string
          due_date?: string
          hours?: number
          id?: string
          project_id?: string
          rate?: number
          status?: Database["public"]["Enums"]["invoice_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          id: string
          invoice_id: string
          payment_date: string
          payment_method: string | null
          project_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          client_id: string
          created_at?: string
          id?: string
          invoice_id: string
          payment_date?: string
          payment_method?: string | null
          project_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          id?: string
          invoice_id?: string
          payment_date?: string
          payment_method?: string | null
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          client_id: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          assignee_id: string | null
          brd_file_url: string | null
          client_id: string
          created_at: string
          deadline: string | null
          hourly_rate: number
          id: string
          name: string
          project_amount: number | null
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          total_hours: number
          type: Database["public"]["Enums"]["project_type"]
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          brd_file_url?: string | null
          client_id: string
          created_at?: string
          deadline?: string | null
          hourly_rate: number
          id?: string
          name: string
          project_amount?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          total_hours?: number
          type: Database["public"]["Enums"]["project_type"]
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          brd_file_url?: string | null
          client_id?: string
          created_at?: string
          deadline?: string | null
          hourly_rate?: number
          id?: string
          name?: string
          project_amount?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          total_hours?: number
          type?: Database["public"]["Enums"]["project_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      role_privileges: {
        Row: {
          allowed: boolean
          created_at: string | null
          id: string
          operation: Database["public"]["Enums"]["crud_operation"]
          page_name: string
          role: string
          updated_at: string | null
        }
        Insert: {
          allowed?: boolean
          created_at?: string | null
          id?: string
          operation: Database["public"]["Enums"]["crud_operation"]
          page_name: string
          role: string
          updated_at?: string | null
        }
        Update: {
          allowed?: boolean
          created_at?: string | null
          id?: string
          operation?: Database["public"]["Enums"]["crud_operation"]
          page_name?: string
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      services: {
        Row: {
          created_at: string
          description: string | null
          hourly_rate: number
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          hourly_rate: number
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          hourly_rate?: number
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      sprint_tasks: {
        Row: {
          created_at: string
          id: string
          sprint_id: string
          task_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          sprint_id: string
          task_id: string
        }
        Update: {
          created_at?: string
          id?: string
          sprint_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sprint_tasks_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sprint_tasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      sprints: {
        Row: {
          created_at: string
          deadline: string
          id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deadline: string
          id?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deadline?: string
          id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      task_comments: {
        Row: {
          comment: string
          created_at: string
          hours_logged: number
          id: string
          task_id: string
          user_id: string | null
        }
        Insert: {
          comment: string
          created_at?: string
          hours_logged?: number
          id?: string
          task_id: string
          user_id?: string | null
        }
        Update: {
          comment?: string
          created_at?: string
          hours_logged?: number
          id?: string
          task_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string | null
          assigner_id: string | null
          created_at: string
          date: string
          deadline: string | null
          estimated_duration: number | null
          hours: number
          id: string
          invoiced: boolean
          name: string
          project_id: string
          status: Database["public"]["Enums"]["task_status"]
          updated_at: string
          wage_status: string | null
        }
        Insert: {
          assignee_id?: string | null
          assigner_id?: string | null
          created_at?: string
          date?: string
          deadline?: string | null
          estimated_duration?: number | null
          hours?: number
          id?: string
          invoiced?: boolean
          name: string
          project_id: string
          status?: Database["public"]["Enums"]["task_status"]
          updated_at?: string
          wage_status?: string | null
        }
        Update: {
          assignee_id?: string | null
          assigner_id?: string | null
          created_at?: string
          date?: string
          deadline?: string | null
          estimated_duration?: number | null
          hours?: number
          id?: string
          invoiced?: boolean
          name?: string
          project_id?: string
          status?: Database["public"]["Enums"]["task_status"]
          updated_at?: string
          wage_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigner_id_fkey"
            columns: ["assigner_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          comment: string | null
          created_at: string
          duration_minutes: number | null
          employee_id: string
          end_time: string | null
          id: string
          start_time: string
          task_id: string
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          duration_minutes?: number | null
          employee_id: string
          end_time?: string | null
          id?: string
          start_time: string
          task_id: string
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          duration_minutes?: number | null
          employee_id?: string
          end_time?: string | null
          id?: string
          start_time?: string
          task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: { _user_id: string; _role: string }
        Returns: boolean
      }
      setup_admin_user: {
        Args: { admin_email: string }
        Returns: string
      }
    }
    Enums: {
      crud_operation: "create" | "read" | "update" | "delete"
      invoice_status: "Draft" | "Sent" | "Paid" | "Overdue"
      project_status: "Active" | "Completed" | "On Hold"
      project_type:
        | "DevOps"
        | "Marketing"
        | "Consulting"
        | "Strategy"
        | "Technical Writing"
        | "BRD"
      task_status: "Not Started" | "In Progress" | "Completed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      crud_operation: ["create", "read", "update", "delete"],
      invoice_status: ["Draft", "Sent", "Paid", "Overdue"],
      project_status: ["Active", "Completed", "On Hold"],
      project_type: [
        "DevOps",
        "Marketing",
        "Consulting",
        "Strategy",
        "Technical Writing",
        "BRD",
      ],
      task_status: ["Not Started", "In Progress", "Completed"],
    },
  },
} as const
