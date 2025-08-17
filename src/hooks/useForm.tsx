import { useState } from "react";

// Generic form hook
export function useForm<TValues = {}, TErrors = {}>(initialValues: TValues) {
  const [values, setValues] = useState<TValues>(initialValues);
  const [errors, setErrors] = useState<TErrors>({} as TErrors);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  // Input change handler
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value } as TValues));
    setErrors((err) => ({ ...err, [name]: undefined } as TErrors));
  }

  // Validation
  function validate(rules: {
    [K in keyof TValues]?: (v: TValues[K]) => string;
  }): boolean {
    const newErrors: Partial<TErrors> = {};
    for (const key in rules) {
      const error = rules[key as keyof TValues]?.(values[key as keyof TValues]);
      if (error) newErrors[key as keyof TErrors] = error as any;
    }
    setErrors(newErrors as TErrors);
    return Object.keys(newErrors).length === 0;
  }

  return {
    values,
    setValues,
    errors,
    setErrors,
    loading,
    setLoading,
    success,
    setSuccess,
    handleChange,
    validate,
  };
}

// Error banner
export function ErrorBanner({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <div className="bg-red-100 text-red-700 p-2 rounded mb-2 border border-red-300">
      {error}
    </div>
  );
}

// Success banner
export function SuccessBanner({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="bg-green-100 text-green-700 p-2 rounded mb-2 border border-green-300">
      {message}
    </div>
  );
}
