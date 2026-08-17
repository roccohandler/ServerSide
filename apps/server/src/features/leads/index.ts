/**
 * The feature's public API. Everything not exported here is private to it — see the
 * boundary rule in docs/CUSTOMER-PLATFORM.md.
 */

export { createLeadRouter } from './lead.routes.js';
export type { LeadRoutesDependencies } from './lead.routes.js';
/* The signed-in half of the funnel. Mounted inside `/app`; see the note in that file. */
export { createCustomerLeadRouter } from './lead.customer.routes.js';
export type { CustomerLeadRoutesDependencies } from './lead.customer.routes.js';
export { createLeadService } from './lead.service.js';
export type { LeadService, LeadServiceDependencies } from './lead.service.js';
export { createMongoLeadRepository } from './lead.repository.js';
export type { LeadRepository } from './lead.repository.js';
/* The honeypot field name is shared by every public form on the server. */
export { HONEYPOT_FIELD, INQUIRY_TYPES, LEAD_FIELD_LIMITS } from './lead.types.js';
export type { InquiryType, LeadStatus, StoredLead } from './lead.types.js';
/*
 * The human wording for an inquiry slug. Exported because the console quotes the
 * prospect's own words back to them when the owner replies, and "manage-website" is not
 * a sentence anybody wrote — see `features/conversations`.
 */
export { describeInquiryType } from './lead.email.js';
