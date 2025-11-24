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
        }
        Insert: {
          address?: string | null
          airtable_property_id?: string | null
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
        }
        Update: {
          address?: string | null
          airtable_property_id?: string | null
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
          category_name: string
          created_at: string
          id: string
          percentage: number | null
          property_id: string
          updated_at: string
        }
        Insert: {
          activities_text?: string | null
          category_name: string
          created_at?: string
          id?: string
          percentage?: number | null
          property_id: string
          updated_at?: string
        }
        Update: {
          activities_text?: string | null
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
          created_at: string
          created_by: string | null
          has_elevator: boolean
          id: string
          inspection_status: string | null
          metadata: Json | null
          pdf_url: string | null
          property_id: string
          public_link_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          has_elevator?: boolean
          id?: string
          inspection_status?: string | null
          metadata?: Json | null
          pdf_url?: string | null
          property_id: string
          public_link_id?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          has_elevator?: boolean
          id?: string
          inspection_status?: string | null
          metadata?: Json | null
          pdf_url?: string | null
          property_id?: string
          public_link_id?: string
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
      app_role: "admin" | "foreman" | "user"
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
      app_role: ["admin", "foreman", "user"],
    },
  },
} as const

