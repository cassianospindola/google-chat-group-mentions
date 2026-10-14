# Setup, step by step

UI labels are written as they appear in English.

## 1. Apps Script
1. script.google.com, signed in with the Workspace account. **New project**. Rename it (e.g. `mention`).
2. **Project Settings** (gear): check **Show "appsscript.json" manifest file in editor**.
3. Paste `assets/Code.gs` into `Code.gs` and `assets/appsscript.json` into the manifest. Set `DOMAIN`, `BOT_NAME`, `LANG` and, if needed, `timeZone`.
4. **Services** (left menu, +): **Admin SDK API**, identifier `AdminDirectory`, version `directory_v1`.

## 2. Google Cloud project
1. console.cloud.google.com. Confirm the project belongs to the Workspace organization (**IAM & Admin > Settings**, Organization field).
2. **APIs & Services > OAuth consent screen**: User type **Internal**.
3. **APIs & Services > Library**: enable **Google Chat API** and **Admin SDK API**.
4. Copy the **Project number** from the project dashboard.
5. Back in Apps Script: **Project Settings > Google Cloud Platform (GCP) Project > Change project**, paste the number.

## 3. First sync
1. In the editor, select `syncGroups`, **Run**, authorize.
2. Check the execution log: one line per group with its member count. Warnings list members without an id.
3. Select `installTrigger`, **Run**. Check **Triggers** (left menu): one hourly trigger for `syncGroups`.
4. Optional: run `measureProperties` to see storage usage.

## 4. Deployment
1. **Deploy > New deployment**, gear next to Select type, **Add-on**, **Deploy**.
2. Copy the **Deployment ID**.
3. After every code change: **Deploy > Manage deployments**, edit, **New version**. The ID stays the same.

## 5. Google Chat API Configuration
console.cloud.google.com > APIs & Services > Google Chat API > **Configuration** tab:
- **App name**: the name people type after `@`. Must match `BOT_NAME` in the code.
- **Avatar URL**: public HTTPS, square image. A public object in Cloud Storage works. If an old image keeps showing, upload with a new file name (cache).
- **Description**: one short line.
- **Functionality**: check **Receive 1:1 messages** and **Join spaces and group conversations**.
- **Connection settings**: **Apps Script**, paste the Deployment ID.
- **Visibility**: the whole domain, or specific people and groups. Empty means nobody can find the app.
- **Save**. Propagation takes 5 to 10 minutes.

## 6. First use
1. In a space: space name > **Apps & integrations** > **Add apps** > your app.
2. Send `@mention group message`. The first time: **Configure** > **Allow**. Each user authorizes once.
3. In a direct message with the bot: `groups`, `who group`, `help`.
