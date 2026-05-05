import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi, mutateApi } from "./api";

export interface ZohoInvoice {
  id: string;
  invoiceNumber: string | null;
  date: string;
  dueDate: string;
  amount: number;
  status: string;
  zohoUrl: string | null;
}

export interface Customer {
  id: number;
  leadId: number;
  company: string;
  contact: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  industry: string | null;
  modules: string[];
  certifications: string[];
  facilities: number;
  ownerId: number;
  owner: { id: number; name: string; color: string | null };
  contractValue: number;
  contractStart: string | null;
  contractEnd: string | null;
  status: string;
  billingStatus: string;
  zohoCustomerId: string | null;
  notes: string | null;
  invoices: ZohoInvoice[];
  createdAt: string;
}

export function useCustomers() {
  return useQuery({
    queryKey: ["customers"],
    queryFn: () => fetchApi<Customer[]>("/api/customers"),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Record<string, unknown>) =>
      mutateApi<Customer>(`/api/customers/${id}`, "PATCH", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });
}
