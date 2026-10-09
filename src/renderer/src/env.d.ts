import type { PoiesisApi } from '@shared/types'

declare global {
  interface Window {
    poiesis: PoiesisApi
  }
}

export {}
