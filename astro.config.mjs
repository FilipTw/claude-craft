// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightLinksValidator from 'starlight-links-validator';

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
			plugins: [starlightLinksValidator()],
		}),
	],
});
