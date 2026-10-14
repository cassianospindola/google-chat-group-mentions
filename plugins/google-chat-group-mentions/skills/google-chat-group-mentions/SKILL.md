---
name: google-chat-group-mentions
description: Build a Google Chat app in Apps Script that expands a Google Group alias into individual @mentions, because Google Chat cannot mention groups. Use this skill whenever someone wants to mention a whole team in Google Chat, create an "@finance" or "@support" style mention, notify the members of a Google Group in a space, or build or debug a Chat app in Apps Script (app missing from "Add apps", "requires configuration", event.message undefined, reply outside the thread, duplicate messages, chat.bot scope errors). Trigger even if the user never says "bot" or "skill", since the pain of mentioning a group in Google Chat is enough.
---

# Google Chat group mentions

Google Chat does not mention Google Groups, only people one by one. This skill guides the build of a Chat app in Apps Script that reads the Workspace groups and, when called with `@mention group message`, posts in the thread one mention per member.

The working code is in `assets/`. It came out of a real build that went through about ten pivots caused by production errors. Follow the order below so the next build skips them.

## Step 0: check prerequisites before writing any code

Confirm each point with the user. If one fails, stop and discuss: the architecture changes.

1. **Groups Admin role (or higher)** for whoever owns the script. The hourly sync reads every group through the Admin SDK Directory API with the owner's credentials. Without the role, only groups the owner belongs to and whose members are visible can be read.
2. **A Google Cloud project inside the Workspace organization.** A Chat app is only listed for users of the domain that owns the project's organization. A project under "No organization" or another organization never shows the app.
3. **That project has no other Chat app.** It is one Chat app per Cloud project. If the user cannot create projects, only one bot fits.
4. **Domain** (e.g. `example.com`), **bot name** (e.g. `mention`) and **reply language** (`en` or `pt`).

## What NOT to do (this takes priority over everything else)

- Do not call the Admin SDK, GroupsApp or People API inside `onMessage`. The caller is usually not an admin, so the call fails or is slow. The handler reads only the cache in Script Properties.
- Do not use GroupsApp or People API as the membership source. GroupsApp fails on groups with restricted member visibility; People API does not resolve group members reliably.
- Do not put the `chat.bot` scope in the manifest of an app that posts as the user. It breaks the user consent screen.
- Do not rely on the synchronous return of `onMessage` to land in the thread. Chat ignores `messageReplyOption` when the interaction did not start in the thread. Post through the REST API with the caller's token.
- Do not parse the command from `argumentText`. When the bot is mentioned mid-message, the first word of the message becomes the "group". Read from the bot's mention annotation instead.
- Do not post before writing the idempotency mark. Chat retries slow events, and without the mark mentions are duplicated.
- Do not revoke the app's OAuth access in the user's Google Account to "reset" authorization without checking other scripts in the same Cloud project. Revoking breaks every script that shares the OAuth client.
- Do not hardcode people, emails or exceptions in the code. Opt-outs live in Script Properties (`exceptions:<userId>`) and are managed by the `mute` and `unmute` commands.
- Do not create a service account key just to post messages. The caller's own token is enough.

## Build flow

Follow the order. Each step has a check before the next.

1. **Apps Script project.** script.google.com, New project, signed in with the Workspace account (not a personal one). Paste `assets/Code.gs` and `assets/appsscript.json` (enable "Show appsscript.json" in Project Settings). Set `DOMAIN`, `BOT_NAME` and `LANG` at the top of the file. Set `timeZone` in the manifest if needed.
2. **Advanced service.** Services, add Admin SDK API (`AdminDirectory`, `directory_v1`).
3. **Link the Cloud project.** Project Settings, Google Cloud Platform Project, Change project, paste the project **number** (not the ID).
4. **First sync.** Run `syncGroups` in the editor and authorize. Check the log: one line per group with its member count. Run `installTrigger` once. Check: Script Properties has `group:<alias>` keys and Triggers shows an hourly trigger. Run `measureProperties` to check storage.
5. **Deployment.** Deploy, New deployment, type Add-on. Copy the Deployment ID.
6. **Google Chat API.** In the linked Cloud project, enable the API and fill the Configuration tab. Field by field in `references/setup.md`. Most common blockers: "Receive 1:1 messages" and "Join spaces and group conversations" both checked, Visibility filled, OAuth consent screen set to Internal.
7. **Test.** Add the app to a test space and send `@mention group test` inside a thread. The first time Chat shows "requires configuration": Configure, Allow. In a direct message with the bot, test `groups`, `who group` and `mute group`.

If anything fails, go straight to `references/pitfalls.md` (symptom, cause, fix). Before rollout, read `references/risks.md` with the user.

## How the code works

- `syncGroups` runs hourly as the script owner. It lists every group in the domain, expands members (nested groups included, via `includeDerivedMembership`), drops suspended users and non-user members, and writes `group:<alias>` = `[{id, email}]` to Script Properties. Aliases of deleted groups are removed.
- `onMessage` runs as the caller. It handles both event formats (classic `event.message` and add-on `event.chat.messagePayload`), reads the text right after the bot mention, accepts several comma-separated groups, deduplicates people, applies opt-outs and posts `<users/ID>` mentions in the thread through the Chat API. It answers privately (visible only to the caller) with a summary: who was skipped, groups not found, empty groups.
- Commands are accepted in English and Portuguese whatever `LANG` is. `LANG` only picks the reply language. All user-facing texts are in the `TEXT` block at the top, ready to translate.
- Idempotency: `LockService` plus `CacheService`, keyed on `message.name`, for 10 minutes.
- Fallback: if posting through the API fails (e.g. a space where only managers can post), the app replies synchronously as itself.

## Usage

- In a space: `@mention finance closing files are in the folder` or `@mention finance,support check this`.
- In a direct message with the bot (keeps long lists out of spaces): `groups`, `who finance`, `mute finance`, `mute all`, `unmute finance`, `muted`, `help`.

## Files

- `assets/Code.gs`: complete code.
- `assets/appsscript.json`: manifest with the minimum scopes.
- `references/setup.md`: console steps, with UI labels in English.
- `references/pitfalls.md`: symptom, cause, fix.
- `references/risks.md`: what the adopter must know, including storage sizing.
