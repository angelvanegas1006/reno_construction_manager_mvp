export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      activity_tasks: {
        Row: {
          activity_id: string
          completed: boolean
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          activity_id: string
          completed?: boolean
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          activity_id?: string
          completed?: boolean
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_tasks_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "property_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      category_table: {
        Row: {
          category_name: string | null
          category_name_en: string | null
          created_at: string
          id: number
        }
        Insert: {
          category_name?: string | null
          category_name_en?: string | null
          created_at?: string
          id?: number
        }
        Update: {
          category_name?: string | null
          category_name_en?: string | null
          created_at?: string
          id?: number
        }
        Relationships: []
      }
      inspection_elements: {
        Row: {
          condition: string | null
          created_at: string
          element_name: string
          exists: boolean | null
          id: string
          image_urls: string[] | null
          notes: string | null
          quantity: number | null
          updated_at: string
          video_urls: string[] | null
          zone_id: string
        }
        Insert: {
          condition?: string | null
          created_at?: string
          element_name: string
          exists?: boolean | null
          id?: string
          image_urls?: string[] | null
          notes?: string | null
          quantity?: number | null
          updated_at?: string
          video_urls?: string[] | null
          zone_id: string
        }
        Update: {
          condition?: string | null
          created_at?: string
          element_name?: string
          exists?: boolean | null
          id?: string
          image_urls?: string[] | null
          notes?: string | null
          quantity?: number | null
          updated_at?: string
          video_urls?: string[] | null
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_elements_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "inspection_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_zones: {
        Row: {
          created_at: string
          id: string
          inspection_id: string
          updated_at: string
          zone_name: string
          zone_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          inspection_id: string
          updated_at?: string
          zone_name: string
          zone_type?: string
        }
        Update: {
          created_at?: string
          id?: string
          inspection_id?: string
          updated_at?: string
          zone_name?: string
          zone_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_zones_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "property_inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address: string | null
          airtable_property_id: string | null
          area_cluster: string | null
          bathrooms: number | null
          bedrooms: number | null
          budget_pdf_url: string | null
          "Client email": string | null
          "Client Name": string | null
          created_at: string | null
          drive_folder_id: string | null
          drive_folder_url: string | null
          estimated_end_date: string | null
          "Estimated Visit Date": string | null
          garage: string | null
          has_elevator: boolean | null
          "Hubspot ID": number | null
          id: string
          last_update: string | null
          name: string | null
          needs_foreman_notification: boolean | null
          next_update: string | null
          notes: string | null
          renovation_type: string | null
          "Renovator name": string | null
          "Set Up Status": string | null
          square_meters: number | null
          start_date: string | null
          status: string | null
          team: string | null
          "Technical construction": string | null
          type: string | null
          "Unique ID From Engagements": string | null
          updated_at: string | null
          updated_by: string | null
          reno_phase: string | null
          property_unique_id: string | null
          responsible_owner: string | null
          keys_location: string | null
          stage: string | null
          next_reno_steps: string | null
          pics_urls: string[] | null
          "Days to Start Reno (Since RSD)": number | null
          "Reno Duration": number | null
          "Days to Property Ready": number | null
          days_to_visit: number | null
          assigned_site_manager_email: string | null
          project_id: string | null
          airtable_properties_record_id: string | null
          ready_for_commercialization: boolean | null
        }
        Insert: {
          address?: string | null
          airtable_property_id?: string | null
          airtable_properties_record_id?: string | null
          ready_for_commercialization?: boolean | null
          reno_precheck_comments?: string | null
          reno_precheck_checks?: { categoryChecks?: Record<string, boolean>; itemChecks?: Record<string, boolean> } | null
          area_cluster?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          budget_pdf_url?: string | null
          "Client email"?: string | null
          "Client Name"?: string | null
          created_at?: string | null
          drive_folder_id?: string | null
          drive_folder_url?: string | null
          estimated_end_date?: string | null
          "Estimated Visit Date"?: string | null
          garage?: string | null
          has_elevator?: boolean | null
          "Hubspot ID"?: number | null
          id?: string
          last_update?: string | null
          name?: string | null
          needs_foreman_notification?: boolean | null
          next_update?: string | null
          notes?: string | null
          renovation_type?: string | null
          "Renovator name"?: string | null
          "Set Up Status"?: string | null
          square_meters?: number | null
          start_date?: string | null
          status?: string | null
          team?: string | null
          "Technical construction"?: string | null
          type?: string | null
          "Unique ID From Engagements"?: string | null
          updated_at?: string | null
          updated_by?: string | null
          reno_phase?: string | null
          property_unique_id?: string | null
          responsible_owner?: string | null
          keys_location?: string | null
          stage?: string | null
          next_reno_steps?: string | null
          pics_urls?: string[] | null
          "Days to Start Reno (Sice RSD)"?: number | null
          "Reno Duration"?: number | null
          "Days to Property Ready"?: number | null
          days_to_visit?: number | null
          assigned_site_manager_email?: string | null
          project_id?: string | null
        }
        Update: {
          address?: string | null
          airtable_property_id?: string | null
          airtable_properties_record_id?: string | null
          area_cluster?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          budget_pdf_url?: string | null
          "Client email"?: string | null
          "Client Name"?: string | null
          created_at?: string | null
          drive_folder_id?: string | null
          drive_folder_url?: string | null
          estimated_end_date?: string | null
          "Estimated Visit Date"?: string | null
          garage?: string | null
          has_elevator?: boolean | null
          "Hubspot ID"?: number | null
          id?: string
          last_update?: string | null
          name?: string | null
          needs_foreman_notification?: boolean | null
          next_update?: string | null
          notes?: string | null
          renovation_type?: string | null
          "Renovator name"?: string | null
          "Set Up Status"?: string | null
          square_meters?: number | null
          start_date?: string | null
          status?: string | null
          team?: string | null
          "Technical construction"?: string | null
          type?: string | null
          "Unique ID From Engagements"?: string | null
          updated_at?: string | null
          updated_by?: string | null
          reno_phase?: string | null
          property_unique_id?: string | null
          responsible_owner?: string | null
          keys_location?: string | null
          stage?: string | null
          next_reno_steps?: string | null
          pics_urls?: string[] | null
          "Days to Start Reno (Sice RSD)"?: number | null
          "Reno Duration"?: number | null
          "Days to Property Ready"?: number | null
          days_to_visit?: number | null
          assigned_site_manager_email?: string | null
          project_id?: string | null
          ready_for_commercialization?: boolean | null
          reno_precheck_comments?: string | null
          reno_precheck_checks?: { categoryChecks?: Record<string, boolean>; itemChecks?: Record<string, boolean> } | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          id: string
          name: string | null
          airtable_project_id: string | null
          reno_phase: string | null
          created_at: string | null
          updated_at: string | null
          investment_type: string | null
          properties_to_convert: string | null
          project_start_date: string | null
          renovation_spend: number | null
          project_unique_id: string | null
          estimated_settlement_date: string | null
          project_status: string | null
          drive_folder: string | null
          area_cluster: string | null
          project_set_up_team_notes: string | null
          project_keys_location: string | null
          renovator: string | null
          est_reno_start_date: string | null
          reno_start_date: string | null
          reno_end_date: string | null
          est_reno_end_date: string | null
          type: string | null
          reno_duration: number | null
          project_address: string | null
          settlement_date: string | null
          already_tenanted: string | null
          operation_name: string | null
          opportunity_stage: string | null
          scouter: string | null
          lead: string | null
        }
        Insert: {
          id?: string
          name?: string | null
          airtable_project_id?: string | null
          reno_phase?: string | null
          created_at?: string | null
          updated_at?: string | null
          investment_type?: string | null
          properties_to_convert?: string | null
          project_start_date?: string | null
          renovation_spend?: number | null
          project_unique_id?: string | null
          estimated_settlement_date?: string | null
          project_status?: string | null
          drive_folder?: string | null
          area_cluster?: string | null
          project_set_up_team_notes?: string | null
          project_keys_location?: string | null
          renovator?: string | null
          est_reno_start_date?: string | null
          reno_start_date?: string | null
          reno_end_date?: string | null
          est_reno_end_date?: string | null
          type?: string | null
          reno_duration?: number | null
          project_address?: string | null
          settlement_date?: string | null
          already_tenanted?: string | null
          operation_name?: string | null
          opportunity_stage?: string | null
          scouter?: string | null
          lead?: string | null
        }
        Update: {
          id?: string
          name?: string | null
          airtable_project_id?: string | null
          reno_phase?: string | null
          created_at?: string | null
          updated_at?: string | null
          investment_type?: string | null
          properties_to_convert?: string | null
          project_start_date?: string | null
          renovation_spend?: number | null
          project_unique_id?: string | null
          estimated_settlement_date?: string | null
          project_status?: string | null
          drive_folder?: string | null
          area_cluster?: string | null
          project_set_up_team_notes?: string | null
          project_keys_location?: string | null
          renovator?: string | null
          est_reno_start_date?: string | null
          reno_start_date?: string | null
          reno_end_date?: string | null
          est_reno_end_date?: string | null
          type?: string | null
          reno_duration?: number | null
          project_address?: string | null
          settlement_date?: string | null
          already_tenanted?: string | null
          operation_name?: string | null
          opportunity_stage?: string | null
          scouter?: string | null
          lead?: string | null
        }
        Relationships: []
      }
      property_activities: {
        Row: {
          category_id: number | null
          created_at: string | null
          details: string | null
          id: string
          name: string
          percentage: number | null
          property_id: string | null
          updated_at: string | null
        }
        Insert: {
          category_id?: number | null
          created_at?: string | null
          details?: string | null
          id?: string
          name: string
          percentage?: number | null
          property_id?: string | null
          updated_at?: string | null
        }
        Update: {
          category_id?: number | null
          created_at?: string | null
          details?: string | null
          id?: string
          name?: string
          percentage?: number | null
          property_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_activities_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "category_table"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_activities_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_activities_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_activities_view"
            referencedColumns: ["property_id"]
          },
        ]
      }
      property_dynamic_categories: {
        Row: {
          activities_text: string | null
          budget_index: number | null
          category_name: string
          created_at: string
          id: string
          percentage: number | null
          property_id: string
          updated_at: string
        }
        Insert: {
          activities_text?: string | null
          budget_index?: number | null
          category_name: string
          created_at?: string
          id?: string
          percentage?: number | null
          property_id: string
          updated_at?: string
        }
        Update: {
          activities_text?: string | null
          budget_index?: number | null
          category_name?: string
          created_at?: string
          id?: string
          percentage?: number | null
          property_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_dynamic_categories_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_dynamic_categories_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_activities_view"
            referencedColumns: ["property_id"]
          },
        ]
      }
      property_images: {
        Row: {
          created_at: string
          created_by: string | null
          filename: string | null
          id: string
          metadata: Json | null
          property_id: string
          updated_by: string | null
          url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          filename?: string | null
          id?: string
          metadata?: Json | null
          property_id: string
          updated_by?: string | null
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          filename?: string | null
          id?: string
          metadata?: Json | null
          property_id?: string
          updated_by?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_images_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_images_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_activities_view"
            referencedColumns: ["property_id"]
          },
        ]
      }
      property_inspections: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          has_elevator: boolean
          id: string
          inspection_status: string | null
          inspection_type: string | null
          metadata: Json | null
          pdf_url: string | null
          property_id: string
          public_link_id: string | null
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          has_elevator?: boolean
          id?: string
          inspection_status?: string | null
          inspection_type?: string | null
          metadata?: Json | null
          pdf_url?: string | null
          property_id: string
          public_link_id?: string | null
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          has_elevator?: boolean
          id?: string
          inspection_status?: string | null
          inspection_type?: string | null
          metadata?: Json | null
          pdf_url?: string | null
          property_id?: string
          public_link_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_inspections_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_inspections_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_activities_view"
            referencedColumns: ["property_id"]
          },
        ]
      }
      property_comments: {
        Row: {
          id: string
          property_id: string
          comment_text: string
          created_by: string | null
          created_at: string
          updated_at: string
          synced_to_airtable: boolean
          airtable_sync_date: string | null
          is_reminder: boolean | null
          reminder_date: string | null
          reminder_notified: boolean | null
          reminder_notification_date: string | null
        }
        Insert: {
          id?: string
          property_id: string
          comment_text: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
          synced_to_airtable?: boolean
          airtable_sync_date?: string | null
          is_reminder?: boolean | null
          reminder_date?: string | null
          reminder_notified?: boolean | null
          reminder_notification_date?: string | null
        }
        Update: {
          id?: string
          property_id?: string
          comment_text?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
          synced_to_airtable?: boolean
          airtable_sync_date?: string | null
          is_reminder?: boolean | null
          reminder_date?: string | null
          reminder_notified?: boolean | null
          reminder_notification_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_property_comments_property"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_reminders: {
        Row: {
          id: string
          comment_id: string
          property_id: string
          reminder_text: string
          reminder_date: string
          created_by: string | null
          notified: boolean
          notification_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          comment_id: string
          property_id: string
          reminder_text: string
          reminder_date: string
          created_by?: string | null
          notified?: boolean
          notification_date?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          comment_id?: string
          property_id?: string
          reminder_text?: string
          reminder_date?: string
          created_by?: string | null
          notified?: boolean
          notification_date?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_property_reminders_property"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_reminders_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "property_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      property_visits: {
        Row: {
          id: string
          property_id: string
          visit_date: string
          visit_type: string
          notes: string | null
          created_by: string | null
          notified: boolean
          notification_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          property_id: string
          visit_date: string
          visit_type?: string
          notes?: string | null
          created_by?: string | null
          notified?: boolean
          notification_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          property_id?: string
          visit_date?: string
          visit_type?: string
          notes?: string | null
          created_by?: string | null
          notified?: boolean
          notification_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_property_visits_property"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      user_column_preferences: {
        Row: {
          id: string
          user_id: string
          view_type: string
          phase: string
          visible_columns: string[]
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          view_type: string
          phase: string
          visible_columns?: string[]
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          view_type?: string
          phase?: string
          visible_columns?: string[]
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_column_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wrappers_fdw_stats: {
        Row: {
          bytes_in: number | null
          bytes_out: number | null
          create_times: number | null
          created_at: string
          fdw_name: string
          metadata: Json | null
          rows_in: number | null
          rows_out: number | null
          updated_at: string
        }
        Insert: {
          bytes_in?: number | null
          bytes_out?: number | null
          create_times?: number | null
          created_at?: string
          fdw_name: string
          metadata?: Json | null
          rows_in?: number | null
          rows_out?: number | null
          updated_at?: string
        }
        Update: {
          bytes_in?: number | null
          bytes_out?: number | null
          create_times?: number | null
          created_at?: string
          fdw_name?: string
          metadata?: Json | null
          rows_in?: number | null
          rows_out?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      category_updates: {
        Row: {
          id: string
          category_id: string
          property_id: string
          previous_percentage: number | null
          new_percentage: number
          photos: string[] | null
          videos: string[] | null
          notes: string | null
          category_text: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          category_id: string
          property_id: string
          previous_percentage?: number | null
          new_percentage: number
          photos?: string[] | null
          videos?: string[] | null
          notes?: string | null
          category_text?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          category_id?: string
          property_id?: string
          previous_percentage?: number | null
          new_percentage?: number
          photos?: string[] | null
          videos?: string[] | null
          notes?: string | null
          category_text?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_category_updates_category"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "property_dynamic_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_category_updates_property"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      client_update_emails: {
        Row: {
          id: string
          property_id: string
          html_content: string
          client_email: string | null
          subject: string | null
          sent_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          property_id: string
          html_content: string
          client_email?: string | null
          subject?: string | null
          sent_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          property_id?: string
          html_content?: string
          client_email?: string | null
          subject?: string | null
          sent_at?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_client_update_emails_property"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      rent_contracts: {
        Row: {
          id: string
          tenant_id: string | null
          property_id: string | null
          start_date: string
          end_date: string | null
          monthly_rent: number
          deposit: number | null
          status: string
          contract_number: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id?: string | null
          property_id?: string | null
          start_date: string
          end_date?: string | null
          monthly_rent: number
          deposit?: number | null
          status?: string
          contract_number?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string | null
          property_id?: string | null
          start_date?: string
          end_date?: string | null
          monthly_rent?: number
          deposit?: number | null
          status?: string
          contract_number?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rent_contracts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "rent_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_contracts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "rent_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      rent_properties: {
        Row: {
          id: string
          property_id: string | null
          address: string
          monthly_rent: number | null
          status: string
          bedrooms: number | null
          bathrooms: number | null
          square_meters: number | null
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          property_id?: string | null
          address: string
          monthly_rent?: number | null
          status?: string
          bedrooms?: number | null
          bathrooms?: number | null
          square_meters?: number | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          property_id?: string | null
          address?: string
          monthly_rent?: number | null
          status?: string
          bedrooms?: number | null
          bathrooms?: number | null
          square_meters?: number | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rent_properties_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      rent_tenants: {
        Row: {
          id: string
          property_id: string | null
          name: string
          email: string | null
          phone: string | null
          id_number: string | null
          status: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          property_id?: string | null
          name: string
          email?: string | null
          phone?: string | null
          id_number?: string | null
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          property_id?: string | null
          name?: string
          email?: string | null
          phone?: string | null
          id_number?: string | null
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rent_tenants_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "rent_properties"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      properties_activities_view: {
        Row: {
          address: string | null
          Bathroom: string | null
          budget_pdf_url: string | null
          Carpentry: string | null
          Coatings: string | null
          Contingencies: string | null
          Demolitions: string | null
          "Electricity, lighting and telecom": string | null
          "Heating and air conditioning": string | null
          Kitchen: string | null
          "Masonry Help": string | null
          notes: string | null
          Paintings: string | null
          "Partition walls": string | null
          "Plumbing and sanitation": string | null
          "Pre work activities": string | null
          property_id: string | null
          Various: string | null
          Ventilation: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      calculate_next_update_date: {
        Args: { last_update_date?: string; renovation_type: string }
        Returns: string
      }
      needs_update_next_week: {
        Args: { next_update_date: string }
        Returns: boolean
      }
      needs_update_this_week: {
        Args: { next_update_date: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "construction_manager" | "foreman" | "user"
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

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "construction_manager", "foreman", "user"],
    },
  },
} as const

