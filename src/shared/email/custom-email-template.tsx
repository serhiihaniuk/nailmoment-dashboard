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
  Hr,
  Link,
} from "@react-email/components";
import * as React from "react";

interface CustomEmailTemplateProps {
  name: string;
  subject: string;
  body: string;
}

const LOGO_URL =
  "https://oet9iwqxtk87xaxw.public.blob.vercel-storage.com/assets/v1/nailmoment-wroclaw/content/2026/nm_logo.png";

export const CustomEmailTemplate = ({
  name,
  subject,
  body,
}: CustomEmailTemplateProps) => {
  const currentYear = new Date().getFullYear();
  const paragraphs = body.split("\n").filter((p) => p.trim() !== "");

  return (
    <Html>
      <Head />
      <Preview>{subject}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={headerSection}>
            <Img
              src={LOGO_URL}
              width="140"
              style={logoImageStyle}
              alt="Nail Moment Logo"
            />
          </Section>

          <Section style={contentSection}>
            <Heading style={h1}>{name},</Heading>
            {paragraphs.map((p, i) => (
              <Text key={i} style={text}>
                {p}
              </Text>
            ))}
          </Section>

          <Hr style={hr} />

          <Section style={footerSection}>
            <Text style={footerText}>
              З повагою,
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

const colors = {
  olive: "#4a5e23",
  cream: "#f7f5ef",
  brown: "#3d2b1f",
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

const contentSection = {
  padding: "28px 40px",
};

const h1 = {
  color: colors.brown,
  fontSize: "22px",
  fontWeight: "bold" as const,
  textAlign: "left" as const,
  margin: "0 0 20px 0",
};

const text = {
  color: colors.textDark,
  fontSize: "15px",
  lineHeight: "26px",
  margin: "0 0 16px 0",
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
