import sgMail from "@sendgrid/mail";
import { getSuspiciousCache } from "./transactionResolver.js";
import logger from "../../../logs/logger.js";

sgMail.setApiKey(process.env.EMAIL_API_KEY);

/**
 * GraphQL resolvers for email-related mutations.
 * Provides the ability to send an email containing suspicious transaction reports.
 */
const emailResolvers = {
  Mutation: {
    /**
     * Sends an email report containing suspicious transactions.
     *
     * @async
     * @function sendEmail
     * @param {object} _ - Parent resolver context (unused).
     * @param {object} args - GraphQL mutation arguments.
     * @param {string} args.to - Recipient email address.
     * @returns {Promise<boolean>} - Returns true if the email was sent successfully, otherwise false.
     *
     * Steps:
     * 1. Fetch suspicious transactions from cache.
     * 2. Construct plain text and HTML summaries of the transactions.
     * 3. Use SendGrid to send the email to the recipient.
     * 4. Log results and return success/failure.
     */
    async sendEmail(_, { to }) {
      try {
        // Get suspicious records from cache
        const suspiciousRecords = getSuspiciousCache() || [];
        if (!suspiciousRecords.length) {
          return false;
        }

        // Convert to plain text summary
        const textBody = suspiciousRecords
          .map((r, i) => `#${i + 1} | ID: ${r.id}, Amount: ${r.amount}, User: ${r.user}, Reason: ${r.reason}`)
          .join("\n");

        // Build a HTML table
        const htmlBody = consturctHTMLTable(suspiciousRecords);

        const msg = {
          to,
          from: process.env.EMAIL_FROM,
          subject: "Fraud Alert - Suspicious Transactions Report",
          text: textBody,
          html: htmlBody,
        };
        
        try {
          await sgMail.send(msg);
        } catch (err) {
          logger.error("Error: " + err);
          return false;
        }
        logger.info(`Message sent to: ${to}`);
        return true;
      } catch (error) {
        logger.error("SendGrid error:", error);
        return false;
      }
    },
  },
};

/**
 * Constructs an HTML table summarizing suspicious transactions.
 *
 * @function consturctHTMLTable
 * @param {Array<object>} suspiciousRecords - Array of suspicious transaction objects.
 * @param {string|number} suspiciousRecords[].id - Transaction ID.
 * @param {string|number} suspiciousRecords[].user_id - User identifier.
 * @param {number} suspiciousRecords[].amount - Transaction amount.
 * @param {string} suspiciousRecords[].reason - Reason why the transaction was flagged.
 * @returns {string} - Returns an HTML string containing a styled table.
 */
function consturctHTMLTable(suspiciousRecords){
  return `
    <h3>Fraud Alert - Suspicious Transactions</h3>
    <table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse;">
      <tr>
        <th>#</th>
        <th>User</th>
        <th>Amount</th>
        <th>Reason</th>
      </tr>
      ${suspiciousRecords
        .map(
          (r, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${r.user_id}</td>
          <td>${r.amount}</td>
          <td>${r.reason}</td>
        </tr>`
        )
        .join("")}
    </table>
  `;
}

export default emailResolvers;