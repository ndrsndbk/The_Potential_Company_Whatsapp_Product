# End Node

Terminates flow execution.

## Overview

| Property | Value |
|----------|-------|
| Category | Actions |
| Inputs | 1 |
| Outputs | 0 |

## Configuration

The End node has no configuration. It simply stops the flow.

## Usage

Add an End node to explicitly terminate a flow path.

```
Trigger → Process → Send Result → End
```

## When to Use

### Explicit Termination

Mark clear end points in your flow:

```
Condition: {{confirmed}}
├── Yes → Process Order → Send Confirmation → End
└── No  → Send Cancellation → End
```

### Multiple Exit Points

Flows with branches need multiple End nodes:

```
Main Menu
    ├── Option A → Handle A → End
    ├── Option B → Handle B → End
    └── Option C → Handle C → End
```

### After Final Message

End the flow after the last message:

```
Send Text: "Thanks for using our service. Goodbye!"
    ↓
End
```

## What Happens at End

1. Flow execution stops
2. Conversation state is cleared
3. Variables are discarded
4. User can start a new flow with next message

## Without End Node

If a path has no End node and no more connected nodes:
- Flow ends implicitly
- Same effect as End node
- Less explicit, harder to debug

## Best Practices

### Use Explicit Ends

```yaml
# Good - Clear termination
Send Final Message → End

# Okay but less clear
Send Final Message → (nothing)
```

### End All Branches

Every branch should eventually reach an End:

```
Condition
├── Yes → ... → End
└── No  → ... → End
```

### Don't End Mid-Conversation

```yaml
# Bad - Ends abruptly
Ask Question → End

# Good - Completes interaction
Ask Question → Wait → Process → Send Result → End
```

### Goodbye Messages

Add a final message before End:

```yaml
# Good
Send Text: "Thanks! Talk to you later." → End

# Acceptable but abrupt
Process Complete → End
```

## Multiple Flows

After End:
- User's next message triggers new flow matching
- Previous conversation context is gone
- New flow starts fresh

## Common Patterns

### Successful Completion

```
Process Order
    ↓
Send Confirmation
    ↓
End
```

### Error Exit

```
Condition: {{is_valid}}
├── Yes → Continue...
└── No  → Send Error Message → End
```

### User-Requested Exit

```
Wait for Reply
    ↓
Condition: {{last_reply}} == "quit"
├── Yes → Send "Goodbye!" → End
└── No  → Continue Flow...
```

### Timeout Exit

```
Wait for Reply (timeout: 300)
    ↓
Condition: {{timed_out}}
├── Yes → Send "Session expired" → End
└── No  → Continue...
```

## Debugging

### Flow Won't End

**Problem:** Flow seems stuck

**Causes:**
- Missing End node
- Circular connections (loop without exit)
- Wait for Reply without response

### Premature End

**Problem:** Flow ends too early

**Causes:**
- End node on wrong branch
- Condition routing to End incorrectly

**Debug:** Trace through flow logic step by step.

## Visual Representation

In the editor, End node appears as:

```
┌─────────────┐
│     End     │
│      ⬛     │
└─────────────┘
```

No output handles (can't connect to another node).
