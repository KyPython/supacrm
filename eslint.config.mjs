import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // Relax a few rules to reduce noise during iterative development.
  {
    rules: {
      // Allow `any` temporarily across the codebase; we'll gradually add types.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
];

export default eslintConfig;
