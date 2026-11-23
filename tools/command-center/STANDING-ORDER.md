# Standing order: weekday 7am Eastern refresh

A Claude scheduled task runs this every weekday morning in a fresh cloud session on the
`advisorbooking` environment, which holds the GoHighLevel sub-account key as a network secret.
The exact prompt it runs is in the scheduled task itself; this is what it does:

1. Checks out `tools/command-center` from branch `claude/kind-newton-5ridn6`.
2. Runs `build_data.py` (read only) against GoHighLevel and, once set up, the Gmail bridge.
3. Compares the five names and their last messages to the live dashboard's `data.json`.
   Unchanged: reports "nothing changed" and stops.
4. Otherwise reuses drafts for people whose thread has not moved, writes new drafts under
   PROMPT TWO in `PROMPTS.md` for the rest, rebuilds, and republishes `data.json` only.

It never writes to GoHighLevel or Gmail, never sends, and never commits prospect data to git.
To change or stop it: tell Claude "make the command center refresh at 6:30" or "stop the
command center refresh".
