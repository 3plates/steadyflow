import { describe, it } from 'vitest'
import { Graph } from '../types/steadyflow.d'

describe('Types', () => {
  it('should validate types', () => {
    const _ = new Graph<string, number>()
  })
})
