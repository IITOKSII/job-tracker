// Hardcoded Australian workplace accommodation request templates.
// Legal basis: Fair Work Act 2009 (Cth), Disability Discrimination Act 1992 (Cth).
// Placeholders: [NEED], [REASON], [JOB_DUTY], [ADJUSTMENT_x] — filled by Gemini at generation time.

export const ACCOMMODATION_TEMPLATES = [
  {
    id:   "interview-request",
    name: "Interview Accommodation Request",
    desc: "Request adjustments for an upcoming interview (e.g. quiet room, extra time, accessible venue)",
    body: `[Your Name]
[Your Address]
[City, State, Postcode]
[Date]

[Hiring Manager's Name]
[Company Name]
[Company Address]

Dear [Hiring Manager's Name],

Re: Accommodation Request — [Job Title] Interview

I am writing to respectfully request reasonable adjustments for my upcoming interview for the [Job Title] position at [Company Name].

Under the Disability Discrimination Act 1992 (Cth), I am entitled to request reasonable adjustments to ensure equitable access to the interview process. I have [NEED], which [REASON]. To perform at my best and ensure the assessment is a fair reflection of my capabilities, I would appreciate the following adjustments:

• [ADJUSTMENT_1]
• [ADJUSTMENT_2]

These adjustments relate directly to my ability to [JOB_DUTY] and will not alter the essential requirements of the assessment.

I am happy to discuss these needs further and provide supporting documentation if required. I look forward to the opportunity to demonstrate my suitability for this role.

Yours sincerely,

[Your Name]
[Phone Number]
[Email Address]`,
  },
  {
    id:   "workplace-adjustment",
    name: "Formal Workplace Adjustment Request",
    desc: "Post-offer or current role adjustments (ergonomic equipment, flexible hours, modified duties)",
    body: `[Your Name]
[Position / Employee ID]
[Date]

[Manager's Name / HR Contact]
[Company Name]

Dear [Manager's Name],

Re: Reasonable Adjustment Request — [Job Title]

I am writing to formally request reasonable workplace adjustments in accordance with the Disability Discrimination Act 1992 (Cth) and my rights under the Fair Work Act 2009 (Cth).

I have [NEED], which affects my ability to [JOB_DUTY] in the standard working environment. This is not a barrier to performing the essential functions of my role — with the following adjustments, I am fully capable of meeting all key responsibilities:

Requested Adjustments:
1. [ADJUSTMENT_1] — [REASON_1]
2. [ADJUSTMENT_2] — [REASON_2]

I am committed to my role and to working collaboratively with management to find solutions that meet both my access needs and the operational requirements of the team. I am available to meet at your earliest convenience and can provide supporting documentation from my treating practitioner upon request.

I trust this request will be considered in good faith, consistent with the organisation's obligations under Australian anti-discrimination law.

Yours sincerely,

[Your Name]
[Phone Number]
[Email Address]`,
  },
  {
    id:   "remote-flexible",
    name: "Remote Work / Flexible Location Request",
    desc: "Accessibility-based request for remote or hybrid work arrangements",
    body: `[Your Name]
[Position / Employee ID]
[Date]

[Manager's Name / HR Contact]
[Company Name]

Dear [Manager's Name],

Re: Flexible Work Arrangement Request — Accessibility Grounds

I am writing to request a flexible work arrangement under the Fair Work Act 2009 (Cth) and Disability Discrimination Act 1992 (Cth) on the basis of a disability or medical condition affecting my access to the workplace.

I have [NEED], which means that [REASON]. My ability to carry out [JOB_DUTY] is not affected by working remotely or from an alternative location — in fact, a flexible arrangement would enable me to perform at a consistently higher level without the physical and logistical barriers presented by the standard workplace environment.

Proposed Arrangement:
• Work location: [LOCATION] (remote / hybrid / alternative site)
• Proposed schedule: [SCHEDULE]
• Review period: [REVIEW_PERIOD] (e.g. 3 months, then reassess)

I am confident this arrangement will have no adverse impact on my output, team communication, or service delivery. I welcome the opportunity to discuss this request and any conditions that might support a successful outcome for all parties.

Yours sincerely,

[Your Name]
[Phone Number]
[Email Address]`,
  },
];
