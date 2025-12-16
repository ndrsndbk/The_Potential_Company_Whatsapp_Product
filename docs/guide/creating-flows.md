# Creating Flows

This guide covers how to create and design conversation flows in the visual editor.

## Opening the Editor

1. From the dashboard, click **New Flow** or click an existing flow
2. The editor opens with:
   - **Left sidebar** - Node palette (drag nodes from here)
   - **Center canvas** - Flow diagram
   - **Right panel** - Node properties (when a node is selected)

## The Flow Editor Interface

```
┌─────────────────────────────────────────────────────────────────┐
│  Flow Name                              [Save] [Test] [Publish] │
├──────────┬──────────────────────────────────────┬───────────────┤
│          │                                      │               │
│  Node    │                                      │   Property    │
│  Palette │         Canvas                       │   Panel       │
│          │                                      │               │
│  [Nodes] │    ┌─────┐     ┌─────┐              │  [Config]     │
│          │    │Start│────▶│Node │              │               │
│          │    └─────┘     └─────┘              │               │
│          │                                      │               │
└──────────┴──────────────────────────────────────┴───────────────┘
```

## Creating Your First Flow

### Step 1: Configure the Trigger

Every flow starts with a **Trigger** node:

1. Click the Trigger node on the canvas
2. In the property panel, set:
   - **Trigger Type**: `keyword`, `regex`, or `default`
   - **Trigger Value**: The word/pattern to match

Example configurations:
- Keyword: `MENU` (exact match)
- Regex: `^(hi|hello|hey)$` (matches greetings)
- Default: Leave empty (catches unmatched messages)

### Step 2: Add Nodes

1. Find a node in the left palette (use search or browse categories)
2. Drag the node onto the canvas
3. Position it near the previous node

### Step 3: Connect Nodes

1. Hover over a node to see connection handles
2. Click and drag from an output handle (bottom/right)
3. Drop on an input handle (top/left) of another node
4. A connection line appears

### Step 4: Configure Nodes

1. Click a node to select it
2. Configure options in the right panel
3. Each node type has different settings

### Step 5: Save and Test

1. Click **Save** to store your progress
2. Click **Test** to open the simulator
3. Type messages to walk through your flow

### Step 6: Publish

1. Click **Publish** when ready
2. The flow becomes active for real WhatsApp messages
3. Toggle **Active** to enable/disable without unpublishing

## Flow Design Patterns

### Linear Flow

Simple sequence of messages:

```
Trigger → Send Text → Send Image → End
```

### Branching Flow

Different paths based on user input:

```
Trigger → Wait for Reply → Condition
                              ├── Yes → Path A
                              └── No  → Path B
```

### Loop Flow

Repeat until condition met:

```
Trigger → Loop Start → Ask Question → Wait → Check Answer
              ▲                                   │
              └───────── No ──────────────────────┘
                         │
                        Yes → Continue
```

### Menu Flow

Let users choose options:

```
Trigger → Send Buttons → Wait for Reply → Condition
                                             ├── Option 1 → ...
                                             ├── Option 2 → ...
                                             └── Option 3 → ...
```

## Best Practices

### Keep Flows Focused

- One flow per use case
- Don't try to handle everything in one flow
- Use the default flow for fallback only

### Use Variables

- Store user responses: `{{last_reply}}`
- Reference later: "You said: {{last_reply}}"
- Build up context through the conversation

### Handle Errors

- Add timeout handling for wait nodes
- Provide fallback paths for unexpected inputs
- Use conditions to validate user input

### Test Thoroughly

- Walk through every path
- Test edge cases (empty input, special characters)
- Verify variable substitution works

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Delete` / `Backspace` | Delete selected node |
| `Ctrl/Cmd + S` | Save flow |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` | Redo |
| `Ctrl/Cmd + C` | Copy node |
| `Ctrl/Cmd + V` | Paste node |

## Common Issues

### Nodes Not Connecting

- Check that you're dragging from output to input
- Some nodes have specific handle types
- Condition nodes have "Yes" and "No" outputs

### Flow Not Triggering

- Verify trigger type and value
- Check if flow is published AND active
- Ensure no other flow matches first

### Variables Not Substituting

- Use double curly braces: `{{variable_name}}`
- Check variable was set before being used
- Variable names are case-sensitive
