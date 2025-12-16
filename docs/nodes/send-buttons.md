# Send Buttons Node

Sends an interactive message with up to 3 clickable buttons.

## Overview

| Property | Value |
|----------|-------|
| Category | Messages |
| Inputs | 1 |
| Outputs | 1 |

## Configuration

### Body Text

The main message content (required):

```
What would you like to do?
```

### Header (Optional)

Text shown above the body:

```
Main Menu
```

### Footer (Optional)

Small text below the buttons:

```
Select an option to continue
```

### Buttons

Add up to 3 buttons:

| Property | Description |
|----------|-------------|
| ID | Unique identifier (returned when clicked) |
| Title | Button text (max 20 characters) |

Example:
```
Button 1: ID="opt_1", Title="View Products"
Button 2: ID="opt_2", Title="Track Order"
Button 3: ID="opt_3", Title="Get Help"
```

## Examples

### Simple Menu

```yaml
Body: "How can we help you?"
Buttons:
  - ID: "products", Title: "Products"
  - ID: "support", Title: "Support"
  - ID: "contact", Title: "Contact Us"
```

### Yes/No Confirmation

```yaml
Header: "Confirm Order"
Body: "Ready to place your order for ${{total}}?"
Footer: "This action cannot be undone"
Buttons:
  - ID: "yes", Title: "Yes, confirm"
  - ID: "no", Title: "No, cancel"
```

### With Variables

```yaml
Body: "Hi {{customer_name}}, what's next?"
Buttons:
  - ID: "continue", Title: "Continue"
  - ID: "restart", Title: "Start Over"
```

## Handling Responses

When a user clicks a button, the button ID is captured.

### Using Wait for Reply

```
Send Buttons → Wait for Reply → Condition
```

The `last_reply` variable contains the button ID (e.g., "opt_1").

### Condition Example

```
{{last_reply}} == "opt_1"  → Handle Option 1
{{last_reply}} == "opt_2"  → Handle Option 2
{{last_reply}} == "opt_3"  → Handle Option 3
```

## WhatsApp Appearance

```
┌─────────────────────────┐
│ Header Text             │
├─────────────────────────┤
│                         │
│ Body text goes here     │
│                         │
├─────────────────────────┤
│ Footer text             │
├─────────────────────────┤
│ ┌─────────────────────┐ │
│ │     Button 1        │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │     Button 2        │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │     Button 3        │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

## Limitations

| Constraint | Limit |
|------------|-------|
| Maximum buttons | 3 |
| Button title length | 20 characters |
| Body text length | 1024 characters |
| Header text length | 60 characters |
| Footer text length | 60 characters |

## Best Practices

### Clear Button Labels

```yaml
# Good - Clear action
Buttons:
  - Title: "View Cart"
  - Title: "Checkout"

# Bad - Vague
Buttons:
  - Title: "Option 1"
  - Title: "Click here"
```

### Meaningful IDs

```yaml
# Good - Descriptive IDs
Buttons:
  - ID: "confirm_order", Title: "Confirm"
  - ID: "cancel_order", Title: "Cancel"

# Bad - Generic IDs
Buttons:
  - ID: "1", Title: "Confirm"
  - ID: "2", Title: "Cancel"
```

### Use All Available Space

```yaml
Header: "Quick Menu"           # Context
Body: "Select your preference" # Main message
Footer: "Reply anytime"        # Help text
```

## Common Issues

### Buttons Not Appearing

**Problem:** Message sent as plain text without buttons

**Causes:**
- Missing body text
- Invalid button configuration
- WhatsApp API version mismatch

### Button Click Not Detected

**Problem:** User clicks button but flow doesn't continue

**Fix:** Ensure Wait for Reply node follows Send Buttons.

### Text Truncated

**Problem:** Button text is cut off

**Fix:** Keep titles under 20 characters.

## When to Use

**Use Send Buttons when:**
- You have 2-3 clear options
- Options are mutually exclusive
- Quick selection is important

**Use Send List instead when:**
- You have more than 3 options
- Options are categorized
- Need more descriptive text per option
