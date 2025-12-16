# Set Variable Node

Stores a value in a variable for use later in the flow.

## Overview

| Property | Value |
|----------|-------|
| Category | Logic |
| Inputs | 1 |
| Outputs | 1 |

## Configuration

### Variable Name

The name of the variable to set:

```
order_total
```

### Value

The value to store (supports variable substitution):

```
100
```

Or with variables:

```
{{item_price}} * {{quantity}}
```

## Examples

### Static Value

```yaml
Variable: greeting
Value: "Hello!"
```

### Copy Variable

```yaml
Variable: saved_reply
Value: "{{last_reply}}"
```

### Computed Value

```yaml
Variable: total
Value: "{{subtotal}} + {{tax}}"
```

### Concatenation

```yaml
Variable: full_name
Value: "{{first_name}} {{last_name}}"
```

### Counter Increment

```yaml
Variable: count
Value: "{{count}} + 1"
```

## Use Cases

### Initialize Variables

At flow start, set default values:

```
Set Variable: step = 1
Set Variable: items = 0
Set Variable: total = 0
```

### Save User Input

After Wait for Reply:

```
Wait for Reply (last_reply)
    ↓
Set Variable: customer_email = {{last_reply}}
```

### Build Up Data

Accumulate information through the flow:

```
Set Variable: order_summary = "Items:"
    ↓
[user selects item]
    ↓
Set Variable: order_summary = "{{order_summary}}\n- {{selected_item}}"
```

### Transform Data

Prepare data for use:

```
Set Variable: phone_display = "+{{country_code}} {{phone_number}}"
```

## Variable Naming

### Valid Names

- Letters, numbers, underscores
- Start with letter or underscore
- Case-sensitive

```yaml
# Good
customer_name
orderTotal
_tempValue
item1

# Bad
1stItem      # Starts with number
my-variable  # Contains hyphen
my variable  # Contains space
```

### Naming Conventions

```yaml
# Recommended: snake_case
customer_name
order_total
is_confirmed

# Also works: camelCase
customerName
orderTotal
isConfirmed
```

## Scope and Lifetime

Variables exist for the conversation duration:

```
Flow Start → Set var → Use var → End Flow
                ↓
        (var exists here)
```

### Persistence

- Variables saved to database between interactions
- Cleared when flow ends or new flow starts
- Available across Wait for Reply nodes

### No Global Variables

Each conversation has its own variable space:

- User A's <code v-pre>{{count}}</code> ≠ User B's <code v-pre>{{count}}</code>
- Variables don't persist between conversations

## Best Practices

### Initialize Early

```yaml
# Start of flow
Set Variable: status = "pending"
Set Variable: attempts = 0
```

### Descriptive Names

```yaml
# Good
customer_selected_product
order_confirmation_sent

# Bad
x
temp
var1
```

### Don't Overwrite System Variables

Avoid using these names:
- `customer_name`
- `customer_phone`
- `last_reply`
- `message_timestamp`

### Document Purpose

For complex flows, use clear names that indicate purpose:

```yaml
# Order tracking
order_id
order_status
order_items_count

# User preferences
user_language
user_timezone
```

## Common Issues

### Value Not Setting

**Problem:** Variable stays empty or old value

**Causes:**
- Typo in variable name
- Expression error
- Node not executed (branch issue)

### Overwritten Value

**Problem:** Value changes unexpectedly

**Cause:** Same variable set multiple times

**Fix:** Use unique names or check flow logic

### Expression Not Evaluated

**Problem:** Value shows literal expression like "<span v-pre>{{a}}</span> + <span v-pre>{{b}}</span>"

**Cause:** Referenced variables don't exist

**Fix:** Ensure variables are set before use

## Technical Details

Variable storage during execution:

```json
{
  "variables": {
    "customer_name": "John",
    "order_total": "150",
    "status": "confirmed"
  }
}
```

All values stored as strings. Numeric operations convert automatically.
