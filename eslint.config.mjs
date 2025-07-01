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
    rules: {
      // Production-friendly TypeScript rules - downgrade 'any' from error to warning
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
      
      // Custom rule to prevent manual Authorization header construction
      "no-restricted-syntax": [
        "error",
        {
          selector: "MemberExpression[object.name='headers'][property.name='Authorization']",
          message: "Use authFetch utility instead of manually constructing Authorization headers"
        },
        {
          selector: "AssignmentExpression[left.type='MemberExpression'][left.object.name='headers'][left.property.name='Authorization']",
          message: "Use authFetch utility instead of manually constructing Authorization headers"
        },
        {
          selector: "Property[key.name='Authorization'][value.type='TemplateLiteral'][value.quasis.0.value.raw=/Bearer/]",
          message: "Use authFetch utility instead of manually constructing Authorization headers"
        },
        {
          selector: "Property[key.value='Authorization'][value.type='TemplateLiteral'][value.quasis.0.value.raw=/Bearer/]",
          message: "Use authFetch utility instead of manually constructing Authorization headers"
        }
      ]
    }
  }
];

export default eslintConfig;
