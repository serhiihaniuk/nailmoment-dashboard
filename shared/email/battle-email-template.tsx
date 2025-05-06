import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Link,
  Button,
  Hr,
} from "@react-email/components";
import * as React from "react";

interface BattleTicketEmailTemplateProps {
  name: string;
  ticketId: string; // Added ticketId
  logoUrl?: string;
  instagramLink?: string;
  telegramUsername?: string;
}

const DEFAULT_LOGO_URL =
  "https://oet9iwqxtk87xaxw.public.blob.vercel-storage.com/nailmoment-wroclaw/assets/logo-sYFHGN18H1zPtjucntQDiZXrYdpXQB.png";
const DEFAULT_INSTAGRAM_LINK = "https://www.instagram.com/nail_moment_pl";
const DEFAULT_TELEGRAM_USERNAME = "nail_moment_pl";

export const BattleTicketEmailTemplate = ({
  name,
  ticketId,
  logoUrl = DEFAULT_LOGO_URL,
  instagramLink = DEFAULT_INSTAGRAM_LINK,
  telegramUsername = DEFAULT_TELEGRAM_USERNAME,
}: BattleTicketEmailTemplateProps) => {
  const currentYear = new Date().getFullYear();
  const telegramSubmissionLink = `https://t.me/${telegramUsername}`;

  return (
    <Html>
      <Head />
      <Preview>
        Ваш квиток №{ticketId} учасника Битви Майстрів Nail Moment!
      </Preview>{" "}
      {/* Updated Preview */}
      <Body style={main}>
        <Container style={container}>
          <Section style={logoContainer}>
            <Img
              src={logoUrl}
              width="150"
              style={logoImageStyle}
              alt="Nail Moment Logo"
            />
          </Section>

          <Heading style={h1}>Вітаємо, {name}!</Heading>

          <Text style={text}>
            Дякуємо за покупку квитка учасника конкурсу{" "}
            <span style={brandName}>&quot;Битва Майстрів&quot;</span>!
          </Text>

          {/* --- Added Ticket ID Section --- */}
          <Section style={ticketIdSection}>
            <Text style={ticketIdText}>
              <strong>Ваш номер квитка:</strong> {ticketId}
            </Text>
          </Section>
          {/* -------------------------------- */}

          <Hr style={hr} />

          <Section style={instructionsSection}>
            <Heading style={h2}>Що робити далі:</Heading>
            <ol style={listStyle}>
              <li style={listItemStyle}>
                Виберіть категорію, на яку будете надсилати роботу.
              </li>
              <li style={listItemStyle}>
                Підготуйте якісну роботу згідно з обраною номінацією. Зробіть
                1-3 дуже гарні фотографії вашої роботи.
              </li>
              <li style={listItemStyle}>
                Вкажіть вашу номінацію, прикріпіть 1-3 фотографії вашої роботи
                та надішліть нам у Telegram:{" "}
                <Link href={telegramSubmissionLink} style={link}>
                  @{telegramUsername}
                </Link>
                .
              </li>
              <li style={listItemStyle}>
                Поки чекаєте на результати, ви можете придбати ще один квиток
                учасника та взяти участь у наступній номінації! ☺️
              </li>
            </ol>
          </Section>

          <Hr style={hr} />

          <Section style={ctaSection}>
            <Text style={{ ...text, textAlign: "center" as const }}>
              Хочете взяти участь у ще одній номінації?
            </Text>
            <Button style={button} href={instagramLink}>
              Напишіть нам в Instagram, щоб придбати ще квиток
            </Button>
          </Section>

          <Hr style={hr} />

          <Section style={footerSection}>
            <Text style={footerText}>
              З нетерпінням чекаємо на ваші роботи!
              <br />З повагою, Команда Nail Moment
            </Text>
            <Text style={footerInfo}>
              Якщо у вас виникли запитання, зв&apos;яжіться з нами:
              <br />
              <Link
                href="mailto:Nailmoment.Official@gmail.com"
                style={footerLink}
              >
                Nailmoment.Official@gmail.com
              </Link>
              <br />
              <Link href={instagramLink} style={footerLink}>
                Instagram: @nail_moment_pl
              </Link>
              <br />
              <Link href={telegramSubmissionLink} style={footerLink}>
                Telegram для зв&apos;язку: @{telegramUsername}
              </Link>
            </Text>
            <Text style={footerCopyright}>
              © {currentYear} Nail Moment. Всі права захищено.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// --- STYLES ---

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const logoImageStyle = {
  display: "block",
  margin: "0 auto",
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 40px 48px",
  marginBottom: "64px",
  border: "1px solid #eee",
  borderRadius: "5px",
  maxWidth: "600px",
};

const logoContainer = {
  textAlign: "center" as const,
  padding: "20px 0",
  backgroundColor: "#bcd9f7",
};

const h1 = {
  color: "#333",
  fontSize: "28px",
  fontWeight: "bold" as const,
  textAlign: "center" as const,
  margin: "30px 0",
  padding: "0",
};

const h2 = {
  color: "#444",
  fontSize: "22px",
  fontWeight: "bold" as const,
  margin: "25px 0 15px 0",
};

const brandName = {
  fontWeight: "bold" as const,
  color: "#6a0dad",
};

const text = {
  color: "#333",
  fontSize: "16px",
  lineHeight: "26px",
  margin: "16px 0",
};

const ticketIdSection = {
  textAlign: "center" as const,
  margin: "10px 0 20px 0", // Adjusted margin
};

const ticketIdText = {
  color: "#555",
  fontSize: "15px",
  lineHeight: "24px",
};

const hr = {
  borderColor: "#cccccc",
  margin: "30px 0",
};

const instructionsSection = {
  margin: "20px 0",
};

const listStyle = {
  paddingLeft: "20px",
  margin: "16px 0",
};

const listItemStyle = {
  color: "#333",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "8px 0",
};

const ctaSection = {
  textAlign: "center" as const,
  margin: "30px 0",
};

const button = {
  backgroundColor: "#007bff",
  borderRadius: "5px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "bold" as const,
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  lineHeight: "100%",
  padding: "12px 20px",
  marginTop: "10px",
};

const footerSection = {
  textAlign: "center" as const,
  marginTop: "30px",
};

const footerText = {
  color: "#555",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0 0 10px 0",
};

const footerInfo = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "18px",
  margin: "0 0 10px 0",
};

const footerLink = {
  color: "#007bff",
  textDecoration: "underline",
};

const footerCopyright = {
  color: "#aaaaaa",
  fontSize: "11px",
  lineHeight: "16px",
  margin: "0",
};

const link = {
  color: "#007bff",
  textDecoration: "underline",
};
