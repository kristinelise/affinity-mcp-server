#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import axios from "axios";
import { z } from "zod";

const apiKey = process.env.AFFINITY_API_KEY;
if (!apiKey) {
  console.error("Error: AFFINITY_API_KEY required");
  process.exit(1);
}

const api = axios.create({
  baseURL: "https://api.affinity.co",
  auth: { username: "", password: apiKey },
  headers: { "Content-Type": "application/json" }
});

const server = new McpServer({ name: "affinity-mcp-server", version: "1.0.0" });

const SearchSchema = z.object({
  term: z.string().optional(),
  page_size: z.number().default(20),
  page_token: z.string().optional()
}).strict();

const CreatePersonSchema = z.object({
  first_name: z.string(),
  last_name: z.string(),
  emails: z.array(z.string()).optional(),
  organization_ids: z.array(z.number()).optional()
}).strict();

const CreateOrgSchema = z.object({
  name: z.string(),
  domain: z.string().optional(),
  person_ids: z.array(z.number()).optional()
}).strict();

const CreateNoteSchema = z.object({
  parent_id: z.number(),
  parent_type: z.enum(["person", "organization", "opportunity"]),
  content: z.string()
}).strict();

server.registerTool("affinity_search_people", {
  title: "Search People",
  description: "Search for people in Affinity CRM by name or email",
  inputSchema: SearchSchema,
  annotations: { readOnlyHint: true, destructiveHint: false }
}, async (params) => {
  const res = await api.get("/persons", { params });
  return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
});

server.registerTool("affinity_create_person", {
  title: "Create Person",
  description: "Create a new person in Affinity CRM",
  inputSchema: CreatePersonSchema,
  annotations: { readOnlyHint: false, destructiveHint: false }
}, async (params) => {
  const res = await api.post("/persons", params);
  return { content: [{ type: "text", text: `Person created: ${res.data.first_name} ${res.data.last_name} (ID: ${res.data.id})` }] };
});

server.registerTool("affinity_search_organizations", {
  title: "Search Organizations",
  description: "Search for organizations in Affinity CRM",
  inputSchema: SearchSchema,
  annotations: { readOnlyHint: true, destructiveHint: false }
}, async (params) => {
  const res = await api.get("/organizations", { params });
  return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
});

server.registerTool("affinity_create_organization", {
  title: "Create Organization",
  description: "Create a new organization in Affinity CRM",
  inputSchema: CreateOrgSchema,
  annotations: { readOnlyHint: false, destructiveHint: false }
}, async (params) => {
  const res = await api.post("/organizations", params);
  return { content: [{ type: "text", text: `Organization created: ${res.data.name} (ID: ${res.data.id})` }] };
});

server.registerTool("affinity_create_note", {
  title: "Create Note",
  description: "Add a note to a person, organization, or opportunity",
  inputSchema: CreateNoteSchema,
  annotations: { readOnlyHint: false, destructiveHint: false }
}, async (params) => {
  const res = await api.post("/notes", params);
  return { content: [{ type: "text", text: `Note created successfully (ID: ${res.data.id})` }] };
});

async function main() {
  const app = express();
  app.use(express.json());

  app.post("/mcp", async (_req, res) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true
    });
    res.on("close", () => transport.close());
    await server.connect(transport);
    await transport.handleRequest(_req, res, _req.body);
  });

  const port = parseInt(process.env.PORT || "3000");
  app.listen(port, "0.0.0.0", () => {
    console.error(`Affinity MCP server running on http://0.0.0.0:${port}/mcp`);
  });
}

main().catch(console.error);
