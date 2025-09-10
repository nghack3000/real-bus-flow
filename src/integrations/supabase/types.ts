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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      booking_seats: {
        Row: {
          booking_id: string
          created_at: string | null
          id: string
          seat_id: string
        }
        Insert: {
          booking_id: string
          created_at?: string | null
          id?: string
          seat_id: string
        }
        Update: {
          booking_id?: string
          created_at?: string | null
          id?: string
          seat_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_seats_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_seats_seat_id_fkey"
            columns: ["seat_id"]
            isOneToOne: false
            referencedRelation: "seats"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booking_reference: string
          created_at: string | null
          id: string
          passenger_email: string
          passenger_name: string
          passenger_phone: string | null
          payment_status: string | null
          seat_numbers: string[]
          total_amount: number
          trip_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          booking_reference: string
          created_at?: string | null
          id?: string
          passenger_email: string
          passenger_name: string
          passenger_phone?: string | null
          payment_status?: string | null
          seat_numbers: string[]
          total_amount: number
          trip_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          booking_reference?: string
          created_at?: string | null
          id?: string
          passenger_email?: string
          passenger_name?: string
          passenger_phone?: string | null
          payment_status?: string | null
          seat_numbers?: string[]
          total_amount?: number
          trip_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "bus_trips"
            referencedColumns: ["id"]
          },
        ]
      }
      bus_trips: {
        Row: {
          arrival_time: string
          base_price: number
          booking_window_end: string
          booking_window_start: string | null
          bus_type: Database["public"]["Enums"]["bus_type"]
          created_at: string | null
          departure_time: string
          id: string
          organizer_id: string
          route_from: string
          route_to: string
          seat_layout: Json
          total_seats: number
          updated_at: string | null
        }
        Insert: {
          arrival_time: string
          base_price: number
          booking_window_end: string
          booking_window_start?: string | null
          bus_type?: Database["public"]["Enums"]["bus_type"]
          created_at?: string | null
          departure_time: string
          id?: string
          organizer_id: string
          route_from: string
          route_to: string
          seat_layout: Json
          total_seats?: number
          updated_at?: string | null
        }
        Update: {
          arrival_time?: string
          base_price?: number
          booking_window_end?: string
          booking_window_start?: string | null
          bus_type?: Database["public"]["Enums"]["bus_type"]
          created_at?: string | null
          departure_time?: string
          id?: string
          organizer_id?: string
          route_from?: string
          route_to?: string
          seat_layout?: Json
          total_seats?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          phone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      seat_holds: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          seat_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          seat_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          seat_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seat_holds_seat_id_fkey"
            columns: ["seat_id"]
            isOneToOne: true
            referencedRelation: "seats"
            referencedColumns: ["id"]
          },
        ]
      }
      seats: {
        Row: {
          column_position: number
          created_at: string | null
          id: string
          price: number
          row_number: number
          seat_number: string
          seat_type: string | null
          status: Database["public"]["Enums"]["seat_status"] | null
          trip_id: string
          updated_at: string | null
        }
        Insert: {
          column_position: number
          created_at?: string | null
          id?: string
          price: number
          row_number: number
          seat_number: string
          seat_type?: string | null
          status?: Database["public"]["Enums"]["seat_status"] | null
          trip_id: string
          updated_at?: string | null
        }
        Update: {
          column_position?: number
          created_at?: string | null
          id?: string
          price?: number
          row_number?: number
          seat_number?: string
          seat_type?: string | null
          status?: Database["public"]["Enums"]["seat_status"] | null
          trip_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seats_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "bus_trips"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_holds: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      bus_type: "standard" | "luxury" | "double_decker"
      seat_status: "available" | "held" | "sold"
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
      bus_type: ["standard", "luxury", "double_decker"],
      seat_status: ["available", "held", "sold"],
    },
  },
} as const
