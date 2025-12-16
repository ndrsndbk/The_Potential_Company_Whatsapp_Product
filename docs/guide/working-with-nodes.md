# Working with Nodes

Nodes are the building blocks of flows. Each node performs a specific action and connects to other nodes to create conversation logic.

## Node Anatomy

Every node has:

```
        Input Handle (receives connections)
              │
    ┌─────────▼─────────┐
    │   📝 Node Type    │
    │                   │
    │   Configuration   │
    │   summary here    │
    │                   │
    └─────────┬─────────┘
              │
        Output Handle (sends connections)
```

### Handles

- **Input Handle** (top) - Receives flow from previous node
- **Output Handle** (bottom) - Sends flow to next node
- **Branch Handles** - Some nodes have multiple outputs (Condition has Yes/No)

### Node Colors

| Color | Category |
|-------|----------|
| 🟢 Green | Triggers |
| 🔵 Blue | Messages |
| 🟡 Yellow | Logic |
| 🟣 Purple | User Data |
| 🟠 Orange | Utilities |
| ⚪ Gray | Actions |

## Node Categories

### Triggers

Start your flow when conditions are met.

| Node | Purpose |
|------|---------|
| **Trigger** | Start flow on keyword, regex, or default |

### Messages

Send content to the user.

| Node | Purpose |
|------|---------|
| **Send Text** | Plain text message |
| **Send Image** | Image with optional caption |
| **Send Video** | Video with optional caption |
| **Send Audio** | Audio file |
| **Send Document** | PDF, DOC, or other files |
| **Send Buttons** | Message with up to 3 buttons |
| **Send List** | Scrollable list menu |
| **Send Location** | Map location |
| **Send Contact** | Contact card |
| **Send Sticker** | Sticker image |
| **Send Stamp Card** | Loyalty card image |

### User Data

Retrieve information about the current user.

| Node | Purpose |
|------|---------|
| **Get Customer Name** | WhatsApp profile name |
| **Get Customer Phone** | Phone number |
| **Get Customer Country** | Country from phone code |
| **Get Message Timestamp** | When message was sent |

### Logic

Control flow execution.

| Node | Purpose |
|------|---------|
| **Wait for Reply** | Pause until user responds |
| **Condition** | Branch based on condition |
| **Set Variable** | Store a value |
| **Loop** | Repeat nodes multiple times |
| **Random Choice** | Random branch selection |

### Utilities

Transform and format data.

| Node | Purpose |
|------|---------|
| **Format Phone** | Standardize phone format |
| **Date/Time** | Get/format timestamps |
| **Math Operation** | Arithmetic on variables |
| **Text Operation** | String manipulation |
| **Mark as Read** | Mark message as read |

### Actions

Perform operations.

| Node | Purpose |
|------|---------|
| **API Call** | HTTP request to external service |
| **Delay** | Wait specified time |
| **End** | Terminate flow |

## Adding Nodes

### From Palette

1. Open the node palette (left sidebar)
2. Browse categories or search
3. Drag node to canvas
4. Release to place

### Quick Add

1. Click output handle of existing node
2. Drag to empty space
3. Release to open node selector
4. Click node type to add and connect

## Configuring Nodes

Click a node to open its configuration panel:

### Common Properties

- **Step ID** - Unique identifier (auto-generated, copyable)
- **Delay** - Wait before executing (seconds)

### Node-Specific Properties

Each node type has its own settings. See [Node Reference](/nodes/overview) for details.

## Connecting Nodes

### Creating Connections

1. Hover over source node
2. Click output handle (appears on hover)
3. Drag to target node's input handle
4. Release to connect

### Removing Connections

1. Click on the connection line
2. Press `Delete` or `Backspace`

### Connection Rules

- One input can receive multiple connections
- One output connects to one input (except branches)
- No circular connections (loops must use Loop node)

## Deleting Nodes

1. Select the node by clicking
2. Press `Delete` or `Backspace`
3. Connected edges are also removed

## Node Execution Order

Nodes execute in connection order:

```
1. Trigger → 2. Send Text → 3. Wait → 4. Condition
                                          ↓
                              5a. Yes Path  OR  5b. No Path
```

### Waiting Nodes

Some nodes pause execution:

- **Wait for Reply** - Until user sends message
- **Delay** - For specified duration

State is saved to database, execution resumes on next event.

## Tips

### Use Descriptive Messages

Help future you understand the flow:
```
Good:  "Thanks for your order! Your order #{{order_id}} is confirmed."
Bad:   "ok"
```

### Preview Your Messages

Click the preview button on message nodes to see how they'll appear in WhatsApp.

### Copy Step IDs

Use the copy button on Step ID to reference nodes in conditions or debugging.

### Test Each Branch

For condition nodes, test both Yes and No paths to ensure they work correctly.
