// @ts-check

import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';
import starlightLinksValidator from 'starlight-links-validator';
import { loadStructure, toSidebar } from './scripts/structure.mjs';

export default defineConfig({
	site: 'https://filiptw.github.io',
	base: '/claude-craft',
	// Fetch a page when the pointer rests on its link, so the view transition (transitions.css) starts without a wait
	prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
	integrations: [
		starlight({
			title: 'claude-craft',
			description: 'Claude Code i praca z agentami na poziomie Senior Dev.',
			defaultLocale: 'root',
			locales: { root: { label: 'Polski', lang: 'pl' } },
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/FilipTw/claude-craft' }],
			editLink: { baseUrl: 'https://github.com/FilipTw/claude-craft/edit/main/' },
			logo: { src: './src/assets/logo.svg' },
			lastUpdated: true,
			customCss: [
				'./src/styles/tokens.css',
				'./src/styles/theme.css',
				'./src/styles/content.css',
				'./src/styles/search.css',
				'./src/styles/home.css',
				'./src/styles/transitions.css',
			],
			// Starlight names overridable components in PascalCase, so biome.json allows PascalCase keys in this file.
			components: {
				ThemeProvider: './src/components/ThemeProvider.astro',
				ThemeSelect: './src/components/ThemeSelect.astro',
				Sidebar: './src/components/Sidebar.astro',
				Hero: './src/components/Hero.astro',
				Search: './src/components/Search.astro',
				MarkdownContent: './src/components/MarkdownContent.astro',
				Pagination: './src/components/Pagination.astro',
				TableOfContents: './src/components/TableOfContents.astro',
			},
			expressiveCode: {
				themes: ['github-dark-default', 'github-light'],
				styleOverrides: {
					borderColor: 'var(--cc-border)',
					borderRadius: 'var(--cc-radius-md)',
					codeBackground: 'var(--cc-surface)',
					uiFontFamily: 'var(--cc-font-body)',
					textMarkers: {
						markBackground: 'var(--cc-accent-soft)',
						markBorderColor: 'var(--cc-accent-ui)',
					},
					frames: {
						editorActiveTabBackground: 'var(--cc-surface)',
						editorActiveTabIndicatorTopColor: 'var(--cc-accent-text)',
						editorTabBarBackground: 'var(--cc-surface-raised)',
						terminalBackground: 'var(--cc-surface)',
						terminalTitlebarBackground: 'var(--cc-surface-raised)',
						frameBoxShadowCssValue: 'none',
					},
				},
			},
			sidebar: toSidebar(loadStructure()),
			plugins: [starlightLinksValidator()],
		}),
	],
});
