import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { schemas } from "./sanity/schemas";
import { structure } from "./sanity/structure";
import { catalogoDashboardPlugin } from "./sanity/plugins/catalogoDashboard";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "missing-project-id";
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";

export default defineConfig({
  name: "ondebrincar",
  title: "Onde Brincar",
  basePath: "/studio",
  projectId,
  dataset,
  plugins: [structureTool({ structure }), visionTool(), catalogoDashboardPlugin()],
  schema: {
    types: schemas,
  },
});
