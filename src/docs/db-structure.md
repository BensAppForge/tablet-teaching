# Database Structure Reference

This document describes the Firestore database structure for the Tablet Teaching app.

## Top-Level Collections

### 1. `teachers`

- **Description:** Holds a document for every teacher who has signed up. Document ID matches the auth ID of the user.
- **Example Document:**

```json
{
	"createdAt": "timestamp",
	"email": "string",
	"firstName": "string",
	"lastName": "string",
	"isBetaTester": "boolean",
	"isPremium": "boolean",
	"premiumExpiresOn": "timestamp"
}
```

### 2. `tests`

- **Description:** Contains all tests for all teachers. Document ID is auto-generated. Each test contains a `teacherId` field referencing the owner.
- **Example Document:**

```json
{
	"cefrLevel": "string",
	"createdAt": "timestamp",
	"defaultCreditPoints": "number",
	"defaultMultiplier": "number",
	"defaultTimePerQuestion": "number",
	"description": "string",
	"isAIGenerated": "boolean",
	"targetLanguage": "string",
	"teacherId": "string",
	"title": "string",
	"updatedAt": "timestamp"
}
```

#### Subcollection: `questions`

Each test document contains a `questions` subcollection. Each question document has a `type` field that determines its structure and question type. It also has an 'order' field to determine its position in the test.

---

## Question Types

### Multiple Choice (`multiple-choice`)

```json
{
	"correctOption": "number",
	"createdAt": "timestamp",
	"multiplier": "number",
	"options": ["string"],
	"points": "number",
	"text": "string",
	"timeLimit": "number",
	"type": "string" // 'multiple-choice'
}
```

### Reordering (`horizontal-reordering` or `vertical-reordering`)

```json
{
	"correctOrder": ["number"],
	"createdAt": "timestamp",
	"explanation": "string",
	"isGap": ["boolean"],
	"items": ["string"],
	"multiplier": "number",
	"points": "number",
	"text": "string",
	"timeLimit": "number",
	"type": "string"
}
```

### Matching (`matching`)

```json
{
	"correctMatches": ["number"],
	"createdAt": "timestamp",
	"distractors": ["string"],
	"leftItems": ["string"],
	"multiplier": "number",
	"points": "number",
	"rightItems": ["string"],
	"text": "string",
	"timeLimit": "number",
	"type": "string"
}
```

### True/False (`true-false`)

```json
{
	"createdAt": "timestamp",
	"isTrue": "boolean",
	"multiplier": "number",
	"points": "number",
	"text": "string",
	"timeLimit": "number",
	"type": "string"
}
```

### Gap Filling

- **Note:** To be documented after code review of the legacy editor.

---

_This document will be updated as the schema evolves._
