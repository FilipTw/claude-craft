import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
import { PAGE_TYPES } from '../scripts/structure.mjs';

export const collections = {
	docs: defineCollection({
		loader: docsLoader(),
		schema: docsSchema({
			extend: z.object({
				// One Diátaxis mode per page. Optional only for index and roadmap.
				type: z.enum(PAGE_TYPES as [string, ...string[]]).optional(),
				// Missing means the page is not written yet. scripts/freshness.mjs reports it.
				lastVerified: z.coerce.date().optional(),
				sources: z.array(z.string().url()).default([]),
			}),
		}),
	}),
};
