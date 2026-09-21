/** English strings for the overlay UI. */
export const en = {
  "overlay.title": "freecode",
  "overlay.lang.switch": "Switch language",
  "overlay.collapse": "Collapse",
  "overlay.expandTitle": "Open freecode panel",
  "overlay.project.heading": "CURRENT PROJECT DIRECTORY",
  "overlay.project.none": "No project selected",
  "overlay.project.change": "Change",
  "overlay.project.selecting": "Selecting…",
  "overlay.project.promptSent": "Prompt sent",
  "overlay.project.cancelled": "Selection cancelled",
  "overlay.project.error": "Error",

  "overlay.delay.heading": "SEND DELAY",
  "overlay.delay.to": "to",
  "overlay.delay.sec": "sec",
  "overlay.delay.save": "Save delay",
  "overlay.delay.saved": "Saved",

  "overlay.task.heading": "TASK DETECTED",
  "overlay.task.script": "[JS script]",

  "overlay.result.heading": "RESULT",
  "overlay.result.success": "JS script executed successfully",
  "overlay.result.error": "JS script failed",
  "overlay.result.empty": "No result yet",
} as const;

export type TranslationKey = keyof typeof en;
