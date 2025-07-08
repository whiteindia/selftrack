export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
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
          services: string[] | null
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          phone?: string | null
          services?: string[] | null
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          services?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      codi_note_tags: {
        Row: {
          codi_note_id: string
          created_at: string
          id: string
          tag_id: string
        }
        Insert: {
          codi_note_id: string
          created_at?: string
          id?: string
          tag_id: string
        }
        Update: {
          codi_note_id?: string
          created_at?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "codi_note_tags_codi_note_id_fkey"
            columns: ["codi_note_id"]
            isOneToOne: false
            referencedRelation: "codi_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "codi_note_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "codi_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      codi_notes: {
        Row: {
          client_id: string | null
          content: string
          created_at: string
          id: string
          project_id: string | null
          service_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          content: string
          created_at?: string
          id?: string
          project_id?: string | null
          service_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          content?: string
          created_at?: string
          id?: string
          project_id?: string | null
          service_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "codi_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "codi_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "codi_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "task_project_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "codi_notes_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      codi_tags: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
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
      invoice_comments: {
        Row: {
          comment: string
          created_at: string
          id: string
          invoice_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          invoice_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          invoice_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_invoice_comments_invoice_id"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_invoice_comments_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            referencedRelation: "task_project_managers"
            referencedColumns: ["task_id"]
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
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "task_project_info"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_reads: {
        Row: {
          created_at: string
          id: string
          notification_id: string
          notification_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notification_id: string
          notification_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notification_id?: string
          notification_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          id: string
          invoice_id: string | null
          payment_date: string
          payment_method: string | null
          payment_type: string
          project_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          client_id: string
          created_at?: string
          id?: string
          invoice_id?: string | null
          payment_date?: string
          payment_method?: string | null
          payment_type?: string
          project_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          id?: string
          invoice_id?: string | null
          payment_date?: string
          payment_method?: string | null
          payment_type?: string
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
          {
            foreignKeyName: "payments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "task_project_info"
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
          assignee_employee_id: string | null
          assignee_id: string | null
          brd_file_url: string | null
          client_id: string
          created_at: string
          deadline: string | null
          hourly_rate: number
          id: string
          name: string
          project_amount: number | null
          service: string
          start_date: string | null
          status: string
          total_hours: number
          type: string
          updated_at: string
        }
        Insert: {
          assignee_employee_id?: string | null
          assignee_id?: string | null
          brd_file_url?: string | null
          client_id: string
          created_at?: string
          deadline?: string | null
          hourly_rate: number
          id?: string
          name: string
          project_amount?: number | null
          service: string
          start_date?: string | null
          status?: string
          total_hours?: number
          type?: string
          updated_at?: string
        }
        Update: {
          assignee_employee_id?: string | null
          assignee_id?: string | null
          brd_file_url?: string | null
          client_id?: string
          created_at?: string
          deadline?: string | null
          hourly_rate?: number
          id?: string
          name?: string
          project_amount?: number | null
          service?: string
          start_date?: string | null
          status?: string
          total_hours?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_projects_assignee_employee"
            columns: ["assignee_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
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
      role_rls_policies: {
        Row: {
          created_at: string
          id: string
          page_name: string
          rls_enabled: boolean
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          page_name: string
          rls_enabled?: boolean
          role: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          page_name?: string
          rls_enabled?: boolean
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      roles: {
        Row: {
          created_at: string
          id: string
          landing_page: string | null
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          landing_page?: string | null
          role: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          landing_page?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      routine_completions: {
        Row: {
          completion_date: string
          created_at: string
          id: string
          routine_id: string
          scheduled_time: string | null
          user_id: string
        }
        Insert: {
          completion_date: string
          created_at?: string
          id?: string
          routine_id: string
          scheduled_time?: string | null
          user_id: string
        }
        Update: {
          completion_date?: string
          created_at?: string
          id?: string
          routine_id?: string
          scheduled_time?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_completions_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      routines: {
        Row: {
          client_id: string
          created_at: string
          frequency: string
          id: string
          preferred_days: Json | null
          preferred_slot_end: string | null
          preferred_slot_start: string | null
          project_id: string
          start_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          frequency: string
          id?: string
          preferred_days?: Json | null
          preferred_slot_end?: string | null
          preferred_slot_start?: string | null
          project_id: string
          start_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          frequency?: string
          id?: string
          preferred_days?: Json | null
          preferred_slot_end?: string | null
          preferred_slot_start?: string | null
          project_id?: string
          start_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "routines_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "task_project_info"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "task_project_managers"
            referencedColumns: ["task_id"]
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
          assignee_id: string | null
          completion_date: string | null
          created_at: string
          deadline: string
          end_time: string | null
          estimated_hours: number | null
          id: string
          is_favorite: boolean | null
          is_pinned: boolean | null
          name: string | null
          project_id: string | null
          slot_date: string | null
          sprint_leader_id: string | null
          start_time: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          completion_date?: string | null
          created_at?: string
          deadline: string
          end_time?: string | null
          estimated_hours?: number | null
          id?: string
          is_favorite?: boolean | null
          is_pinned?: boolean | null
          name?: string | null
          project_id?: string | null
          slot_date?: string | null
          sprint_leader_id?: string | null
          start_time?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          completion_date?: string | null
          created_at?: string
          deadline?: string
          end_time?: string | null
          estimated_hours?: number | null
          id?: string
          is_favorite?: boolean | null
          is_pinned?: boolean | null
          name?: string | null
          project_id?: string | null
          slot_date?: string | null
          sprint_leader_id?: string | null
          start_time?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sprints_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sprints_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sprints_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "task_project_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sprints_sprint_leader_id_fkey"
            columns: ["sprint_leader_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      sticky_note_tags: {
        Row: {
          created_at: string
          id: string
          sticky_note_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          sticky_note_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          id?: string
          sticky_note_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sticky_note_tags_sticky_note_id_fkey"
            columns: ["sticky_note_id"]
            isOneToOne: false
            referencedRelation: "sticky_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sticky_note_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      sticky_notes: {
        Row: {
          client_id: string | null
          content: string
          created_at: string
          id: string
          project_id: string | null
          service_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          content: string
          created_at?: string
          id?: string
          project_id?: string | null
          service_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          content?: string
          created_at?: string
          id?: string
          project_id?: string | null
          service_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sticky_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sticky_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sticky_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "task_project_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sticky_notes_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      sticky_tags: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      subtasks: {
        Row: {
          assignee_id: string | null
          assigner_id: string | null
          completion_date: string | null
          created_at: string
          date: string | null
          deadline: string | null
          estimated_duration: number | null
          hours: number | null
          id: string
          name: string
          scheduled_time: string | null
          status: string
          task_id: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          assigner_id?: string | null
          completion_date?: string | null
          created_at?: string
          date?: string | null
          deadline?: string | null
          estimated_duration?: number | null
          hours?: number | null
          id?: string
          name: string
          scheduled_time?: string | null
          status?: string
          task_id: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          assigner_id?: string | null
          completion_date?: string | null
          created_at?: string
          date?: string | null
          deadline?: string | null
          estimated_duration?: number | null
          hours?: number | null
          id?: string
          name?: string
          scheduled_time?: string | null
          status?: string
          task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subtasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subtasks_assigner_id_fkey"
            columns: ["assigner_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subtasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "task_project_managers"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "subtasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
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
            referencedRelation: "task_project_managers"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_wage_amounts: {
        Row: {
          amount: number
          created_at: string
          id: string
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assignee_id: string | null
          assigner_id: string | null
          completion_date: string | null
          created_at: string
          date: string
          deadline: string | null
          estimated_duration: number | null
          hours: number
          id: string
          invoiced: boolean
          is_favorite: boolean | null
          name: string
          project_id: string
          reminder_datetime: string | null
          reminder_time: string | null
          scheduled_time: string | null
          slot_end_datetime: string | null
          slot_end_time: string | null
          slot_start_datetime: string | null
          slot_start_time: string | null
          status: Database["public"]["Enums"]["task_status"]
          updated_at: string
          wage_status: string | null
        }
        Insert: {
          assignee_id?: string | null
          assigner_id?: string | null
          completion_date?: string | null
          created_at?: string
          date?: string
          deadline?: string | null
          estimated_duration?: number | null
          hours?: number
          id?: string
          invoiced?: boolean
          is_favorite?: boolean | null
          name: string
          project_id: string
          reminder_datetime?: string | null
          reminder_time?: string | null
          scheduled_time?: string | null
          slot_end_datetime?: string | null
          slot_end_time?: string | null
          slot_start_datetime?: string | null
          slot_start_time?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          updated_at?: string
          wage_status?: string | null
        }
        Update: {
          assignee_id?: string | null
          assigner_id?: string | null
          completion_date?: string | null
          created_at?: string
          date?: string
          deadline?: string | null
          estimated_duration?: number | null
          hours?: number
          id?: string
          invoiced?: boolean
          is_favorite?: boolean | null
          name?: string
          project_id?: string
          reminder_datetime?: string | null
          reminder_time?: string | null
          scheduled_time?: string | null
          slot_end_datetime?: string | null
          slot_end_time?: string | null
          slot_start_datetime?: string | null
          slot_start_time?: string | null
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
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "task_project_info"
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
          entry_type: string | null
          id: string
          start_time: string
          task_id: string
          timer_metadata: string | null
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          duration_minutes?: number | null
          employee_id: string
          end_time?: string | null
          entry_type?: string | null
          id?: string
          start_time: string
          task_id: string
          timer_metadata?: string | null
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          duration_minutes?: number | null
          employee_id?: string
          end_time?: string | null
          entry_type?: string | null
          id?: string
          start_time?: string
          task_id?: string
          timer_metadata?: string | null
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
        ]
      }
      time_events: {
        Row: {
          client_id: string | null
          created_at: string
          deadline: string
          id: string
          project_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          deadline: string
          id?: string
          project_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          deadline?: string
          id?: string
          project_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "task_project_info"
            referencedColumns: ["id"]
          },
        ]
      }
      trada_note_tags: {
        Row: {
          created_at: string
          id: string
          tag_id: string
          trada_note_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tag_id: string
          trada_note_id: string
        }
        Update: {
          created_at?: string
          id?: string
          tag_id?: string
          trada_note_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trada_note_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "trada_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trada_note_tags_trada_note_id_fkey"
            columns: ["trada_note_id"]
            isOneToOne: false
            referencedRelation: "trada_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      trada_notes: {
        Row: {
          client_id: string | null
          content: string
          created_at: string
          id: string
          project_id: string | null
          service_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          content: string
          created_at?: string
          id?: string
          project_id?: string | null
          service_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          content?: string
          created_at?: string
          id?: string
          project_id?: string | null
          service_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trada_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trada_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trada_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "task_project_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trada_notes_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      trada_tags: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
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
      task_project_info: {
        Row: {
          client_name: string | null
          id: string | null
          name: string | null
          service: string | null
        }
        Relationships: []
      }
      task_project_managers: {
        Row: {
          project_manager_id: string | null
          task_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_projects_assignee_employee"
            columns: ["project_manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      apply_rls_policies: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_invoice_with_tasks: {
        Args: {
          p_invoice_id: string
          p_client_id: string
          p_project_id: string
          p_amount: number
          p_hours: number
          p_rate: number
          p_due_date: string
          p_task_ids: string[]
        }
        Returns: Json
      }
      delete_invoice_and_unmark_tasks: {
        Args: { invoice_id_param: string }
        Returns: undefined
      }
      get_active_projects_for_invoicing: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
          status: string
          client_id: string
          client_name: string
          service: string
          type: string
          project_amount: number
        }[]
      }
      get_completed_tasks_for_invoicing: {
        Args: { project_uuid: string }
        Returns: {
          id: string
          name: string
          hours: number
          hourly_rate: number
        }[]
      }
      get_current_user_employee_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_invoice_tasks: {
        Args: { invoice_id_param: string }
        Returns: {
          id: string
          name: string
          hours: number
        }[]
      }
      get_project_info_for_task: {
        Args: { project_uuid: string }
        Returns: {
          id: string
          name: string
          service: string
          client_name: string
        }[]
      }
      get_role_available_pages: {
        Args: { role_name: string }
        Returns: {
          page_name: string
        }[]
      }
      get_role_landing_page: {
        Args: { role_name: string }
        Returns: string
      }
      get_user_client_id: {
        Args: { user_id: string }
        Returns: string
      }
      get_user_employee_id: {
        Args: { user_id: string }
        Returns: string
      }
      get_user_role: {
        Args: { user_id: string }
        Returns: string
      }
      has_role: {
        Args: { _user_id: string; _role: string }
        Returns: boolean
      }
      is_rls_enabled: {
        Args: { role_name: string; page_name: string }
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
      task_status:
        | "Not Started"
        | "In Progress"
        | "Completed"
        | "On Hold"
        | "On-Head"
        | "Targeted"
        | "Imp"
        | "Won"
        | "Lost"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      crud_operation: ["create", "read", "update", "delete"],
      invoice_status: ["Draft", "Sent", "Paid", "Overdue"],
      task_status: [
        "Not Started",
        "In Progress",
        "Completed",
        "On Hold",
        "On-Head",
        "Targeted",
        "Imp",
        "Won",
        "Lost",
      ],
    },
  },
} as const
