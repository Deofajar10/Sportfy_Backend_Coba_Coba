import dotenv from "dotenv";
import { defineConfig, env } from "prisma/config";

// Pastikan .env terbaca ketika Prisma config dievaluasi
dotenv.config();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
