import { AsyncLocalStorage } from 'node:async_hooks'

const requests = new AsyncLocalStorage<AbortSignal>()

export function requestSignal(timeoutMs: number): AbortSignal {
  const deadline = requests.getStore()
  return deadline ? AbortSignal.any([deadline, AbortSignal.timeout(timeoutMs)]) : AbortSignal.timeout(timeoutMs)
}

// All provider fallbacks share one deadline instead of adding their individual
// timeouts together until the hosting platform terminates the whole function.
export async function withRequestBudget<T>(work: () => Promise<T>, timeoutMs = 25_000): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(new Error('Marketplace request timed out')), timeoutMs)
  try {
    return await requests.run(controller.signal, async () => {
      const result = await work()
      controller.signal.throwIfAborted()
      return result
    })
  } finally { clearTimeout(timer) }
}
