import type { Appointment } from './types';
export type FinancialState = 'pending' | 'completed' | 'no_show' | 'canceled';
export type FinancialAttendance = Appointment & {
  financial_state: FinancialState;
  awaiting_finalization: boolean;
  price_snapshot: string;
  service_amount: string;
  discount: string;
  final_amount: string;
  paid_amount: string;
  refunded_amount: string;
  net_received: string;
  balance: string;
  refund_due: string;
  payment_status: string;
  finalized_at: string | null;
  financial_notes: string;
};
export type AttendanceDetail = FinancialAttendance & {
  payments: {
    id: number;
    kind: 'payment' | 'refund';
    amount: string;
    method: string;
    paid_at: string;
    notes: string;
  }[];
  audit: {
    id: number;
    action: string;
    created_at: string;
    actor: string;
    details: Record<string, unknown>;
  }[];
};
export type FinanceOverview = {
  estimated: string;
  completed: string;
  completed_count: number;
  received: string;
  refunded: string;
  net_received: string;
  receivable: string;
  refund_due: string;
  awaiting_count: number;
  services: { name: string; count: number; amount: string }[];
  professionals: { name: string; count: number; amount: string }[];
};
export const attendanceLabels: Record<string, string> = {
  pending: 'Aguardando finalização',
  completed: 'Realizado',
  no_show: 'Não compareceu',
  canceled: 'Cancelado',
};
export const paymentLabels: Record<string, string> = {
  pending: 'Em aberto',
  partial: 'Pago parcialmente',
  paid: 'Pago',
  refund_due: 'Valor a devolver',
  no_charge: 'Sem cobrança',
};
export const methodLabels: Record<string, string> = {
  pix: 'Pix',
  cash: 'Dinheiro',
  card: 'Cartão',
  transfer: 'Transferência',
  other: 'Outro',
};
export function financeDate(value: Date) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Fortaleza',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value);
}
export function financeDateTime(value: Date) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Fortaleza',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
    .format(value)
    .replace(' ', 'T');
}
