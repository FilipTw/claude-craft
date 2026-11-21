import { defineCollection } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
import { z } from 'astro/zod';
import { PAGE_TYPES } from '../scripts/structure.mjs';

export const collections = {
	docs: defineCollection({
		loader: docsLoader(),
		schema: docsSchema({
			extend: z.object({
				// One Diátaxis mode per page.
				type: z.enum(PAGE_TYPES),
				// Missing means the page is not written yet. scripts/freshness.mjs reports it.
				lastVerified: z.coerce.date().max(new Date(), 'lastVerified cannot be in the future').optional(),
				sources: z.array(z.url({ protocol: /^https$/, error: 'must be an https URL' })).default([]),
			}),
		}),
	}),
};
