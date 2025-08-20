import { useState } from "react";

// Generic type-safe useForm
export function useForm<
  TValues extends Record<string, unknown>,
  TExtraErrors extends Record<string, string> = Record<string, string>
>(initialValues: TValues) {
  // Merge form field keys + extra error keys
  type TErrors = Partial<Record<keyof TValues, string> & TExtraErrors>;

  const [values, setValues] = useState<TValues>(initialValues);
  const [errors, setErrors] = useState<TErrors>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    if (!(name in values)) return; // Only update existing fields
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((err) => ({ ...err, [name]: undefined }));
  }

  type ValidationRules = {
    [K in keyof TValues]?: (value: TValues[K]) => string;
  };

  function validate(rules: ValidationRules) {
    const newErrors: Partial<Record<keyof TValues, string>> = {};
    for (const key in rules) {
      const error = rules[key as keyof TValues]?.(values[key as keyof TValues]);
      if (error) newErrors[key as keyof TValues] = error;
    }
    setErrors(newErrors as TErrors);
    return Object.keys(newErrors).length === 0;
  }

  return {
    values,
    setValues,
    errors,
    setErrors: setErrors as React.Dispatch<React.SetStateAction<TErrors>>,
    loading,
    setLoading,
    success,
    setSuccess,
    handleChange,
    validate,
  };
}

// Error and success banners
export function ErrorBanner({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <div className="bg-red-100 text-red-700 p-2 rounded mb-2 border border-red-300">
      {error}
    </div>
  );
}

export function SuccessBanner({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="bg-green-100 text-green-700 p-2 rounded mb-2 border border-green-300">
      {message}
    </div>
  );
}
