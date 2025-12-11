"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useForm, ErrorBanner, SuccessBanner } from "../../hooks/useForm";
import { useAuth } from "@/context/AuthContext.js";
import { useUsage } from "@/hooks/useUsage";
import { checkLimitExceeded, incrementUsage, decrementUsage } from "@/lib/usage-tracking";
import UpgradePrompt from "@/components/UpgradePrompt";

interface Company {
  id: number;
  name: string;
}

import Container from "@/components/Container";
import Card from "@/components/Card";
import Button from "@/components/Button";

export default function CompaniesPage() {
  const auth = useAuth() ?? {};
  const { user } = auth;
  const { usageStatus, exceeded } = useUsage();
  const [companies, setCompanies] = useState<Company[]>([]);
  const form = useForm<{ name: string }, Record<string, string>>({ name: "" });

  useEffect(() => {
    (async () => {
      form.setLoading(true);
      if (!supabase) return;
      const { data, error } = await supabase.from("companies").select("*");
      if (!error) setCompanies(data || []);
      else form.setErrors({ fetch: error?.message ?? "Unknown error" });
      form.setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addCompany(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    
    // Check limit before creating
    if (user?.id) {
      const limitExceeded = await checkLimitExceeded(user.id, 'companies');
      if (limitExceeded) {
        form.setErrors({ submit: "Company limit reached. Please upgrade your plan to add more companies." });
        return;
      }
    }
    
    form.setLoading(true);
    if (!supabase) return;
    const { error } = await supabase
      .from("companies")
      .insert([{ name: form.values.name }]);
    if (!error) {
      // Update usage tracking
      if (user?.id) {
        await incrementUsage(user.id, 'companies', 1);
      }
      // Refresh list
      if (!supabase) return;
      const { data } = await supabase.from("companies").select("*");
      setCompanies(data || []);
      form.setSuccess("Company added successfully!");
    } else {
      form.setErrors({ submit: error.message });
    }
    form.setLoading(false);
  }

  async function deleteCompany(id: number) {
    form.setLoading(true);
    if (!supabase) return;
    const { error } = await supabase.from("companies").delete().eq("id", id);
    if (!error) {
      // Update usage tracking
      if (user?.id) {
        await decrementUsage(user.id, 'companies', 1);
      }
      // Refresh list
      if (!supabase) return;
      const { data } = await supabase.from("companies").select("*");
      setCompanies(data || []);
      form.setSuccess("Company deleted successfully!");
    } else {
      form.setErrors({ delete: error.message });
    }
    form.setLoading(false);
  }
  return (
    <Container>
      <Card>
        <h1 className="h1">Companies</h1>
        {exceeded?.companies && usageStatus && (
          <UpgradePrompt
            feature="companies"
            currentCount={usageStatus.usage.companies}
            limit={usageStatus.limits.max_companies || 0}
            className="mb-4"
          />
        )}
        <ErrorBanner
          error={
            form.errors.name ||
            form.errors.fetch ||
            form.errors.submit ||
            form.errors.delete
          }
        />
        <SuccessBanner message={form.success} />
        <form onSubmit={addCompany} className="mb-6 flex gap-2 items-center">
          <input
            name="name"
            value={form.values.name}
            onChange={form.handleChange}
            placeholder="New company name"
            className={`form-input w-full ${
              form.errors.name ? "border-red-400" : ""
            }`}
            style={
              form.errors.name
                ? { borderColor: "var(--danger-600)" }
                : undefined
            }
          />
          <Button
            type="submit"
            variant="primary"
            className="px-5"
            leftIcon={undefined}
            disabled={form.loading}
          >
            Add
          </Button>
        </form>
        {form.loading && <p>Loading...</p>}
        <ul className="divide-y">
          {companies.map((c: Company) => (
            <li key={c.id} className="flex justify-between items-center py-3">
              <span className="font-medium">{c.name}</span>
              <button
                onClick={() => deleteCompany(c.id)}
                style={{ color: "var(--brand)" }}
                disabled={form.loading}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </Card>
    </Container>
  );
}
