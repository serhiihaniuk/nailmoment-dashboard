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

interface EmailTemplateProps {
  name: string;
  qrCodeUrl: string;
  ticketType: string;
  ticketId?: string;
  logoUrl?: string;
  battleOfMastersLink?: string;
  instagramLink?: string;
}

const DEFAULT_LOGO_URL =
  "https://oet9iwqxtk87xaxw.public.blob.vercel-storage.com/assets/v1/nailmoment-wroclaw/content/2026/nm_logo.png";
const DEFAULT_BATTLE_LINK = "https://www.nailmoment.pl/battle";
const DEFAULT_INSTAGRAM_LINK = "https://www.instagram.com/nail_moment_pl";
const TELEGRAM_CHANNEL_LINK = "https://t.me/+5bQ5eI6x0vIyZTlk";

export const EmailTemplate = ({
  name,
  qrCodeUrl,
  ticketType,
  ticketId,
  logoUrl = DEFAULT_LOGO_URL,
  battleOfMastersLink = DEFAULT_BATTLE_LINK,
  instagramLink = DEFAULT_INSTAGRAM_LINK,
}: EmailTemplateProps) => {
  const shortCode = ticketId
    ? ticketId.replace(/[^a-zA-Z0-9]/g, "").slice(-5).toLowerCase()
    : "";
  const eventDetails = {
    date: "7 червня 2026",
    locationName: 'Uczelnia Biznesu i Nauk Stosowanych "Varsovia"',
    address: "Al. Jerozolimskie 133A, 02-304 Warszawa",
    mapsLink:
      "https://www.google.com/maps/place/Al.+Jerozolimskie+133A,+02-304+Warszawa,+Poland",
  };
  const currentYear = new Date().getFullYear();

  const normalizedTicketType = ticketType.toLocaleLowerCase();
  const isMaxiOrVip =
    normalizedTicketType === "maxi" || normalizedTicketType === "vip";
  const isVip = normalizedTicketType === "vip";

  return (
    <Html>
      <Head />
      <Preview>
        Ваш квиток на Nail Moment у Варшаві — {ticketType.toUpperCase()}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header with logo */}
          <Section style={headerSection}>
            <Img
              src={logoUrl}
              width="140"
              style={logoImageStyle}
              alt="Nail Moment Logo"
            />
            <Text style={headerTagline}>
              ГОЛОВНИЙ NAIL-ФЕСТИВАЛЬ ПОЛЬЩІ
            </Text>
          </Section>

          {/* Greeting */}
          <Section style={greetingSection}>
            <Heading style={h1}>Вітаємо, {name}!</Heading>
            <Text style={text}>
              Дякуємо за покупку квитка! Ми раді підтвердити вашу участь у
              фестивалі <span style={brandName}>Nail Moment</span> у Варшаві.
            </Text>
          </Section>

          {/* QR Ticket */}
          <Section style={qrWrapper}>
            <table style={qrInnerBox}>
              <tr>
                <td style={qrInnerCell}>
                  <p style={ticketLabel}>ВАШ КВИТОК</p>
                  <Img
                    src={qrCodeUrl}
                    width="200"
                    height="200"
                    alt="QR код вашого квитка"
                    style={qrCode}
                  />
                  <p style={ticketTypeBadge}>
                    {ticketType.toUpperCase()}
                  </p>
                  {shortCode && (
                    <p style={shortCodeText}>#{shortCode}</p>
                  )}
                  <p style={subtleText}>
                    Покажіть цей QR-код на вході для реєстрації
                  </p>
                </td>
              </tr>
            </table>
          </Section>

          {/* Event Details */}
          <Section style={detailsCard}>
            <Heading style={h2}>Деталі Події</Heading>
            <table style={detailsTable}>
              <tr>
                <td style={detailsIcon}>📅</td>
                <td style={detailsValue}>{eventDetails.date}</td>
              </tr>
              <tr>
                <td style={detailsIcon}>📍</td>
                <td style={detailsValue}>
                  {eventDetails.locationName}
                  <br />
                  <span style={addressText}>{eventDetails.address}</span>
                </td>
              </tr>
            </table>
            <Link href={eventDetails.mapsLink} style={mapLink}>
              Знайти на карті →
            </Link>
          </Section>

          {/* What's Included */}
          <Section style={includedSection}>
            <Heading style={h2}>Що включено у ваш квиток</Heading>
            <table style={featureTable}>
              <tr>
                <td style={checkmark}>✓</td>
                <td style={featureText}>Доступ до nail-маркету</td>
              </tr>
              <tr>
                <td style={checkmark}>✓</td>
                <td style={featureText}>Усі виступи спікерів</td>
              </tr>
              <tr>
                <td style={checkmark}>✓</td>
                <td style={featureText}>Нетворкінг з учасниками</td>
              </tr>
              <tr>
                <td style={checkmark}>✓</td>
                <td style={featureText}>
                  Доступ до закритого телеграм-каналу
                </td>
              </tr>
              {isMaxiOrVip && (
                <>
                  <tr>
                    <td style={checkmarkVip}>+</td>
                    <td style={featureTextVip}>Подарунки від брендів</td>
                  </tr>
                  <tr>
                    <td style={checkmarkVip}>+</td>
                    <td style={featureTextVip}>
                      Сертифікат про участь у заході
                    </td>
                  </tr>
                </>
              )}
              {isVip && (
                <tr>
                  <td style={checkmarkVip}>+</td>
                  <td style={featureTextVip}>Місця у перших рядах</td>
                </tr>
              )}
            </table>
          </Section>

          {/* Telegram */}
          <Section style={telegramSection}>
            <Heading style={h2}>Закритий Telegram Канал</Heading>
            <Text style={text}>
              Приєднуйтесь до нашого закритого Telegram-каналу для оновлень,
              анонсів та спілкування з іншими учасниками фестивалю.
            </Text>
            <Button style={button} href={TELEGRAM_CHANNEL_LINK}>
              Приєднатися до Telegram
            </Button>
          </Section>

          {/* Battle of Masters */}
          <Section style={battleSection}>
            <Heading style={h2}>Конкурс «Битва Майстрів»</Heading>
            <Text style={text}>
              Хочете взяти участь у конкурсі{" "}
              <strong>«Битва Майстрів»</strong>? Для участі необхідно
              додатково придбати окремий квиток конкурсанта.
            </Text>
            <Button style={buttonOutline} href={battleOfMastersLink}>
              Дізнатися більше
            </Button>
          </Section>

          <Hr style={hr} />

          {/* Footer */}
          <Section style={footerSection}>
            <Text style={footerText}>
              З нетерпінням чекаємо на зустріч з вами у Варшаві!
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
              <Link
                href="https://www.instagram.com/nail_moment_pl"
                style={footerLink}
              >
                Instagram
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
  oliveDark: "#3a4a1c",
  cream: "#f7f5ef",
  creamDark: "#eee9dd",
  brown: "#3d2b1f",
  brownLight: "#5c4033",
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

const subtleText = {
  color: colors.textMuted,
  fontSize: "13px",
  lineHeight: "20px",
  margin: "8px 0 0 0",
};

const qrWrapper = {
  padding: "0 40px 24px",
};

const qrInnerBox = {
  width: "100%",
  backgroundColor: colors.cream,
  borderRadius: "8px",
  border: `1px solid ${colors.border}`,
  borderCollapse: "collapse" as const,
};

const qrInnerCell = {
  padding: "24px",
  textAlign: "center" as const,
};

const ticketLabel = {
  color: colors.olive,
  fontSize: "11px",
  fontWeight: "700" as const,
  letterSpacing: "2px",
  margin: "0 0 16px 0",
  textTransform: "uppercase" as const,
};

const qrCode = {
  margin: "0 auto",
  display: "block" as const,
};

const shortCodeText = {
  color: colors.textMuted,
  fontSize: "13px",
  fontFamily: "monospace",
  letterSpacing: "1px",
  margin: "8px 0 0 0",
};

const ticketTypeBadge = {
  display: "inline-block",
  backgroundColor: colors.olive,
  color: colors.white,
  fontSize: "13px",
  fontWeight: "bold" as const,
  padding: "4px 16px",
  borderRadius: "4px",
  marginTop: "16px",
  marginBottom: "0",
  letterSpacing: "1px",
};

const detailsCard = {
  padding: "24px 40px",
  margin: "0",
};

const detailsTable = {
  width: "100%",
  borderSpacing: "0",
  marginBottom: "12px",
};

const detailsIcon = {
  width: "28px",
  fontSize: "16px",
  verticalAlign: "top" as const,
  paddingTop: "2px",
  paddingBottom: "12px",
};

const detailsValue = {
  color: colors.textDark,
  fontSize: "15px",
  lineHeight: "22px",
  paddingBottom: "12px",
};

const addressText = {
  color: colors.textMuted,
  fontSize: "14px",
};

const mapLink = {
  color: colors.olive,
  fontSize: "14px",
  fontWeight: "600" as const,
  textDecoration: "none",
};

const includedSection = {
  padding: "24px 40px",
  backgroundColor: colors.cream,
};

const featureTable = {
  width: "100%",
  borderSpacing: "0",
};

const checkmark = {
  width: "24px",
  color: colors.olive,
  fontSize: "16px",
  fontWeight: "bold" as const,
  verticalAlign: "top" as const,
  paddingTop: "6px",
  paddingBottom: "6px",
};

const checkmarkVip = {
  ...checkmark,
  color: colors.gold,
};

const featureText = {
  color: colors.textDark,
  fontSize: "14px",
  lineHeight: "20px",
  paddingTop: "6px",
  paddingBottom: "6px",
  borderBottom: `1px solid ${colors.border}`,
};

const featureTextVip = {
  ...featureText,
  fontWeight: "600" as const,
};

const telegramSection = {
  textAlign: "center" as const,
  padding: "24px 40px",
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

const battleSection = {
  textAlign: "center" as const,
  padding: "24px 40px",
  backgroundColor: colors.creamDark,
};

const buttonOutline = {
  backgroundColor: "transparent",
  borderRadius: "6px",
  color: colors.olive,
  fontSize: "15px",
  fontWeight: "600" as const,
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  lineHeight: "100%",
  padding: "12px 26px",
  border: `2px solid ${colors.olive}`,
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
