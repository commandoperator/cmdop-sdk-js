/**
 * Zod schema for MachineRequest
 *
 * This schema provides runtime validation and type inference.
 *  * Serializer for Machine model.

All fields are always present in responses.
Read-only fields are explicitly defined to ensure correct OpenAPI schema.
 *  */
import { z } from 'zod'
import * as Enums from '../../enums'

/**
 * Serializer for Machine model.

All fields are always present in responses.
Read-only fields are explicitly defined to ensure correct OpenAPI schema.
 */
export const MachineRequestSchema = z.object({
  workspace: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  name: z.string().min(1).max(100),
  hostname: z.string().min(1).max(255),
  os: z.nativeEnum(Enums.MachineOs),
  os_version: z.string().max(50).optional(),
  kernel_version: z.string().max(50).optional(),
  status: z.nativeEnum(Enums.MachineStatus).optional(),
  device_type: z.string().max(20).optional(),
  device_id: z.string().max(255).nullable().optional(),
  architecture: z.string().max(50).optional(),
  has_shell: z.boolean().optional(),
  public_ip: z.string().min(1).nullable().optional(),
  username: z.string().max(255).optional(),
  uid: z.int().min(0.0).max(2147483647.0).nullable().optional(),
  is_root: z.boolean().optional(),
  home_dir: z.string().max(500).optional(),
  cpu_model: z.string().max(255).optional(),
  cpu_count: z.int().min(0.0).max(32767.0).optional(),
  total_ram_bytes: z.int().min(-9.223372036854776e+18).max(9.223372036854776e+18).optional(),
  cpu_usage: z.number().optional(),
  memory_usage: z.number().optional(),
  memory_total_gb: z.number().optional(),
  disk_usage: z.number().optional(),
  disk_total_gb: z.number().optional(),
  battery_level: z.number().optional(),
  is_charging: z.boolean().optional(),
  is_on_ac_power: z.boolean().optional(),
  uptime_seconds: z.int().min(-9.223372036854776e+18).max(9.223372036854776e+18).optional(),
  process_count: z.int().min(-2147483648.0).max(2147483647.0).optional(),
  agent_version: z.string().max(20).optional(),
  agent_token: z.string().min(1).max(255),
})

/**
 * Infer TypeScript type from Zod schema
 */
export type MachineRequest = z.infer<typeof MachineRequestSchema>