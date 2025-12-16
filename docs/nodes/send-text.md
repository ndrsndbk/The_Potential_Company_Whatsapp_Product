# Send Text Node

Sends a plain text message to the user.

## Overview

| Property | Value |
|----------|-------|
| Category | Messages |
| Inputs | 1 |
| Outputs | 1 |

## Configuration

### Message Text

The text content to send. Supports variable substitution.

```
Hello {{customer_name}}!

Welcome to our service. How can we help you today?
```

### Preview

Click the preview button to see how your message will appear in WhatsApp.

## Variable Substitution

Use <code v-pre>{{variable_name}}</code> to insert dynamic content:

| Variable | Example Output |
|----------|----------------|
| <code v-pre>{{customer_name}}</code> | "John Doe" |
| <code v-pre>{{customer_phone}}</code> | "+1234567890" |
| <code v-pre>{{last_reply}}</code> | "HELLO" |
| <code v-pre>{{custom_var}}</code> | Value you set |

## Examples

### Simple Greeting

```
Hi there! 👋
```

### Personalized Message

```
Hello {{customer_name}}!

Thanks for contacting us. We received your message:
"{{last_reply}}"

How can we assist you today?
```

### Multi-line Message

```
📋 Your Order Summary:

Order ID: {{order_id}}
Items: {{item_count}}
Total: ${{order_total}}

Thank you for your purchase!
```

### With Emojis

```
Great choice! 🎉

Your selection has been saved. ✅
```

## WhatsApp Formatting

WhatsApp supports basic text formatting:

| Format | Syntax | Result |
|--------|--------|--------|
| Bold | `*text*` | **text** |
| Italic | `_text_` | *text* |
| Strikethrough | `~text~` | ~~text~~ |
| Monospace | ``` `text` ``` | `text` |

Example:
```
*Important Notice*

Your appointment is _confirmed_ for tomorrow.

Order ID: `#12345`
```

## Character Limits

- Maximum message length: 4096 characters
- Longer messages are truncated

## Best Practices

### Keep Messages Concise

```
# Good
Thanks! Your order #{{order_id}} is confirmed.

# Too long
Thank you so much for placing your order with us today!
We really appreciate your business and we want to let you
know that your order number {{order_id}} has been successfully
confirmed in our system...
```

### Use Line Breaks

```
# Good - Easy to read
Step 1: Choose an option
Step 2: Enter your details
Step 3: Confirm

# Bad - Wall of text
Step 1: Choose an option Step 2: Enter your details Step 3: Confirm
```

### Test Variable Substitution

Before publishing, verify:
- Variables are spelled correctly
- Variables have values when used
- No orphan <code v-pre>{{</code> or `}}` brackets

## Common Issues

### Variables Not Substituting

**Problem:** Message shows <code v-pre>{{customer_name}}</code> literally

**Causes:**
1. Typo in variable name
2. Variable not set before this node
3. Missing curly brace

**Fix:** Check spelling and ensure variable is set earlier in flow.

### Message Too Long

**Problem:** Message is cut off

**Fix:** Split into multiple Send Text nodes or shorten content.

### Special Characters

**Problem:** Characters display incorrectly

**Fix:** Use UTF-8 characters directly. Emojis work fine.

## Execution

1. Variable substitution is performed
2. Message is sent via WhatsApp Cloud API
3. Flow continues to next node

The node does not wait for a response. Use **Wait for Reply** to pause for user input.
