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
  logoUrl?: string;
  battleOfMastersLink?: string;
  instagramLink?: string;
}

const DEFAULT_LOGO_URL =
  "https://oet9iwqxtk87xaxw.public.blob.vercel-storage.com/nailmoment-wroclaw/assets/logo-sYFHGN18H1zPtjucntQDiZXrYdpXQB.png";
const DEFAULT_BATTLE_LINK = "https://www.nailmoment.pl/battle";
const DEFAULT_INSTAGRAM_LINK = "https://www.instagram.com/nail_moment_pl";
const TELEGRAM_CHANNEL_LINK = "https://t.me/+eNoGeJrBIzMyOWQ8";

export const EmailTemplate = ({
  name,
  qrCodeUrl,
  ticketType,
  logoUrl = DEFAULT_LOGO_URL,
  battleOfMastersLink = DEFAULT_BATTLE_LINK,
  instagramLink = DEFAULT_INSTAGRAM_LINK,
}: EmailTemplateProps) => {
  const eventDetails = {
    date: "27 липня 2025",
    locationName: "Concordia Design Wrocław",
    address: "Wyspa Słodowa 7, 50-266 Wrocław",
    mapsLink:
      "https://www.google.com/maps/place/Concordia+Design+Wroc%C5%82aw+I+Wynajem+biur+I+Centrum+Konferencyjno+-+Eventowe/@51.116155,17.039087,18z/data=!4m6!3m5!1s0x470fe9d955a31883:0xe8473c13af04dfb3!8m2!3d51.1161551!4d17.039087!16s%2Fg%2F11h42p_991?hl=pl&entry=ttu&g_ep=EgoyMDI1MDQyMy4wIKXMDSoASAFQAw%3D%3D",
  };
  const currentYear = new Date().getFullYear(); // Get current year for footer

  // Normalize ticket type for comparison
  const normalizedTicketType = ticketType.toLocaleLowerCase();
  const isVipOrStandard =
    normalizedTicketType === "vip" || normalizedTicketType === "standard";

  return (
    <Html>
      <Head />
      <Preview>
        Ваш квиток на фестиваль Nail Moment + Доступ до Telegram!
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
            Дякуємо за покупку квитка! Ми раді підтвердити ваше запрошення на
            фестиваль <span style={brandName}>Nail Moment</span> у Вроцлаві. Ваш
            електронний квиток готовий.
          </Text>

          <Section style={qrSection}>
            <Heading style={h2}>Ваш Квиток</Heading>
            <Text style={subtleText}>
              Покажіть цей QR-код на вході для реєстрації.
            </Text>
            <Img
              src={qrCodeUrl}
              width="220"
              height="220"
              alt="QR код вашого квитка"
              style={qrCode}
            />
            <Text style={ticketTypeText}>
              <span style={ticketTypeHighlight}>
                {ticketType.toUpperCase()}
              </span>
            </Text>
          </Section>

          <Hr style={hr} />

          <Section style={detailsSection}>
            <Heading style={h2}>Деталі Події</Heading>
            <Text style={detailsText}>
              <strong>Дата:</strong> {eventDetails.date}
            </Text>
            <Text style={detailsText}>
              <strong>Місце:</strong> {eventDetails.locationName}
              <br />
              {eventDetails.address}
            </Text>
            <Text style={detailsText}>
              <Link href={eventDetails.mapsLink} style={link}>
                Знайти на карті
              </Link>
            </Text>
          </Section>

          <Hr style={hr} />

          {/* --- New Telegram Channel Section --- */}
          <Section style={telegramSection}>
            <Heading style={h2}>🎁 Ваш Бонус: Закритий Telegram Канал</Heading>
            <Text style={text}>
              Як власник квитка, ви отримуєте ексклюзивний доступ до нашого
              закритого Telegram-каналу! Приєднуйтесь, щоб отримувати останні
              оновлення, спеціальні анонси та спілкуватися з іншими учасниками
              фестивалю.
            </Text>
            <Button style={button} href={TELEGRAM_CHANNEL_LINK}>
              Приєднатися до Каналу в Telegram
            </Button>
          </Section>
          {/* ------------------------------------ */}

          <Hr style={hr} />

          {isVipOrStandard && (
            <Section style={competitionSection}>
              <Heading style={h2}>🔥 Бонус: Битва Майстрів!</Heading>
              <Text style={text}>
                Маєте хист до змагань? Після придбання цього квитка ви отримуєте
                ексклюзивну можливість взяти участь у конкурсі{" "}
                <strong>&quot;Битва Майстрів&quot;</strong>! Для участі
                необхідно додатково придбати окремий квиток конкурсанта.
              </Text>
              <Button style={button} href={battleOfMastersLink}>
                Дізнатися більше та купити квиток учасника
              </Button>
            </Section>
          )}

          {!isVipOrStandard && (
            <Section style={upgradeSectionStyle}>
              <Heading style={h2}>Хочеш Більшого?</Heading>
              <Text style={text}>
                Якщо хочеш <strong>БІЛЬШОГО</strong>, у тебе є шанс: більше
                побачити, більше навчитися та потрапити на конференцію з
                виступами наших спікерів: Анастасія Костенко, Юлія Зварич, Яна,
                Ангеліна Рагоза, Юлія Бельмас та інші.
              </Text>
              <Text style={text}>
                Щоб змінити твій квиток на квиток STANDARD чи VIP,{" "}
                <Link href={instagramLink} style={link}>
                  напиши до нас у дірект
                </Link>
                📩
              </Text>
            </Section>
          )}

          <Hr style={hr} />

          <Section style={footerSection}>
            <Text style={footerText}>
              З нетерпінням чекаємо на зустріч з вами у Вроцлаві!
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
              <Link href="https://www.nailmoment.pl" style={footerLink}>
                www.nailmoment.pl
              </Link>
              <br />
              <Link href="https://t.me/nail_moment_pl" style={footerLink}>
                t.me/nail_moment_pl
              </Link>
              <br />
              <Link
                href="https://www.instagram.com/nail_moment_pl"
                style={footerLink}
              >
                instagram.com/nail_moment_pl
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

const telegramSection = {
  textAlign: "center" as const,
  margin: "30px 0",
  padding: "20px",
  backgroundColor: "#f0f8ff",
  borderRadius: "5px",
  border: "1px solid #d6ebff",
};
// ---------------------------------------

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

const subtleText = {
  color: "#555",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0 0 15px 0",
};

const qrSection = {
  backgroundColor: "#f8f8f8",
  padding: "20px",
  margin: "30px 0",
  textAlign: "center" as const,
  border: "1px dashed #ccc",
  borderRadius: "5px",
};

const qrCode = {
  margin: "10px auto",
};

const ticketTypeText = {
  ...subtleText,
  marginTop: "15px",
  fontWeight: "bold" as const,
};

const ticketTypeHighlight = {
  color: "#007bff",
};

const hr = {
  borderColor: "#cccccc",
  margin: "30px 0",
};

const detailsSection = {
  margin: "20px 0",
};

const detailsText = {
  color: "#333",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "8px 0",
};

const competitionSection = {
  textAlign: "center" as const,
  margin: "30px 0",
  padding: "20px",
  backgroundColor: "#fff9e6", // Yellowish background for attention
  borderRadius: "5px",
  border: "1px solid #ffeeba",
};

// Style for the new upgrade section
const upgradeSectionStyle = {
  textAlign: "center" as const,
  margin: "30px 0",
  padding: "20px",
  backgroundColor: "#eaf6ff", // Light blue background
  borderRadius: "5px",
  border: "1px solid #cde7ff",
};

const button = {
  backgroundColor: "#007bff",
  borderRadius: "5px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "bold" as const,
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block", // Changed from block to inline-block for better centering within textAlign:center sections
  lineHeight: "100%",
  padding: "12px 20px",
  marginTop: "10px", // Ensures some space above the button if text is short
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
