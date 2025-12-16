# Send List Node

Sends an interactive list menu with sections and items.

## Overview

| Property | Value |
|----------|-------|
| Category | Messages |
| Inputs | 1 |
| Outputs | 1 |

## Configuration

### Body Text

Main message content (required):

```
Browse our menu below
```

### Header (Optional)

Text shown above the body:

```
Restaurant Menu
```

### Footer (Optional)

Small text at the bottom:

```
Tap the button to view options
```

### Button Text

The label for the menu button (max 20 chars):

```
View Menu
```

### Sections

Organize items into sections:

```yaml
Section 1:
  Title: "Main Dishes"
  Items:
    - ID: "burger", Title: "Burger", Description: "Beef patty with cheese"
    - ID: "pizza", Title: "Pizza", Description: "12-inch pepperoni"

Section 2:
  Title: "Drinks"
  Items:
    - ID: "cola", Title: "Cola", Description: "330ml can"
    - ID: "water", Title: "Water", Description: "500ml bottle"
```

## Item Properties

Each list item has:

| Property | Required | Max Length | Description |
|----------|----------|------------|-------------|
| ID | Yes | 200 chars | Unique identifier |
| Title | Yes | 24 chars | Item name |
| Description | No | 72 chars | Additional details |

## Examples

### Product Catalog

```yaml
Header: "Our Products"
Body: "Select a category to browse"
Button: "View Products"
Sections:
  - Title: "Electronics"
    Items:
      - ID: "phones", Title: "Phones"
      - ID: "laptops", Title: "Laptops"
  - Title: "Accessories"
    Items:
      - ID: "cases", Title: "Phone Cases"
      - ID: "chargers", Title: "Chargers"
```

### Service Selection

```yaml
Body: "What service do you need?"
Button: "Select Service"
Sections:
  - Title: "Appointments"
    Items:
      - ID: "new_apt", Title: "Book New", Description: "Schedule a new appointment"
      - ID: "reschedule", Title: "Reschedule", Description: "Change existing booking"
      - ID: "cancel", Title: "Cancel", Description: "Cancel appointment"
```

### Time Slot Picker

```yaml
Header: "Available Times"
Body: "Choose your preferred time slot"
Button: "Select Time"
Sections:
  - Title: "Morning"
    Items:
      - ID: "9am", Title: "9:00 AM"
      - ID: "10am", Title: "10:00 AM"
      - ID: "11am", Title: "11:00 AM"
  - Title: "Afternoon"
    Items:
      - ID: "2pm", Title: "2:00 PM"
      - ID: "3pm", Title: "3:00 PM"
      - ID: "4pm", Title: "4:00 PM"
```

## WhatsApp Appearance

**Initial message:**
```
┌─────────────────────────┐
│ Header                  │
├─────────────────────────┤
│ Body text here          │
├─────────────────────────┤
│ Footer                  │
├─────────────────────────┤
│ ┌─────────────────────┐ │
│ │    [Button Text]    │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

**After tapping button:**
```
┌─────────────────────────┐
│ Section 1               │
├─────────────────────────┤
│ ○ Item 1 Title          │
│   Item 1 Description    │
├─────────────────────────┤
│ ○ Item 2 Title          │
│   Item 2 Description    │
├─────────────────────────┤
│ Section 2               │
├─────────────────────────┤
│ ○ Item 3 Title          │
│   Item 3 Description    │
└─────────────────────────┘
```

## Handling Responses

When user selects an item, the item ID is returned.

```
Send List → Wait for Reply → Condition
```

Check <code v-pre>{{last_reply}}</code> against item IDs:

```
{{last_reply}} == "phones" → Show phones
{{last_reply}} == "laptops" → Show laptops
```

## Limitations

| Constraint | Limit |
|------------|-------|
| Maximum sections | 10 |
| Maximum items per section | 10 |
| Maximum total items | 10 |
| Button text | 20 characters |
| Item title | 24 characters |
| Item description | 72 characters |

## Best Practices

### Logical Grouping

```yaml
# Good - Related items grouped
Sections:
  - Title: "Food"
    Items: [burger, pizza, pasta]
  - Title: "Drinks"
    Items: [cola, juice, water]

# Bad - Random grouping
Sections:
  - Title: "Options"
    Items: [burger, cola, pizza, juice]
```

### Descriptive Items

```yaml
# Good - Clear descriptions
Items:
  - ID: "premium", Title: "Premium Plan"
    Description: "$19.99/mo - All features"

# Bad - No context
Items:
  - ID: "1", Title: "Plan 1"
```

### Single Section Alternative

For simple lists, you can use one unnamed section:

```yaml
Body: "Choose an option"
Button: "Options"
Sections:
  - Items:
      - ID: "a", Title: "Option A"
      - ID: "b", Title: "Option B"
```

## When to Use

**Use Send List when:**
- You have 4+ options
- Options fit into categories
- You need descriptions for items
- Building menus or catalogs

**Use Send Buttons instead when:**
- You have 2-3 options
- Quick selection is priority
- Options are simple (yes/no, confirm/cancel)
