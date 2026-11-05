# time-disk

**Office Focus Timer** — a small Windows app to plan your office day and stay on track.

- Set your office hours and working days.
- Add tasks with how long each should take, drag to reorder, and save.
- A small always-on-top timer sits on the side of your screen: it shows the task running now, the countdown and the next task.
- When time is up you get a Windows notification and a soft chime, with **+5 min** and **Start next** buttons.
- Plan tasks for upcoming days; on that day they load automatically and you get a reminder.
- Safe if the PC sleeps or shuts down: the timer pauses and picks up where it stopped. All data is saved on disk.
- History of planned vs actual time, tray icon, optional launch with Windows.

## Install

Download `Office-Focus-Timer-Setup-<version>.exe` (installer) or `Office-Focus-Timer-Portable-<version>.exe` (no install) and run it.
The app is not code-signed, so Windows SmartScreen may warn the first time: click **More info → Run anyway**.

## Develop

```bash
npm install
npm run dev        # run with hot reload
npm test           # timer and day-rollover tests
npm run build:win  # build installer + portable exe into dist/
```

Built with Electron, React, TypeScript and Tailwind CSS. Data lives in `%APPDATA%\Office Focus Timer\data.json`.
