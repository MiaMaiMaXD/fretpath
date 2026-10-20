
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "courses": {
                  Row: {
                    "cover_url": string | null,"created_at": string,"description": string | null,"id": string,"is_free": boolean,"price_thb": number | null,"slug": string,"sort_order": number,"status": Database["public"]['Enums']["content_status"],"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cover_url"?: string | null,"created_at"?: string,"description"?: string | null,"id"?: string,"is_free"?: boolean,"price_thb"?: number | null,"slug": string,"sort_order"?: number,"status"?: Database["public"]['Enums']["content_status"],"title": string,"updated_at"?: string
                  }
                  Update: {
                    "cover_url"?: string | null,"created_at"?: string,"description"?: string | null,"id"?: string,"is_free"?: boolean,"price_thb"?: number | null,"slug"?: string,"sort_order"?: number,"status"?: Database["public"]['Enums']["content_status"],"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"enrollments": {
                  Row: {
                    "course_id": string,"created_at": string,"enrolled_at": string,"source": Database["public"]['Enums']["enrollment_source"],"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "course_id": string,"created_at"?: string,"enrolled_at"?: string,"source"?: Database["public"]['Enums']["enrollment_source"],"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "course_id"?: string,"created_at"?: string,"enrolled_at"?: string,"source"?: Database["public"]['Enums']["enrollment_source"],"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "enrollments_course_id_fkey"
      columns: ["course_id"]
isOneToOne: false
      referencedRelation: "courses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "enrollments_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"lesson_contents": {
                  Row: {
                    "content_md": string,"created_at": string,"lesson_id": string,"updated_at": string,"video_url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "content_md"?: string,"created_at"?: string,"lesson_id": string,"updated_at"?: string,"video_url"?: string | null
                  }
                  Update: {
                    "content_md"?: string,"created_at"?: string,"lesson_id"?: string,"updated_at"?: string,"video_url"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "lesson_contents_lesson_id_fkey"
      columns: ["lesson_id"]
isOneToOne: true
      referencedRelation: "lessons"
      referencedColumns: ["id"]
    }
                  ]
                },"lesson_progress": {
                  Row: {
                    "best_score": number | null,"completed_at": string | null,"created_at": string,"lesson_id": string,"status": Database["public"]['Enums']["progress_status"],"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "best_score"?: number | null,"completed_at"?: string | null,"created_at"?: string,"lesson_id": string,"status"?: Database["public"]['Enums']["progress_status"],"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "best_score"?: number | null,"completed_at"?: string | null,"created_at"?: string,"lesson_id"?: string,"status"?: Database["public"]['Enums']["progress_status"],"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lesson_progress_lesson_id_fkey"
      columns: ["lesson_id"]
isOneToOne: false
      referencedRelation: "lessons"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lesson_progress_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"lessons": {
                  Row: {
                    "course_id": string,"created_at": string,"id": string,"pass_score": number,"slug": string,"sort_order": number,"status": Database["public"]['Enums']["content_status"],"summary": string | null,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "course_id": string,"created_at"?: string,"id"?: string,"pass_score"?: number,"slug": string,"sort_order": number,"status"?: Database["public"]['Enums']["content_status"],"summary"?: string | null,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "course_id"?: string,"created_at"?: string,"id"?: string,"pass_score"?: number,"slug"?: string,"sort_order"?: number,"status"?: Database["public"]['Enums']["content_status"],"summary"?: string | null,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lessons_course_id_fkey"
      columns: ["course_id"]
isOneToOne: false
      referencedRelation: "courses"
      referencedColumns: ["id"]
    }
                  ]
                },"practice_logs": {
                  Row: {
                    "activity": string,"created_at": string,"id": string,"lesson_id": string | null,"minutes": number,"note": string | null,"practiced_on": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activity": string,"created_at"?: string,"id"?: string,"lesson_id"?: string | null,"minutes": number,"note"?: string | null,"practiced_on": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "activity"?: string,"created_at"?: string,"id"?: string,"lesson_id"?: string | null,"minutes"?: number,"note"?: string | null,"practiced_on"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "practice_logs_lesson_id_fkey"
      columns: ["lesson_id"]
isOneToOne: false
      referencedRelation: "lessons"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "practice_logs_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_url": string | null,"created_at": string,"display_name": string | null,"id": string,"role": Database["public"]['Enums']["user_role"],"updated_at": string,"weekly_goal_minutes": number
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_url"?: string | null,"created_at"?: string,"display_name"?: string | null,"id": string,"role"?: Database["public"]['Enums']["user_role"],"updated_at"?: string,"weekly_goal_minutes"?: number
                  }
                  Update: {
                    "avatar_url"?: string | null,"created_at"?: string,"display_name"?: string | null,"id"?: string,"role"?: Database["public"]['Enums']["user_role"],"updated_at"?: string,"weekly_goal_minutes"?: number
                  }
                  Relationships: [
                    
                  ]
                },"quiz_answer_keys": {
                  Row: {
                    "correct_choice_id": string,"created_at": string,"explanation": string | null,"question_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "correct_choice_id": string,"created_at"?: string,"explanation"?: string | null,"question_id": string,"updated_at"?: string
                  }
                  Update: {
                    "correct_choice_id"?: string,"created_at"?: string,"explanation"?: string | null,"question_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "quiz_answer_keys_correct_choice_id_question_id_fkey"
      columns: ["correct_choice_id","question_id"]
isOneToOne: false
      referencedRelation: "quiz_choices"
      referencedColumns: ["id","question_id"]
    },{
      foreignKeyName: "quiz_answer_keys_question_id_fkey"
      columns: ["question_id"]
isOneToOne: true
      referencedRelation: "quiz_questions"
      referencedColumns: ["id"]
    }
                  ]
                },"quiz_attempt_answers": {
                  Row: {
                    "attempt_id": string,"choice_id": string,"created_at": string,"is_correct": boolean,"question_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attempt_id": string,"choice_id": string,"created_at"?: string,"is_correct": boolean,"question_id": string,"updated_at"?: string
                  }
                  Update: {
                    "attempt_id"?: string,"choice_id"?: string,"created_at"?: string,"is_correct"?: boolean,"question_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "quiz_attempt_answers_attempt_id_fkey"
      columns: ["attempt_id"]
isOneToOne: false
      referencedRelation: "quiz_attempts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quiz_attempt_answers_choice_id_fkey"
      columns: ["choice_id"]
isOneToOne: false
      referencedRelation: "quiz_choices"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quiz_attempt_answers_question_id_fkey"
      columns: ["question_id"]
isOneToOne: false
      referencedRelation: "quiz_questions"
      referencedColumns: ["id"]
    }
                  ]
                },"quiz_attempts": {
                  Row: {
                    "created_at": string,"id": string,"lesson_id": string,"passed": boolean,"score_pct": number,"submitted_at": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"lesson_id": string,"passed": boolean,"score_pct": number,"submitted_at"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"lesson_id"?: string,"passed"?: boolean,"score_pct"?: number,"submitted_at"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "quiz_attempts_lesson_id_fkey"
      columns: ["lesson_id"]
isOneToOne: false
      referencedRelation: "lessons"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quiz_attempts_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"quiz_choices": {
                  Row: {
                    "created_at": string,"id": string,"question_id": string,"sort_order": number,"text": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"question_id": string,"sort_order"?: number,"text": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"question_id"?: string,"sort_order"?: number,"text"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "quiz_choices_question_id_fkey"
      columns: ["question_id"]
isOneToOne: false
      referencedRelation: "quiz_questions"
      referencedColumns: ["id"]
    }
                  ]
                },"quiz_questions": {
                  Row: {
                    "created_at": string,"id": string,"image_url": string | null,"lesson_id": string,"prompt": string,"sort_order": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"image_url"?: string | null,"lesson_id": string,"prompt": string,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"image_url"?: string | null,"lesson_id"?: string,"prompt"?: string,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "quiz_questions_lesson_id_fkey"
      columns: ["lesson_id"]
isOneToOne: false
      referencedRelation: "lessons"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "admin_create_lesson":
{ Args: { "p_content_md": string,"p_course": string,"p_pass_score": number,"p_slug": string,"p_summary": string,"p_title": string,"p_video_url": string }; Returns: string
                           },
"admin_delete_question":
{ Args: { "p_question": string }; Returns: undefined
                           },
"admin_last_practice":
{ Args: Record<PropertyKey, never>; Returns: {
              "last_practiced_on": string,"user_id": string
            }[]
                           },
"admin_move_question":
{ Args: { "p_direction": string,"p_question": string }; Returns: undefined
                           },
"admin_save_question":
{ Args: { "p_choice_ids": (string)[],"p_choices": (string)[],"p_correct": number,"p_explanation": string,"p_lesson": string,"p_prompt": string,"p_question": string }; Returns: string
                           },
"admin_update_lesson":
{ Args: { "p_content_md": string,"p_id": string,"p_pass_score": number,"p_slug": string,"p_summary": string,"p_title": string,"p_video_url": string }; Returns: undefined
                           },
"bangkok_date":
{ Args: { "p_ts": string }; Returns: string
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_enrolled":
{ Args: { "p_course": string }; Returns: boolean
                           },
"is_lesson_unlocked":
{ Args: { "p_lesson": string }; Returns: boolean
                           },
"lesson_publish_problems":
{ Args: { "p_lesson": string }; Returns: (string)[]
                           },
"lesson_publish_problems_internal":
{ Args: { "p_lesson": string }; Returns: (string)[]
                           },
"reorder_lessons":
{ Args: { "p_course": string,"p_lesson_ids": (string)[] }; Returns: undefined
                           },
"set_user_role":
{ Args: { "p_role": Database["public"]['Enums']["user_role"],"p_user": string }; Returns: undefined
                           },
"submit_quiz":
{ Args: { "p_answers": Json,"p_lesson_id": string }; Returns: Json
                           }
          }
          Enums: {
            "content_status": "draft"|"published","enrollment_source": "free"|"purchase","progress_status": "unlocked"|"completed","user_role": "member"|"admin"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "content_status": ["draft", "published"],"enrollment_source": ["free", "purchase"],"progress_status": ["unlocked", "completed"],"user_role": ["member", "admin"]
          }
        }
} as const
