import { defineConfig } from "@hey-api/openapi-ts";

const baseUrl = "http://localhost:8000";

export default defineConfig({
    // Use backend URL to fetch OpenAPI schema
    // You can use environment variable or direct URL
    // Example: http://localhost:8000/openapi.json or https://your-backend.com/openapi.json
    input: `${baseUrl}/openapi.json`,

    output: "./src/api/heyapi/client",

    plugins: [
        {
            name: "@hey-api/client-next",
            runtimeConfigPath: "@/api/heyapi/hey-api.ts",
            throwOnError: true,
        },
        {
            name: "@hey-api/sdk",
            // NOTE: this doesn't allow tree-shaking
            asClass: true,
            operationId: true,
            classNameBuilder: "{{name}}Service",
            methodNameBuilder: (operation) => {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                let name: string = operation.name || operation.operationId || "unknown";
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                const service: string = operation.service;

                if (service && name.toLowerCase().startsWith(service.toLowerCase())) {
                    name = name.slice(service.length);
                }

                return name.charAt(0).toLowerCase() + name.slice(1);
            },
        },
        {
            name: "@hey-api/schemas",
            type: "json",
        },
        '@tanstack/react-query',
    ],
});