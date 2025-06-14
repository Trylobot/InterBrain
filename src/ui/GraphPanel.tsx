import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { getAllNodes, DreamNode } from '../dreamModel';
import { App } from 'obsidian';
import NodeDetail from './NodeDetail';

export default function GraphPanel({ plugin }: { plugin: any }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [focus, setFocus] = useState<DreamNode | null>(null);
  const app: App = plugin.app;

  useEffect(() => draw(), []);

  function draw() {
    const nodes = getAllNodes();
    const links = nodes.flatMap(n => [...n.links].map(t => ({ source: n.id, target: t })));
    const svg = d3.select(svgRef.current!);
    svg.selectAll('*').remove();
    const g = svg.append('g');
    const sim = d3.forceSimulation(nodes as any)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(80))
      .force('charge', d3.forceManyBody().strength(-250))
      .force('center', d3.forceCenter(400, 300));

    const link = g.selectAll('line').data(links)
      .enter().append('line')
      .attr('stroke', '#aaa');

    const node = g.selectAll('circle').data(nodes)
      .enter().append('circle')
      .attr('r', d => d.isPerson ? 10 : 8)
      .attr('fill', d => d.isPerson ? '#e67e22' : '#3498db')
      .call(d3.drag<SVGCircleElement, DreamNode>()
        .on('start', dragstart)
        .on('drag', dragged)
        .on('end', dragend))
      .on('dblclick', (_, d) => app.workspace.openLinkText(d.md.path, '', true))
      .on('click', (_, d) => setFocus(d));

    const label = g.selectAll('text').data(nodes)
      .enter().append('text')
      .text(d => d.title)
      .attr('dx', 12)
      .attr('dy', '.35em')
      .attr('font-size', 10);

    sim.on('tick', () => {
      link
        .attr('x1', d => (d as any).source.x)
        .attr('y1', d => (d as any).source.y)
        .attr('x2', d => (d as any).target.x)
        .attr('y2', d => (d as any).target.y);

      node
        .attr('cx', d => (d as any).x)
        .attr('cy', d => (d as any).y);

      label
        .attr('x', d => (d as any).x)
        .attr('y', d => (d as any).y);
    });

    function dragstart(event: any) {
      if (!event.active) sim.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }
    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }
    function dragend(event: any) {
      if (!event.active) sim.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }
  }

  return (
    <div className="graph-wrapper" style={{ width: '100%', height: '100%', position: 'relative' }}>
      <svg ref={svgRef} width="100%" height="100%"></svg>
      {focus && <NodeDetail node={focus} onClose={() => setFocus(null)} app={app} />}
    </div>
  );
}
