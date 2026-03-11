// Email template data — pure data, no logic.

export const EMAIL_TEMPLATES = [
  {
    id:      "post-apply",
    icon:    "\u{1F4EC}",
    name:    "Post-Application Follow-Up",
    desc:    "1 week after applying with no response",
    subject: "Following Up \u2014 [Job Title] Application",
    body:    "Hi [Hiring Manager's Name],\n\nI wanted to follow up on my application for the [Job Title] role at [Company Name], submitted on [date].\n\nI'm very enthusiastic about this opportunity and believe my background in [your key skill] aligns closely with what you're looking for. I'd welcome the chance to discuss how I can contribute to your team.\n\nPlease let me know if you need any additional information. I'm available for a call or interview at your convenience.\n\nKind regards,\n[Your Name]\n[Phone Number]",
  },
  {
    id:      "post-interview",
    icon:    "\u{1F91D}",
    name:    "Post-Interview Thank You",
    desc:    "Within 24 hours of your interview",
    subject: "Thank You \u2014 [Job Title] Interview",
    body:    "Hi [Interviewer's Name],\n\nThank you for taking the time to speak with me today about the [Job Title] position at [Company Name].\n\nIt was great to learn more about [something specific from the interview]. Our conversation reinforced my enthusiasm for this role and my confidence that I can make a strong contribution to your team.\n\nI look forward to the next steps and am happy to provide any additional information.\n\nKind regards,\n[Your Name]\n[Phone Number]",
  },
  {
    id:      "no-response",
    icon:    "\u{1F514}",
    name:    "No Response Follow-Up",
    desc:    "2+ weeks after applying with no reply",
    subject: "Re: [Job Title] Application \u2014 Checking In",
    body:    "Hi [Hiring Manager's Name],\n\nI hope you're well. I'm reaching out to check on the status of my application for the [Job Title] role at [Company Name], submitted on [date].\n\nI remain very interested in this opportunity and would love to contribute to [Company Name]'s work in [relevant area]. If the role is still open, I'd be keen to connect.\n\nThanks so much for your time.\n\nKind regards,\n[Your Name]\n[Phone Number]",
  },
  {
    id:      "offer-received",
    icon:    "\u{1F389}",
    name:    "Offer Received \u2014 Request Time",
    desc:    "Buy time to consider an offer professionally",
    subject: "Re: [Job Title] Offer \u2014 Thank You",
    body:    "Hi [Hiring Manager's Name],\n\nThank you so much for the offer for the [Job Title] position \u2014 I'm genuinely thrilled.\n\nI'd love to take a couple of days to review everything carefully before formally accepting. Would it be possible to have until [specific date] to get back to you?\n\nI'm very excited about the prospect of joining the team.\n\nKind regards,\n[Your Name]",
  },
  {
    id:      "decline-offer",
    icon:    "\u{1F64F}",
    name:    "Decline an Offer Gracefully",
    desc:    "Keep doors open while saying no",
    subject: "Re: [Job Title] Offer \u2014 With Thanks",
    body:    "Hi [Hiring Manager's Name],\n\nThank you so much for offering me the [Job Title] position at [Company Name]. I truly appreciate the time invested throughout the process.\n\nAfter careful consideration, I've decided to decline the offer at this stage. This was not an easy decision \u2014 I have a great deal of respect for [Company Name] and the team I met.\n\nI hope our paths cross again in the future.\n\nKind regards,\n[Your Name]",
  },
];
