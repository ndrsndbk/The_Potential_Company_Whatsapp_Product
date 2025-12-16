# Node Overview

Nodes are the building blocks of flows. Each node performs a specific action when executed.

## Node Categories

### 🟢 Triggers

Start your flow when specific conditions are met.

| Node | Description |
|------|-------------|
| [Trigger](/nodes/trigger) | Start flow on keyword, regex, or default match |

### 🔵 Messages

Send various types of content to users.

| Node | Description |
|------|-------------|
| [Send Text](/nodes/send-text) | Plain text message |
| [Send Image](/nodes/send-image) | Image with optional caption |
| [Send Video](/nodes/send-video) | Video with optional caption |
| [Send Audio](/nodes/send-audio) | Audio file (mp3, ogg, etc.) |
| [Send Document](/nodes/send-document) | PDF, DOC, or other files |
| [Send Buttons](/nodes/send-buttons) | Message with up to 3 clickable buttons |
| [Send List](/nodes/send-list) | Scrollable menu with sections |
| [Send Location](/nodes/send-location) | Map pin with address |
| [Send Contact](/nodes/send-contact) | Contact card |
| [Send Sticker](/nodes/send-sticker) | Sticker image |
| [Send Stamp Card](/nodes/send-stamp-card) | Loyalty stamp card image |

### 🟣 User Data

Retrieve information about the current user.

| Node | Description |
|------|-------------|
| [Get Customer Name](/nodes/get-customer-name) | WhatsApp profile name |
| [Get Customer Phone](/nodes/get-customer-phone) | Phone number |
| [Get Customer Country](/nodes/get-customer-country) | Country from phone code |
| [Get Message Timestamp](/nodes/get-message-timestamp) | When message was sent |

### 🟡 Logic

Control the flow of execution.

| Node | Description |
|------|-------------|
| [Wait for Reply](/nodes/wait-for-reply) | Pause until user responds |
| [Condition](/nodes/condition) | Branch based on expression |
| [Set Variable](/nodes/set-variable) | Store a value |
| [Loop](/nodes/loop) | Repeat nodes multiple times |
| [Random Choice](/nodes/random-choice) | Random branch selection (A/B) |

### 🟠 Utilities

Transform and format data.

| Node | Description |
|------|-------------|
| [Format Phone Number](/nodes/format-phone-number) | Standardize phone format |
| [Date/Time](/nodes/date-time) | Get or format timestamps |
| [Math Operation](/nodes/math-operation) | Arithmetic calculations |
| [Text Operation](/nodes/text-operation) | String manipulation |
| [Mark as Read](/nodes/mark-as-read) | Mark message as read |

### ⚪ Actions

Perform external operations.

| Node | Description |
|------|-------------|
| [API Call](/nodes/api-call) | HTTP request to external service |
| [Delay](/nodes/delay) | Wait specified duration |
| [End](/nodes/end) | Terminate flow execution |

## Common Properties

All nodes share these properties:

| Property | Description |
|----------|-------------|
| **Step ID** | Unique identifier for the node (auto-generated) |
| **Delay** | Seconds to wait before executing (optional) |

## Execution Flow

Nodes execute sequentially following connections:

```
Trigger → Node A → Node B → Node C → End
```

### Branching

Some nodes create branches:

```
Condition
├── Yes → Path A
└── No  → Path B
```

### Waiting

These nodes pause execution:

- **Wait for Reply** - Until user sends message
- **Delay** - For specified duration

## Node States

During execution, nodes can be:

| State | Description |
|-------|-------------|
| **Pending** | Not yet executed |
| **Executing** | Currently running |
| **Waiting** | Paused for user input |
| **Completed** | Finished successfully |
| **Error** | Failed during execution |

## Variable Access

Most nodes can:

- **Read variables**: Use `{{variable_name}}` in text fields
- **Write variables**: Store results in specified variable name

## Best Practices

1. **Name flows descriptively** - Makes it easy to find and maintain
2. **Use comments** - Add Send Text debug nodes while developing
3. **Test all branches** - Don't forget edge cases
4. **Keep flows focused** - One purpose per flow
5. **Handle errors** - Add fallback paths for failures
