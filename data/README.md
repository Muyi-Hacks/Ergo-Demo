# Sample deal: Marlow County Library System × Bramble Software

Everything here is made up: the companies, people, ILS ("Atrium"), domains and numbers.

**Seller:** Bramble Software, a small vendor whose patron-services platform covers holds/SMS notifications, room booking, events and summer reading registration, and online card signup.
**Buyer:** Marlow County Library System, which has 9 branches and runs the hosted Atrium ILS.

## Sources

| id | file | what it is | date |
|---|---|---|---|
| crm | crm.json | CRM opportunity record, **last updated Oct 29, so it's stale by call 2** | 2026-10-29 |
| call1 | call1.txt | Discovery call: Dana, Maria, Tom | 2026-10-14 |
| email1 | email1.txt | Dana's recap after call 1 | 2026-10-15 |
| email2 | email2.txt | Dana's pricing proposal | 2026-10-23 |
| email3 | email3.txt | Maria's heads-up before call 2 (new attendee, budget news) | 2026-11-04 |
| call2 | call2.txt | Technical and security call, where Janelle joins | 2026-11-10 |
| email4 | email4.txt | Janelle's risk-review package, with Tom's Atrium follow-up on top | 2026-11-13 |

The code will number each file's lines from 1 (`[call1-L48]`). Transcripts have one utterance per line. The demo portion of each call is trimmed down to a few exchanges, which is why the timestamps jump.

**Snapshots** (in `manifest.json`):
- `after_call1` (as of Oct 30) includes crm, call1, email1 and email2.
- `after_call2` (as of Nov 13) includes all seven sources.

## Answer key (what a good brief should find)

### Stakeholders
| Person | Role | First appears |
|---|---|---|
| Maria Okafor, Deputy Director, Public Services | Champion; brings the recommendation | call1 |
| Tom Brennan, Systems & IT Manager | Technical evaluator; skeptical about integration | call1 |
| Linda Castellano, Library Director | Economic buyer, signs (call1-L64). Never on a call. Her view on the deal is **not mentioned**. "She knows I'm looking" (L66) says nothing about her stance | call1 |
| Raj Patel, Bramble SE | Seller side | named in call1, attends call2 |
| **Janelle Brooks, Sr. InfoSec Analyst, County Office of Technology** | **New in call 2.** Her security review is a hard gate before a PO is issued (call2-L9, L15) | email3 / call2 |

### Pains (call 1)
- Hold pickup notices go out by email only, and 1,840 holds expired unclaimed in September (call1-L21)
- 23 rooms are booked by phone plus a Google Sheet, which causes double-bookings (call1-L14)
- Summer reading: about 4,000 kids registered, followed by roughly 3 weeks of manual merging and deduping (call1-L28, L29). This is the champion's main driver (L26, L50, L91)
- Events have no registration (L32)
- Card signup is a nice-to-have only (L34–L36)

### Hidden objection
In **call1-L48**, Tom says almost in passing: *"Atrium's been telling us they've got a patron engagement module on the roadmap, so part of me's like... you know."* Dana moves on without addressing it, and it never shows up in the CRM (`"competitors": []`). That makes it a "wait for the incumbent" objection. Together with the SIP2 history (L42–L46) and Tom's "I need to see the integration side" (L92), it reads as integration skepticism.
In **email4-L11**, it comes out in the open: Atrium is now saying "second half of 2027," and Linda will ask why they shouldn't just wait.

### What changed from call 1 to call 2 (the diff the demo should surface)
| | After call 1 | After call 2 |
|---|---|---|
| **New stakeholder** | none | Janelle Brooks (county security), a gating approver (call2-L9, L15) |
| **Budget** | about $60K for FY27 (call1-L56) | **$48K ceiling** after a 4% county cut (call2-L22, L28). Year-one price of $52.4K now exceeds it. Being under $50K means the Board of Supervisors no longer needs to approve, which Maria sees as a plus (L26) |
| **Timeline** | Go-live June 1, 2027 (call1-L52) | **Go-live September 2027.** Summer reading stays manual for another year (call2-L32, L34). Signature target moves to April (L37, L73) |
| **New process step** | none | County third-party risk review, 6–8 weeks from a complete package, with no committee meetings in the last two weeks of December (call2-L17, L72; email4) |
| **New risks** | — | SOC 2 Type I only, with the Type II report expected late Feb (call2-L61). Library isn't on Atrium's Connect tier, so the upgrade costs $4,200/yr or they fall back to SIP2 and lose reply-to-extend (call2-L41, L43; email4-L9). DPA required because patron records are confidential under state law (call2-L64). SMS subprocessor gets patron phone numbers (call2-L67–L70). SSO now goes through the county tenant (call2-L49) |
| **Hidden objection** | Implied (call1-L48) | Explicit (email4-L11) |
| **CRM** | Matches the calls | **Stale**: close date 2027-02-26, go-live 2027-06-01, $52,400, Janelle missing, no competitors listed |

Constant across both calls: the FY27 money still has to be encumbered by June 30 (call1-L58, call2-L36).

### Next steps after call 2 (call2-L74–L83)
- Bramble sends the full security package by Nov 24
- Tom checks the Atrium Connect tier (done in email4-L9: not on Connect)
- Raj and Tom hold a SIP2 deep-dive on Dec 2
- Dana sends revised phased pricing under $48K by Nov 17
- Maria briefs Linda on her own

### Things deliberately *not* in the sources (the brief should say "Not mentioned")
- Linda's opinion of the deal or the vendor
- Any competitor's pricing, and the names of the other vendors Maria looked at
- Whether the county attorney or legal reviews the contract (only the DPA and the security review come up)
- The number of staff users or SMS volume needs
- The library's preference on contract length (Bramble proposed 3 years, and the customer never responded to that)
