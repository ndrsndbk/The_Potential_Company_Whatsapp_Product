# Trigger Node

The Trigger node is the starting point of every flow. It defines when the flow should execute based on incoming messages.

## Overview

| Property | Value |
|----------|-------|
| Category | Triggers |
| Inputs | None (start node) |
| Outputs | 1 |

## Configuration

### Trigger Type

Choose how messages are matched:

| Type | Description | Use Case |
|------|-------------|----------|
| `keyword` | Exact text match | Specific commands like "MENU" |
| `regex` | Regular expression | Pattern matching |
| `default` | Matches all messages | Fallback flow |

### Trigger Value

The value to match against incoming messages:

**For keyword:**
```
MENU
HELP
START
```

**For regex:**
```
^(hi|hello|hey)$
^order\s+\d+$
.*(help|support).*
```

**For default:**
Leave empty - matches when no other flow matches.

### Multiple Keywords

Enable multiple trigger keywords:

1. Toggle "Multiple Keywords" on
2. Add keywords with the + button
3. Any matching keyword triggers the flow

## Examples

### Simple Keyword

```yaml
Type: keyword
Value: MENU
```

Triggers when user sends exactly "MENU".

### Case-Insensitive Keyword

```yaml
Type: regex
Value: ^menu$
Flags: i
```

Triggers for "MENU", "menu", "Menu", etc.

### Multiple Words

```yaml
Type: keyword
Multiple: true
Values:
  - HELP
  - SUPPORT
  - ASSIST
```

Triggers for any of these words.

### Pattern Matching

```yaml
Type: regex
Value: ^order\s*#?\s*(\d+)$
```

Matches:
- "order 123"
- "order #456"
- "order#789"

### Greeting Detection

```yaml
Type: regex
Value: ^(hi|hello|hey|good\s+(morning|afternoon|evening))
Flags: i
```

Matches various greetings.

### Default Fallback

```yaml
Type: default
Value: (empty)
```

Catches any message not matched by other flows.

## Trigger Priority

When multiple flows could match:

1. Keyword matches are checked first (exact match)
2. Regex matches are checked second
3. Default flow matches last

If multiple flows have the same priority, the first one found is used.

## Output

The Trigger node outputs:

| Variable | Description |
|----------|-------------|
| `last_reply` | The message that triggered the flow |
| `customer_phone` | Sender's phone number |
| `customer_name` | Sender's WhatsApp name |

## Best Practices

### Be Specific with Keywords

```yaml
# Good - clear intent
keyword: ORDERHELP

# Risky - might match accidentally
keyword: O
```

### Use Regex for Flexibility

```yaml
# Match variations
regex: ^(menu|menú|MENU)$
```

### Have a Default Flow

Always create a default flow to handle:
- Typos
- Unexpected messages
- New users who don't know commands

### Document Your Triggers

Keep a list of all trigger words:

| Trigger | Flow | Purpose |
|---------|------|---------|
| MENU | Main Menu | Show options |
| HELP | Support | Get assistance |
| ORDER | Order Flow | Place order |
| (default) | Fallback | Unknown commands |

## Common Issues

### Flow Not Triggering

1. Check spelling of trigger value
2. Verify flow is published AND active
3. Check if another flow matches first
4. For regex, test the pattern independently

### Multiple Flows Matching

Only one flow executes per message. To control which one:

1. Use more specific triggers
2. Check flow activation status
3. Use regex with anchors (^ and $)

### Case Sensitivity

Keywords are case-sensitive by default:

- `MENU` ≠ `menu`

Use regex with `i` flag for case-insensitive:

```
/^menu$/i
```
