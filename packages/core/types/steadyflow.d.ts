/**
 * Steadyflow - Incremental graph layout library
 *
 * A directed graph with efficient structural sharing and incremental layout.
 * Stores nodes and edges internally with automatic topological layering.
 */

/**
 * Directed graph with incremental layout.
 * 
 * Graph maintains nodes and edges internally, automatically computing
 * topological layers for layout. All mutations return new graph versions
 * with structural sharing for efficiency.
 */
export class Graph {
  /**
   * Create a new graph.
   * 
   * @param options - Optional configuration
   * @param options.prior - Previous graph version for structural sharing
   * @param options.nodes - Initial nodes to add
   * @param options.edges - Initial edges to add
   */
  constructor(options?: {
    prior?: Graph
    nodes?: Array<{ id: string; data?: any; ports?: any }>
    edges?: Array<{ source: { id: string }; target: { id: string }; data?: any }>
  })

  /**
   * Check if the graph is empty (no nodes or edges).
   */
  isEmpty(): boolean

  /**
   * Add a node to the graph.
   * 
   * @param node - Node to add with id and optional data
   * @returns New graph with node added
   */
  addNode(node: { id: string; data?: any; ports?: any }): Graph

  /**
   * Add multiple nodes to the graph.
   * 
   * @param nodes - Nodes to add
   * @returns New graph with nodes added
   */
  addNodes(...nodes: Array<{ id: string; data?: any; ports?: any }>): Graph

  /**
   * Remove a node from the graph.
   * 
   * @param node - Node to remove (or node id)
   * @returns New graph with node removed
   */
  removeNode(node: { id: string } | string): Graph

  /**
   * Remove multiple nodes from the graph.
   * 
   * @param nodes - Nodes to remove
   * @returns New graph with nodes removed
   */
  removeNodes(...nodes: Array<{ id: string } | string>): Graph

  /**
   * Add an edge to the graph.
   * 
   * @param edge - Edge to add with source and target nodes
   * @returns New graph with edge added
   */
  addEdge(edge: {
    source: { id: string }
    target: { id: string }
    data?: any
  }): Graph

  /**
   * Add multiple edges to the graph.
   * 
   * @param edges - Edges to add
   * @returns New graph with edges added
   */
  addEdges(
    ...edges: Array<{
      source: { id: string }
      target: { id: string }
      data?: any
    }>
  ): Graph

  /**
   * Remove an edge from the graph.
   * 
   * @param edge - Edge to remove
   * @returns New graph with edge removed
   */
  removeEdge(edge: {
    source: { id: string }
    target: { id: string }
  }): Graph

  /**
   * Remove multiple edges from the graph.
   * 
   * @param edges - Edges to remove
   * @returns New graph with edges removed
   */
  removeEdges(
    ...edges: Array<{
      source: { id: string }
      target: { id: string }
    }>
  ): Graph

  /**
   * Batch multiple mutations efficiently.
   * 
   * @param callback - Function that receives a mutator for batching changes
   * @returns New graph with all mutations applied
   */
  withMutations(callback: (mutator: Mutator) => void): Graph
}

/**
 * Mutator for batch graph updates.
 * 
 * Allows efficient batching of multiple add/remove operations.
 */
export class Mutator {
  /**
   * Add a node.
   */
  addNode(node: { id: string; data?: any; ports?: any }): void

  /**
   * Add multiple nodes.
   */
  addNodes(...nodes: Array<{ id: string; data?: any; ports?: any }>): void

  /**
   * Add an edge.
   */
  addEdge(edge: {
    source: { id: string }
    target: { id: string }
    data?: any
  }): void

  /**
   * Add multiple edges.
   */
  addEdges(
    ...edges: Array<{
      source: { id: string }
      target: { id: string }
      data?: any
    }>
  ): void

  /**
   * Remove a node.
   */
  removeNode(node: { id: string } | string): void

  /**
   * Remove multiple nodes.
   */
  removeNodes(...nodes: Array<{ id: string } | string>): void

  /**
   * Remove an edge.
   */
  removeEdge(edge: {
    source: { id: string }
    target: { id: string }
  }): void

  /**
   * Remove multiple edges.
   */
  removeEdges(
    ...edges: Array<{
      source: { id: string }
      target: { id: string }
    }>
  ): void
}
