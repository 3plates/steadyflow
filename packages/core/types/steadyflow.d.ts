/**
 * Steadyflow - Incremental graph layout library
 *
 * A directed graph with efficient structural sharing and incremental layout.
 * Stores nodes and edges internally with automatic topological layering.
 */

export type Node = {
  id: string
  data?: any
  inputPorts?: string[]
  outputPorts?: string[]
}

export type Edge = {
  sourceId: string
  targetId: string
  data?: any
  sourcePort?: string
  targetPort?: string
}

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
  constructor(options?: { prior?: Graph, nodes?: Node[], edges?: Edge[] })

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
  addNode(node: Node): Graph

  /**
   * Add multiple nodes to the graph.
   * 
   * @param nodes - Nodes to add
   * @returns New graph with nodes added
   */
  addNodes(...nodes: Node[]): Graph

  /**
   * Remove a node from the graph.
   * 
   * @param node - Node to remove (or node id)
   * @returns New graph with node removed
   */
  removeNode(node: Node | string): Graph

  /**
   * Remove multiple nodes from the graph.
   * 
   * @param nodes - Nodes to remove
   * @returns New graph with nodes removed
   */
  removeNodes(...nodes: (Node | string)[]): Graph

  /**
   * Add an edge to the graph.
   * 
   * @param edge - Edge to add with source and target nodes
   * @returns New graph with edge added
   */
  addEdge(edge: Edge): Graph

  /**
   * Add multiple edges to the graph.
   * 
   * @param edges - Edges to add
   * @returns New graph with edges added
   */
  addEdges(...edges: Edge[]): Graph

  /**
   * Remove an edge from the graph.
   * 
   * @param edge - Edge to remove
   * @returns New graph with edge removed
   */
  removeEdge(edge: Edge): Graph

  /**
   * Remove multiple edges from the graph.
   * 
   * @param edges - Edges to remove
   * @returns New graph with edges removed
   */
  removeEdges(...edges: Edge[]): Graph

  /**
   * Batch multiple mutations efficiently.
   * 
   * @param callback - Function that receives a mutator for batching changes
   * @returns New graph with all mutations applied
   */
  withMutations(callback: (mutator: Mutator) => void): Graph

  /**
   * Get the layer index of a node.
   * 
   * @param id - Node id
   * @returns Layer index
   */
  nodeLayer(id: string): number

  /**
   * Get the successors of a node.
   * 
   * @param id - Node id
   * @returns Array of successor node ids
   */
  *succNodes(id: string): Iterable<string>

  /**
   * Get the predecessors of a node.
   * 
   * @param id - Node id
   * @returns Array of predecessor node ids
   */
  *predNodes(id: string): Iterable<string>

  /**
   * Get the successors of a node.
   * 
   * @param id - Node id
   * @returns Array of successor edges
   */
  *succEdges(id: string): Iterable<Edge>

  /**
   * Get the predecessors of a node.
   * 
   * @param id - Node id
   * @returns Array of predecessor edges
   */
  *predEdges(id: string): Iterable<Edge>

  /**
   * Get a node by id.
   * 
   * @param id - Node id
   * @returns Node or undefined
   */
  getNode(id: string): Node | undefined

  /**
   * Get an edge by id.
   * 
   * @param id - Edge id
   * @returns Edge or undefined
   */
  getEdge(id: string): Edge | undefined

  /**
   * Check if a node exists.
   * 
   * @param id - Node id
   * @returns True if node exists, false otherwise
   */
  hasNode(id: string): boolean

  /**
   * Check if an edge exists.
   * 
   * @param id - Edge id
   * @returns True if edge exists, false otherwise
   */
  hasEdge(id: string): boolean
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
  addNode(node: Node): void

  /**
   * Add multiple nodes.
   */
  addNodes(...nodes: Node[]): void

  /**
   * Add an edge.
   */
  addEdge(edge: Edge): void

  /**
   * Add multiple edges.
   */
  addEdges(...edges: Edge[]): void

  /**
   * Remove a node.
   */
  removeNode(node: Node | string): void

  /**
   * Remove multiple nodes.
   */
  removeNodes(...nodes: (Node | string)[]): void

  /**
   * Remove an edge.
   */
  removeEdge(edge: Edge): void

  /**
   * Remove multiple edges.
   */
  removeEdges(...edges: Edge[]): void
}
