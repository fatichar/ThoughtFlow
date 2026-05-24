# ThoughtFlow MVP Prototype Spec

## Product Goal

ThoughtFlow is a frontend-first web prototype for building and sharing interactive, playable reasoning flowcharts. A viewer starts at one decision block, chooses an option, and watches the next branch emerge with animated lines and guided canvas movement.

The first prototype should make a reasoning tree feel playable, persuasive, and alive rather than like a static diagram editor.

Primary use cases:

- Vegan ethics and animal rights reasoning
- Philosophy and applied ethics
- Critical thinking education
- Step-by-step persuasion or self-guided reflection

## MVP Scope

Build the viewer/player experience first.

Included:

- React + TypeScript + Vite app
- Tailwind CSS styling
- React Flow canvas rendering
- Framer Motion for UI and block animation polish
- Hardcoded sample JSON flow
- One playable demo (to demonstrate the concept and features)
- Minimal side panel showing the flow data model and current path
- Local state only

Not included:

- Backend
- Authentication
- Public sharing
- Real visual editor
- Persistence beyond optional local storage
- Rich input nodes
- Collaborative editing

## Core Viewer Experience

The app opens to a large canvas with one central highlighted block.

Each block contains:

- `title`
- Short `text`
- `type`
- 2-4 clickable `choices`

When a viewer clicks a choice:

1. Add the target node to the visible path.
2. Draw or reveal an animated edge from the current node to the target node.
3. Reveal the target node with a smooth entrance animation.
4. Move the canvas viewport so the target node becomes centered.
5. De-emphasize previous nodes while keeping them visible.
6. Highlight the current node with larger scale, stronger border, elevation, and brighter tone.

The experience should feel like progressing through a guided argument.

## Visual Direction

Canvas:

- Clean light or soft neutral workspace
- Subtle grid or dotted background
- Spacious layout with visible branching history
- No heavy editor chrome

Nodes:

- Modern UML/activity/decision-node inspired cards
- Current node is visually dominant
- Previous path nodes remain readable but quieter
- Unvisited future branches are hidden until chosen
- Choices look like clear action buttons
- Include placeholder styling affordance for future input nodes, but no real input behavior yet

Edges:

- Smooth curved or stepped connections
- Animated draw/reveal when a choice is selected
- Previous path edges remain visible
- Active edge can briefly glow or pulse

Motion:

- Smooth viewport transitions
- Node reveal animation
- Current node scale/elevation transition
- Choice selection feedback

## Suggested App Layout

- Main canvas: full-height primary area
- Right side panel: compact flow inspector
- Top bar: app name, flow title, reset button

Side panel contents:

- Flow metadata
- Current node id
- Selected path as a simple list
- Collapsible JSON preview or simplified schema view
- Notes that editor features are future scope

## Data Model

Use a hardcoded JSON-like TypeScript object.

```ts
export type ThoughtFlowFlow = {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  startNodeId: string;
  nodes: Record<string, ThoughtFlowNode>;
};

export type ThoughtFlowNode = {
  id: string;
  title: string;
  text: string;
  type: "question" | "claim" | "reflection" | "input-placeholder" | "conclusion";
  choices: ThoughtFlowChoice[];
};

export type ThoughtFlowChoice = {
  id: string;
  label: string;
  targetNodeId: string;
};
```

## Sample Flow

Create one sample flow: `veganEthicsFlow`.

Start node:

- Title: `Is taste enough?`
- Text: `Is it okay to harm an animal mainly because we enjoy the taste?`
- Choices:
  - `No, taste alone is not enough`
  - `Yes, taste can justify it`
  - `Depends on the animal`

Branch topics should include:

- Dogs and companion animals
- Pigs and farmed animals
- Intelligence and sentience
- Necessity versus preference
- Availability of alternatives
- Consistency across similar cases
- A few soft conclusion/reflection nodes

Keep the sample tree small but interesting: roughly 10-14 nodes is enough for MVP.

## Component Structure

Suggested files:

```txt
src/
  App.tsx
  main.tsx
  index.css
  data/
    veganEthicsFlow.ts
  types/
    flow.ts
  components/
    FlowPlayer.tsx
    ReasoningNode.tsx
    FlowSidebar.tsx
    TopBar.tsx
  utils/
    layoutFlow.ts
```

Component responsibilities:

- `App`: app shell and sample flow wiring
- `FlowPlayer`: owns player state, React Flow nodes/edges, choice handling, viewport focus
- `ReasoningNode`: custom React Flow node UI
- `FlowSidebar`: minimal schema/path inspector
- `TopBar`: title and reset controls
- `layoutFlow`: simple deterministic positions for revealed nodes

## Player State

Track:

- `currentNodeId`
- `visitedNodeIds`
- `visibleNodeIds`
- `selectedChoices`
- `visibleEdges`

Initial state:

- `currentNodeId = flow.startNodeId`
- only start node visible
- no edges visible

On choice click:

- Find target node
- Add target node to visible nodes
- Add edge from current node to target
- Append choice to selected path
- Set target as current
- Call React Flow viewport centering for target node

## Layout Strategy

For MVP, use deterministic layout rather than automatic graph layout.

Recommended approach:

- Start node at `(0, 0)`
- Each next selected node appears to the right and slightly up/down based on branch index
- Previous nodes can remain where they are
- If a branch splits, use vertical offsets to avoid overlap

React Flow can handle pan/zoom, but the guided viewport should be the primary navigation.

## Interaction Details

Choice click behavior:

- Disable or soften already selected choices on previous nodes
- Allow reset to replay from the beginning
- Optional: allow clicking a previous node in the path to jump focus back without changing history

Node styling states:

- `current`: large, highlighted, elevated
- `visited`: smaller, muted, visible
- `new`: animated entrance
- `future`: not rendered

Edge styling states:

- `active`: recently created, animated/glowing
- `visited`: stable muted line

## Implementation Notes

- Use React Flow custom node types.
- Use React Flow's `fitView`, `setCenter`, or `setViewport` for guided movement.
- Use Framer Motion inside custom node components for entrance and state transitions.
- Use Tailwind utility classes for fast styling.
- Keep editor-like React Flow controls minimal or hidden.
- Do not expose node dragging as a primary feature.
- Keep all flow data local and mock-based.

## Acceptance Criteria

The MVP is acceptable when:

- The app runs locally with Vite.
- The first screen shows a polished canvas with the start node centered.
- Clicking choices reveals connected nodes with animated edges.
- The current node auto-centers and becomes visually dominant.
- Previous selected path remains visible and understandable.
- The side panel shows basic flow/schema/path information.
- The sample vegan ethics flow is playable through multiple branches.
- Code is modular enough to extend into a real editor later.

## Next Phase TODOs

- Visual editor for creating and connecting nodes
- Shareable public flow links
- Fork/remix existing flows
- User accounts and saved libraries
- Analytics for drop-off points and selected choices
- Input nodes for written reflection
- AI-assisted flow generation
- Comments/discussion per node
- Better layout engine for larger trees
- Flow validation and broken-link detection
