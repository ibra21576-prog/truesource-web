import { defineConfig } from '@trigger.dev/sdk'

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_REF || 'proj_truesource_flip',
  dirs: ['./trigger'],
  runtime: 'node-22',
  maxDuration: 300,
  logLevel: 'info',
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 2_000,
      maxTimeoutInMs: 30_000,
      factor: 2,
      randomize: true,
    },
  },
  build: {
    external: ['onnxruntime-node'],
  },
})

