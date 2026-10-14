# Pitfalls: symptom, cause, fix

Every item happened in a real build. Find the symptom, apply the fix.

| # | Symptom | Cause | Fix |
|---|---|---|---|
| 1 | App does not show in "Add apps" | Visibility empty, "Join spaces" unchecked, or the Cloud project is outside the Workspace organization | Fill Visibility, check both functionality options, confirm the project's Organization. Wait 10 minutes |
| 2 | Search does not find the app | Search uses the App name from the Configuration tab, not the Apps Script project name | Search by App name. Shortcut: type `@name` in the message box |
| 3 | `Cannot read properties of undefined (reading 'argumentText')` | Add-on deployments send the new event format: `event.chat.messagePayload.message` | Branch both formats and return `hostAppDataAction` in the new one (already in the code) |
| 4 | Consent or scope error when authorizing | `chat.bot` scope in the manifest of an app that posts as the user | Remove `chat.bot`, use `chat.messages.create` |
| 5 | Members of some groups are not listed | GroupsApp depends on member visibility settings of each group | Admin SDK Directory API, with the Groups Admin role, in the sync |
| 6 | Slow bot, or permission errors for non-admins | Admin SDK called inside `onMessage` | Hourly sync writes the cache; `onMessage` reads only the cache |
| 7 | Mentions land outside the thread | Synchronous reply ignores `messageReplyOption` when the interaction did not start in the thread | Post through REST `spaces.messages.create` with `thread.name` and the caller's token (`ScriptApp.getOAuthToken()`) |
| 8 | Duplicate mentions | Chat retries events that take too long | Lock plus cache keyed on `message.name`, written BEFORE posting |
| 9 | `Group "hi," not found` | `argumentText` carries the whole message when the bot is not mentioned first | Read the text after `startIndex + length` of the bot's mention annotation |
| 10 | An unrelated script in the same Cloud project stops working | Revoking the app's access in the Google Account revokes the shared OAuth client | Run one function of each affected script manually to reauthorize. Avoid revoking |
| 11 | Posting fails in a restricted space | Space set to "Only owners and managers can post" and the caller is neither | Synchronous fallback replies as the app (already in the code) |
| 12 | Cannot create a second Chat app | One Chat app per Cloud project | New Cloud project inside the organization, or add commands to the existing bot |
| 13 | Direct message with the bot does not open | "Receive 1:1 messages" unchecked | Check it in the Configuration tab |
| 14 | Old avatar keeps showing | URL cached | Upload with a new file name and update the Avatar URL |
| 15 | Code change has no effect | Deployment still on the old version | Manage deployments, edit, New version |
| 16 | "requires configuration" shows again for one user | That user revoked the app's access | The user clicks Configure and Allow again |
