import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import tailwindCanonicalClasses from "eslint-plugin-tailwind-canonical-classes";
import unusedImports from "eslint-plugin-unused-imports";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    plugins: {
      "tailwind-canonical-classes": tailwindCanonicalClasses,
      "unused-imports": unusedImports,
    },
    rules: {
      "react/jsx-uses-react": "off",
      "react/react-in-jsx-scope": "off",
      "no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "tailwind-canonical-classes/tailwind-canonical-classes": [
        "error",
        {
          cssPath: "./app/globals.css",
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/blocks/*",
                "@/components/*",
                "@/shared/const",
                "@/shared/utils",
              ],
              message:
                "Use FSD layer imports from src, for example '@/shared/ui/*', '@/shared/lib/*', or an entity public API.",
            },
            {
              group: [
                "@/features/*/api/*",
                "@/features/*/model/*",
                "@/features/*/ui/*",
                "@/widgets/*/api/*",
                "@/widgets/*/model/*",
                "@/widgets/*/ui/*",
                "@/entities/*/api/*",
                "@/entities/*/lib/*",
                "@/entities/*/model/*",
                "@/entities/*/ui/*",
              ],
              message:
                "Import slices through their public index entry point instead of internal segment files.",
            },
          ],
        },
      ],
    },
  },
  {
    // FSD boundary guard: pages/widgets/features/entities may import downward
    // through public APIs, but they must not reach upward into Next app code.
    files: [
      "src/pages/**/*.{ts,tsx}",
      "src/widgets/**/*.{ts,tsx}",
      "src/features/**/*.{ts,tsx}",
      "src/entities/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/blocks/*",
                "@/components/*",
                "@/shared/const",
                "@/shared/utils",
              ],
              message:
                "Use FSD layer imports from src, for example '@/shared/ui/*', '@/shared/lib/*', or an entity public API.",
            },
            {
              group: [
                "@/features/*/api/*",
                "@/features/*/model/*",
                "@/features/*/ui/*",
                "@/widgets/*/api/*",
                "@/widgets/*/model/*",
                "@/widgets/*/ui/*",
                "@/entities/*/api/*",
                "@/entities/*/lib/*",
                "@/entities/*/model/*",
                "@/entities/*/ui/*",
              ],
              message:
                "Import slices through their public index entry point instead of internal segment files.",
            },
            {
              group: ["@/app/*"],
              message:
                "Lower FSD layers must not import upward from '@/app/*'. Keep page-specific server actions in the owning page slice or move reusable infrastructure to shared/entities.",
            },
          ],
        },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    ".test-dist/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
