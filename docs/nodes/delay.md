# Delay Node

Pauses flow execution for a specified duration.

## Overview

| Property | Value |
|----------|-------|
| Category | Actions |
| Inputs | 1 |
| Outputs | 1 |

## Configuration

### Duration

Time to wait in seconds:

```
5
```

Or with variables:

```
{{wait_time}}
```

## Examples

### Fixed Delay

```yaml
Duration: 3
```

Waits 3 seconds before continuing.

### Variable Delay

```yaml
Duration: {{delay_seconds}}
```

Uses value from variable.

### Simulated Typing

```yaml
Send Text: "Let me check that for you..."
    ↓
Delay: 2
    ↓
Send Text: "Here's what I found!"
```

## Use Cases

### Natural Conversation Pace

Make bot responses feel more human:

```
Send Text: "Great question!"
    ↓
Delay: 1
    ↓
Send Text: "Here's what you need to know..."
```

### Rate Limiting

Space out messages to avoid spam:

```
Send Text: Message 1
    ↓
Delay: 2
    ↓
Send Text: Message 2
    ↓
Delay: 2
    ↓
Send Text: Message 3
```

### Processing Indicator

Show activity while "processing":

```
Send Text: "Processing your order... ⏳"
    ↓
Delay: 3
    ↓
Send Text: "Order confirmed! ✅"
```

### Timed Sequences

Drip content over time:

```
Send Text: "Tip 1: Always start with a greeting"
    ↓
Delay: 60
    ↓
Send Text: "Tip 2: Keep messages concise"
    ↓
Delay: 60
    ↓
Send Text: "Tip 3: Use buttons for options"
```

## Best Practices

### Keep Delays Short

```yaml
# Good - Natural pause
Delay: 1-3 seconds

# Bad - User might leave
Delay: 30+ seconds
```

### Indicate Waiting

Before long delays, tell the user:

```
Send Text: "This might take a moment..."
    ↓
Delay: 5
    ↓
Send Text: "Done!"
```

### Don't Overuse

Too many delays feel sluggish:

```yaml
# Bad - Slow and frustrating
Send → Delay → Send → Delay → Send → Delay

# Good - Key moments only
Send → Send → Send → Delay → Summary
```

### Consider User Context

- Quick queries: Minimal delays
- Complex info: Pause between sections
- Emotional messages: Allow processing time

## Technical Details

### Execution

1. Flow reaches Delay node
2. Execution pauses for specified duration
3. After delay, continues to next node

### State During Delay

- For short delays (< 30s): Execution waits in memory
- For long delays: State may be saved to database

### Maximum Duration

Practical limit depends on:
- Cloudflare function timeout
- User patience
- WhatsApp session limits

Recommended: Keep under 30 seconds.

## Comparison with Wait for Reply

| Delay | Wait for Reply |
|-------|----------------|
| Fixed time pause | Waits for user message |
| Continues automatically | Continues on user input |
| Use for pacing | Use for interaction |
| Short durations | Any duration |

## Common Issues

### Delay Too Long

**Problem:** User sends another message during delay

**Result:** May trigger new flow or queue messages

**Fix:** Keep delays short, use Wait for Reply for longer pauses.

### Delay Not Working

**Problem:** No visible pause

**Causes:**
- Duration is 0
- Duration variable empty

**Fix:** Check duration value is positive number.

## Alternatives

### For User Pacing

Instead of Delay, consider:
- Send longer messages (natural read time)
- Use Wait for Reply with "Press any key to continue"
- Send interactive buttons

### For Processing Time

If actually processing:
- Show progress: "Step 1 of 3..."
- Use API Call timeout appropriately
- Don't fake delays unnecessarily
