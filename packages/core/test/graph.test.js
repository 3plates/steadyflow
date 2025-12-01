import { describe, it, expect } from 'vitest'
import { Graph } from '../src/index.js'

describe('Graph', () => {
  describe('Construction', () => {
    it('should create an empty graph', () => {
      const graph = new Graph()
      expect(graph.isEmpty()).toBe(true)
    })

    it('should create graph with initial nodes', () => {
      const graph = new Graph({
        nodes: [
          { id: 'n1', data: 'Node 1' },
          { id: 'n2', data: 'Node 2' },
        ],
      })
      expect(graph.isEmpty()).toBe(false)
    })

    it('should create graph with nodes and edges', () => {
      const graph = new Graph({
        nodes: [
          { id: 'n1', data: 'Node 1' },
          { id: 'n2', data: 'Node 2' },
        ],
        edges: [
          {
            sourceId: 'n1',
            targetId: 'n2',
            data: 'Edge 1',
          },
        ],
      })
      expect(graph.isEmpty()).toBe(false)
    })
  })

  describe('Adding nodes', () => {
    it('should add a single node', () => {
      const g1 = new Graph()
      const g2 = g1.addNode({ id: 'n1', data: 'Node 1' })

      expect(g1.isEmpty()).toBe(true)
      expect(g2.isEmpty()).toBe(false)
    })

    it('should add multiple nodes', () => {
      const g1 = new Graph()
      const g2 = g1.addNodes(
        { id: 'n1', data: 'Node 1' },
        { id: 'n2', data: 'Node 2' },
        { id: 'n3', data: 'Node 3' }
      )

      expect(g1.isEmpty()).toBe(true)
      expect(g2.isEmpty()).toBe(false)
    })
  })

  describe('Batch mutations', () => {
    it('should batch multiple operations', () => {
      const g1 = new Graph()
      const g2 = g1.withMutations((m) => {
        m.addNodes(
          { id: 'n1', data: 'Node 1' },
          { id: 'n2', data: 'Node 2' },
          { id: 'n3', data: 'Node 3' }
        )
        m.addEdges(
          { sourceId: 'n1', targetId: 'n2' },
          { sourceId: 'n2', targetId: 'n3' }
        )
      })

      expect(g1.isEmpty()).toBe(true)
      expect(g2.isEmpty()).toBe(false)
    })
  })

  describe('Structural sharing', () => {
    it('should maintain prior reference', () => {
      const g1 = new Graph({ nodes: [{ id: 'n1' }] })
      const g2 = g1.addNode({ id: 'n2' })

      expect(g2.prior).toBe(g1)
    })

    it('should chain multiple versions', () => {
      const g1 = new Graph({ nodes: [{ id: 'n1' }] })
      const g2 = g1.addNode({ id: 'n2' })
      const g3 = g2.addNode({ id: 'n3' })

      expect(g3.prior).toBe(g2)
      expect(g2.prior).toBe(g1)
    })
  })

  describe('Adding edges', () => {
    it('should populate pred/succ', () => {
      const graph = new Graph({
        nodes: [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }, { id: 'n4' }],
        edges: [
          { sourceId: 'n1', targetId: 'n3' },
          { sourceId: 'n2', targetId: 'n3' },
          { sourceId: 'n2', targetId: 'n4' },
        ],
      })
      expect([...graph.pred('n1')]).toEqual([])
      expect([...graph.pred('n2')]).toEqual([])
      expect([...graph.pred('n3')]).toEqual(['n1', 'n2'])
      expect([...graph.pred('n4')]).toEqual(['n2'])
      expect([...graph.succ('n1')]).toEqual(['n3'])
      expect([...graph.succ('n2')]).toEqual(['n3', 'n4'])
      expect([...graph.succ('n3')]).toEqual([])
      expect([...graph.succ('n4')]).toEqual([])
    })
  })

  describe('Removing nodes', () => {
    it('should remove nodes from layers', () => {
      const g1 = new Graph({
        nodes: [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }],
      })

      // Check that layer 0 has all 3 nodes
      const layer0 = g1.layers.get(g1.layerMap.get('n1'))
      expect(layer0.nodes.size).toBe(3)
      expect(layer0.nodes.has('n1')).toBe(true)
      expect(layer0.nodes.has('n2')).toBe(true)
      expect(layer0.nodes.has('n3')).toBe(true)

      // Remove a node
      const g2 = g1.withMutations(m => {
        m.removeNode({ id: 'n2' })
      })

      // Check that n2 is gone from the layer
      const layer0After = g2.layers.get(g2.layerMap.get('n1'))
      expect(layer0After.nodes.size).toBe(2)
      expect(layer0After.nodes.has('n1')).toBe(true)
      expect(layer0After.nodes.has('n2')).toBe(false)
      expect(layer0After.nodes.has('n3')).toBe(true)

      // And that the node is truly removed
      expect(g2.hasNode('n2')).toBe(false)
    })

    it('should automatically remove edges when removing a node', () => {
      const g1 = new Graph({
        nodes: [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }],
        edges: [
          { sourceId: 'n1', targetId: 'n2' },
          { sourceId: 'n2', targetId: 'n3' },
        ],
      })

      // Verify edges exist
      expect(g1.hasEdge('n1-n2')).toBe(true)
      expect(g1.hasEdge('n2-n3')).toBe(true)
      expect([...g1.succ('n1')]).toEqual(['n2'])
      expect([...g1.pred('n3')]).toEqual(['n2'])

      // Remove the middle node
      const g2 = g1.withMutations(m => {
        m.removeNode({ id: 'n2' })
      })

      // Both edges involving n2 should be gone
      expect(g2.hasEdge('n1-n2')).toBe(false)
      expect(g2.hasEdge('n2-n3')).toBe(false)
      expect([...g2.succ('n1')]).toEqual([])
      expect([...g2.pred('n3')]).toEqual([])

      // But n1 and n3 should still exist
      expect(g2.hasNode('n1')).toBe(true)
      expect(g2.hasNode('n3')).toBe(true)
    })
  })

  describe('Cycle detection', () => {
    describe('Acyclic graphs', () => {
      it('should not throw for simple chain', () => {
        expect(() => {
          new Graph({
            nodes: [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }],
            edges: [
              { sourceId: 'n1', targetId: 'n2' },
              { sourceId: 'n2', targetId: 'n3' },
            ],
          })
        }).not.toThrow()
      })

      it('should not throw for DAG with multiple paths', () => {
        expect(() => {
          new Graph({
            nodes: [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }, { id: 'n4' }],
            edges: [
              { sourceId: 'n1', targetId: 'n2' },
              { sourceId: 'n1', targetId: 'n3' },
              { sourceId: 'n2', targetId: 'n4' },
              { sourceId: 'n3', targetId: 'n4' },
            ],
          })
        }).not.toThrow()
      })
    })

    describe('Full cycle detection (large graphs)', () => {
      it('should detect simple 2-node cycle', () => {
        expect(() => {
          new Graph({
            nodes: [{ id: 'n1' }, { id: 'n2' }],
            edges: [
              { sourceId: 'n1', targetId: 'n2' },
              { sourceId: 'n2', targetId: 'n1' },
            ],
          })
        }).toThrow('Cycle detected')
      })

      it('should detect 3-node cycle', () => {
        expect(() => {
          new Graph({
            nodes: [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }],
            edges: [
              { sourceId: 'n1', targetId: 'n2' },
              { sourceId: 'n2', targetId: 'n3' },
              { sourceId: 'n3', targetId: 'n1' },
            ],
          })
        }).toThrow('Cycle detected')
      })

      it('should detect self-loop', () => {
        expect(() => {
          new Graph({
            nodes: [{ id: 'n1' }],
            edges: [{ sourceId: 'n1', targetId: 'n1' }],
          })
        }).toThrow('Cycle detected')
      })

      it('should include cycle info in error', () => {
        try {
          new Graph({
            nodes: [{ id: 'n1' }, { id: 'n2' }],
            edges: [
              { sourceId: 'n1', targetId: 'n2' },
              { sourceId: 'n2', targetId: 'n1' },
            ],
          })
          expect.fail('Should have thrown')
        } catch (error) {
          expect(error.message).toContain('Cycle detected')
          expect(error.cycle).toBeDefined()
          expect(Array.isArray(error.cycle)).toBe(true)
        }
      })
    })

    describe('Incremental cycle detection (small changes)', () => {
      it('should detect cycle when adding edge to small graph', () => {
        const g1 = new Graph({
          nodes: [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }],
          edges: [
            { sourceId: 'n1', targetId: 'n2' },
            { sourceId: 'n2', targetId: 'n3' },
          ],
        })

        // Adding edge that creates cycle: n3 -> n1
        expect(() => {
          g1.addEdge({ sourceId: 'n3', targetId: 'n1' })
        }).toThrow('Cycle detected')
      })

      it('should detect cycle in forward edge check', () => {
        // Graph: n1 -> n2 -> n3
        const g1 = new Graph({
          nodes: [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }],
          edges: [
            { sourceId: 'n1', targetId: 'n2' },
            { sourceId: 'n2', targetId: 'n3' },
          ],
        })

        // Try to add backward edge n2 -> n1 (creates cycle)
        expect(() => {
          g1.addEdge({ sourceId: 'n2', targetId: 'n1' })
        }).toThrow('Cycle detected')
      })

      it('should allow forward edges in incremental mode', () => {
        const g1 = new Graph({
          nodes: [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }],
          edges: [{ sourceId: 'n1', targetId: 'n2' }],
        })

        // Adding forward edge should work
        expect(() => {
          g1.addEdge({ sourceId: 'n2', targetId: 'n3' })
        }).not.toThrow()
      })

      it('should handle multiple edge additions without cycle', () => {
        const g1 = new Graph({
          nodes: [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }, { id: 'n4' }],
          edges: [{ sourceId: 'n1', targetId: 'n2' }],
        })

        expect(() => {
          g1.withMutations((m) => {
            m.addEdges(
              { sourceId: 'n2', targetId: 'n3' },
              { sourceId: 'n3', targetId: 'n4' }
            )
          })
        }).not.toThrow()
      })

      it('should detect cycle in batch of edges', () => {
        const g1 = new Graph({
          nodes: [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }],
          edges: [{ sourceId: 'n1', targetId: 'n2' }],
        })

        expect(() => {
          g1.withMutations((m) => {
            m.addEdges(
              { sourceId: 'n2', targetId: 'n3' },
              { sourceId: 'n3', targetId: 'n1' } // Creates cycle
            )
          })
        }).toThrow('Cycle detected')
      })
    })

    describe('Full detection fallback', () => {
      it('should use full detection for large graphs', () => {
        // Create graph with 25 nodes (>20 threshold)
        const nodes = Array.from({ length: 25 }, (_, i) => ({ id: `n${i}` }))
        const edges = Array.from({ length: 24 }, (_, i) => ({
          sourceId: `n${i}`,
          targetId: `n${i + 1}`,
        }))

        const g1 = new Graph({ nodes, edges })

        // Add cycle with full detection
        expect(() => {
          g1.addEdge({ sourceId: 'n24', targetId: 'n0' })
        }).toThrow('Cycle detected')
      })

      it('should use full detection for high change ratio', () => {
        // Small graph but adding many edges (>30% change)
        const g1 = new Graph({
          nodes: [
            { id: 'n1' },
            { id: 'n2' },
            { id: 'n3' },
            { id: 'n4' },
            { id: 'n5' },
          ],
        })

        // Add 5 edges to 5-node graph (100% change ratio)
        expect(() => {
          g1.withMutations((m) => {
            m.addEdges(
              { sourceId: 'n1', targetId: 'n2' },
              { sourceId: 'n2', targetId: 'n3' },
              { sourceId: 'n3', targetId: 'n4' },
              { sourceId: 'n4', targetId: 'n5' },
              { sourceId: 'n5', targetId: 'n1' } // Cycle!
            )
          })
        }).toThrow('Cycle detected')
      })
    })
  })

  describe('Layer assignment', () => {
    describe('Initial layout', () => {
      it('should assign a chain of nodes to layers', () => {
        const g1 = new Graph({
          nodes: [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }],
          edges: [
            { sourceId: 'n1', targetId: 'n2' },
            { sourceId: 'n2', targetId: 'n3' },
          ],
        })

        expect(g1.layerOf('n1')).toBe(0)
        expect(g1.layerOf('n2')).toBe(1)
        expect(g1.layerOf('n3')).toBe(2)
      })

      it('should assign unlinked nodes to layer 0', () => {
        const g1 = new Graph({
          nodes: [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }],
        })

        expect(g1.layerOf('n1')).toBe(0)
        expect(g1.layerOf('n2')).toBe(0)
        expect(g1.layerOf('n3')).toBe(0)
      })

      it('should assign two fully linked layers to the same layer', () => {
        const g1 = new Graph({
          nodes: [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }, { id: 'n4' }],
          edges: [
            { sourceId: 'n1', targetId: 'n3' },
            { sourceId: 'n1', targetId: 'n4' },
            { sourceId: 'n2', targetId: 'n3' },
            { sourceId: 'n2', targetId: 'n4' },
          ],
        })

        expect(g1.layerOf('n1')).toBe(0)
        expect(g1.layerOf('n2')).toBe(0)
        expect(g1.layerOf('n3')).toBe(1)
        expect(g1.layerOf('n4')).toBe(1)
      })

      it('should push parents down', () => {
        const g1 = new Graph({
          nodes: [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }, { id: 'n4' }],
          edges: [
            { sourceId: 'n1', targetId: 'n2' },
            { sourceId: 'n2', targetId: 'n3' },
            { sourceId: 'n4', targetId: 'n3' },
          ],
        })

        expect(g1.layerOf('n1')).toBe(0)
        expect(g1.layerOf('n2')).toBe(1)
        expect(g1.layerOf('n3')).toBe(2)
        expect(g1.layerOf('n4')).toBe(1)
      })

      it('should handle diamond pattern', () => {
        const g1 = new Graph({
          nodes: [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }, { id: 'n4' }],
          edges: [
            { sourceId: 'n1', targetId: 'n2' },
            { sourceId: 'n1', targetId: 'n3' },
            { sourceId: 'n2', targetId: 'n4' },
            { sourceId: 'n3', targetId: 'n4' },
          ],
        })

        expect(g1.layerOf('n1')).toBe(0)
        expect(g1.layerOf('n2')).toBe(1)
        expect(g1.layerOf('n3')).toBe(1)
        expect(g1.layerOf('n4')).toBe(2)
      })

      it('should handle disconnected components', () => {
        const g1 = new Graph({
          nodes: [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }, { id: 'n4' }],
          edges: [
            { sourceId: 'n1', targetId: 'n2' },
            { sourceId: 'n3', targetId: 'n4' },
          ],
        })

        // Both components should have their roots at layer 0
        expect(g1.layerOf('n1')).toBe(0)
        expect(g1.layerOf('n2')).toBe(1)
        expect(g1.layerOf('n3')).toBe(0)
        expect(g1.layerOf('n4')).toBe(1)
      })
    })

    describe('Incremental layout', () => {
      it('should push parents down', () => {
        const g1 = new Graph({
          nodes: [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }],
          edges: [
            { sourceId: 'n1', targetId: 'n2' },
            { sourceId: 'n2', targetId: 'n3' },
          ],
        })

        expect(g1.layerOf('n1')).toBe(0)
        expect(g1.layerOf('n2')).toBe(1)
        expect(g1.layerOf('n3')).toBe(2)

        const g2 = g1.withMutations((m) => {
          m.addNode({ id: 'n4' })
          m.addEdge({ sourceId: 'n4', targetId: 'n3' })
        })

        expect(g1.layerOf('n1')).toBe(0)
        expect(g1.layerOf('n2')).toBe(1)
        expect(g1.layerOf('n3')).toBe(2)
        expect(g2.layerOf('n4')).toBe(1)
      })

      it('should delete empty layers', () => {
        const g1 = new Graph({
          nodes: [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }],
          edges: [
            { sourceId: 'n1', targetId: 'n2' },
            { sourceId: 'n2', targetId: 'n3' },
          ],
        })

        expect(g1.layerOf('n1')).toBe(0)
        expect(g1.layerOf('n2')).toBe(1)
        expect(g1.layerOf('n3')).toBe(2)

        const g2 = g1.withMutations((m) => {
          m.removeEdge({ sourceId: 'n1', targetId: 'n2' })
          m.addEdge({ sourceId: 'n1', targetId: 'n3' })
        })

        expect(g2.layerOf('n1')).toBe(0)
        expect(g2.layerOf('n2')).toBe(0)
        expect(g2.layerOf('n3')).toBe(1)
      })

      it('should move nodes up when removing edges', () => {
        const g1 = new Graph({
          nodes: [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }, { id: 'n4' }],
          edges: [
            { sourceId: 'n1', targetId: 'n2' },
            { sourceId: 'n2', targetId: 'n3' },
            { sourceId: 'n3', targetId: 'n4' },
          ],
        })

        expect(g1.layerOf('n1')).toBe(0)
        expect(g1.layerOf('n2')).toBe(1)
        expect(g1.layerOf('n3')).toBe(2)
        expect(g1.layerOf('n4')).toBe(3)

        // Remove middle edge - n3 and n4 should move up
        const g2 = g1.removeEdge({ sourceId: 'n2', targetId: 'n3' })

        expect(g2.layerOf('n1')).toBe(0)
        expect(g2.layerOf('n2')).toBe(1)
        expect(g2.layerOf('n3')).toBe(0) // n3 has no parents now
        expect(g2.layerOf('n4')).toBe(1) // n4 follows n3
      })

      it('should handle cascading layer updates', () => {
        const g1 = new Graph({
          nodes: [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }],
          edges: [
            { sourceId: 'n1', targetId: 'n3' },
            { sourceId: 'n2', targetId: 'n3' },
          ],
        })

        expect(g1.layerOf('n1')).toBe(0)
        expect(g1.layerOf('n2')).toBe(0)
        expect(g1.layerOf('n3')).toBe(1)

        // Add edge that makes n2 depend on n1 - should push n2 and n3 down
        const g2 = g1.addEdge({ sourceId: 'n1', targetId: 'n2' })

        expect(g2.layerOf('n1')).toBe(0)
        expect(g2.layerOf('n2')).toBe(1)
        expect(g2.layerOf('n3')).toBe(2) // Cascades down
      })

      it('should handle adding multiple nodes in a chain', () => {
        const g1 = new Graph({
          nodes: [{ id: 'n1' }],
        })

        expect(g1.layerOf('n1')).toBe(0)

        const g2 = g1.withMutations((m) => {
          m.addNode({ id: 'n2' })
          m.addNode({ id: 'n3' })
          m.addNode({ id: 'n4' })
          m.addEdge({ sourceId: 'n1', targetId: 'n2' })
          m.addEdge({ sourceId: 'n2', targetId: 'n3' })
          m.addEdge({ sourceId: 'n3', targetId: 'n4' })
        })

        expect(g2.layerOf('n1')).toBe(0)
        expect(g2.layerOf('n2')).toBe(1)
        expect(g2.layerOf('n3')).toBe(2)
        expect(g2.layerOf('n4')).toBe(3)
      })
    })
  })
})
