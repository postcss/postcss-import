"use strict"

// This is a modified version of toposort.
// Instead of throwing on cycles, it returns true.
module.exports = function checkForCycles(edges) {
  const nodes = uniqueNodes(edges)

  let cursor = nodes.length
  const sorted = new Array(cursor)
  const visited = {}
  let i = cursor
  const outgoingEdges = makeOutgoingEdges(edges)
  const nodesHash = makeNodesHash(nodes)

  while (i--) {
    if (visited[i]) {
      continue
    }

    if (visit(nodes[i], i, new Set())) {
      return true
    }
  }

  return false

  function visit(node, i, predecessors) {
    if (predecessors.has(node)) {
      // Has a cycle.
      return true
    }

    if (visited[i]) {
      return false
    }

    visited[i] = true

    let outgoing = outgoingEdges.get(node) || new Set()
    outgoing = Array.from(outgoing)

    if ((i = outgoing.length)) {
      predecessors.add(node)
      do {
        const child = outgoing[--i]
        if (visit(child, nodesHash.get(child), predecessors)) {
          return true
        }
      } while (i)
      predecessors.delete(node)
    }

    sorted[--cursor] = node

    return false
  }
}

function uniqueNodes(arr) {
  const res = new Set()
  for (let i = 0, len = arr.length; i < len; i++) {
    const edge = arr[i]
    res.add(edge[0])
    res.add(edge[1])
  }
  return Array.from(res)
}

function makeOutgoingEdges(arr) {
  const edges = new Map()
  for (let i = 0, len = arr.length; i < len; i++) {
    const edge = arr[i]
    if (!edges.has(edge[0])) edges.set(edge[0], new Set())
    if (!edges.has(edge[1])) edges.set(edge[1], new Set())
    edges.get(edge[0]).add(edge[1])
  }
  return edges
}

function makeNodesHash(arr) {
  const res = new Map()
  for (let i = 0, len = arr.length; i < len; i++) {
    res.set(arr[i], i)
  }
  return res
}
