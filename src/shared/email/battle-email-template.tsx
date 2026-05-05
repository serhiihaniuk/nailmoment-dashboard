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
  ticketId: string;
  logoUrl?: string;
  instagramLink?: string;
  telegramUsername?: string;
}

const DEFAULT_LOGO_URL =
  "https://oet9iwqxtk87xaxw.public.blob.vercel-storage.com/assets/v1/nailmoment-wroclaw/content/2026/nm_logo.png";
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
  const shortCode = ticketId
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(-5)
    .toLowerCase();

  return (
    <Html>
      <Head />
      <Preview>
        Ваш квиток учасника Битви Майстрів Nail Moment — #{shortCode}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={headerSection}>
            <Img
              src={logoUrl}
              width="140"
              style={logoImageStyle}
              alt="Nail Moment Logo"
            />
            <Text style={headerTagline}>КОНКУРС «БИТВА МАЙСТРІВ»</Text>
          </Section>

          {/* Greeting */}
          <Section style={greetingSection}>
            <Heading style={h1}>Вітаємо, {name}!</Heading>
            <Text style={text}>
              Дякуємо за покупку квитка учасника конкурсу{" "}
              <span style={brandName}>«Битва Майстрів»</span> на фестивалі
              Nail Moment у Варшаві.
            </Text>
          </Section>

          {/* Ticket ID card */}
          <Section style={ticketWrapper}>
            <table style={ticketInnerBox}>
              <tr>
                <td style={ticketInnerCell}>
                  <p style={ticketLabel}>ВАШ КВИТОК УЧАСНИКА</p>
                  <p style={ticketIdDisplay}>{ticketId}</p>
                  <p style={shortCodeStyle}>#{shortCode}</p>
                </td>
              </tr>
            </table>
          </Section>

          {/* Instructions */}
          <Section style={instructionsSection}>
            <Heading style={h2}>Що робити далі</Heading>
            <table style={stepsTable}>
              <tr>
                <td style={stepNumber}>1.</td>
                <td style={stepText}>
                  Виберіть категорію, на яку будете надсилати роботу.
                </td>
              </tr>
              <tr>
                <td style={stepNumber}>2.</td>
                <td style={stepText}>
                  Підготуйте якісну роботу згідно з обраною номінацією.
                  Зробіть 1–3 гарні фотографії вашої роботи.
                </td>
              </tr>
              <tr>
                <td style={stepNumber}>3.</td>
                <td style={stepText}>
                  Вкажіть вашу номінацію, прикріпіть 1–3 фотографії та
                  надішліть нам у Telegram:{" "}
                  <Link href={telegramSubmissionLink} style={inlineLink}>
                    @{telegramUsername}
                  </Link>
                </td>
              </tr>
              <tr>
                <td style={stepNumber}>4.</td>
                <td style={stepText}>
                  Поки чекаєте на результати, можете придбати ще один квиток
                  та взяти участь у наступній номінації!
                </td>
              </tr>
            </table>
          </Section>

          {/* Deadline */}
          <Section style={deadlineSection}>
            <table style={deadlineBox}>
              <tr>
                <td style={deadlineCell}>
                  <p style={deadlineLabel}>ДЕДЛАЙН ПОДАЧІ РОБІТ</p>
                  <p style={deadlineDate}>10 травня 2026</p>
                  <p style={deadlineNote}>
                    Роботи, надіслані після цієї дати, не будуть розглядатися.
                  </p>
                </td>
              </tr>
            </table>
          </Section>

          {/* CTA */}
          <Section style={ctaSection}>
            <Heading style={h2}>Ще одна номінація?</Heading>
            <Text style={text}>
              Хочете взяти участь у ще одній категорії? Напишіть нам —
              допоможемо з додатковим квитком.
            </Text>
            <Button style={button} href={instagramLink}>
              Написати в Instagram
            </Button>
          </Section>

          <Hr style={hr} />

          {/* Footer */}
          <Section style={footerSection}>
            <Text style={footerText}>
              З нетерпінням чекаємо на ваші роботи!
              <br />
              Команда Nail Moment
            </Text>
            <Text style={footerInfo}>
              <Link
                href="mailto:Nailmoment.Official@gmail.com"
                style={footerLink}
              >
                Nailmoment.Official@gmail.com
              </Link>
              {" · "}
              <Link href="https://www.nailmoment.pl" style={footerLink}>
                nailmoment.pl
              </Link>
              {" · "}
              <Link href={instagramLink} style={footerLink}>
                Instagram
              </Link>
              {" · "}
              <Link href={telegramSubmissionLink} style={footerLink}>
                Telegram
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

// ---- Colors matching the website theme ----
const colors = {
  olive: "#4a5e23",
  oliveLight: "#5c7a2e",
  cream: "#f7f5ef",
  creamDark: "#eee9dd",
  brown: "#3d2b1f",
  gold: "#8b7d3c",
  white: "#ffffff",
  textDark: "#2d2d2d",
  textMuted: "#6b6b6b",
  textLight: "#999999",
  border: "#e0ddd5",
};

const main = {
  backgroundColor: colors.cream,
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: colors.white,
  margin: "0 auto",
  padding: "0",
  marginBottom: "64px",
  borderRadius: "8px",
  maxWidth: "600px",
  overflow: "hidden" as const,
  border: `1px solid ${colors.border}`,
};

const headerSection = {
  textAlign: "center" as const,
  padding: "32px 40px 20px",
  backgroundColor: colors.cream,
};

const logoImageStyle = {
  display: "block",
  margin: "0 auto",
};

const headerTagline = {
  color: colors.olive,
  fontSize: "11px",
  fontWeight: "600" as const,
  letterSpacing: "2px",
  marginTop: "12px",
  marginBottom: "0",
  textTransform: "uppercase" as const,
};

const greetingSection = {
  padding: "24px 40px 0",
};

const h1 = {
  color: colors.brown,
  fontSize: "26px",
  fontWeight: "bold" as const,
  textAlign: "left" as const,
  margin: "0 0 16px 0",
};

const h2 = {
  color: colors.brown,
  fontSize: "18px",
  fontWeight: "bold" as const,
  margin: "0 0 12px 0",
};

const brandName = {
  fontWeight: "bold" as const,
  color: colors.olive,
};

const text = {
  color: colors.textDark,
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 16px 0",
};

const ticketWrapper = {
  padding: "0 40px 24px",
};

const ticketInnerBox = {
  width: "100%",
  backgroundColor: colors.cream,
  borderRadius: "8px",
  border: `1px solid ${colors.border}`,
  borderCollapse: "collapse" as const,
};

const ticketInnerCell = {
  padding: "24px",
  textAlign: "center" as const,
};

const ticketLabel = {
  color: colors.olive,
  fontSize: "11px",
  fontWeight: "700" as const,
  letterSpacing: "2px",
  margin: "0 0 12px 0",
  textTransform: "uppercase" as const,
};

const ticketIdDisplay = {
  color: colors.brown,
  fontSize: "20px",
  fontWeight: "bold" as const,
  fontFamily: "monospace",
  margin: "0 0 8px 0",
};

const shortCodeStyle = {
  color: colors.textMuted,
  fontSize: "13px",
  fontFamily: "monospace",
  letterSpacing: "1px",
  margin: "0",
};

const instructionsSection = {
  padding: "0 40px 24px",
};

const stepsTable = {
  width: "100%",
  borderSpacing: "0",
};

const stepNumber = {
  width: "24px",
  color: colors.olive,
  fontSize: "15px",
  fontWeight: "bold" as const,
  verticalAlign: "top" as const,
  paddingTop: "2px",
};

const stepText = {
  color: colors.textDark,
  fontSize: "14px",
  lineHeight: "22px",
  paddingLeft: "12px",
  paddingBottom: "16px",
  verticalAlign: "top" as const,
};

const inlineLink = {
  color: colors.olive,
  fontWeight: "600" as const,
  textDecoration: "none",
};

const deadlineSection = {
  padding: "0 40px 24px",
};

const deadlineBox = {
  width: "100%",
  backgroundColor: "#fdf6e8",
  borderRadius: "8px",
  border: "1px solid #e8d5a8",
  borderCollapse: "collapse" as const,
};

const deadlineCell = {
  padding: "20px 24px",
  textAlign: "center" as const,
};

const deadlineLabel = {
  color: colors.gold,
  fontSize: "11px",
  fontWeight: "700" as const,
  letterSpacing: "2px",
  margin: "0 0 8px 0",
  textTransform: "uppercase" as const,
};

const deadlineDate = {
  color: colors.brown,
  fontSize: "22px",
  fontWeight: "bold" as const,
  margin: "0 0 8px 0",
};

const deadlineNote = {
  color: colors.textMuted,
  fontSize: "13px",
  lineHeight: "18px",
  margin: "0",
};

const ctaSection = {
  textAlign: "center" as const,
  padding: "24px 40px",
  backgroundColor: colors.creamDark,
};

const button = {
  backgroundColor: colors.olive,
  borderRadius: "6px",
  color: colors.white,
  fontSize: "15px",
  fontWeight: "600" as const,
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  lineHeight: "100%",
  padding: "14px 28px",
};

const hr = {
  borderColor: colors.border,
  margin: "0",
};

const footerSection = {
  textAlign: "center" as const,
  padding: "24px 40px",
};

const footerText = {
  color: colors.textMuted,
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0 0 12px 0",
};

const footerInfo = {
  color: colors.textLight,
  fontSize: "12px",
  lineHeight: "20px",
  margin: "0 0 8px 0",
};

const footerLink = {
  color: colors.olive,
  textDecoration: "none",
};

const footerCopyright = {
  color: colors.textLight,
  fontSize: "11px",
  margin: "0",
};
