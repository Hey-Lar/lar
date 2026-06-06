// Zod input schemas for @lar/mcp tools.
// Only read-relevant schemas are included; order/mutation schemas are intentionally absent.

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Primitive validators
// ---------------------------------------------------------------------------

export const ResolutionSchema = z.enum(['1', '5', '15', '30', '60', '240', 'D', 'W', 'M']);

export const SymbolTypeSchema = z.enum([
  'stock',
  'etf',
  'index',
  'futures',
  'forex',
  'crypto',
  'option',
]);

// Permissive but safe symbol pattern.
const SymbolStringSchema = z
  .string()
  .min(1)
  .max(32)
  .regex(/^[A-Z0-9.\-/:]+$/i, 'symbol must be alphanumeric with . - / :');

// ---------------------------------------------------------------------------
// Tool input schemas
// ---------------------------------------------------------------------------

export const EmptyArgsSchema = z.object({}).strict();

export const SymbolArgsSchema = z
  .object({
    symbol: SymbolStringSchema,
  })
  .strict();

export const GetOrdersArgsSchema = z
  .object({
    status: z.enum(['open', 'closed', 'all']).optional(),
    limit: z.number().int().positive().max(500).optional(),
  })
  .strict();

export const GetBarsArgsSchema = z
  .object({
    symbol: SymbolStringSchema,
    resolution: ResolutionSchema,
    from: z.number().int().nonnegative(), // unix seconds
    to: z.number().int().nonnegative(),
    extendedHours: z.boolean().optional(),
  })
  .strict()
  .refine((v) => v.to >= v.from, { message: '`to` must be >= `from`' });

export const SearchSymbolsArgsSchema = z
  .object({
    query: z.string().min(1).max(128),
    type: SymbolTypeSchema.optional(),
    limit: z.number().int().positive().max(100).optional(),
  })
  .strict();

// TS type aliases for handler use.
export type GetBarsInput = z.infer<typeof GetBarsArgsSchema>;
export type SearchSymbolsInput = z.infer<typeof SearchSymbolsArgsSchema>;
export type GetOrdersInput = z.infer<typeof GetOrdersArgsSchema>;
