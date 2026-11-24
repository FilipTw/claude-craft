import { defineCollection } from 'astro:content';
import { docsLoader, i18nLoader } from '@astrojs/starlight/loaders';
import { docsSchema, i18nSchema } from '@astrojs/starlight/schema';
import { z } from 'astro/zod';
import { PAGE_TYPES } from '../scripts/structure.mjs';
import { latestCheckDate } from './lib/verification.mjs';

export const collections = {
	docs: defineCollection({
		loader: docsLoader(),
		schema: docsSchema({
			extend: z.object({
				type: z.enum(PAGE_TYPES),
				lastVerified: z.coerce
					.date()
					.max(latestCheckDate(new Date()), 'lastVerified cannot be in the future')
					.optional(),
				sources: z.array(z.url({ protocol: /^https$/, error: 'must be an https URL' })).default([]),
			}),
		}),
	}),
	// Polish strings for the Pagefind search UI, which Starlight does not translate (src/content/i18n/pl.json).
	i18n: defineCollection({ loader: i18nLoader(), schema: i18nSchema() }),
};
