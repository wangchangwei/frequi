import { defineConfig } from 'vitest/config';
import { execFile, execSync } from 'child_process';
import bodyParser from 'body-parser';
import createVuePlugin from '@vitejs/plugin-vue';
import ui from '@nuxt/ui/vite';
import { resolve } from 'path';
import fs from 'fs';
import path from 'path';
import IconsResolve from 'unplugin-icons/resolver';
import Icons from 'unplugin-icons/vite';

const QUEUE_STATUS_FILE = path.join(process.cwd(), 'backtest_queue', 'status.json');
const NUXT_UI_ROOT_RUNTIME_ID = '\0nuxt-ui-root-runtime';
const CSS_IMPORT_RE = /\.(?:css|scss|sass|less|styl)(?:$|\?)/;
const NUXT_UI_ROOT_RUNTIME_EXPORTS = [
  ['UBadge', 'Badge'],
  ['UCheckbox', 'Checkbox'],
  ['UNumberInput', 'InputNumber'],
  ['USelect', 'Select'],
  ['UToggle', 'Switch'],
];

let commitHash: string = 'unknown';
try {
  commitHash = execSync('git rev-parse --short HEAD').toString();
} catch (error) {
  console.error('Failed to get commit hash. Running in this mode will not be supported.');
}

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    __COMMIT_HASH__: JSON.stringify(commitHash),
  },
  plugins: [
    createVuePlugin({
      script: {
        defineModel: true,
      },
    }),
    {
      name: 'nuxt-ui-root-runtime',
      enforce: 'pre',
      resolveId(source, importer) {
        if (source === '@nuxt/ui' && !CSS_IMPORT_RE.test(importer ?? '')) {
          return NUXT_UI_ROOT_RUNTIME_ID;
        }
      },
      load(id) {
        if (id === NUXT_UI_ROOT_RUNTIME_ID) {
          return NUXT_UI_ROOT_RUNTIME_EXPORTS.map(
            ([exportName, componentName]) =>
              `export { default as ${exportName} } from '@nuxt/ui/components/${componentName}.vue';`,
          ).join('\n');
        }
      },
    },
    ui({
      ui: {
        colors: {
          primary: 'brand',
          // slate, gray or mist
          neutral: 'mist',
        },
        alert: {
          defaultVariants: {
            variant: 'subtle',
          },
        },
        button: {
          defaultVariants: {
            variant: 'subtle',
          },
        },
        table: {
          slots: {
            td: 'px-2 py-2 text-default text-md text-left',
            th: 'px-2 py-2 text-default text-md',
          },
        },
        tabs: {
          variants: {
            variant: {
              link: {
                trigger: 'grow focus:outline-none',
              },
            },
          },
        },
      },
      autoImport: {
        imports: ['vue', 'vue-router', '@vueuse/core', 'pinia'],
        dts: 'src/auto-imports.d.ts',
        dirs: ['src/composables', 'src/stores', 'src/utils/**'],
        vueTemplate: true,
      },
      components: {
        resolvers: [IconsResolve()],
        dts: 'src/components.d.ts',
      },
    }),
    Icons({
      compiler: 'vue3',
    }),
    {
      name: 'queue-backtest-plugin',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.method === 'GET' && req.url === '/api/v1/queue_backtest/status') {
            if (fs.existsSync(QUEUE_STATUS_FILE)) {
              const statusData = JSON.parse(fs.readFileSync(QUEUE_STATUS_FILE, 'utf-8'));
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(statusData));
            } else {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ status: 'idle', result_file: null, error: null, progress: { current: 0, total: 0, current_pair: '' }, started_at: null, finished_at: null }));
            }
            return;
          }
          if (req.method === 'DELETE' && req.url === '/api/v1/queue_backtest') {
            const stopFile = QUEUE_STATUS_FILE.replace('.json', '.stop');
            fs.writeFileSync(stopFile, JSON.stringify({ stop: true, requested_at: new Date().toISOString() }));
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ status: 'stop_requested' }));
            return;
          }
          if (req.method === 'POST' && req.url === '/api/v1/queue_backtest') {
            bodyParser.json()(req, res, () => {
              const body = (req as any).body;
              const pairsCount = body.pairs ? body.pairs.split(',').length : 0;
              fs.mkdirSync(path.dirname(QUEUE_STATUS_FILE), { recursive: true });
              // Clean up any stale stop marker from a previous run
              const stopFile = QUEUE_STATUS_FILE.replace('.json', '.stop');
              if (fs.existsSync(stopFile)) {
                fs.unlinkSync(stopFile);
              }
              const initialStatus = {
                status: 'running',
                progress: { current: 0, total: pairsCount, current_pair: 'starting' },
                started_at: new Date().toISOString(),
                finished_at: null,
                result_file: null,
                error: null,
              };
              fs.writeFileSync(QUEUE_STATUS_FILE, JSON.stringify(initialStatus));

              const args = ['queue_backtest.py', '--export-mode', 'trades', '--status-file', QUEUE_STATUS_FILE];
              if (body.pairs) args.push('--pairs', body.pairs);
              if (body.timeframes) args.push('--timeframes', body.timeframes);
              if (body.timerange) args.push('--timerange', body.timerange);
              if (body.strategy) args.push('--strategy', body.strategy);

              execFile('python3', args, { cwd: process.cwd() }, (error, stdout, stderr) => {
                if (error) {
                  console.error(`[Queue Backtest] Error: ${error.message}`);
                }
                if (stderr) {
                  console.error(`[Queue Backtest] Stderr: ${stderr}`);
                }
              });

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ status: 'started', msg: 'Queue backtest started in background' }));
            });
            return;
          }
          next();
        });
      }
    }
  ],
  resolve: {
    dedupe: ['vue'],
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 700, // Default is 500
    sourcemap: true,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
    },
    host: '127.0.0.1',
    port: 4399,
  },
  test: {
    environment: 'happy-dom',
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/e2e/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
    ],
  },
});
