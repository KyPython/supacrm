import { useState } from "react";

export function useForm(initialValues) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  function handleChange(e) {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((err) => ({ ...err, [name]: undefined }));
  }

  function validate(rules) {
    const newErrors = {};
    for (const key in rules) {
      const error = rules[key](values[key]);
      if (error) newErrors[key] = error;
    }
    setErrors(newErrors);
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

export function ErrorBanner({ error }) {
  if (!error) return null;
  return (
    <div className="bg-red-100 text-red-700 p-2 rounded mb-2 border border-red-300">
      {error}
    </div>
  );
}

export function SuccessBanner({ message }) {
  if (!message) return null;
  return (
    <div className="bg-green-100 text-green-700 p-2 rounded mb-2 border border-green-300">
      {message}
    </div>
  );
}
