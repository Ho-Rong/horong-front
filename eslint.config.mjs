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
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    rules: {
      // ⚠️ 변수 정의했는데 안 쓰는 경우 무시
      "@typescript-eslint/no-unused-vars": "off",
      // ⚠️ any 타입 허용
      "@typescript-eslint/no-explicit-any": "off",
      // ⚠️ useEffect deps 경고 무시
      "react-hooks/exhaustive-deps": "off",
    },
  },
];

export default eslintConfig;
