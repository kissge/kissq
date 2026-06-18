import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit'

export default defineConfig({
	plugins: [
		sveltekit(),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			manifest: {
				name: 'kissQ',
				short_name: 'kissQ',
				description: 'クイズカウンター（得点表示機）のkissQ。各種早押しクイズルールに対応、休み数管理も',
				theme_color: '#0d2540',
				icons: [
					{
						src: '/favicon.png',
						sizes: '192x192',
						type: 'image/png'
					},
					{
						src: '/favicon.png',
						sizes: '512x512',
						type: 'image/png'
					}
				]
			}
		})
	]
});
