import { defineConfig } from 'vitest/config';
export default defineConfig({
	test: {
		environment: 'jsdom',
		include: ['tests/**/*.test.js'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html', 'json-summary'],
			include: ['src/rules.js', 'src/service.js', 'src/memory-repository.js', 'src/db.js'],
			thresholds: { lines: 80, functions: 80, branches: 70, statements: 80 },
		},
	},
});
