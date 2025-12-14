# n8n-Only Bot Implementation Guide

This guide shows how to replicate your entire Bulgarian Learning Bot logic in n8n **without needing the Node.js bot server**.

## Architecture Comparison

### Current Setup (Node.js + n8n)
```
Telegram → Node.js Webhook Server → Bot Logic → MongoDB
                                  ↓
                              n8n (optional workflows)
```

### Alternative (n8n-Only)
```
Telegram → n8n Webhook → All Bot Logic in n8n → MongoDB
```

## Benefits of n8n-Only Approach

✅ **Single Platform** — No separate Node.js server needed  
✅ **Visual Workflow** — See the entire flow at a glance  
✅ **Easier to Maintain** — No TypeScript compilation, just UI  
✅ **Built-in n8n Features** — Branching, error handling, scheduling  
✅ **Less Deployment Complexity** — Only n8n running on VPS  
❌ **Trade-off:** Slightly slower, slightly more expensive n8n resources  

## Core Concept: Telegram Webhook in n8n

Instead of your Node.js webhook receiving updates, **n8n becomes the webhook receiver**.

### Step 1: Create Telegram Webhook Workflow in n8n

**Workflow Structure:**

```
[Telegram Webhook Trigger]
    ↓
[Route by Message Type]
    ├→ [Text Message] → Handle Command
    ├→ [Callback Query] → Handle Button Click
    └→ [Other] → Log
```

## Implementation: Workflow Blueprints

### Workflow 1: Main Telegram Handler

**Node Setup:**

#### 1A. Telegram Webhook Trigger Node
```
Node: Webhook
- Method: POST
- Path: /telegram/webhook
- Authentication: None (or API Key if you want)
- Response: { ok: true }

This receives:
{
  "update_id": 123456789,
  "message": {
    "message_id": 1,
    "from": { "id": 12345, "first_name": "User" },
    "chat": { "id": 12345, "type": "private" },
    "date": 1702566000,
    "text": "/start"
  }
}
OR
{
  "update_id": 123456790,
  "callback_query": {
    "id": "callback_id",
    "from": { "id": 12345, "first_name": "User" },
    "chat_instance": "123",
    "data": "lang_to_eng"
  }
}
```

#### 1B. Set Variables Node
Extract and normalize data:
```javascript
// Use expression:
{
  "userId": $json.message?.from?.id || $json.callback_query?.from?.id,
  "chatId": $json.message?.chat?.id || $json.callback_query?.message?.chat?.id,
  "messageType": $json.message ? "message" : "callback_query",
  "command": $json.message?.text || null,
  "callbackData": $json.callback_query?.data || null,
  "queryId": $json.callback_query?.id || null
}
```

#### 1C. Switch/Condition Node
Branch based on message type:
```
IF messageType === "message"
  → Route to Message Handler
ELSE IF messageType === "callback_query"
  → Route to Callback Handler
ELSE
  → Route to Logging
```

---

### Workflow 2: Handle /start Command

**Flow:**

```
[Receive /start]
  ↓
[Check if user exists in MongoDB]
  ├→ [User exists + lessonActive=true]
  │  └→ [Send "Resume Lesson" message with buttons]
  └→ [First time or no active lesson]
     └→ [Send "Select Language" message with buttons]
```

**Node Setup:**

#### 2A. MongoDB Lookup: Get User Progress
```
Node: MongoDB
- Operation: Find
- Collection: user_progress
- Query: { userId: $json.variables.userId }
```

#### 2B. If Statement (Check user progress exists)
```javascript
// Condition:
$json.data[0]?.lessonActive === true
```

#### 2C. Send Message Node (Resume)
```
Node: Telegram (Send Message)
- Chat ID: $json.variables.chatId
- Text: "🇧🇬 Welcome back! 👋..."
- Reply Markup (Inline Keyboard):
  [
    { text: "📖 Resume lesson", callback_data: "continue_lesson" },
    { text: "🚀 Start new lesson", callback_data: "start_new" }
  ]
```

#### 2D. Send Message Node (First Time)
```
Node: Telegram (Send Message)
- Chat ID: $json.variables.chatId
- Text: "🇧🇬 Welcome to Bulgarian Learning Bot!..."
- Reply Markup (Inline Keyboard):
  [
    { text: "🇬🇧 English", callback_data: "lang_to_eng" },
    { text: "🇷🇺 Russian", callback_data: "lang_to_ru" },
    { text: "🇺🇦 Ukrainian", callback_data: "lang_to_ua" }
  ]
```

---

### Workflow 3: Handle Language Selection (callback: lang_to_*)

**Flow:**

```
[Callback: lang_to_eng, lang_to_ru, etc.]
  ↓
[Extract language from callback_data]
  ↓
[Get or Create user progress in MongoDB]
  ↓
[Update languageTo field]
  ↓
[Send Level Selection message]
```

**Node Setup:**

#### 3A. MongoDB Lookup: Check if user exists
```
Node: MongoDB
- Operation: Find
- Collection: user_progress
- Query: { userId: $json.variables.userId }
```

#### 3B. If Statement: User exists?
```javascript
$json.data?.length > 0
```

#### 3C. Update User Progress (If exists)
```
Node: MongoDB
- Operation: UpdateOne
- Collection: user_progress
- Query: { userId: $json.variables.userId }
- Update: {
    $set: {
      languageTo: $json.variables.callbackData.replace('lang_to_', ''),
      updatedAt: new Date()
    }
  }
```

#### 3D. Create New User (If not exists)
```
Node: MongoDB
- Operation: InsertOne
- Collection: user_progress
- Data: {
    userId: $json.variables.userId,
    languageTo: $json.variables.callbackData.replace('lang_to_', ''),
    category: 'greetings',
    folder: 'basic',
    currentIndex: 0,
    lessonActive: false,
    createdAt: new Date(),
    updatedAt: new Date()
  }
```

#### 3E. Answer Callback Query
```
Node: Telegram (Answer Callback Query)
- Callback Query ID: $json.variables.queryId
- Text: "Language selected! 🎯"
```

#### 3F. Send Level Selection Message
```
Node: Telegram (Send Message)
- Chat ID: $json.variables.chatId
- Text: "🌐 Select your learning level:"
- Reply Markup (Inline Keyboard):
  [
    { text: "📚 Basic", callback_data: "folder_basic" },
    { text: "🌟 Expressions", callback_data: "folder_expressions" },
    { text: "⭐ Middle", callback_data: "folder_middle" },
    { text: "🎓 Middle Slavic", callback_data: "folder_middle-slavic" },
    { text: "🔗 Language Comparison", callback_data: "folder_language-comparison" },
    { text: "🎯 Miscellaneous", callback_data: "folder_misc" }
  ]
```

---

### Workflow 4: Handle Level Selection (callback: folder_*)

**Flow:**

```
[Callback: folder_basic, folder_middle, etc.]
  ↓
[Extract folder from callback_data]
  ↓
[Update user.folder in MongoDB]
  ↓
[Fetch available categories from data collection]
  ↓
[Send Category Selection message]
```

**Node Setup:**

#### 4A. MongoDB UpdateOne: Set selected folder
```
Node: MongoDB
- Operation: UpdateOne
- Collection: user_progress
- Query: { userId: $json.variables.userId }
- Update: {
    $set: {
      folder: $json.variables.callbackData.replace('folder_', '')
    }
  }
```

#### 4B. Fetch Available Categories
```
Node: MongoDB
- Operation: Find
- Collection: categories
- Query: { folder: $json.variables.callbackData.replace('folder_', '') }
- Limit: 100
```

#### 4C. Send Category Selection Message
```
Node: Telegram (Send Message)
- Chat ID: $json.variables.chatId
- Text: "📚 Now select a lesson category:"
- Reply Markup (Inline Keyboard):
  Build from $json.data array:
  [
    { text: "✨ Greetings", callback_data: "select_category:greetings" },
    { text: "🍽️ Restaurant", callback_data: "select_category:restaurant" },
    { text: "🛍️ Shopping", callback_data: "select_category:shopping" },
    ...etc
  ]
```

---

### Workflow 5: Handle Category Selection (callback: select_category:*)

**Flow:**

```
[Callback: select_category:greetings, etc.]
  ↓
[Extract category from callback_data]
  ↓
[Update user.category in MongoDB]
  ↓
[Send Start Lesson button]
```

**Node Setup:**

#### 5A. MongoDB UpdateOne: Set category
```
Node: MongoDB
- Operation: UpdateOne
- Collection: user_progress
- Query: { userId: $json.variables.userId }
- Update: {
    $set: {
      category: $json.variables.callbackData.replace('select_category:', ''),
      currentIndex: 0
    }
  }
```

#### 5B. Send Start Lesson Message
```
Node: Telegram (Send Message)
- Chat ID: $json.variables.chatId
- Text: "✨ Starting lesson in **greetings** category...\n\n⏱️ Click below to begin:"
- Reply Markup (Inline Keyboard):
  [
    { text: "▶️ Start Lesson", callback_data: "start_lesson" }
  ]
```

---

### Workflow 6: Handle Lesson Start (callback: start_lesson)

**Flow:**

```
[Callback: start_lesson or continue_lesson]
  ↓
[Get user progress from MongoDB]
  ↓
[Fetch sentence by category + index from data]
  ↓
[Calculate progress (currentIndex / total)]
  ↓
[Send Bulgarian text with "Show Translation" button]
  ↓
[Update user.lessonActive = true in MongoDB]
```

**Node Setup:**

#### 6A. MongoDB Find: Get user progress
```
Node: MongoDB
- Operation: Find
- Collection: user_progress
- Query: { userId: $json.variables.userId }
```

#### 6B. MongoDB Find: Get sentence data
```
Node: MongoDB
- Operation: Find
- Collection: sentences
- Query: {
    category: $json.data[0].category,
    folder: $json.data[0].folder,
    index: { $lte: $json.data[0].currentIndex }
  }
- Sort: { index: -1 }
- Limit: 1
```

#### 6C. Calculate progress
```javascript
// Use expression:
{
  "current": $json.previousResponse[0].currentIndex + 1,
  "total": 20  // Get this from category metadata
}
```

#### 6D. Send Lesson Message
```
Node: Telegram (Send Message)
- Chat ID: $json.variables.chatId
- Text: "📚 **GREETINGS** | 🇧🇬 → 🇬🇧\n\n⏳ **1/20**\n\n${sentence.bg}\n\n✨ _Click button to reveal translation_"
- Reply Markup (Inline Keyboard):
  [
    { text: "👁️ Show Translation", callback_data: "show_translation" }
  ]
```

#### 6E. MongoDB UpdateOne: Set lesson active + save messageId
```
Node: MongoDB
- Operation: UpdateOne
- Collection: user_progress
- Query: { userId: $json.variables.userId }
- Update: {
    $set: {
      lessonActive: true,
      lessonMessageId: $json.previousResponse.message_id,
      updatedAt: new Date()
    }
  }
```

---

### Workflow 7: Show Translation (callback: show_translation)

**Flow:**

```
[Callback: show_translation]
  ↓
[Get user progress]
  ↓
[Get sentence data]
  ↓
[Translate sentence (call translation service or use stored translation)]
  ↓
[Edit message with translation + next/prev buttons]
```

**Node Setup:**

#### 7A. Get user progress + sentence
```
Node: MongoDB Find (user)
Node: MongoDB Find (sentence with translation)
```

#### 7B. Edit Message with Translation
```
Node: Telegram (Edit Message)
- Chat ID: $json.variables.chatId
- Message ID: $json.userProgress.lessonMessageId
- Text: "📚 **GREETINGS**...\n\n${sentence.bg}\n\n🎯 **${sentence.translation}**"
- Reply Markup (Inline Keyboard):
  [
    { text: "⬅️ Prev", callback_data: "prev" },
    { text: "➡️ Next", callback_data: "next" }
  ]
```

---

### Workflow 8: Navigation (callback: next, prev)

**Flow:**

```
[Callback: next]
  ↓
[Get user progress + currentIndex]
  ↓
[Check: currentIndex < totalSentences - 1?]
  ├→ [YES] Increment index, fetch next sentence, edit message
  └→ [NO] Show "Lesson Complete!" message
```

**Node Setup:**

#### 8A. Get user progress
```
Node: MongoDB Find
```

#### 8B. If statement: Check if more sentences
```javascript
$json.userProgress.currentIndex < 19 // or dynamic total
```

#### 8C. Update index + fetch next sentence
```
Node: MongoDB UpdateOne
Node: MongoDB Find (next sentence)
```

#### 8D. Edit message with next sentence
```
Node: Telegram Edit Message
```

#### 8E. Show completion message (if at end)
```
Node: Telegram Edit Message
- Text: "🎉 **CONGRATULATIONS!** 🎉\n\n✅ You completed the GREETINGS lesson!\n\n💪 Great job!"
- Reply Markup (Inline Keyboard):
  [
    { text: "🔙 Back to Menu", callback_data: "back_to_menu" },
    { text: "🚀 Next Category", callback_data: "next_category" }
  ]
```

---

## Database Schema for n8n

You'll need these MongoDB collections:

### Collection: user_progress
```json
{
  "_id": ObjectId,
  "userId": 12345,
  "chatId": 12345,
  "languageTo": "eng",
  "category": "greetings",
  "folder": "basic",
  "currentIndex": 0,
  "lessonActive": true,
  "lessonMessageId": 123,
  "createdAt": ISODate,
  "updatedAt": ISODate
}
```

### Collection: sentences
```json
{
  "_id": ObjectId,
  "bg": "Здравей",
  "eng": "Hello",
  "ru": "Привет",
  "ua": "Привіт",
  "category": "greetings",
  "folder": "basic",
  "index": 0,
  "grammar": ["greeting"],
  "explanation": "Common greeting in Bulgarian"
}
```

### Collection: categories
```json
{
  "_id": ObjectId,
  "folder": "basic",
  "name": "greetings",
  "emoji": "👋",
  "description": "Common greetings and expressions"
}
```

---

## How to Deploy This in n8n

### Step 1: Set Up Telegram Credentials
```
n8n Admin Panel → Credentials
→ Create New: Telegram Token
→ Token: YOUR_BOT_TOKEN
```

### Step 2: Set Up MongoDB Credentials
```
n8n Admin Panel → Credentials
→ Create New: MongoDB
→ Connection String: mongodb+srv://user:pass@cluster.mongodb.net/bg_bot
```

### Step 3: Create Main Workflow
```
File → New
Name: "Bulgarian Bot - Main Handler"
Description: "Handles all Telegram updates"
```

### Step 4: Build the Webhook + Switch Structure
(Follow the workflow blueprints above)

### Step 5: Create Sub-Workflows for Each Handler
- Workflow: "Handle /start"
- Workflow: "Handle Language Selection"
- Workflow: "Handle Level Selection"
- etc.

Link them using "Call Workflow" nodes.

### Step 6: Register n8n as Telegram Webhook

Get your n8n webhook URL:
```
https://your-n8n-domain.com/webhook/telegram-webhook-path
```

Register with Telegram API:
```bash
curl -X POST https://api.telegram.org/botYOUR_TOKEN/setWebhook \
  -H "Content-Type: application/json" \
  -d '{"url":"https://your-n8n-domain.com/webhook/telegram-webhook-path"}'
```

### Step 7: Test
Send `/start` to your bot in Telegram, watch n8n logs.

---

## Advantages vs Disadvantages

### Advantages of n8n-Only
✅ Single platform (no separate Node.js server)  
✅ Visual, easy to debug  
✅ Built-in error handling & notifications  
✅ Can schedule workflows (daily reminders, etc.)  
✅ No need for PM2 or process management  
✅ One deployment to maintain  

### Disadvantages of n8n-Only
❌ Slightly slower execution (0.5-2s vs <100ms)  
❌ Uses more n8n resources (might exceed free tier)  
❌ Complex workflows become hard to manage  
❌ Less suitable for high-traffic bots  
❌ n8n execution time costs if on pro plan  

### Advantages of Hybrid (Current Setup)
✅ Instant message responses (<100ms)  
✅ Can handle high traffic  
✅ TypeScript type safety  
✅ More scalable  
✅ Cheaper for high-volume  
✅ Better error logging  

### Disadvantages of Hybrid
❌ Two systems to maintain  
❌ Need to deploy Node.js + n8n  
❌ More complexity  
❌ Higher resource usage  

---

## Recommendation

**Use n8n-Only if:**
- Low to medium user volume (<1000/day messages)
- You want simplicity and visual management
- You don't need sub-100ms response times
- You're on Hostinger's included n8n

**Use Hybrid (Node.js + n8n) if:**
- High user volume or complex logic
- You want fast responses
- You're willing to manage two systems
- You need production-grade reliability

---

## Example: Complete /start Handler as n8n JSON

Here's what the `/start` workflow looks like in n8n JSON format:

```json
{
  "name": "Bulgarian Bot - Handle /start",
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "position": [250, 300],
      "parameters": {
        "httpMethod": "POST",
        "path": "telegram-bot/start",
        "responseMode": "onReceived"
      }
    },
    {
      "name": "Check User Progress",
      "type": "n8n-nodes-base.mongoDb",
      "position": [450, 300],
      "parameters": {
        "operation": "find",
        "collection": "user_progress",
        "query": "{ \"userId\": {{ $json.message.from.id }} }"
      }
    },
    {
      "name": "User Has Active Lesson?",
      "type": "n8n-nodes-base.if",
      "position": [650, 300],
      "parameters": {
        "conditions": {
          "boolean": [
            {
              "value1": "{{ $json.data[0].lessonActive }}",
              "operation": "equals",
              "value2": true
            }
          ]
        }
      }
    },
    {
      "name": "Send Resume Message",
      "type": "n8n-nodes-base.telegram",
      "position": [850, 200],
      "parameters": {
        "operation": "sendMessage",
        "chatId": "{{ $json.message.chat.id }}",
        "text": "🇧🇬 Welcome back! 👋\n\nYou have an active lesson in **{{ $json.data[0].category.toUpperCase() }}**\n\n_What would you like to do?_",
        "parseMode": "Markdown",
        "replyMarkup": {
          "inlineKeyboard": [
            [{ "text": "📖 Resume lesson", "callbackData": "continue_lesson" }],
            [{ "text": "🚀 Start new lesson", "callbackData": "start_new" }]
          ]
        }
      }
    },
    {
      "name": "Send Language Selection",
      "type": "n8n-nodes-base.telegram",
      "position": [850, 400],
      "parameters": {
        "operation": "sendMessage",
        "chatId": "{{ $json.message.chat.id }}",
        "text": "🇧🇬 **Welcome to Bulgarian Learning Bot!** 🎓\n\n_Select your target language:_",
        "parseMode": "Markdown",
        "replyMarkup": {
          "inlineKeyboard": [
            [{ "text": "🇬🇧 English", "callbackData": "lang_to_eng" }],
            [{ "text": "🇷🇺 Russian", "callbackData": "lang_to_ru" }],
            [{ "text": "🇺🇦 Ukrainian", "callbackData": "lang_to_ua" }]
          ]
        }
      }
    }
  ],
  "connections": {
    "Webhook": { "main": [["Check User Progress"]] },
    "Check User Progress": { "main": [["User Has Active Lesson?"]] },
    "User Has Active Lesson?": {
      "main": [["Send Resume Message"], ["Send Language Selection"]]
    }
  }
}
```

---

## Migration Path (If You Want to Switch)

If you currently have the Node.js bot and want to move to n8n-only:

1. **Backup MongoDB data** (export all collections)
2. **Stop Node.js bot** (`pm2 stop bg-bot`)
3. **Build n8n workflows** (test locally first)
4. **Register n8n as Telegram webhook**
5. **Test extensively** with a test bot
6. **Go live** with n8n
7. **Delete** Node.js deployment

---

This gives you complete control and visibility over every step of your bot's logic!
