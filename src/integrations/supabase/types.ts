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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          appointment_date: string
          consultation_type: string | null
          created_at: string | null
          doctor_id: string | null
          duration_minutes: number | null
          fee: number | null
          id: string
          meeting_room_id: string | null
          notes: string | null
          patient_id: string | null
          payment_status: string | null
          prescription: string | null
          specialty_id: string | null
          status: string | null
          suggested_time: string | null
          symptoms: string | null
          updated_at: string | null
        }
        Insert: {
          appointment_date: string
          consultation_type?: string | null
          created_at?: string | null
          doctor_id?: string | null
          duration_minutes?: number | null
          fee?: number | null
          id?: string
          meeting_room_id?: string | null
          notes?: string | null
          patient_id?: string | null
          payment_status?: string | null
          prescription?: string | null
          specialty_id?: string | null
          status?: string | null
          suggested_time?: string | null
          symptoms?: string | null
          updated_at?: string | null
        }
        Update: {
          appointment_date?: string
          consultation_type?: string | null
          created_at?: string | null
          doctor_id?: string | null
          duration_minutes?: number | null
          fee?: number | null
          id?: string
          meeting_room_id?: string | null
          notes?: string | null
          patient_id?: string | null
          payment_status?: string | null
          prescription?: string | null
          specialty_id?: string | null
          status?: string | null
          suggested_time?: string | null
          symptoms?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_specialty_id_fkey"
            columns: ["specialty_id"]
            isOneToOne: false
            referencedRelation: "specialties"
            referencedColumns: ["id"]
          },
        ]
      }
      call_sessions: {
        Row: {
          call_type: string
          created_at: string
          doctor_id: string
          duration_minutes: number | null
          ended_at: string | null
          id: string
          notes: string | null
          patient_id: string
          room_id: string | null
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          call_type: string
          created_at?: string
          doctor_id: string
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          room_id?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          call_type?: string
          created_at?: string
          doctor_id?: string
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          room_id?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_sessions_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_sessions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          appointment_id: string | null
          created_at: string | null
          delivered_at: string | null
          file_type: string | null
          file_url: string | null
          id: string
          is_read: boolean
          message: string
          message_type: string | null
          read_at: string | null
          sender_id: string | null
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_read?: boolean
          message: string
          message_type?: string | null
          read_at?: string | null
          sender_id?: string | null
        }
        Update: {
          appointment_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_read?: boolean
          message?: string
          message_type?: string | null
          read_at?: string | null
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_conversations: {
        Row: {
          context: Json | null
          created_at: string
          id: string
          messages: Json
          session_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string
          id?: string
          messages?: Json
          session_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string
          id?: string
          messages?: Json
          session_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_availability: {
        Row: {
          created_at: string | null
          day_of_week: number | null
          doctor_id: string | null
          end_time: string
          id: string
          is_available: boolean | null
          start_time: string
        }
        Insert: {
          created_at?: string | null
          day_of_week?: number | null
          doctor_id?: string | null
          end_time: string
          id?: string
          is_available?: boolean | null
          start_time: string
        }
        Update: {
          created_at?: string | null
          day_of_week?: number | null
          doctor_id?: string | null
          end_time?: string
          id?: string
          is_available?: boolean | null
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_availability_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_online_status: {
        Row: {
          created_at: string
          doctor_id: string
          id: string
          is_online: boolean
          last_seen: string
          status_message: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          doctor_id: string
          id?: string
          is_online?: boolean
          last_seen?: string
          status_message?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          doctor_id?: string
          id?: string
          is_online?: boolean
          last_seen?: string
          status_message?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_online_status_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_posts: {
        Row: {
          content: string
          created_at: string
          doctor_id: string
          id: string
          is_published: boolean
          likes_count: number
          tags: string[] | null
          title: string
          updated_at: string
          views_count: number
        }
        Insert: {
          content: string
          created_at?: string
          doctor_id: string
          id?: string
          is_published?: boolean
          likes_count?: number
          tags?: string[] | null
          title: string
          updated_at?: string
          views_count?: number
        }
        Update: {
          content?: string
          created_at?: string
          doctor_id?: string
          id?: string
          is_published?: boolean
          likes_count?: number
          tags?: string[] | null
          title?: string
          updated_at?: string
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "doctor_posts_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_profiles: {
        Row: {
          bio: string | null
          consultation_fee: number | null
          created_at: string | null
          doctor_type: string | null
          education: string[] | null
          experience_years: number | null
          hospital_id: string | null
          hospital_name: string | null
          id: string
          is_available: boolean | null
          is_private: boolean | null
          is_verified: boolean | null
          languages: string[] | null
          license_number: string
          rating: number | null
          specialty_id: string | null
          total_reviews: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          bio?: string | null
          consultation_fee?: number | null
          created_at?: string | null
          doctor_type?: string | null
          education?: string[] | null
          experience_years?: number | null
          hospital_id?: string | null
          hospital_name?: string | null
          id?: string
          is_available?: boolean | null
          is_private?: boolean | null
          is_verified?: boolean | null
          languages?: string[] | null
          license_number: string
          rating?: number | null
          specialty_id?: string | null
          total_reviews?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          bio?: string | null
          consultation_fee?: number | null
          created_at?: string | null
          doctor_type?: string | null
          education?: string[] | null
          experience_years?: number | null
          hospital_id?: string | null
          hospital_name?: string | null
          id?: string
          is_available?: boolean | null
          is_private?: boolean | null
          is_verified?: boolean | null
          languages?: string[] | null
          license_number?: string
          rating?: number | null
          specialty_id?: string | null
          total_reviews?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doctor_profiles_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_profiles_specialty_id_fkey"
            columns: ["specialty_id"]
            isOneToOne: false
            referencedRelation: "specialties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_timetable: {
        Row: {
          created_at: string | null
          day_of_week: number
          doctor_id: string
          end_time: string
          id: string
          is_available: boolean | null
          location: string | null
          start_time: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          day_of_week: number
          doctor_id: string
          end_time: string
          id?: string
          is_available?: boolean | null
          location?: string | null
          start_time: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          day_of_week?: number
          doctor_id?: string
          end_time?: string
          id?: string
          is_available?: boolean | null
          location?: string | null
          start_time?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      hospitals: {
        Row: {
          address: string
          created_at: string
          description: string | null
          email: string | null
          id: string
          is_promoted: boolean | null
          is_verified: boolean | null
          name: string
          owner_id: string
          phone: string | null
          promotion_expires_at: string | null
          rating: number | null
          services: string[] | null
          total_reviews: number | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address: string
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_promoted?: boolean | null
          is_verified?: boolean | null
          name: string
          owner_id: string
          phone?: string | null
          promotion_expires_at?: string | null
          rating?: number | null
          services?: string[] | null
          total_reviews?: number | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_promoted?: boolean | null
          is_verified?: boolean | null
          name?: string
          owner_id?: string
          phone?: string | null
          promotion_expires_at?: string | null
          rating?: number | null
          services?: string[] | null
          total_reviews?: number | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hospitals_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      laboratories: {
        Row: {
          address: string
          created_at: string
          description: string | null
          email: string | null
          id: string
          is_promoted: boolean | null
          is_verified: boolean | null
          name: string
          owner_id: string
          phone: string | null
          promotion_expires_at: string | null
          rating: number | null
          test_types: string[] | null
          total_reviews: number | null
          updated_at: string
        }
        Insert: {
          address: string
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_promoted?: boolean | null
          is_verified?: boolean | null
          name: string
          owner_id: string
          phone?: string | null
          promotion_expires_at?: string | null
          rating?: number | null
          test_types?: string[] | null
          total_reviews?: number | null
          updated_at?: string
        }
        Update: {
          address?: string
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_promoted?: boolean | null
          is_verified?: boolean | null
          name?: string
          owner_id?: string
          phone?: string | null
          promotion_expires_at?: string | null
          rating?: number | null
          test_types?: string[] | null
          total_reviews?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "laboratories_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_records: {
        Row: {
          created_at: string
          description: string | null
          doctor_id: string | null
          file_url: string | null
          id: string
          patient_id: string
          record_type: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          doctor_id?: string | null
          file_url?: string | null
          id?: string
          patient_id: string
          record_type: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          doctor_id?: string | null
          file_url?: string | null
          id?: string
          patient_id?: string
          record_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      medication_reminders: {
        Row: {
          created_at: string
          dosage: string
          frequency: string
          id: string
          is_active: boolean
          name: string
          next_reminder: string | null
          patient_id: string
          time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dosage: string
          frequency: string
          id?: string
          is_active?: boolean
          name: string
          next_reminder?: string | null
          patient_id: string
          time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dosage?: string
          frequency?: string
          id?: string
          is_active?: boolean
          name?: string
          next_reminder?: string | null
          patient_id?: string
          time?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          appointment_reminders: boolean
          call_notifications: boolean
          created_at: string
          email_notifications: boolean
          id: string
          message_notifications: boolean
          push_notifications: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          appointment_reminders?: boolean
          call_notifications?: boolean
          created_at?: string
          email_notifications?: boolean
          id?: string
          message_notifications?: boolean
          push_notifications?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          appointment_reminders?: boolean
          call_notifications?: boolean
          created_at?: string
          email_notifications?: boolean
          id?: string
          message_notifications?: boolean
          push_notifications?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          appointment_id: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          related_id: string | null
          title: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          related_id?: string | null
          title: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          appointment_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          related_id?: string | null
          title?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_problem_indicators: {
        Row: {
          created_at: string | null
          has_urgent_problem: boolean | null
          id: string
          patient_id: string
          problem_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          has_urgent_problem?: boolean | null
          id?: string
          patient_id: string
          problem_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          has_urgent_problem?: boolean | null
          id?: string
          patient_id?: string
          problem_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_problem_indicators_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_problem_indicators_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "patient_problems"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_problems: {
        Row: {
          attachments: Json | null
          category: string
          created_at: string
          id: string
          patient_id: string
          problem_text: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string
          urgency_level: string
        }
        Insert: {
          attachments?: Json | null
          category: string
          created_at?: string
          id?: string
          patient_id: string
          problem_text: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
          urgency_level?: string
        }
        Update: {
          attachments?: Json | null
          category?: string
          created_at?: string
          id?: string
          patient_id?: string
          problem_text?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
          urgency_level?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_problems_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_problems_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_profiles: {
        Row: {
          allergies: string[] | null
          blood_type: string | null
          created_at: string | null
          current_medications: string[] | null
          date_of_birth: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          gender: string | null
          id: string
          medical_history: string[] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          allergies?: string[] | null
          blood_type?: string | null
          created_at?: string | null
          current_medications?: string[] | null
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          gender?: string | null
          id?: string
          medical_history?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          allergies?: string[] | null
          blood_type?: string | null
          created_at?: string | null
          current_medications?: string[] | null
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          gender?: string | null
          id?: string
          medical_history?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacies: {
        Row: {
          address: string
          created_at: string
          description: string | null
          email: string | null
          id: string
          is_promoted: boolean | null
          is_verified: boolean | null
          location_lat: number | null
          location_lng: number | null
          medications_available: string[] | null
          name: string
          owner_id: string
          phone: string | null
          promotion_expires_at: string | null
          rating: number | null
          services: string[] | null
          total_reviews: number | null
          updated_at: string
        }
        Insert: {
          address: string
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_promoted?: boolean | null
          is_verified?: boolean | null
          location_lat?: number | null
          location_lng?: number | null
          medications_available?: string[] | null
          name: string
          owner_id: string
          phone?: string | null
          promotion_expires_at?: string | null
          rating?: number | null
          services?: string[] | null
          total_reviews?: number | null
          updated_at?: string
        }
        Update: {
          address?: string
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_promoted?: boolean | null
          is_verified?: boolean | null
          location_lat?: number | null
          location_lng?: number | null
          medications_available?: string[] | null
          name?: string
          owner_id?: string
          phone?: string | null
          promotion_expires_at?: string | null
          rating?: number | null
          services?: string[] | null
          total_reviews?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pharmacies_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_medicines: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          in_stock: boolean | null
          name: string
          pharmacy_id: string
          price: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          in_stock?: boolean | null
          name: string
          pharmacy_id: string
          price?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          in_stock?: boolean | null
          name?: string
          pharmacy_id?: string
          price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_medicines_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "doctor_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          country: string | null
          country_code: string | null
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string | null
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      promotions: {
        Row: {
          created_at: string
          description: string | null
          end_date: string
          entity_id: string
          entity_type: string
          id: string
          is_active: boolean | null
          owner_id: string
          payment_amount: number
          payment_status: string | null
          start_date: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date: string
          entity_id: string
          entity_type: string
          id?: string
          is_active?: boolean | null
          owner_id: string
          payment_amount: number
          payment_status?: string | null
          start_date: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string
          entity_id?: string
          entity_type?: string
          id?: string
          is_active?: boolean | null
          owner_id?: string
          payment_amount?: number
          payment_status?: string | null
          start_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotions_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          appointment_id: string | null
          created_at: string | null
          doctor_id: string | null
          id: string
          patient_id: string | null
          rating: number | null
          review_text: string | null
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string | null
          doctor_id?: string | null
          id?: string
          patient_id?: string | null
          rating?: number | null
          review_text?: string | null
        }
        Update: {
          appointment_id?: string | null
          created_at?: string | null
          doctor_id?: string | null
          id?: string
          patient_id?: string | null
          rating?: number | null
          review_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_doctors: {
        Row: {
          created_at: string
          doctor_id: string
          id: string
          patient_id: string
        }
        Insert: {
          created_at?: string
          doctor_id: string
          id?: string
          patient_id: string
        }
        Update: {
          created_at?: string
          doctor_id?: string
          id?: string
          patient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_doctors_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_doctors_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      specialties: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_username_available: {
        Args: { username_to_check: string }
        Returns: boolean
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_post_views: {
        Args: { post_id_param: string }
        Returns: undefined
      }
      is_super_admin: {
        Args: { _user_id: string }
        Returns: boolean
      }
      update_doctor_online_status: {
        Args: { is_online_param: boolean; status_message_param?: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "patient"
        | "doctor"
        | "hospital_owner"
        | "pharmacy_owner"
        | "lab_owner"
        | "admin"
        | "super_admin"
        | "polyclinic_owner"
      user_role:
        | "patient"
        | "doctor"
        | "admin"
        | "hospital_owner"
        | "pharmacy_owner"
        | "lab_owner"
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
      app_role: [
        "patient",
        "doctor",
        "hospital_owner",
        "pharmacy_owner",
        "lab_owner",
        "admin",
        "super_admin",
        "polyclinic_owner",
      ],
      user_role: [
        "patient",
        "doctor",
        "admin",
        "hospital_owner",
        "pharmacy_owner",
        "lab_owner",
      ],
    },
  },
} as const
