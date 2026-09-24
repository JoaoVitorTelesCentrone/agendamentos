// Tipos do banco escritos à mão (espelham supabase/migrations/0001_init.sql).
// Quando o schema estabilizar, dá pra trocar por `supabase gen types typescript`.

export type TenantStatus =
  | "trial"
  | "ativo"
  | "inadimplente"
  | "suspenso"
  | "cancelado"
export type UserRole = "admin" | "atendente" | "profissional"
export type ApptStatus =
  | "agendado"
  | "confirmado"
  | "concluido"
  | "cancelado"
  | "no_show"

export type Tenant = {
  id: string
  name: string
  slug: string
  niche: string | null
  plan: string
  status: TenantStatus
  primary_color: string | null
  logo_url: string | null
  cancel_min_minutes: number
  description: string | null
  phone: string | null
  address: string | null
  timezone: string
  tax_rate: number
  card_fee_rate: number
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  stripe_price_id: string | null
  stripe_current_period_end: string | null
  created_at: string
}

export type Profile = {
  id: string
  tenant_id: string
  name: string
  role: UserRole
  created_at: string
}

export type Professional = {
  id: string
  tenant_id: string
  name: string
  active: boolean
  created_at: string
}

export type WorkingHour = {
  id: string
  tenant_id: string
  professional_id: string
  weekday: number
  start_time: string
  end_time: string
}

export type TimeOff = {
  id: string
  tenant_id: string
  professional_id: string
  starts_at: string
  ends_at: string
  reason: string | null
}

export type Service = {
  id: string
  tenant_id: string
  name: string
  description: string | null
  duration_min: number
  price_cents: number
  active: boolean
  created_at: string
}

export type ServiceProfessional = {
  tenant_id: string
  service_id: string
  professional_id: string
}

export type Client = {
  id: string
  tenant_id: string
  whatsapp: string
  name: string
  notes: string | null
  email: string | null
  created_at: string
  updated_at: string
}

export type Appointment = {
  id: string
  tenant_id: string
  client_id: string
  professional_id: string
  service_id: string
  starts_at: string
  ends_at: string
  status: ApptStatus
  price_cents: number
  notes: string | null
  source: string
  created_at: string
  updated_at: string
}

export type Lead = {
  id: string
  tenant_id: string
  name: string | null
  whatsapp: string | null
  service_id: string | null
  created_at: string
}
