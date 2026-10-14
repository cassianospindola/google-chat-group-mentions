# Risks to state before rollout

| Risk | Impact | Mitigation |
|---|---|---|
| Sync depends on one person's admin role | If the owner loses the role or the trigger stops, the bot keeps answering with the last saved list and stops updating | Monitor `synced_at` (shown by `groups`). To remove the dependency: a service account with domain-wide delegation, approved by a super admin |
| Shared Cloud project | OAuth changes (revocation, scope changes) affect every script linked to the same project | Prefer a dedicated project when allowed. Never revoke access to "reset" |
| One Chat app per Cloud project | Without permission to create projects, only one bot is possible | Extend the existing bot with commands |
| Per-user authorization | Each user authorizes once; whoever revokes sees "requires configuration" again | Explain the Configure step in the rollout message |
| Only space members are notified | Group members outside the space show up as text, not as a mention | Add the group (or its people) to the space |
| Messages are posted as the caller | The mention list appears under the caller's name, not the app's | Expected behavior; mention it in the rollout message |
| Script Properties limits | About 500 KB in total and about 9 KB per value | See sizing below. If it gets close, move the cache to a spreadsheet or Firestore |
| Membership is visible to every user | `who group` lists the emails of any group in the domain | Acceptable for internal use; restrict Visibility if groups are sensitive |

## Storage sizing

Each stored member is about 70 bytes (`{"id":"<21 digits>","email":"first.last@example.com"}`). Per group:

| Members per group | Size per group | 20 groups | 50 groups |
|---|---|---|---|
| 10 | ~0.7 KB | ~14 KB | ~35 KB |
| 35 | ~2.5 KB | ~50 KB | ~125 KB |
| 130 | ~9 KB (per-value limit) | ~180 KB | ~450 KB |

A small company (tens of people) is far from both limits. The per-value limit (~130 members in a single group) usually comes first. Run `measureProperties` to read the real numbers.
