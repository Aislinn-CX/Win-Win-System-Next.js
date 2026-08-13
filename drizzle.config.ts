import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit CLI 不会自动加载 Next.js 的 .env.local，需显式加载
config({ path: ".env.local" });

export default defineConfig({
    schema: "./src/db/schema/index.ts",
    out: "./drizzle",
    dialect: "postgresql",
    dbCredentials: {
        url: process.env.DATABASE_URL!,
    },
});