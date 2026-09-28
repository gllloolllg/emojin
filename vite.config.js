import {defineConfig} from 'vite';

const repository=process.env.GITHUB_REPOSITORY?.split('/')[1];
const repositoryBase=repository && !repository.endsWith('.github.io') ? `/${repository}/` : '/';

export default defineConfig({
  base:process.env.PAGES_BASE_PATH || repositoryBase
});
