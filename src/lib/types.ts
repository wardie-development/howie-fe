export type Onboarding = {
  stage: 'pending' | 'suspended' | 'whatsapp' | 'ready';
  can_use_panel: boolean;
  whatsapp_connected: boolean;
  phone_number: string | null;
};
export type Profile = {
  onboarding: Onboarding;
  user: { id: number; name: string; email: string };
  company: { id: number; name: string; logo: string | null };
};
export type Agent = {
  id: number;
  name: string;
  custom_prompt: string | null;
  is_active: boolean;
  connected: boolean;
  created_at: string;
};
export type Service = {
  id: number;
  name: string;
  description: string | null;
  sell_price: string;
  duration: number;
};
export type Professional = { id: number; name: string; photo: string | null };
export type Client = { id: number; name: string; phone: string };
export type Offering = {
  id: number;
  professional: number;
  service: number;
  professional_name: string;
  service_name: string;
  effective_duration: number;
  effective_sell_price: string;
};
export type Availability = {
  id: number;
  professional: number;
  weekday: string;
  start_time: string;
  end_time: string;
};
export type Block = {
  id: number;
  professional: number;
  professional_name: string;
  starts_at: string;
  ends_at: string;
  reason: string | null;
};
export type Appointment = {
  id: number;
  professional_service: number | null;
  professional_id: number;
  professional_name: string;
  service_name: string;
  client: number;
  client_name: string;
  client_phone: string;
  starts_at: string;
  ends_at: string;
  status: 'pending' | 'scheduled' | 'confirmed' | 'canceled';
  financial_state?: 'pending' | 'completed' | 'no_show' | 'canceled';
  price: string;
  notes: string | null;
};
export type Chat = {
  id: number;
  client_name: string;
  client_phone: string;
  agent_name: string;
  context_reset_at: string | null;
  last_message: { content: string; created_at: string } | null;
};
export type Message = { id: number; role: string; content: string; created_at: string };
export type Execution = {
  id: number;
  client_name: string;
  agent_name: string;
  status: string;
  created_at: string;
  tools: { id: number; label: string; status: string }[];
};
export type Dashboard = {
  agents: number;
  active_agents: number;
  conversations: number;
  executions_30d: number;
  errors_30d: number;
  appointments_today: number;
  appointments_30d: number;
  clients: number;
  services: number;
  professionals: number;
  interactions_30d: number;
  conversations_30d: number;
  clients_assisted_30d: number;
  appointments_created_30d: number;
  activity: { day: string; count: number }[];
  upcoming: Appointment[];
};
