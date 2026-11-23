// @ts-check

import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';
import starlightLinksValidator from 'starlight-links-validator';
import { loadStructure, toSidebar } from './scripts/structure.mjs';

export default defineConfig({
	site: 'https://filiptw.github.io',
	base: '/claude-craft',
	integrations: [
		starlight({
			title: 'claude-craft',
			description: 'Claude Code i praca z agentami na poziomie Senior Dev.',
			defaultLocale: 'root',
			locales: { root: { label: 'Polski', lang: 'pl' } },
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/FilipTw/claude-craft' }],
			editLink: { baseUrl: 'https://github.com/FilipTw/claude-craft/edit/main/' },
			lastUpdated: true,
			customCss: ['./src/styles/tokens.css', './src/styles/theme.css'],
			components: {
				// biome-ignore lint/style/useNamingConvention: Starlight names overridable components in PascalCase.
				ThemeProvider: './src/components/ThemeProvider.astro',
				// biome-ignore lint/style/useNamingConvention: Starlight names overridable components in PascalCase.
				ThemeSelect: './src/components/ThemeSelect.astro',
			},
			sidebar: ['roadmap', ...toSidebar(loadStructure())],
			plugins: [starlightLinksValidator()],
		}),
	],
});
