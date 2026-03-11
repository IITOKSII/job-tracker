// Pure constants — no side-effects, no imports.

export const STATUS = {
  saved:     { label: "Saved",     color: "var(--accent)"  },
  applied:   { label: "Applied",   color: "var(--blue)"    },
  interview: { label: "Interview", color: "var(--purple)"  },
  offer:     { label: "Offer",     color: "var(--green)"   },
  rejected:  { label: "Rejected",  color: "var(--red)"     },
};

export const STATUS_ORDER = ["saved", "applied", "interview", "offer", "rejected"];

export const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
];

export const CHECKLIST_ITEMS = [
  { key: "resume_sent",    label: "Resume uploaded / sent"         },
  { key: "cover_written",  label: "Cover letter written"           },
  { key: "refs_ready",     label: "References prepared"            },
  { key: "portfolio",      label: "Portfolio / work samples ready" },
  { key: "linkedin",       label: "LinkedIn profile updated"       },
  { key: "follow_up",      label: "Follow-up email drafted"        },
  { key: "interview_prep", label: "Interview prep done"            },
  { key: "thank_you",      label: "Thank-you note sent"            },
];

export const EASY_LABELS = {
  "Dashboard":                       "My Jobs",
  "Analytics":                       "How Am I Going",
  "Add Job":                         "Add a New Job",
  "CV Match":                        "Check My Resume",
  "Resumes":                         "My Resumes",
  "Cover Letters":                   "My Letters",
  "Email Templates":                 "Email Help",
  "Settings":                        "Settings",
  "Interview Prep Questions":        "Practice Questions for Your Interview",
  "Application Questions":           "Questions to Answer When You Apply",
  "Key Company Facts":               "About This Company",
  "Job Description":                 "About This Job",
  "My Notes":                        "My Notes",
  "Application Timeline":            "What Has Happened",
  "Quick-Apply Checklist":           "Things to Do Before You Apply",
  "Export Data":                     "Save a Copy",
  "Import Data":                     "Load a Copy",
  "Clear All Data":                  "Delete Everything",
  "Gemini API Key":                  "Your AI Key",
  "Account & Cloud Sync":            "Your Account",
  "Generate":                        "Make It",
  "Generate from Job":               "Write a Letter for This Job",
  "Generate from Scratch":           "Make a New Resume",
  "New Resume":                      "Make a New Resume",
  "New Cover Letter":                "Write a New Letter",
  "Analyse Job":                     "Look at This Job",
  "Search...":                       "Search your jobs...",
  "Edit":                            "Change It",
  "View":                            "Look At It",
  "Delete":                          "Remove It",
  "Duplicate":                       "Make a Copy",
  "Save":                            "Save It",
  "TEMPLATE:":                       "Style:",
  "Modern":                          "Clean",
  "Classic":                         "Traditional",
  "Minimal":                         "Simple",
  "Executive":                       "Formal",
};
