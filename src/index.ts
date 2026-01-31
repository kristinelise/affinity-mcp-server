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

// Common schemas
const SearchSchema = z.object({
  term: z.string().optional(),
  page_size: z.number().default(20),
  page_token: z.string().optional()
}).strict();

const IDSchema = z.object({
  id: z.number()
}).strict();

// Person schemas
const CreatePersonSchema = z.object({
  first_name: z.string(),
  last_name: z.string(),
  emails: z.array(z.string()).optional(),
  organization_ids: z.array(z.number()).optional()
}).strict();

const UpdatePersonSchema = z.object({
  person_id: z.number(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  emails: z.array(z.string()).optional(),
  organization_ids: z.array(z.number()).optional()
}).strict();

// Organization schemas
const CreateOrgSchema = z.object({
  name: z.string(),
  domain: z.string().optional(),
  person_ids: z.array(z.number()).optional()
}).strict();

const UpdateOrgSchema = z.object({
  organization_id: z.number(),
  name: z.string().optional(),
  domain: z.string().optional(),
  person_ids: z.array(z.number()).optional()
}).strict();

// Opportunity schemas
const SearchOpportunitiesSchema = z.object({
  term: z.string().optional(),
  page_size: z.number().default(20)
}).strict();

const CreateOpportunitySchema = z.object({
  name: z.string(),
  person_ids: z.array(z.number()).optional(),
  organization_ids: z.array(z.number()).optional()
}).strict();

// Note schemas
const CreateNoteSchema = z.object({
  parent_id: z.number(),
  parent_type: z.enum(["person", "organization", "opportunity"]),
  content: z.string()
}).strict();

const GetNotesSchema = z.object({
  parent_id: z.number(),
  parent_type: z.enum(["person", "organization", "opportunity"])
}).strict();

// List schemas
const AddToListSchema = z.object({
  list_id: z.number(),
  entity_id: z.number()
}).strict();

const RemoveFromListSchema = z.object({
  list_entry_id: z.number()
}).strict();

const GetListEntriesSchema = z.object({
  list_id: z.number(),
  page_size: z.number().default(20)
}).strict();

// Field schemas
const UpdateFieldValueSchema = z.object({
  field_id: z.number(),
  entity_id: z.number(),
  value: z.unknown()
}).strict();

const GetFieldValuesSchema = z.object({
  entity_id: z.number()
}).strict();

// PEOPLE TOOLS
server.registerTool("affinity_search_people", {
  title: "Search People",
  description: "Search for people in Affinity CRM by name or email",
  inputSchema: SearchSchema,
  annotations: { readOnlyHint: true, destructiveHint: false }
}, async (params) => {
  const res = await api.get("/persons", { params });
  return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
});

server.registerTool("affinity_get_person", {
  title: "Get Person by ID",
  description: "Get detailed information about a specific person",
  inputSchema: IDSchema,
  annotations: { readOnlyHint: true, destructiveHint: false }
}, async (params) => {
  const res = await api.get(`/persons/${params.id}`);
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

server.registerTool("affinity_update_person", {
  title: "Update Person",
  description: "Update an existing person's information",
  inputSchema: UpdatePersonSchema,
  annotations: { readOnlyHint: false, destructiveHint: false }
}, async (params) => {
  const { person_id, ...updateData } = params;
  const res = await api.put(`/persons/${person_id}`, updateData);
  return { content: [{ type: "text", text: `Person updated: ${res.data.first_name} ${res.data.last_name}` }] };
});

// ORGANIZATION TOOLS
server.registerTool("affinity_search_organizations", {
  title: "Search Organizations",
  description: "Search for organizations in Affinity CRM",
  inputSchema: SearchSchema,
  annotations: { readOnlyHint: true, destructiveHint: false }
}, async (params) => {
  const res = await api.get("/organizations", { params });
  return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
});

server.registerTool("affinity_get_organization", {
  title: "Get Organization by ID",
  description: "Get detailed information about a specific organization",
  inputSchema: IDSchema,
  annotations: { readOnlyHint: true, destructiveHint: false }
}, async (params) => {
  const res = await api.get(`/organizations/${params.id}`);
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

server.registerTool("affinity_update_organization", {
  title: "Update Organization",
  description: "Update an existing organization's information",
  inputSchema: UpdateOrgSchema,
  annotations: { readOnlyHint: false, destructiveHint: false }
}, async (params) => {
  const { organization_id, ...updateData } = params;
  const res = await api.put(`/organizations/${organization_id}`, updateData);
  return { content: [{ type: "text", text: `Organization updated: ${res.data.name}` }] };
});

// OPPORTUNITY TOOLS
server.registerTool("affinity_search_opportunities", {
  title: "Search Opportunities",
  description: "Search for opportunities in Affinity CRM",
  inputSchema: SearchOpportunitiesSchema,
  annotations: { readOnlyHint: true, destructiveHint: false }
}, async (params) => {
  const res = await api.get("/opportunities", { params });
  return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
});

server.registerTool("affinity_create_opportunity", {
  title: "Create Opportunity",
  description: "Create a new opportunity in Affinity CRM",
  inputSchema: CreateOpportunitySchema,
  annotations: { readOnlyHint: false, destructiveHint: false }
}, async (params) => {
  const res = await api.post("/opportunities", params);
  return { content: [{ type: "text", text: `Opportunity created: ${res.data.name} (ID: ${res.data.id})` }] };
});

// NOTE TOOLS
server.registerTool("affinity_create_note", {
  title: "Create Note",
  description: "Add a note to a person, organization, or opportunity",
  inputSchema: CreateNoteSchema,
  annotations: { readOnlyHint: false, destructiveHint: false }
}, async (params) => {
  const res = await api.post("/notes", params);
  return { content: [{ type: "text", text: `Note created successfully (ID: ${res.data.id})` }] };
});

server.registerTool("affinity_get_notes", {
  title: "Get Notes",
  description: "Get all notes for a person, organization, or opportunity",
  inputSchema: GetNotesSchema,
  annotations: { readOnlyHint: true, destructiveHint: false }
}, async (params) => {
  const res = await api.get("/notes", { params: { parent_id: params.parent_id, parent_type: params.parent_type } });
  return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
});

// LIST TOOLS
server.registerTool("affinity_list_all_lists", {
  title: "List All Lists",
  description: "Get all lists in your Affinity CRM",
  inputSchema: z.object({}).strict(),
  annotations: { readOnlyHint: true, destructiveHint: false }
}, async () => {
  const res = await api.get("/lists");
  return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
});

server.registerTool("affinity_get_list_entries", {
  title: "Get List Entries",
  description: "Get all entries (people/orgs/opportunities) in a specific list",
  inputSchema: GetListEntriesSchema,
  annotations: { readOnlyHint: true, destructiveHint: false }
}, async (params) => {
  const res = await api.get(`/lists/${params.list_id}/list-entries`, { params: { page_size: params.page_size } });
  return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
});

server.registerTool("affinity_add_to_list", {
  title: "Add to List",
  description: "Add a person, organization, or opportunity to a list",
  inputSchema: AddToListSchema,
  annotations: { readOnlyHint: false, destructiveHint: false }
}, async (params) => {
  const res = await api.post(`/lists/${params.list_id}/list-entries`, { entity_id: params.entity_id });
  return { content: [{ type: "text", text: `Added to list successfully (Entry ID: ${res.data.id})` }] };
});

server.registerTool("affinity_remove_from_list", {
  title: "Remove from List",
  description: "Remove an entry from a list",
  inputSchema: RemoveFromListSchema,
  annotations: { readOnlyHint: false, destructiveHint: false }
}, async (params) => {
  await api.delete(`/list-entries/${params.list_entry_id}`);
  return { content: [{ type: "text", text: `Removed from list successfully` }] };
});

// FIELD TOOLS
server.registerTool("affinity_get_all_fields", {
  title: "Get All Fields",
  description: "Get all custom fields in Affinity",
  inputSchema: z.object({}).strict(),
  annotations: { readOnlyHint: true, destructiveHint: false }
}, async () => {
  const res = await api.get("/fields");
  return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
});

server.registerTool("affinity_get_field_values", {
  title: "Get Field Values",
  description: "Get all field values for a person, organization, or opportunity",
  inputSchema: GetFieldValuesSchema,
  annotations: { readOnlyHint: true, destructiveHint: false }
}, async (params) => {
  const res = await api.get("/field-values", { params: { entity_id: params.entity_id } });
  return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
});

server.registerTool("affinity_update_field_value", {
  title: "Update Field Value",
  description: "Update a custom field value for a person, organization, or opportunity",
  inputSchema: UpdateFieldValueSchema,
  annotations: { readOnlyHint: false, destructiveHint: false }
}, async (params) => {
  const res = await api.put(`/field-values`, params);
  return { content: [{ type: "text", text: `Field value updated successfully` }] };
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
