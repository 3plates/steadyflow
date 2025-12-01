import { Map as IMap, List as IList, Set as ISet } from 'immutable'

const defaultOptions = {}

export class Graph {
  constructor({ prior, changes, options, nodes, edges } = {}) {
    // nodeId -> node
    this.nodeMap = prior?.nodeMap || IMap()
    // edgeId -> edge
    this.edgeMap = prior?.edgeMap || IMap()
    // nodeId -> layerId
    this.layerMap = prior?.layerMap || IMap()
    // layerId -> layer
    this.layers = prior?.layers || IMap()
    // index -> layerId
    this.layerList = prior?.layerList || IList()
    // nodeId -> { edgeId }
    this.predMap = prior?.predMap || IMap()
    // nodeId -> { edgeId }
    this.succMap = prior?.succMap || IMap()
    // nodeId -> { pos, dims }
    this.nodeLayout = prior?.nodeLayout || IMap()

    this.nextLayerId = prior?.nextLayerId || 0
    this.dirtyNodes = new Set()
    this.prior = prior
    this.options = {
      ...defaultOptions,
      ...(prior?.options || {}),
      ...(options || {}),
    }

    this.changes = changes || {
      addedNodes: [],
      removedNodes: [],
      addedEdges: [],
      removedEdges: [],
    }

    this.changes.addedNodes.push(...(nodes || []))
    this.changes.addedEdges.push(...(edges || []))

    this.dirty =
      this.changes.addedNodes.length > 0 ||
      this.changes.removedNodes.length > 0 ||
      this.changes.addedEdges.length > 0 ||
      this.changes.removedEdges.length > 0

    // Apply initial changes
    if (this.dirty) {
      this.update()
    }
  }

  edgeId(edge) {
    let source = edge.sourceId
    if (edge.sourcePort) source += `.${edge.sourcePort}`
    let target = edge.targetId
    if (edge.targetPort) target += `.${edge.targetPort}`
    return `${source}-${target}`
  }

  isEmpty() {
    return this.nodeMap.isEmpty()
  }

  numNodes() {
    return this.nodeMap.size
  }

  numEdges() {
    return this.edgeMap.size
  }

  nodes() {
    return this.nodeMap?.valueSeq() || []
  }

  edges() {
    return this.edgeMap?.valueSeq() || []
  }

  nodeIds() {
    return this.nodeMap.keySeq().toArray().sort()
  }

  getNode(id) {
    return this.nodeMap?.get(id)
  }

  getEdge(id) {
    return this.edgeMap?.get(id)
  }

  hasNode(id) {
    return this.nodeMap?.has(id) || false
  }

  hasEdge(id) {
    return this.edgeMap?.has(id) || false
  }

  _pred(id) {
    return this.predMap.get(id) || ISet()
  }

  _succ(id) {
    return this.succMap.get(id) || ISet()
  }

  predNodes(id) {
    return this._pred(id).map(id => this.getEdge(id).sourceId).toSet()
  }

  succNodes(id) {
    return this._succ(id).map(id => this.getEdge(id).targetId).toSet()
  }

  predEdges(id) {
    return this._pred(id).map(id => this.getEdge(id))
  }

  succEdges(id) {
    return this._succ(id).map(id => this.getEdge(id))
  }

  withMutations(callback) {
    const mut = new Mutator()
    callback(mut)
    return new Graph({ prior: this, changes: mut.changes })
  }

  addNodes(...nodes) {
    return this.withMutations(mutator => {
      nodes.forEach(node => mutator.addNode(node))
    })
  }

  addNode(node) {
    return this.withMutations(mutator => {
      mutator.addNode(node)
    })
  }

  addEdges(...edges) {
    return this.withMutations(mutator => {
      edges.forEach(edge => mutator.addEdge(edge))
    })
  }

  addEdge(edge) {
    return this.withMutations(mutator => {
      mutator.addEdge(edge)
    })
  }

  removeNodes(...nodes) {
    return this.withMutations(mutator => {
      nodes.forEach(node => mutator.removeNode(node))
    })
  }

  removeNode(node) {
    return this.withMutations(mutator => {
      mutator.removeNode(node)
    })
  }

  removeEdges(...edges) {
    return this.withMutations(mutator => {
      edges.forEach(edge => mutator.removeEdge(edge))
    })
  }

  removeEdge(edge) {
    return this.withMutations(mutator => {
      mutator.removeEdge(edge)
    })
  }

  layerOf(id) {
    return this.layers.get(this.layerMap.get(id)).index
  }

  update() {
    if (!this.dirty) return
    this._mutate(() => {
      this._applyChanges()
      this._markDirtyNodes()
      this._checkCycles()
      this._updateLayers()
    })
    this.dirty = false
  }

  _mutate(callback) {
    const state = [
      'nodeMap',
      'edgeMap',
      'layerMap',
      'predMap',
      'succMap',
      'layers',
      'layerList',
      'nodeLayout',
    ]
    const mut = () => {
      if (state.length == 0) return callback()
      const name = state.shift()
      this[name] = this[name].withMutations(map => {
        this[name] = map
        mut()
      })
    }
    mut()
  }

  // Apply changes to the graph
  _applyChanges() {
    let layer = this.layerByIndex(0)
    const nodes = layer.nodes.withMutations(nodes => {
      for (const node of this.changes.addedNodes) {
        this.nodeMap.set(node.id, node)
        this.predMap.set(node.id, ISet())
        this.succMap.set(node.id, ISet())
        this.layerMap.set(node.id, layer.id)
        nodes.add(node.id)
      }
    })
    layer = { ...layer, nodes }
    this.layers.set(layer.id, layer)
    for (const node of this.changes.removedNodes) {
      layer = this.layers.get(this.layerMap.get(node.id))
      layer = { ...layer, nodes: layer.nodes.remove(node.id) }
      for (const edge of this.predEdges(node.id))
        this.changes.removedEdges.push(edge)
      for (const edge of this.succEdges(node.id))
        this.changes.removedEdges.push(edge)
      this.layers.set(layer.id, layer)
      this.nodeMap.delete(node.id)
      this.predMap.delete(node.id)
      this.succMap.delete(node.id)
      this.layerMap.delete(node.id)
    }
    for (const edge of this.changes.addedEdges) {
      const id = this.edgeId(edge)
      this.edgeMap.set(id, edge)
      const predSet = this.predMap.get(edge.targetId)
      this.predMap.set(edge.targetId, predSet.add(id))
      const succSet = this.succMap.get(edge.sourceId)
      this.succMap.set(edge.sourceId, succSet.add(id))
    }
    for (const edge of this.changes.removedEdges) {
      const id = this.edgeId(edge)
      this.edgeMap.delete(id)
      const predSet = this.predMap.get(edge.targetId)
      if (predSet?.has(id))
        this.predMap.set(edge.targetId, predSet.remove(id))
      const succSet = this.succMap.get(edge.sourceId)
      if (succSet?.has(id))
        this.succMap.set(edge.sourceId, succSet.remove(id))
    }
  }

  _markDirtyNodes() {
    for (const node of this.changes.addedNodes)
      this._markDirty(node.id)
    for (const edge of this.changes.addedEdges)
      this._markDirty(edge.targetId)
    for (const edge of this.changes.removedEdges)
      this._markDirty(edge.targetId)
  }

  _markDirty(id) {
    if (this.nodeMap.has(id))
      this.dirtyNodes.add(id)
  }

  cycleInfo(id) {
    const node = this.nodeMap.get(id)
    return node?.id || id
  }

  _checkCycles() {
    const totalNodes = this.nodeMap.size
    const newStuff = this.changes.addedNodes.length + this.changes.addedEdges.length
    const changeRatio = newStuff / totalNodes
    if (changeRatio > 0.2 || totalNodes < 20) {
      this._checkCyclesFull()
    } else {
      this._checkCyclesIncremental()
    }
  }

  _checkCyclesFull() {
    const colorMap = new Map()
    const parentMap = new Map()
    const white = 0, gray = 1, black = 2
    let start, end

    const visit = (id) => {
      colorMap.set(id, gray)
      for (const next of this.succNodes(id)) {
        switch (colorMap.get(next) ?? white) {
          case gray:
            start = next
            end = id
            return true
          case white:
            parentMap.set(next, id)
            if (visit(next)) return true
        }
      }
      colorMap.set(id, black)
      return false
    }

    for (const id of this.nodeMap.keySeq())
      if ((colorMap.get(id) ?? white) == white)
        if (visit(id)) break

    if (!start) return

    const cycle = [this.cycleInfo(start)]
    let id = end
    while (id != start) {
      cycle.push(this.cycleInfo(id))
      id = parentMap.get(id)
    }
    cycle.push(this.cycleInfo(start))
    cycle.reverse()
    const error = new Error(`Cycle detected: ${cycle.join(' → ')}`)
    error.cycle = cycle
    throw error
  }

  _checkCyclesIncremental() {
    for (const edge of this.changes.addedEdges) {
      const layer1 = this.layerOf(edge.sourceId)
      const layer2 = this.layerOf(edge.targetId)
      if (layer1 < layer2) continue
      const route = this.findRoute(edge.sourceId, edge.targetId)
      const cycle = route.map(id => this.cycleInfo(id))
      cycle.reverse()
      const error = new Error(`Cycle detected: ${cycle.join(' → ')}`)
      error.cycle = cycle
      throw error
    }
  }

  // Update layers in two passes:
  // 
  //  - Move children up or down to just below lowest parent
  //  - Move parents down to just above highest child
  // 
  // While moving nodes between layers, if any layer becomes empty,
  // remove it from the list; at the end, renumber the remaining layers
  _updateLayers() {
    // phase 1: DFS to fix child layers based on parents
    // visit at least each dirty node
    const stack = [...this.dirtyNodes]
    const phase2 = new Set(stack)
    while (stack.length > 0) {
      const id = stack.pop()
      const parents = this.predNodes(id)
      let correctLayer
      if (parents.size == 0) {
        // this only happens for new nodes or removed edges; move to top
        correctLayer = 0
      } else {
        // otherwise, move to just below max parent
        const maxParent = parents.map(id => this.layerOf(id)).max()
        correctLayer = maxParent + 1
      }
      const curLayer = this.layerOf(id)
      // if needs a move, move it and push children to stack
      // also add parents to phase 2
      if (curLayer != correctLayer) {
        this._moveNodeLayer(id, correctLayer)
        stack.push(...this.succNodes(id))
        for (const parent of parents)
          phase2.add(parent)
      }
    }
    // phase 2: reverse topo order to fix parents based on children
    const byLayer = new Map()
    // start by grouping by layer
    const addParent = (id) => {
      let set
      const layerId = this.layerMap.get(id)
      if (!byLayer.has(layerId)) {
        set = new Set()
        byLayer.set(layerId, set)
      } else {
        set = byLayer.get(layerId)
      }
      set.add(id)
    }
    for (const id of phase2) addParent(id)
    // take layers in reverse topo order
    const layerIds = [...byLayer.keys()].sort((a, b) => this.layers.get(b).index - this.layers.get(a).index)
    for (const layerId of layerIds) {
      const curLayer = this.layers.get(layerId).index
      // visit each parent of this layer
      for (const id of byLayer.get(layerId).values()) {
        const children = this.succNodes(id)
        if (children.size == 0) continue
        // should be just above min child
        const minChild = children.map(id => this.layerOf(id)).min()
        const correctLayer = minChild - 1
        // if needs a move, move it and push parents to stack
        if (curLayer != correctLayer) {
          this._moveNodeLayer(id, correctLayer)
          for (const parent of this.predNodes(id))
            addParent(parent)
        }
      }
    }
  }

  // Move the node to a new layer, crushing the original layer
  // if it becomes empty
  _moveNodeLayer(id, newIndex) {
    const oldId = this.layerMap.get(id)
    let oldLayer = this.layers.get(oldId)
    let newLayer = this.layerByIndex(newIndex)
    oldLayer = { ...oldLayer, nodes: oldLayer.nodes.remove(id) }
    newLayer = { ...newLayer, nodes: newLayer.nodes.add(id) }
    this.layers.set(newLayer.id, newLayer)
    this.layerMap.set(id, newLayer.id)
    if (oldLayer.nodes.size == 0) {
      this.layers.delete(oldId)
      this.layerList.remove(oldLayer.index)
      // Update indices for all layers after the removed one
      for (let i = oldLayer.index; i < this.layerList.size; i++) {
        const layerId = this.layerList.get(i)
        const layer = { ...this.layers.get(layerId), index: i }
        this.layers.set(layerId, layer)
      }
    } else {
      this.layers.set(oldId, oldLayer)
    }
  }

  // Get the layer at the given index, creating it if necessary
  layerByIndex(index) {
    while (index >= this.layerList.size) {
      const id = this.nextLayerId++
      const layerIndex = this.layerList.size  // Use current size as the index
      const layer = { id, index: layerIndex, nodes: ISet() }
      this.layers.set(id, layer)
      this.layerList.push(id)  // Store ID, not layer object
    }
    const layerId = this.layerList.get(index)
    return this.layers.get(layerId)
  }

  findRoute(from, to) {
    const parentMap = new Map()
    const queue = [from]
    const visited = new Set([from])

    while (queue.length > 0) {
      const id = queue.shift()
      if (id == to) {
        // Found! Reconstruct path
        const route = []
        let curr = to
        while (curr != from) {
          route.push(curr)
          curr = parentMap.get(curr)
        }
        route.push(from)
        route.reverse()
        return route
      }

      for (const child of this.succNodes(id)) {
        if (!visited.has(child)) {
          visited.add(child)
          parentMap.set(child, id)
          queue.push(child)
        }
      }
    }

    return null  // No path found
  }
}


export class Mutator {
  constructor() {
    this.changes = {
      addedNodes: [],
      removedNodes: [],
      addedEdges: [],
      removedEdges: [],
    }
  }

  addNode(node) {
    this.changes.addedNodes.push(node)
  }

  addNodes(...nodes) {
    nodes.forEach(node => this.addNode(node))
  }

  addEdge(edge) {
    this.changes.addedEdges.push(edge)
  }

  addEdges(...edges) {
    edges.forEach(edge => this.addEdge(edge))
  }

  removeNode(node) {
    if (typeof (node) == 'string')
      this.changes.removedNodes.push({ id: node })
    else
      this.changes.removedNodes.push(node)
  }

  removeNodes(...nodes) {
    nodes.forEach(node => this.removeNode(node))
  }

  removeEdge(edge) {
    this.changes.removedEdges.push(edge)
  }

  removeEdges(...edges) {
    edges.forEach(edge => this.removeEdge(edge))
  }
}