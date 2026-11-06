# Google OAuth verification — Calendar sync

Drafts for answering Google's "[Action Needed] OAuth Verification Request Acknowledgement" email (Sep 1, 2026) for the `https://www.googleapis.com/auth/calendar.events` scope.

Anything in **[CONFIRM: …]** is a fact only you can check (mostly what the backend at api.produchive.com stores). Don't publish a sentence you can't stand behind. Google reviewers compare the policy against the app and the video.

---

## 1. Privacy policy section (add to produchive.com/privacy)

> ### Google user data
>
> Produchive's optional Google Calendar sync uses one Google permission, **"See, edit, share, and permanently delete all the calendars you can access using Google Calendar"** (`calendar.events`). We use it only to:
>
> - **read** events on your primary calendar so they appear in Produchive's Routine calendar, and
> - **create** events on your calendar for routine blocks you choose to sync.
>
> We do not use Google Calendar data for advertising, sell it, or use it for any purpose other than showing and syncing your own schedule inside Produchive.
>
> #### How we store your Google data
>
> - Calendar events you import are stored **only on your computer**, in Produchive's local app data.
> - The Google access token is stored only on your computer. **[CONFIRM: Our server (api.produchive.com) handles the sign-in step with Google and passes the access token to the app. It does not store your token or your calendar events.]**
> - If you turn on Produchive's multi-device sync, your Produchive data, including imported events, is encrypted on your device with end-to-end encryption before it is written to the sync folder you choose. We cannot read it.
>
> #### Who we share Google data with
>
> We **do not share, transfer, sell or disclose** Google user data to any third party. The only exceptions are:
>
> - **Google itself**, when the app reads or writes events through the Google Calendar API at your request, and
> - **where required by law**, such as a valid court order.
>
> Google Calendar data is **never sent to AI providers**. See "AI features" below.
>
> #### How we protect it
>
> - All communication with Google and with our servers uses HTTPS (TLS encryption in transit).
> - Calendar data and tokens stay on your device. Encrypted sync uses end-to-end encryption, so data is encrypted before it leaves your device.
> - AI provider API keys you enter are encrypted with your operating system's keychain.
> - **[CONFIRM: Server access is limited to the developer, and the server keeps no Google user data.]**
>
> #### AI features
>
> Produchive can use an AI model to plan your day and review your productivity. You choose the model:
>
> - **On-device model (default):** runs entirely on your computer through WebLLM. Your data, including Google Calendar events, is processed **locally** and is never sent to the model's provider. Self-hosted local servers (Ollama, LM Studio) running on your own computer are treated the same way.
> - **Cloud AI providers (optional, using your own API key):** Produchive sends your goals and activity summaries to the provider you choose. **Google Calendar events are automatically excluded** from anything sent to a cloud provider.
>
> Google user data is never used to create, train or improve any AI or machine-learning model, by us or by anyone else.
>
> **Limited Use:** Produchive's use and transfer of information received from Google APIs to any other app will adhere to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements.
>
> #### Removing access and deleting your data
>
> - In Produchive, go to **Routine → Google Calendar Sync → Disconnect**. This removes the token from your device.
> - You can also revoke access at any time at https://myaccount.google.com/permissions.
> - Imported events can be deleted from the Routine calendar. Uninstalling Produchive and deleting its app data folder removes all locally stored data.
> - Questions or deletion requests: **[CONFIRM: contact email]**.

---

## 2. Reply email (reply on the same thread)

> Hello Third Party Data Safety Team,
>
> Thank you for the review. We have addressed each item for the Produchive OAuth client **[CONFIRM: client ID]** (project **[CONFIRM: project ID]**).
>
> **1. Privacy policy**
> The updated policy is at **[CONFIRM: https://produchive.com/privacy]**. Its "Google user data" section now covers:
> - **Sharing:** Google user data is not shared, transferred or disclosed to any third party, except Google itself when the app reads or writes calendar events, and where required by law. It is never sent to AI providers.
> - **Protection:** data and tokens stay on the user's device; transport uses TLS; optional multi-device sync uses end-to-end encryption; AI API keys are encrypted with the OS keychain.
> - The Limited Use statement, plus how to disconnect and delete data.
>
> **2. Why `calendar.events` is needed**
> Produchive is a desktop productivity app. Its Routine calendar does two-way sync with the user's Google Calendar:
> - **Read:** existing events are imported so the user's day is planned around real commitments.
> - **Write:** routine blocks the user plans in Produchive are created as events on their Google Calendar.
>
> No narrower scope covers both. `calendar.events.readonly` cannot create events, and `calendar.app.created` cannot read the user's existing primary-calendar events.
>
> **3. Demo video**
> New video: **[CONFIRM: unlisted YouTube link]**. It shows the OAuth consent screen with all scopes expanded, an event created in Google Calendar appearing in Produchive (read), and a routine block created in Produchive appearing in Google Calendar (write). It also shows disconnecting.
>
> **4. Test access and steps**
> Produchive is a desktop app for macOS and Windows: **[CONFIRM: download link]**.
> **[CONFIRM: Either "No Produchive account is required" or test account: email / password, with no 2FA or phone verification.]**
> Steps: install and open Produchive → **Routine** (sidebar) → **Sync with Google** → sign in with any Google test account and approve → click **Sync Now**. Imported events appear on the calendar. Add a block with **+ Add** and click **Sync Now** again; it appears in Google Calendar.
>
> **5. AI and Limited Use**
> - **Default AI is fully on-device.** Produchive runs open-weight models (e.g. Gemma 2 2B) locally through WebLLM. Google Calendar data processed by this model never leaves the user's computer and is never sent to the model provider.
> - **Optional cloud AI providers** are used only if the user adds their own API key. **Google Calendar data is excluded from every request to these providers**: the app tags events imported from the Google Calendar API and filters them out before any prompt is sent to a non-local model. Supported providers: Anthropic, OpenAI, Google Gemini, OpenRouter, Groq, Mistral AI, DeepSeek, xAI, Together AI and Perplexity, plus user-run local servers (Ollama, LM Studio) and a custom OpenAI-compatible endpoint. Produchive has no plan or tier with any of these providers. Each user brings their own key and their own account with that provider.
> - **Aggregators:** OpenRouter is the only aggregator supported. It is subject to the same rule: Google Calendar data is never included in requests to it.
> - Google user data is never used to create, train or improve AI/ML models. Our privacy policy states this and includes the Limited Use statement.
>
> Please let us know if anything else is needed.
>
> Best regards,
> **[CONFIRM: name]**, Produchive

---

## 3. Demo video shot list

1. Cloud Console → APIs & Services → Credentials. Show the OAuth client ID (it must match the `client_id` in the consent URL).
2. Open Produchive → **Routine → Sync with Google**. On the consent screen, click **"Show all services"** so `calendar.events` is readable. Briefly show the browser address bar.
3. **Read:** in calendar.google.com, create "Verification test — read" for today. In Produchive, click **Sync Now** and show it on the Routine calendar.
4. **Write:** in Produchive, add a block "Verification test — write" and click **Sync Now**. Switch to Google Calendar and refresh to show it.
5. Show the privacy note in the Google Calendar Sync modal ("Your Google Calendar events stay on this device…").
6. Click **Disconnect**, then show myaccount.google.com/permissions.
7. Show the privacy policy link.

Record with a **packaged build**, not `npm start`, so the reviewer sees what users get.
