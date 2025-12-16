# Loop Node

Repeats a section of the flow multiple times.

## Overview

| Property | Value |
|----------|-------|
| Category | Logic |
| Inputs | 1 |
| Outputs | 2 (Loop / Done) |

## Configuration

### Loop Count

Number of iterations:

```
5
```

Or with variables:

```
{{item_count}}
```

### Counter Variable

Variable name to track current iteration:

```
loop_index
```

## Outputs

| Output | Description |
|--------|-------------|
| **Loop** | Executes for each iteration |
| **Done** | Executes after all iterations complete |

## Examples

### Fixed Iterations

```yaml
Loop Count: 3
Counter: i

Loop path executes 3 times (i = 0, 1, 2)
Then Done path executes
```

### Dynamic Iterations

```yaml
Loop Count: {{num_items}}
Counter: index
```

### Send Multiple Messages

```
Loop (3 times)
├── Loop → Send Text: "Message {{loop_index}}" → (back to Loop)
└── Done → Send Text: "All done!"
```

## Counter Variable

The counter variable tracks the current iteration:

- Starts at 0
- Increments each iteration
- Available in Loop path nodes

```
Iteration 1: {{loop_index}} = 0
Iteration 2: {{loop_index}} = 1
Iteration 3: {{loop_index}} = 2
```

## Flow Pattern

```
        ┌──────────────────────────────┐
        │                              │
        ▼                              │
    ┌───────┐                          │
    │ Loop  │──── Loop ────────────────┘
    │ Node  │
    └───┬───┘
        │
       Done
        │
        ▼
    [Continue]
```

## Use Cases

### Send Item List

```
Set Variable: items = ["Apple", "Banana", "Orange"]
    ↓
Loop (3 times, counter: i)
├── Loop → Send Text: "Item: {{items[i]}}" → (loop)
└── Done → Send Text: "That's all items!"
```

### Retry Logic

```
Set Variable: attempts = 0
    ↓
Loop (3 times, counter: attempt)
├── Loop → API Call → Condition (success?)
│              ├── Yes → Go to Done
│              └── No  → (continue loop)
└── Done → Continue flow
```

### Countdown

```
Loop (5 times, counter: i)
├── Loop → Set Variable: num = 5 - {{i}}
│              ↓
│          Send Text: "{{num}}..."
│              ↓
│          Delay: 1
│              ↓
│          (loop)
└── Done → Send Text: "Go! 🚀"
```

### Pagination

```
Loop ({{total_pages}} times, counter: page)
├── Loop → API Call: /items?page={{page}}
│              ↓
│          Send Text: "Page {{page}} results..."
│              ↓
│          (loop)
└── Done → Send Text: "End of results"
```

## Best Practices

### Limit Iterations

```yaml
# Good - Bounded
Loop Count: 10

# Risky - Could be huge
Loop Count: {{user_input}}  # Validate first!
```

### Provide Progress

```
Send Text: "Processing item {{loop_index}} of {{total}}..."
```

### Exit Conditions

Add conditions to exit early:

```
Loop
├── Loop → Process → Condition (should_stop?)
│              ├── Yes → Go to Done
│              └── No  → (continue loop)
└── Done → ...
```

### Don't Nest Too Deep

```yaml
# Avoid - Complex and hard to debug
Loop → Loop → Loop

# Better - Flatten or restructure
```

## Common Issues

### Infinite Loop

**Problem:** Loop never ends

**Causes:**
- Loop count is 0 or negative
- Loop path doesn't return to Loop node

**Fix:** Ensure valid count and proper connections.

### Wrong Counter Value

**Problem:** Counter shows unexpected value

**Cause:** Counter variable name conflict

**Fix:** Use unique counter names for nested loops.

### Too Many Messages

**Problem:** WhatsApp rate limited

**Cause:** Sending many messages in loop

**Fix:** Add delays between iterations, reduce count.

## Technical Details

Loop execution:

1. Initialize counter to 0
2. Check if counter < loop count
3. If yes: Execute Loop path, increment counter, go to step 2
4. If no: Execute Done path

State saved between iterations for Wait for Reply nodes.
