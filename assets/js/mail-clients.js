// Mail client URL builders for compose drafts
const MAIL_CLIENTS = Object.freeze({
  gmail: "gmail",
  outlook: "outlook",
  mailto: "mailto",
});

const MAIL_CLIENT_LABELS = {
  gmail: "Gmail",
  outlook: "Outlook",
  mailto: "System Default Mail App",
};

function buildMailDraftUrl(client, { bcc, subject, body }) {
  const bccParam = Array.isArray(bcc) ? bcc.join(",") : bcc || "";
  const encodedBcc = encodeURIComponent(bccParam);
  const encodedSubject = encodeURIComponent(subject || "");
  const encodedBody = encodeURIComponent(body || "");

  switch (client) {
    case MAIL_CLIENTS.outlook:
      return (
        "https://outlook.office.com/mail/deeplink/compose" +
        "?bcc=" +
        encodedBcc +
        "&subject=" +
        encodedSubject +
        "&body=" +
        encodedBody
      );
    case MAIL_CLIENTS.mailto:
      return (
        "mailto:" +
        "?bcc=" +
        encodedBcc +
        "&subject=" +
        encodedSubject +
        "&body=" +
        encodedBody
      );
    case MAIL_CLIENTS.gmail:
    default:
      return (
        "https://mail.google.com/mail/?view=cm" +
        "&bcc=" +
        encodedBcc +
        "&su=" +
        encodedSubject +
        "&body=" +
        encodedBody
      );
  }
}

function getMailClientDraftLabel(client) {
  const name = MAIL_CLIENT_LABELS[client] || MAIL_CLIENT_LABELS.gmail;
  return `Open ${name} Draft`;
}
